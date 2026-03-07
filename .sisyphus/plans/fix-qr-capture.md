# Fix QR Code Capture — Debug & Multi-Strategy Hardening

## TL;DR

> **Quick Summary**: The QR capture script fails silently because all 3 strategies (canvas/img/SVG) fail on the Aigens kiosk page. Add diagnostic logging to identify exactly what's on the page, then add additional capture strategies (crossOrigin reload, XHR blob, no-cors fetch). Surface debug info in the alert so iteration is fast.
> 
> **Deliverables**:
> - Hardened `buildCaptureScript()` with 6 strategies instead of 3
> - Debug logging surfaced in alerts for rapid iteration
> - Working QR capture on the Aigens kiosk page
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO — single file, single task
> **Critical Path**: Fix → tsc check → user runtime test

---

## Context

### Original Request
User reports "unable to capture" error when pressing Done on the QR code page. The QR code is clearly visible on screen but the injected JavaScript cannot extract it.

### Root Cause Analysis
The Aigens kiosk page renders the QR code as a cross-origin `<img>` element. Our current strategies fail because:
1. **Canvas strategy**: No `<canvas>` elements on the page — QR is not canvas-rendered
2. **img → drawImage strategy**: Cross-origin image taints the canvas, `toDataURL()` throws SecurityError
3. **fetch() strategy**: `fetch(url, { mode: 'cors' })` fails because the image CDN doesn't send `Access-Control-Allow-Origin` headers
4. **SVG strategy**: No SVG elements — QR is not SVG-rendered

### Why We Can't See What's Happening
The script posts `image: null` when all strategies fail, but provides no information about:
- How many elements of each type exist
- What the image `src` URLs look like
- Which specific strategy failed and with what error
- Whether the QR might be rendered differently than expected (e.g., CSS background-image, iframe, etc.)

---

## Work Objectives

### Core Objective
Make the QR capture work on the Aigens kiosk page, or at minimum get diagnostic data to understand exactly why it fails.

### Must Have
- Debug logging that reports what elements exist, their sizes, and which strategy failed with what error
- Debug info surfaced to the user via the Alert (temporarily) so we can iterate
- At least 2 additional capture strategies beyond the current 3
- `CaptureResult` interface updated with optional `debug` field

### Must NOT Have
- Do NOT add any new npm packages
- Do NOT change the WebView configuration or URL
- Do NOT remove the existing 3 strategies — only ADD new ones
- Do NOT change the modal, navigation, or any other screen logic

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: none
- **QA**: Agent runs `npx tsc --noEmit`. Runtime testing by user.

---

## Execution Strategy

### Single Task — No Parallelism Needed

```
Wave 1:
└── Task 1: Add debug logging + new capture strategies to buildCaptureScript()

Wave FINAL:
└── Task F1: npx tsc --noEmit
```

---

## TODOs

- [x] 1. Harden buildCaptureScript() with debug logging and additional capture strategies

  **What to do**:

  All changes in `mobile/src/screens/CanteenWebViewScreen.tsx`.

  **Step 1 — Update `CaptureResult` interface** (line 41-45):
  Add an optional `debug` field:
  ```typescript
  interface CaptureResult {
    type: string;
    image: string | null;
    price: number;
    debug?: string;
  }
  ```

  **Step 2 — Rewrite `buildCaptureScript()` function** (lines 47-255):
  
  Replace the entire function with a version that includes:

  A. **Debug logging infrastructure**:
  - Create a `debugLog` array at the top of the IIFE
  - Add a `log(msg)` helper that pushes to the array
  - Include `debug: debugLog.join(' | ')` in every `postResult()` call
  - Log: number of `<img>`, `<canvas>`, `<svg>` elements found
  - Log: for each img, its `src` (first 80 chars), `naturalWidth x naturalHeight`, and `display width x height` from `getBoundingClientRect()`
  - Log: which strategy is being attempted and whether it succeeded or failed (with error message)

  B. **Additional capture strategies** (insert between existing Strategy 2b and 2c):

  **Strategy 2c — crossOrigin='anonymous' reload**:
  ```javascript
  function reloadImgWithCors(img, callback) {
    log('cors-reload: trying');
    var newImg = new window.Image();
    newImg.crossOrigin = 'anonymous';
    newImg.onload = function () {
      try {
        var c = document.createElement('canvas');
        c.width = newImg.naturalWidth;
        c.height = newImg.naturalHeight;
        var ctx = c.getContext('2d');
        if (!ctx) { callback(null); return; }
        ctx.drawImage(newImg, 0, 0);
        var d = c.toDataURL('image/png');
        if (d && d.indexOf('data:image') === 0 && d.length > 100) {
          log('cors-reload: success');
          callback(d);
        } else {
          callback(null);
        }
      } catch (e) {
        log('cors-reload: tainted ' + e.message);
        callback(null);
      }
    };
    newImg.onerror = function () { log('cors-reload: failed'); callback(null); };
    newImg.src = img.src;
  }
  ```

  **Strategy 2e — XHR blob fetch** (after existing fetch strategy):
  ```javascript
  function fetchImageNoCors(url, callback) {
    log('xhr: trying');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = function () {
      if (xhr.status === 200 && xhr.response) {
        log('xhr: got blob size=' + xhr.response.size);
        var reader = new FileReader();
        reader.onloadend = function () { callback(reader.result); };
        reader.onerror = function () { callback(null); };
        reader.readAsDataURL(xhr.response);
      } else {
        log('xhr: status=' + xhr.status);
        callback(null);
      }
    };
    xhr.onerror = function () { log('xhr: error'); callback(null); };
    try { xhr.send(); } catch (e) { log('xhr: ' + e.message); callback(null); }
  }
  ```

  **Strategy 4 — CSS background-image extraction** (after SVG, before giving up):
  ```javascript
  function findBackgroundQr() {
    log('bg: scanning');
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg.indexOf('url(') !== -1) {
        var rect = el.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 50 && rect.width < 500) {
          var urlMatch = bg.match(/url\(["']?(.*?)["']?\)/);
          if (urlMatch && urlMatch[1]) {
            log('bg: found ' + urlMatch[1].substring(0, 60) + ' size=' + Math.round(rect.width) + 'x' + Math.round(rect.height));
            return urlMatch[1];
          }
        }
      }
    }
    log('bg: none found');
    return null;
  }
  ```

  C. **Updated `tryCapture()` flow** — chain all strategies in order:
  1. Canvas element (`findQrCanvas`)
  2. Img — data: URL
  3. Img — drawImage to canvas
  4. Img — crossOrigin='anonymous' reload (NEW)
  5. Img — fetch as blob (existing)
  6. Img — XHR as blob (NEW)
  7. SVG capture
  8. CSS background-image (NEW)
  9. Give up with full debug log

  D. **Outer catch** should also include debug log:
  ```javascript
  catch (e) {
    // ... include debug: 'outer catch: ' + e.message + ' | ' + debugLog.join(' | ')
  }
  ```

  **Step 3 — Update `handleMessage` to surface debug info** (around line 260):
  
  In the `!msg.image` branch where we show the "Capture Failed" alert, include the debug log:
  ```typescript
  if (!msg.image) {
    Alert.alert(
      'Capture Failed',
      'Unable to capture the QR code.\n\nDebug: ' + (msg.debug || 'no debug info')
    );
    setCapturing(false);
    return;
  }
  ```

  Also log it to console for expo dev tools:
  ```typescript
  if (msg.debug) {
    console.log('[QR Capture Debug]', msg.debug);
  }
  ```

  **Must NOT do**:
  - Do NOT change anything outside `buildCaptureScript()`, `CaptureResult` interface, and the `handleMessage` alert
  - Do NOT add npm dependencies
  - Do NOT change the WebView props

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-strategy JS injection with async callback chains requires careful reasoning about execution order and CORS behavior
  - **Skills**: `[]`
    - No skills needed — this is pure code editing in a single file
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — we're editing source code, not testing in browser

  **Parallelization**:
  - **Can Run In Parallel**: NO — single task
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Final verification
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `mobile/src/screens/CanteenWebViewScreen.tsx:47-255` — Current `buildCaptureScript()` function to be rewritten
  - `mobile/src/screens/CanteenWebViewScreen.tsx:41-45` — `CaptureResult` interface to update
  - `mobile/src/screens/CanteenWebViewScreen.tsx:257-294` — `handleMessage` callback where alert text needs updating

  **WHY Each Reference Matters**:
  - The executor needs to see the EXACT current code to know what to replace
  - The `CaptureResult` interface must be updated first since it's referenced in `handleMessage`
  - The alert in `handleMessage` must show `msg.debug` for the user to report back what the page looks like

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript compiles cleanly
    Tool: Bash
    Preconditions: Mobile directory exists
    Steps:
      1. Run `npx tsc --noEmit` in mobile/ directory
    Expected Result: Exit code 0, no output
    Failure Indicators: Any TypeScript error output
    Evidence: .sisyphus/evidence/task-1-tsc-check.txt

  Scenario: Debug field present in CaptureResult interface
    Tool: Bash (grep)
    Preconditions: File edited
    Steps:
      1. Search for `debug?:` in CanteenWebViewScreen.tsx
    Expected Result: Line found with `debug?: string`
    Evidence: .sisyphus/evidence/task-1-debug-field.txt

  Scenario: All 6+ strategies present in buildCaptureScript
    Tool: Bash (grep)
    Preconditions: File edited
    Steps:
      1. Search for 'cors-reload' in the file — should exist
      2. Search for 'fetchImageNoCors' or 'xhr' strategy — should exist  
      3. Search for 'backgroundImage' or 'bg:' strategy — should exist
      4. Search for 'debugLog' — should exist
    Expected Result: All 4 searches find matches
    Evidence: .sisyphus/evidence/task-1-strategies-present.txt

  Scenario: Alert shows debug info on failure
    Tool: Bash (grep)
    Preconditions: File edited
    Steps:
      1. Search for 'msg.debug' in handleMessage — should exist in the Alert
    Expected Result: Debug info is included in the Capture Failed alert
    Evidence: .sisyphus/evidence/task-1-debug-alert.txt
  ```

  **Commit**: YES
  - Message: `fix(qr): add debug logging and additional capture strategies for QR extraction`
  - Files: `mobile/src/screens/CanteenWebViewScreen.tsx`
  - Pre-commit: `npx tsc --noEmit` (in mobile/)

---

## Final Verification Wave

- [x] F1. **TypeScript Check** — `quick`
  Run `npx tsc --noEmit` in `mobile/` directory. Must pass with zero errors.
  Output: `Build [PASS/FAIL] | VERDICT: APPROVE/REJECT`

---

## Commit Strategy

- **1**: `fix(qr): add debug logging and additional capture strategies for QR extraction` — `mobile/src/screens/CanteenWebViewScreen.tsx`, `npx tsc --noEmit`

---

## Success Criteria

### Verification Commands
```bash
cd mobile && npx tsc --noEmit  # Expected: no output, exit 0
```

### Final Checklist
- [ ] `CaptureResult` interface has `debug?: string` field
- [ ] `buildCaptureScript()` has debug logging for element counts, sizes, URLs
- [ ] At least 6 capture strategies in the chain (canvas, data-url, drawImage, cors-reload, fetch, xhr, svg, background-image)
- [ ] Alert shows debug info when capture fails
- [ ] TypeScript compiles cleanly
- [ ] No new npm dependencies added
