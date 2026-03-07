# Cart Item Auto-Extraction from Aigens WebView DOM

## TL;DR

> **Quick Summary**: Inject JavaScript into the Aigens canteen WebView to automatically scrape order items (name, quantity, price) from the shopping cart page DOM, and pre-populate OrderConfirmScreen with that data. Also remove the unnecessary QR decode API call and clean up debug code.
> 
> **Deliverables**:
> - Cart item auto-extraction via injected JS (MutationObserver + polling)
> - Pre-populated OrderConfirmScreen with scraped items and total price
> - QR decode call removed (only screenshot kept for deliverer)
> - Clean, maintainable capture + extraction flow
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5

---

## Context

### Original Request
User wants the app to automatically extract food items from the Aigens canteen ordering WebView (shopping cart page DOM) instead of requiring manual entry on the OrderConfirmScreen. The QR code screenshot capture is already working and should be kept for the deliverer to show at the pickup counter. QR decoding is no longer needed.

### Interview Summary
**Key Discussions**:
- QR code only contains `{"language":"zh","uuid":"..."}` — not useful for items
- User confirmed: don't decode QR, just screenshot it for the deliverer
- User provided full DOM trees for all 6 Aigens pages
- Shopping cart page (`app-mobile-cart-page`) has clear, scrapeable DOM structure
- Aigens is an Angular SPA — URL doesn't change between pages, all same-origin
- The `_ngcontent-*` attributes have dynamic prefixes (e.g., `ucp` varies) — don't use them

**Research Findings**:
- Cart items are in `.cart-item-wrapper` containers with `.item-qty`, `.item-name`, `.main-item-price-extra` sub-elements
- Cart total is in `.div-prices .col-right h5`
- Main items use `.main-item-row.main-item`, sub-items use `.main-item-row.sub-item`
- All pages are same-origin SPA, so DOM access works (no CORS issues)
- QR image URL pattern: `https://api.aigens.com/barcode?message=<data>&type=qr&width=500`

### Metis Review
**Identified Gaps** (addressed):
- Edge case: empty cart — handled by existing OrderConfirmScreen validation (`validItems.length === 0`)
- Edge case: sub-items without main items — treat sub-items as separate line items with their own price
- Edge case: user modifies cart after extraction — re-scrape on each cart page visit via MutationObserver
- Race condition: user presses "Done" before cart is visited — items array empty, user can still manually add items (graceful fallback)
- Price format parsing: Aigens uses "$" prefix with decimal (e.g., "$29.5") — parse with regex

---

## Work Objectives

### Core Objective
Automatically extract cart items from the Aigens WebView DOM and pre-populate the OrderConfirmScreen, eliminating manual item entry while keeping the QR screenshot for the deliverer.

### Concrete Deliverables
- `CanteenWebViewScreen.tsx`: New `injectedJavaScriptBeforeContentLoaded` script for cart scraping + updated `handleMessage` + updated `handleConfirm`
- `OrderConfirmScreen.tsx`: Pre-populate items from route params instead of empty defaults
- `CanteenWebViewScreen.tsx`: Remove `decodeQR` import and all QR decode calls

### Definition of Done
- [x] `npx tsc --noEmit` passes with zero errors
- [x] Cart items are automatically extracted when user visits the shopping cart page in the Aigens WebView
- [x] Extracted items (name, qty, price) are passed to OrderConfirmScreen and pre-populated
- [x] QR screenshot is still captured and passed to OrderConfirmScreen
- [x] QR decode API call is removed
- [x] User can still manually edit/add/remove items on OrderConfirmScreen after auto-population
- [x] Empty cart gracefully falls back to manual entry (empty items list)

### Must Have
- MutationObserver or polling to detect `app-mobile-cart-page` appearing in DOM
- Item scraping using stable CSS selectors (NOT `_ngcontent-*` attributes)
- Price parsing that handles "$29.5" format
- Sub-items included in the items list
- Cart total extracted from `.div-prices .col-right h5`
- Items stored in `window.__extractedCartItems` for retrieval on "Done" press
- Items sent alongside QR URL in `postMessage`
- OrderConfirmScreen reads items from route params

### Must NOT Have (Guardrails)
- NO new npm packages — everything uses existing WebView injection
- NO `_ngcontent-*` attribute selectors (dynamic, unreliable)
- NO QR decode API calls (user confirmed not needed)
- NO changes to backend API endpoints or schemas
- NO changes to the WebView URL or source configuration
- NO `any` types — use proper TypeScript typing
- NO breaking the existing QR screenshot capture flow
- NO removing the ability to manually edit items on OrderConfirmScreen

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (no jest/vitest)
- **Automated tests**: None
- **Framework**: none
- **Verification**: `npx tsc --noEmit` only

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **TypeScript**: Use Bash (`npx tsc --noEmit`) — Type-check all changes

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — independent tasks):
├── Task 1: Build cart extraction injected script [deep]
├── Task 2: Remove QR decode calls + clean up [quick]

Wave 2 (After Wave 1 — integration):
├── Task 3: Wire cart items into capture flow + handleMessage [deep]
├── Task 4: Pre-populate OrderConfirmScreen with extracted items [quick]

Wave 3 (After Wave 2 — verification):
├── Task 5: Type-check + final integration review [quick]

Wave FINAL (After ALL tasks — independent review):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Scope fidelity check (deep)
```

### Dependency Matrix

| Task | Depends On | Blocks    | Wave |
|------|-----------|-----------|------|
| 1    | —         | 3         | 1    |
| 2    | —         | 3         | 1    |
| 3    | 1, 2      | 4, 5      | 2    |
| 4    | 3         | 5         | 2    |
| 5    | 3, 4      | F1-F3     | 3    |
| F1   | 5         | —         | FINAL|
| F2   | 5         | —         | FINAL|
| F3   | 5         | —         | FINAL|

### Agent Dispatch Summary

- **Wave 1**: **2** — T1 → `deep`, T2 → `quick`
- **Wave 2**: **2** — T3 → `deep`, T4 → `quick`
- **Wave 3**: **1** — T5 → `quick`
- **FINAL**: **3** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `deep`

---

## TODOs

- [x] 1. Build cart extraction injected JavaScript

  **What to do**:
  - Create a new function `buildCartExtractionScript()` in `CanteenWebViewScreen.tsx` that returns a JavaScript string for injection via `injectedJavaScriptBeforeContentLoaded`
  - The script must:
    1. Set up a `MutationObserver` on `document.body` (or poll every 500ms as fallback) watching for `app-mobile-cart-page` element to appear in the DOM
    2. When cart page is detected, scrape all items from the DOM using these selectors:
       - Container: `.cart-item-wrapper` (each is one item group)
       - Within each wrapper, find `.main-item-row` elements:
         - `.main-item-row.main-item` → main dish
         - `.main-item-row.sub-item` → add-ons/extras
       - For each row:
         - Quantity: `.div-item-qty h4.item-qty` → `parseInt(text)`
         - Name: `h4.item-name` → `text.trim()`
         - Price: `h6.main-item-price-extra` → `parseFloat(text.replace('$',''))` (may be empty for sub-items — use 0)
       - If `.main-item-price-extra` is missing for a sub-item, try `.cart-item-price h5.main-item-price`
    3. Extract total price: `.div-prices .col-right h5` → `parseFloat(text.replace('$','').trim())`
    4. Store results in `window.__extractedCartItems` as `{items: [{name, qty, price}], totalPrice: number}`
    5. Also send a `postMessage` with `type: 'cart_items_extracted'` containing the items and total, so RN can store them immediately
    6. Re-scrape when cart DOM changes (MutationObserver on the cart container, or re-poll every 2 seconds while cart page is visible)
  - The script must be a self-invoking function wrapped in try/catch
  - Use `var` declarations only (no `let`/`const`) for maximum browser compat in WebView
  - Include debug logging with `console.log('[CartExtract]', ...)` for troubleshooting

  **Must NOT do**:
  - Do NOT use `_ngcontent-*` attribute selectors (dynamic prefix changes)
  - Do NOT use `let`, `const`, or arrow functions in the injected JS (compat)
  - Do NOT modify the existing `buildCaptureScript()` function in this task
  - Do NOT add any new npm packages

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: DOM scraping logic requires careful selector handling, edge cases, and understanding of Angular SPA behavior
  - **Skills**: `[]`
    - No special skills needed — pure JavaScript injection code
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — we're writing injected JS, not automating a browser

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References**:
  - `mobile/src/screens/CanteenWebViewScreen.tsx:49-563` — `buildCaptureScript()` function — follow the same pattern: self-invoking function, `var` declarations, debug logging, `window.ReactNativeWebView.postMessage()` for results
  - `mobile/src/screens/CanteenWebViewScreen.tsx:41-47` — `CaptureResult` interface — the message type/shape pattern to follow

  **DOM Structure References** (from user-provided DOM analysis):
  - Shopping cart page root: `app-mobile-cart-page`
  - Item wrapper: `.cart-item-wrapper` → `.cart-item-name` → `.cart-item` → `.cart-item-box`
  - Main item row: `.main-item-row.main-item` with `.div-item-qty h4.item-qty` (qty), `h4.item-name` (name), `h6.main-item-price-extra` (price)
  - Sub-item row: `.main-item-row.sub-item` with same child structure
  - Per-group total: `.cart-item-price h5.main-item-price`
  - Cart total: `.div-prices .col-right h5` (text like "$30.5")
  - Checkout button price: `.checkout-price` (backup total)

  **Type References**:
  - `mobile/src/types/index.ts:3-7` — `OrderItem {name: string, qty: number, price: number}` — items must match this shape

  **WHY Each Reference Matters**:
  - `buildCaptureScript()` shows the exact injection pattern, message posting, error handling — copy the style exactly
  - `CaptureResult` interface shows how messages are typed — new message type must follow same pattern
  - DOM selectors were verified from user-provided DOM tree dumps — these are real, not guessed
  - `OrderItem` defines the exact shape the items must match for downstream consumption

  **Acceptance Criteria**:
  - [ ] New function `buildCartExtractionScript()` exists in CanteenWebViewScreen.tsx
  - [ ] Function returns a string of injectable JavaScript
  - [ ] Script uses only `var` declarations, no arrow functions
  - [ ] Script detects `app-mobile-cart-page` via MutationObserver or polling
  - [ ] Script scrapes items using `.cart-item-wrapper` and `.main-item-row` selectors
  - [ ] Script extracts total from `.div-prices .col-right h5`
  - [ ] Script posts message with `type: 'cart_items_extracted'`
  - [ ] Script stores items in `window.__extractedCartItems`
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript compilation succeeds
    Tool: Bash
    Preconditions: Task 1 code changes applied
    Steps:
      1. Run `npx tsc --noEmit` from mobile/ directory
      2. Check exit code is 0
    Expected Result: Zero type errors
    Failure Indicators: Any TypeScript error output
    Evidence: .sisyphus/evidence/task-1-tsc-check.txt

  Scenario: Script uses var declarations only
    Tool: Bash (grep)
    Preconditions: buildCartExtractionScript function exists
    Steps:
      1. Search the return string of buildCartExtractionScript for `let ` or `const ` declarations
      2. Verify none found (template literal content, not the TS wrapper)
    Expected Result: No let/const in injected JS string content
    Failure Indicators: grep finds let/const inside template literal
    Evidence: .sisyphus/evidence/task-1-var-only.txt

  Scenario: Script does not use _ngcontent selectors
    Tool: Bash (grep)
    Preconditions: buildCartExtractionScript function exists
    Steps:
      1. Search for `_ngcontent` in the function
    Expected Result: No occurrences
    Failure Indicators: grep finds _ngcontent
    Evidence: .sisyphus/evidence/task-1-no-ngcontent.txt
  ```

  **Commit**: YES (groups with Task 2, 3, 4)
  - Message: `feat(canteen): auto-extract cart items from Aigens WebView DOM`
  - Files: `mobile/src/screens/CanteenWebViewScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [x] 2. Remove QR decode calls and clean up

  **What to do**:
  - Remove `import { decodeQR } from '../api/qr';` from `CanteenWebViewScreen.tsx` (line 16)
  - In `handleMessage` callback (line 566+), remove the `decodeQR()` call and its `.then/.catch` chain in the `qr_url_result` handler (lines 609-617):
    - Instead of calling `decodeQR(base64Image)`, simply set `setDecodedData(null)` and `setQrCodeData(null)` (we no longer decode)
    - Or better: remove `decodedData` state entirely and simplify the flow
  - In `handleMessage`, also remove the `decodeQR()` call in the `qr_capture_result` handler (lines 658-666)
  - Remove `decodedData` state (`useState<string | null>(null)`) at line 30 if no longer used
  - Remove the decoded data display from the preview modal (lines 768-772) — replace with a simple "QR Code ready for deliverer" message
  - Keep `qrCodeData` in the navigation params but pass `null` (backend schema expects it, even if null)
  - Clean up any unused `console.log` debug statements from previous iterations (keep a few key ones for troubleshooting)

  **Must NOT do**:
  - Do NOT remove the QR image capture flow — only the decode call
  - Do NOT change the `CaptureResult` interface (still needed for QR capture)
  - Do NOT remove `qrCodeImage` state or `capturedImage` state
  - Do NOT modify the WebView component props
  - Do NOT change backend endpoints

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward removal of imports, function calls, and state — no complex logic
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - None needed for a removal task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References**:
  - `mobile/src/screens/CanteenWebViewScreen.tsx:16` — `import { decodeQR } from '../api/qr';` — REMOVE this line
  - `mobile/src/screens/CanteenWebViewScreen.tsx:30` — `const [decodedData, setDecodedData] = useState<string | null>(null);` — REMOVE if unused after cleanup
  - `mobile/src/screens/CanteenWebViewScreen.tsx:609-617` — `decodeQR(base64Image).then(...)` in qr_url_result handler — REMOVE and simplify
  - `mobile/src/screens/CanteenWebViewScreen.tsx:658-666` — `decodeQR(msg.image).then(...)` in qr_capture_result handler — REMOVE and simplify
  - `mobile/src/screens/CanteenWebViewScreen.tsx:768-772` — decoded data display in modal — REPLACE with "QR Code ready for deliverer"

  **API References**:
  - `mobile/src/api/qr.ts` — `decodeQR` function — will become unused after this task (do NOT delete the file, just remove the import)

  **WHY Each Reference Matters**:
  - Line numbers pinpoint exact locations to modify — agent doesn't need to search
  - The `decodeQR` import removal is critical — leaving it causes unused import warnings/errors
  - The modal display change is user-visible — needs to make sense without decoded data

  **Acceptance Criteria**:
  - [ ] `import { decodeQR }` removed from CanteenWebViewScreen.tsx
  - [ ] No calls to `decodeQR()` remain in the file
  - [ ] `decodedData` state removed if unused
  - [ ] Preview modal no longer shows decoded data
  - [ ] `qrCodeData: null` still passed in navigation params
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No decodeQR references remain
    Tool: Bash (grep)
    Preconditions: Task 2 changes applied
    Steps:
      1. Search CanteenWebViewScreen.tsx for `decodeQR`
    Expected Result: Zero occurrences
    Failure Indicators: Any grep match
    Evidence: .sisyphus/evidence/task-2-no-decodeqr.txt

  Scenario: TypeScript compilation succeeds
    Tool: Bash
    Preconditions: Task 2 changes applied
    Steps:
      1. Run `npx tsc --noEmit` from mobile/ directory
    Expected Result: Zero type errors
    Failure Indicators: Any TypeScript error
    Evidence: .sisyphus/evidence/task-2-tsc-check.txt

  Scenario: qrCodeData still passed in navigation
    Tool: Bash (grep)
    Preconditions: Task 2 changes applied
    Steps:
      1. Search handleConfirm function for `qrCodeData`
    Expected Result: `qrCodeData: null` present in navigation params
    Failure Indicators: qrCodeData missing from navigate call
    Evidence: .sisyphus/evidence/task-2-qrcodedata-param.txt
  ```

  **Commit**: YES (groups with Task 1, 3, 4)
  - Message: `feat(canteen): auto-extract cart items from Aigens WebView DOM`
  - Files: `mobile/src/screens/CanteenWebViewScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 3. Wire cart items into capture flow and handleMessage

  **What to do**:
  - Add `injectedJavaScriptBeforeContentLoaded` prop to the `<WebView>` component (line ~737), passing the script from `buildCartExtractionScript()` built in Task 1
  - Add new state: `const [extractedItems, setExtractedItems] = useState<OrderItem[]>([]);`
  - Add a new `cart_items_extracted` message handler in `handleMessage`:
    - Parse the message, extract `items` array and `totalPrice`
    - Call `setExtractedItems(items)` to store them
    - Call `setExtractedPrice(totalPrice)` to update the price
    - Log: `console.log('[Cart Extract] Got items:', items.length)`
  - Modify `buildCaptureScript()` — at the end of the `tryCapture()` function, after the QR URL is found, also read `window.__extractedCartItems` and include it in the `qr_url_result` message:
    - Add `items` and `cartTotal` fields to the JSON message
    - This ensures that when "Done" is pressed, the items are sent with the QR data
  - Update the `CaptureResult` interface to add `items?: {name: string; qty: number; price: number}[]` and `cartTotal?: number`
  - Update `handleConfirm()` to pass `extractedItems` in navigation:
    ```typescript
    navigation.navigate('OrderConfirm', {
      items: extractedItems,
      totalPrice: extractedPrice,
      canteen,
      qrCodeImage: capturedImage,
      qrCodeData: null,
    });
    ```
  - In the `qr_url_result` handler in `handleMessage`, after fetching the QR image, also set items from the message:
    ```typescript
    if (msg.items && msg.items.length > 0) {
      setExtractedItems(msg.items);
    }
    if (msg.cartTotal && msg.cartTotal > 0) {
      setExtractedPrice(msg.cartTotal);
    }
    ```

  **Must NOT do**:
  - Do NOT remove or break the existing QR capture flow
  - Do NOT modify the WebView `source` prop (URL)
  - Do NOT use `any` types
  - Do NOT change the navigation route name or add new routes

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Integration task touching multiple parts of the component — state, message handling, navigation, and injected scripts. Requires careful coordination.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — code changes only, no browser automation

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential within wave)
  - **Blocks**: Task 4, Task 5
  - **Blocked By**: Task 1, Task 2

  **References** (CRITICAL):

  **Pattern References**:
  - `mobile/src/screens/CanteenWebViewScreen.tsx:566-675` — `handleMessage` callback — shows how `qr_url_result` and `qr_capture_result` are handled; follow same pattern for `cart_items_extracted`
  - `mobile/src/screens/CanteenWebViewScreen.tsx:737-753` — `<WebView>` component JSX — add `injectedJavaScriptBeforeContentLoaded` prop here (note: prop exists on react-native-webview, no new dependency needed)
  - `mobile/src/screens/CanteenWebViewScreen.tsx:708-717` — `handleConfirm` function — modify to pass `extractedItems` instead of `items: []`
  - `mobile/src/screens/CanteenWebViewScreen.tsx:41-47` — `CaptureResult` interface — add `items` and `cartTotal` fields
  - `mobile/src/screens/CanteenWebViewScreen.tsx:26-34` — state declarations — add `extractedItems` state here

  **Type References**:
  - `mobile/src/types/index.ts:3-7` — `OrderItem` interface — import and use for `extractedItems` state typing
  - `mobile/src/types/index.ts:107-112` — `RootStackParamList.OrderConfirm` — `items: OrderItem[]` is already in the params type

  **WHY Each Reference Matters**:
  - `handleMessage` shows exact pattern for parsing WebView messages — new handler must match
  - `WebView` JSX shows existing props — `injectedJavaScriptBeforeContentLoaded` is a different prop from `injectedJavaScript` (runs before page loads)
  - `handleConfirm` is where navigation happens — must pass real items instead of empty array
  - `CaptureResult` interface must be extended for type safety
  - `OrderItem` type ensures items match backend expectations

  **Acceptance Criteria**:
  - [ ] `injectedJavaScriptBeforeContentLoaded` prop added to WebView
  - [ ] `extractedItems` state declared with `OrderItem[]` type
  - [ ] `cart_items_extracted` message type handled in `handleMessage`
  - [ ] `CaptureResult` interface has `items` and `cartTotal` fields
  - [ ] `handleConfirm` passes `extractedItems` to OrderConfirm navigation
  - [ ] `qr_url_result` handler extracts items from message and sets state
  - [ ] `buildCaptureScript` includes `window.__extractedCartItems` in QR result message
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript compilation succeeds after integration
    Tool: Bash
    Preconditions: Tasks 1, 2, and 3 changes applied
    Steps:
      1. Run `npx tsc --noEmit` from mobile/ directory
    Expected Result: Zero type errors
    Failure Indicators: Any TypeScript error
    Evidence: .sisyphus/evidence/task-3-tsc-check.txt

  Scenario: handleConfirm passes extractedItems
    Tool: Bash (grep)
    Preconditions: Task 3 changes applied
    Steps:
      1. Search handleConfirm for `items: extractedItems`
    Expected Result: Found in navigation params
    Failure Indicators: Still shows `items: []`
    Evidence: .sisyphus/evidence/task-3-items-passed.txt

  Scenario: WebView has injectedJavaScriptBeforeContentLoaded prop
    Tool: Bash (grep)
    Preconditions: Task 3 changes applied
    Steps:
      1. Search CanteenWebViewScreen.tsx for `injectedJavaScriptBeforeContentLoaded`
    Expected Result: Prop present on WebView component
    Failure Indicators: Not found
    Evidence: .sisyphus/evidence/task-3-injected-prop.txt

  Scenario: CaptureResult has items field
    Tool: Bash (grep)
    Preconditions: Task 3 changes applied
    Steps:
      1. Search CaptureResult interface for `items`
    Expected Result: `items?: {name: string; qty: number; price: number}[]` or similar
    Failure Indicators: items field missing from interface
    Evidence: .sisyphus/evidence/task-3-capture-result-items.txt
  ```

  **Commit**: YES (groups with Tasks 1, 2, 4)
  - Message: `feat(canteen): auto-extract cart items from Aigens WebView DOM`
  - Files: `mobile/src/screens/CanteenWebViewScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [x] 4. Pre-populate OrderConfirmScreen with extracted items

  **What to do**:
  - Modify the initial `items` state (line 29) to use items from route params instead of a blank item:
    ```typescript
    const passedItems = route.params.items;
    const [items, setItems] = useState<OrderItem[]>(
      passedItems && passedItems.length > 0
        ? passedItems
        : [{ name: '', qty: 1, price: passedPrice > 0 ? passedPrice : 0 }]
    );
    ```
  - This ensures:
    - If items were extracted from DOM (non-empty array), they pre-populate the form
    - If no items were extracted (empty array or undefined), fallback to the current manual-entry default
  - The user can still edit, add, or remove items after pre-population (existing `updateItem`, `addItem`, `removeItem` functions work unchanged)
  - No other changes needed to this screen — the existing `totalPrice` calculation (`items.reduce(...)`) will automatically compute from the pre-populated items

  **Must NOT do**:
  - Do NOT disable manual editing of pre-populated items
  - Do NOT change the `handleSubmit` function
  - Do NOT change the `CreateOrderPayload` shape
  - Do NOT remove the "+ Add Item" button
  - Do NOT change the delivery hall or note sections

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single state initialization change — ~5 lines modified
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - None needed for a small state init change

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 3 for items to be passed)
  - **Parallel Group**: Wave 2 (after Task 3)
  - **Blocks**: Task 5
  - **Blocked By**: Task 3

  **References** (CRITICAL):

  **Pattern References**:
  - `mobile/src/screens/OrderConfirmScreen.tsx:21` — `const { canteen, qrCodeImage, qrCodeData, totalPrice: passedPrice } = route.params;` — destructure `items` from here (already typed as `OrderItem[]` in route params)
  - `mobile/src/screens/OrderConfirmScreen.tsx:29` — `const [items, setItems] = useState<OrderItem[]>([{ name: '', qty: 1, price: passedPrice > 0 ? passedPrice : 0 }]);` — THIS IS THE LINE TO MODIFY
  - `mobile/src/screens/OrderConfirmScreen.tsx:34` — `const totalPrice = items.reduce(...)` — this auto-calculates from items, no change needed
  - `mobile/src/screens/OrderConfirmScreen.tsx:36-55` — `updateItem`, `removeItem`, `addItem` functions — these work on any items array, no change needed

  **Type References**:
  - `mobile/src/types/index.ts:107-112` — `RootStackParamList.OrderConfirm` — `items: OrderItem[]` already in params type

  **WHY Each Reference Matters**:
  - Line 21 shows how to destructure route params — add `items` to the destructuring (note: it might need renaming to avoid conflict with state)
  - Line 29 is the exact line to modify — conditional initialization based on passed items
  - Lines 34-55 confirm no downstream changes needed — existing logic works with any items array

  **Acceptance Criteria**:
  - [ ] `items` destructured from `route.params` (or accessed via `route.params.items`)
  - [ ] State initialized with passed items when non-empty
  - [ ] State falls back to empty item `[{ name: '', qty: 1, price: 0 }]` when no items passed
  - [ ] User can still manually edit, add, remove items
  - [ ] `totalPrice` auto-calculates from pre-populated items
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript compilation succeeds
    Tool: Bash
    Preconditions: Task 4 changes applied
    Steps:
      1. Run `npx tsc --noEmit` from mobile/ directory
    Expected Result: Zero type errors
    Failure Indicators: Any TypeScript error
    Evidence: .sisyphus/evidence/task-4-tsc-check.txt

  Scenario: Items state uses route params
    Tool: Bash (grep)
    Preconditions: Task 4 changes applied
    Steps:
      1. Search OrderConfirmScreen.tsx for route.params.items or passedItems
      2. Verify conditional initialization exists
    Expected Result: Items initialized from route params with fallback
    Failure Indicators: Still hardcoded to `[{ name: '', qty: 1, price: ... }]` without checking params
    Evidence: .sisyphus/evidence/task-4-items-init.txt

  Scenario: Fallback to empty item when no items passed
    Tool: Bash (grep)
    Preconditions: Task 4 changes applied
    Steps:
      1. Search for the fallback empty item pattern
    Expected Result: Conditional with fallback `{ name: '', qty: 1, price: 0 }` or similar
    Failure Indicators: No fallback — would crash with undefined items
    Evidence: .sisyphus/evidence/task-4-fallback.txt
  ```

  **Commit**: YES (groups with Tasks 1, 2, 3)
  - Message: `feat(canteen): auto-extract cart items from Aigens WebView DOM`
  - Files: `mobile/src/screens/OrderConfirmScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [x] 5. Final type-check and integration verification

  **What to do**:
  - Run `npx tsc --noEmit` from `mobile/` directory and fix any type errors
  - Verify the full data flow: `buildCartExtractionScript()` → WebView injection → `handleMessage` (cart_items_extracted) → `extractedItems` state → `handleConfirm` → OrderConfirmScreen route params → items state initialization
  - Verify no unused imports remain (especially `decodeQR`)
  - Verify no `any` types were introduced
  - Read through the final state of both files to confirm coherence
  - Create the git commit with all changes from Tasks 1-4

  **Must NOT do**:
  - Do NOT add new features beyond what Tasks 1-4 specified
  - Do NOT refactor unrelated code
  - Do NOT push to remote (only commit locally)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification and commit task — no complex logic
  - **Skills**: `['git-master']`
    - `git-master`: Needed for proper commit creation
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser testing needed for type-check

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs all prior tasks completed)
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: F1, F2, F3
  - **Blocked By**: Task 3, Task 4

  **References** (CRITICAL):

  **Files to verify**:
  - `mobile/src/screens/CanteenWebViewScreen.tsx` — All Task 1-3 changes
  - `mobile/src/screens/OrderConfirmScreen.tsx` — Task 4 changes
  - `mobile/src/types/index.ts` — Should NOT be modified (existing types sufficient)
  - `mobile/src/api/qr.ts` — Should still exist (not deleted), just no longer imported in WebView screen

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` passes with zero errors
  - [ ] No unused imports in changed files
  - [ ] No `any` types in changed files
  - [ ] Git commit created with all changes
  - [ ] Commit message: `feat(canteen): auto-extract cart items from Aigens WebView DOM`

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full type-check passes
    Tool: Bash
    Preconditions: All Tasks 1-4 complete
    Steps:
      1. Run `npx tsc --noEmit` from mobile/ directory
    Expected Result: Exit code 0, no errors
    Failure Indicators: Any type error output
    Evidence: .sisyphus/evidence/task-5-tsc-final.txt

  Scenario: No any types in changed files
    Tool: Bash (grep)
    Preconditions: All tasks complete
    Steps:
      1. Search CanteenWebViewScreen.tsx for `: any` or `as any`
      2. Search OrderConfirmScreen.tsx for `: any` or `as any`
    Expected Result: No matches (except in existing error handling patterns if any)
    Failure Indicators: New `any` type usage
    Evidence: .sisyphus/evidence/task-5-no-any.txt

  Scenario: No unused imports
    Tool: Bash (grep)
    Preconditions: All tasks complete
    Steps:
      1. Verify `decodeQR` not imported in CanteenWebViewScreen.tsx
      2. Verify all imports in both files are used
    Expected Result: All imports used, no dead imports
    Failure Indicators: Unused import found
    Evidence: .sisyphus/evidence/task-5-imports-clean.txt

  Scenario: Git commit created
    Tool: Bash
    Preconditions: All changes verified
    Steps:
      1. Run `git add mobile/src/screens/CanteenWebViewScreen.tsx mobile/src/screens/OrderConfirmScreen.tsx`
      2. Run `git commit -m "feat(canteen): auto-extract cart items from Aigens WebView DOM"`
      3. Verify commit exists with `git log -1`
    Expected Result: Commit created successfully
    Failure Indicators: Commit fails
    Evidence: .sisyphus/evidence/task-5-git-commit.txt
  ```

  **Commit**: YES (final commit for all tasks)
  - Message: `feat(canteen): auto-extract cart items from Aigens WebView DOM`
  - Files: `mobile/src/screens/CanteenWebViewScreen.tsx`, `mobile/src/screens/OrderConfirmScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 3 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle` (COMPLETE: Re-verified after fix)
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, check code). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high` (APPROVED: Zero issues)
  Run `npx tsc --noEmit`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod (acceptable in debug but flag excessive), commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `TSC [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Scope Fidelity Check** — `deep` (COMPLETE: Re-verified after fix)
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **After Wave 2**: `feat(canteen): auto-extract cart items from Aigens WebView DOM` — CanteenWebViewScreen.tsx, OrderConfirmScreen.tsx

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit  # Expected: no errors
```

### Final Checklist
- [x] Cart items scraped from `.cart-item-wrapper` elements
- [x] Items include name, quantity, price for both main items and sub-items
- [x] Total price extracted from `.div-prices .col-right h5`
- [x] OrderConfirmScreen pre-populated with extracted items
- [x] QR screenshot still captured and passed through
- [x] QR decode call removed
- [x] `npx tsc --noEmit` passes
- [x] User can still manually edit items after auto-population
