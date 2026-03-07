# Fix 5 Post-Testing Issues: QR Capture, Back Button, Header Padding

## TL;DR

> **Quick Summary**: Fix 5 issues reported after testing the Order system — rewrite QR capture to use on-demand JS injection with preview overlay, add backend QR decode endpoint, add back button to DelivererQueueScreen, fix header padding on OrderDetailScreen, and auto-fill price on OrderConfirmScreen.
> 
> **Deliverables**:
> - Backend `POST /qr/decode` endpoint (schema + router + registration)
> - Frontend QR API client (`mobile/src/api/qr.ts`)
> - Rewritten `CanteenWebViewScreen` with on-demand capture + preview overlay
> - Back button on `DelivererQueueScreen`
> - Header padding fix on `OrderDetailScreen`
> - Price auto-fill on `OrderConfirmScreen`
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves + final verification
> **Critical Path**: Task 1 → Task 5 → Task 6 → F1

---

## Context

### Original Request
User tested the Order Creation & Management system and reported 5 issues:
1. QR code data fetching from the WebView failed — selectors don't match the actual page
2. The Done button should trigger QR capture (not passive MutationObserver)
3. Need QR screenshot/capture capability (base64 image + decoded data)
4. No back button on the DelivererQueueScreen
5. OrderDetailScreen header title and back button positioned too high

### Interview Summary
**Key Discussions**:
- JS injection is the capture method (NOT `react-native-view-shot`)
- Backend QR decode via new `POST /qr/decode` endpoint (existing `qr_service.decode_qr_from_base64()` has no router)
- Extract price from page text and auto-fill in OrderConfirmScreen
- Preview overlay (Modal) with Retry/Confirm before navigating
- Alert + retry on capture failure (stay on WebView)
- Both QR image (base64) AND decoded data are needed
- Chat system deferred — just capture the image for now
- Only LG1 canteen for now

**Research Findings**:
- WebView `injectJavaScript()` is the correct method for on-demand injection
- Results come back via `onMessage` / `window.ReactNativeWebView.postMessage()`
- Canvas: `canvas.toDataURL('image/png')` for canvas-based QR
- Image: Draw img onto temp canvas, then `toDataURL()` — cross-origin may fail (need try/catch)
- QR page structure: dark red header → "等待付款中" title → "$ 30" price → large QR code image in white card

### Metis Review
**Identified Gaps** (addressed):
- Add `capturing` state to prevent double-tap on Done button
- Add retry logic inside injected JS (3 attempts, 1s apart)
- Handle case where Done is pressed before page loads
- Backend should return 200 with `decoded_data: null` on decode failure (not 4xx)
- On Retry in preview overlay, re-inject JS — do NOT reload the WebView page
- Price extraction is a convenience, not a requirement — if it fails, price stays 0

---

## Work Objectives

### Core Objective
Fix all 5 post-testing issues to make the QR capture flow functional and fix UI inconsistencies.

### Concrete Deliverables
- `backend/schemas/qr.py` — QR decode request/response schemas
- `backend/routers/qr.py` — `POST /qr/decode` endpoint
- `backend/main.py` — QR router registered
- `mobile/src/api/qr.ts` — Frontend QR decode API client
- `mobile/src/screens/CanteenWebViewScreen.tsx` — Rewritten with on-demand capture + preview
- `mobile/src/screens/OrderConfirmScreen.tsx` — Price auto-fill from nav params
- `mobile/src/screens/DelivererQueueScreen.tsx` — Back button added
- `mobile/src/screens/OrderDetailScreen.tsx` — Header padding fixed

### Definition of Done
- [ ] `npx tsc --noEmit` passes clean in `mobile/`
- [ ] Backend starts without import errors (`uvicorn main:app`)
- [ ] `POST /qr/decode` returns 403 for unauthenticated requests (not 404)
- [ ] DelivererQueueScreen has a back button that calls `navigation.goBack()`
- [ ] OrderDetailScreen header has `paddingTop: 60` (not `paddingVertical: 12`)
- [ ] CanteenWebViewScreen uses on-demand `injectJavaScript()` (no `injectedJavaScript` prop)
- [ ] OrderConfirmScreen destructures `totalPrice` from route.params

### Must Have
- On-demand JS injection triggered by Done button (not passive MutationObserver)
- Preview overlay (Modal) showing captured QR + Retry/Confirm buttons
- Backend QR decode endpoint with auth requirement
- Broad selector strategy: canvas → img → any large image (>100x100)
- `capturing` state to prevent double-tap
- Retry logic inside injected JS (3 attempts, 1s delay)
- Both QR image (base64) AND decoded data passed to OrderConfirm
- Price extraction from page text (`$ XX` format)

### Must NOT Have (Guardrails)
- DO NOT add `react-native-view-shot` or any new npm dependencies
- DO NOT modify `backend/services/qr_service.py` — it is correct as-is
- DO NOT modify `RootStackParamList` in `types/index.ts` — params already support all needed data
- DO NOT add SVG QR support — over-engineering for one canteen
- DO NOT add WebView navigation controls (forward, back, refresh)
- DO NOT add loading spinners or extra UI to DelivererQueueScreen beyond the back button
- DO NOT restructure OrderDetailScreen beyond the padding fix
- DO NOT use `any` types, `@ts-ignore`, `as any`, or bare `except:`
- DO NOT add chat/messaging features (deferred)
- DO NOT modify the injected JS to alter the food ordering website DOM — read-only capture
- DO NOT add error boundary or crash handling — simple try/catch + Alert is sufficient
- DO NOT invoke `pytest`, `jest`, `ruff`, `eslint`, `prettier` — they don't exist
- DO NOT add `from typing import List, Optional` — use `str | None`, `list[str]`

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (no pytest, jest, or any test framework)
- **Automated tests**: None
- **Framework**: None
- **Verification method**: `npx tsc --noEmit` for frontend, `curl` for backend endpoints, `grep` for code content

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Frontend**: Use Bash (`npx tsc --noEmit`) — Type-check all TypeScript
- **Content**: Use Grep — Verify code patterns exist or don't exist

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — all independent, 4 parallel):
├── Task 1: Backend QR decode endpoint [quick]
├── Task 2: Frontend QR API client [quick]
├── Task 3: DelivererQueueScreen back button [quick]
└── Task 4: OrderDetailScreen header padding [quick]

Wave 2 (After Wave 1 — core rewrite):
└── Task 5: Rewrite CanteenWebViewScreen [deep + frontend-ui-ux]

Wave 3 (After Wave 2 — dependent fix):
└── Task 6: OrderConfirmScreen price auto-fill [quick]

Wave FINAL (After ALL tasks — verification):
├── F1: Plan compliance audit [quick]
├── F2: Code quality review [quick]
├── F3: Full integration QA [quick]
└── F4: Scope fidelity check [quick]

Critical Path: Task 1 → Task 5 → Task 6 → F1-F4
Parallel Speedup: ~60% faster than sequential (4 tasks in Wave 1)
Max Concurrent: 4 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 5 | 1 |
| 2 | — | 5 | 1 |
| 3 | — | — | 1 |
| 4 | — | — | 1 |
| 5 | 1, 2 | 6 | 2 |
| 6 | 5 | — | 3 |
| F1-F4 | 1-6 | — | FINAL |

### Agent Dispatch Summary

- **Wave 1**: **4 tasks** — T1 → `quick`, T2 → `quick`, T3 → `quick`, T4 → `quick`
- **Wave 2**: **1 task** — T5 → `deep` + skills: [`frontend-ui-ux`]
- **Wave 3**: **1 task** — T6 → `quick`
- **Wave FINAL**: **4 tasks** — F1-F4 → `quick`

---

## TODOs


> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

- [x] 1. Backend QR Decode Endpoint

  **What to do**:
  - Create `backend/schemas/qr.py` with two Pydantic models:
    - `QRDecodeRequest(BaseModel)` with field `image: str`
    - `QRDecodeResponse(BaseModel)` with field `decoded_data: str | None` and `model_config = {"from_attributes": True}`
  - Create `backend/routers/qr.py` with:
    - `router = APIRouter(prefix="/qr", tags=["qr"])`
    - `POST /decode` endpoint that:
      - Requires auth via `Depends(get_current_user)` (import from `middleware.auth_middleware`)
      - Accepts `QRDecodeRequest` body
      - Calls `qr_service.decode_qr_from_base64(request.image)`
      - Returns `QRDecodeResponse(decoded_data=result)` — always 200, `decoded_data` is `None` if decode fails
  - Modify `backend/main.py`:
    - Change line 7 from `from routers import auth, users, orders, credits` to `from routers import auth, users, orders, credits, qr`
    - Add `app.include_router(qr.router)` after line 31

  **Must NOT do**:
  - DO NOT modify `backend/services/qr_service.py`
  - DO NOT use `from typing import Optional` — use `str | None`
  - DO NOT use bare `except:` — use `except Exception:`
  - DO NOT return 4xx on decode failure — return 200 with `decoded_data: None`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Three small files with well-defined patterns to follow. No complexity.
  - **Skills**: []
    - No frontend, browser, or git skills needed.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Backend-only task
    - `playwright`: No browser testing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `backend/routers/auth.py` — Router structure pattern: `APIRouter(prefix=..., tags=[...])`, endpoint function with `Depends(get_current_user)`, `Depends(get_db)`
  - `backend/routers/credits.py` — Simpler router example (only 2 endpoints, 39 lines)
  - `backend/schemas/auth.py` — Schema pattern: `BaseModel`, field types, `model_config`
  - `backend/schemas/credit.py` — Simple schema example (28 lines)

  **API/Type References**:
  - `backend/services/qr_service.py:8` — Function signature: `decode_qr_from_base64(image_b64: str) -> str | None`
  - `backend/middleware/auth_middleware.py` — `get_current_user` dependency to import
  - `backend/main.py:7` — Current import line to modify: `from routers import auth, users, orders, credits`
  - `backend/main.py:28-31` — Current router registrations to follow pattern

  **WHY Each Reference Matters**:
  - `routers/auth.py`: Copy the exact router setup pattern (prefix, tags, dependency injection)
  - `services/qr_service.py:8`: This is the EXACT function to call — do not wrap or modify it
  - `main.py:7`: This is the EXACT line that needs the `qr` import added

  **Acceptance Criteria**:

  ```
  Scenario: Backend QR decode endpoint exists and requires auth
    Tool: Bash (curl)
    Preconditions: Backend running via `uvicorn main:app` from `backend/` dir
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/qr/decode -H "Content-Type: application/json" -d '{"image":"test"}'
      2. Assert HTTP status code is 403 (not 404, not 405)
    Expected Result: 403 Forbidden (auth required)
    Failure Indicators: 404 (router not registered), 405 (wrong method), 500 (import error)
    Evidence: .sisyphus/evidence/task-1-endpoint-exists.txt

  Scenario: Backend starts without import errors
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd backend && python -c "from routers.qr import router; print('OK')"
      2. Assert output contains 'OK'
    Expected Result: Import succeeds, prints OK
    Failure Indicators: ImportError, ModuleNotFoundError
    Evidence: .sisyphus/evidence/task-1-import-check.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `fix: add QR decode endpoint, API client, back button, header padding`
  - Files: `backend/schemas/qr.py`, `backend/routers/qr.py`, `backend/main.py`
  - Pre-commit: Backend starts cleanly

- [x] 2. Frontend QR API Client

  **What to do**:
  - Create `mobile/src/api/qr.ts` with:
    - Import `client` from `./client`
    - Export async function `decodeQR(imageBase64: string): Promise<{ decoded_data: string | null }>` that:
      - POSTs to `/qr/decode` with body `{ image: imageBase64 }`
      - Returns `data` from response (typed as `{ decoded_data: string | null }`)
  - File should be ~10-15 lines, following the exact pattern from `mobile/src/api/orders.ts`

  **Must NOT do**:
  - DO NOT use `any` type — use explicit `{ decoded_data: string | null }` return type
  - DO NOT add error handling in this file — let the caller handle errors (matching orders.ts pattern)
  - DO NOT create a class or complex abstraction — single exported function

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, ~15 lines, follows existing pattern exactly.
  - **Skills**: []
    - Pure TypeScript utility, no UI or browser needed.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not a UI task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `mobile/src/api/orders.ts` — EXACT pattern to follow: import client, export async function, `client.post<Type>(path, body)`, return `data`
  - `mobile/src/api/credits.ts` — Simpler example (20 lines, 2 functions)

  **API/Type References**:
  - `mobile/src/api/client.ts` — The `client` Axios instance to import (23 lines, has Bearer interceptor)

  **WHY Each Reference Matters**:
  - `orders.ts`: This is the EXACT pattern — copy the function structure, change the path and types
  - `client.ts`: This is what you import — `import client from './client'`

  **Acceptance Criteria**:

  ```
  Scenario: QR API client file exists with correct export
    Tool: Bash (grep)
    Preconditions: File created
    Steps:
      1. grep "decodeQR" mobile/src/api/qr.ts
      2. grep "decoded_data" mobile/src/api/qr.ts
      3. Assert both patterns found
    Expected Result: Function name and return type present in file
    Failure Indicators: File missing, wrong function name, missing return type
    Evidence: .sisyphus/evidence/task-2-api-client.txt

  Scenario: TypeScript type check passes
    Tool: Bash
    Preconditions: File created
    Steps:
      1. cd mobile && npx tsc --noEmit
      2. Assert exit code 0
    Expected Result: No type errors
    Failure Indicators: Type errors in qr.ts or files importing it
    Evidence: .sisyphus/evidence/task-2-tsc.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `fix: add QR decode endpoint, API client, back button, header padding`
  - Files: `mobile/src/api/qr.ts`
  - Pre-commit: `npx tsc --noEmit` passes


- [x] 3. DelivererQueueScreen Back Button

  **What to do**:
  - In `mobile/src/screens/DelivererQueueScreen.tsx`:
    - Add `TouchableOpacity` to the import from `react-native` (line 2)
    - Modify the header section (lines 55-58) to include a back button:
      - Change header `View` to use `flexDirection: 'row'` and `alignItems: 'center'`
      - Add `<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Text style={[styles.backText, { color: colors.text }]}>←</Text></TouchableOpacity>` BEFORE the title
    - Add `backButton: { padding: 8 }` and `backText: { fontSize: 24, fontWeight: 'bold' }` to StyleSheet
  - Total change: ~8 lines across import + JSX + styles

  **Must NOT do**:
  - DO NOT add any other UI elements — ONLY the back button
  - DO NOT change navigation logic, loading state, or FlatList
  - DO NOT add loading spinners, skeleton screens, or extra features

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: ~8 lines across one file. Trivial copy-paste pattern.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Too trivial

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `mobile/src/screens/CanteenWebViewScreen.tsx:100-102` — EXACT back button pattern to copy: `<TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}><Text style={[styles.headerButtonText, { color: colors.text }]}>←</Text></TouchableOpacity>`
  - `mobile/src/screens/OrderDetailScreen.tsx` — Another screen with `←` back button in header

  **API/Type References**:
  - `mobile/src/screens/DelivererQueueScreen.tsx:12` — `navigation` is already destructured from Props — `.goBack()` is available

  **WHY Each Reference Matters**:
  - `CanteenWebViewScreen:100-102`: This is the EXACT JSX + styling pattern to replicate

  **Acceptance Criteria**:

  ```
  Scenario: Back button exists and uses navigation.goBack
    Tool: Bash (grep)
    Preconditions: File modified
    Steps:
      1. grep "goBack" mobile/src/screens/DelivererQueueScreen.tsx
      2. grep "TouchableOpacity" mobile/src/screens/DelivererQueueScreen.tsx
      3. Assert both patterns found
    Expected Result: goBack call exists inside a TouchableOpacity
    Failure Indicators: No goBack, no TouchableOpacity import
    Evidence: .sisyphus/evidence/task-3-back-button.txt

  Scenario: TypeScript type check passes
    Tool: Bash
    Preconditions: File modified
    Steps:
      1. cd mobile && npx tsc --noEmit
      2. Assert exit code 0
    Expected Result: No type errors
    Failure Indicators: Missing import, wrong prop types
    Evidence: .sisyphus/evidence/task-3-tsc.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `fix: add QR decode endpoint, API client, back button, header padding`
  - Files: `mobile/src/screens/DelivererQueueScreen.tsx`
  - Pre-commit: `npx tsc --noEmit` passes

- [x] 4. OrderDetailScreen Header Padding Fix

  **What to do**:
  - In `mobile/src/screens/OrderDetailScreen.tsx`:
    - Line 322: Change `paddingVertical: 12,` to `paddingTop: 60, paddingBottom: 12,`
  - That is the ONLY change. ONE line becomes TWO lines.

  **Must NOT do**:
  - DO NOT change anything else in this file
  - DO NOT restructure the header layout
  - DO NOT modify line 341 (`paddingVertical: 12` in `actionBar` style — that’s a DIFFERENT section)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 1-line change.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - All: Too trivial for any skill

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `mobile/src/screens/DelivererQueueScreen.tsx:100` — Uses `paddingTop: 60` for its header — same value to match

  **API/Type References**:
  - `mobile/src/screens/OrderDetailScreen.tsx:322` — The EXACT line to change: `paddingVertical: 12`
  - `mobile/src/screens/OrderDetailScreen.tsx:341` — This is `actionBar` style — DO NOT change this one

  **WHY Each Reference Matters**:
  - `Line 322`: This is the header `container` padding that positions the title too high
  - `Line 341`: This is the action bar — explicitly called out so executor doesn’t change the wrong line

  **Acceptance Criteria**:

  ```
  Scenario: Header padding fixed to paddingTop 60
    Tool: Bash (grep)
    Preconditions: File modified
    Steps:
      1. grep "paddingTop: 60" mobile/src/screens/OrderDetailScreen.tsx
      2. Assert match found
      3. grep -n "paddingVertical: 12" mobile/src/screens/OrderDetailScreen.tsx
      4. Assert line 322 does NOT appear (line 341 may still match — that’s actionBar, OK)
    Expected Result: paddingTop: 60 on header, paddingVertical: 12 only on actionBar (line 341)
    Failure Indicators: paddingVertical: 12 still on line 322, paddingTop missing
    Evidence: .sisyphus/evidence/task-4-header-padding.txt

  Scenario: TypeScript type check passes
    Tool: Bash
    Preconditions: File modified
    Steps:
      1. cd mobile && npx tsc --noEmit
      2. Assert exit code 0
    Expected Result: No type errors
    Evidence: .sisyphus/evidence/task-4-tsc.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `fix: add QR decode endpoint, API client, back button, header padding`
  - Files: `mobile/src/screens/OrderDetailScreen.tsx`
  - Pre-commit: `npx tsc --noEmit` passes


- [x] 5. Rewrite CanteenWebViewScreen QR Capture

  **What to do**:
  - MAJOR rewrite of `mobile/src/screens/CanteenWebViewScreen.tsx` (currently 169 lines).
  - **Remove passive capture**:
    - Delete the `INJECTED_JS` constant (lines 30-69)
    - Remove `injectedJavaScript={INJECTED_JS}` prop from WebView (line 126)
  - **Add new state variables** (after existing `qrCodeData` state on line 23):
    - `const [capturing, setCapturing] = useState(false);`
    - `const [capturedImage, setCapturedImage] = useState<string | null>(null);`
    - `const [decodedData, setDecodedData] = useState<string | null>(null);`
    - `const [extractedPrice, setExtractedPrice] = useState(0);`
    - `const [showPreview, setShowPreview] = useState(false);`
    - `const [pageLoaded, setPageLoaded] = useState(false);`
  - **Add `onLoadEnd` handler for WebView**:
    - Set `pageLoaded = true` when WebView finishes loading
    - Wire to WebView via `onLoadEnd={() => setPageLoaded(true)}`
  - **Write on-demand JS injection function** `buildCaptureScript(): string`:
    - Returns a self-executing IIFE string that:
    - Attempt 1: Find `<canvas>` elements >100x100px, call `canvas.toDataURL('image/png')` (wrapped in try/catch for cross-origin taint)
    - Attempt 2: Find `<img>` elements >100x100px, draw onto temp canvas via `document.createElement('canvas')`, call `toDataURL()` (wrapped in try/catch)
    - Attempt 3: Find ANY element with `background-image` containing base64 data URL
    - Price extraction: Search all text nodes for `$` followed by a number (regex: `/\$\s*(\d+(?:\.\d{1,2})?)/`), capture first match
    - On success: `window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'qr_capture_result', image: dataUrl, price: priceNum }))`
    - On failure (no image found): `window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'qr_capture_result', image: null, price: 0 }))`
    - Built-in retry: If first scan finds nothing, `setTimeout` 1s and try again, up to 3 attempts total
    - End with `true;` (required by react-native-webview)
  - **Rewrite `handleDone` function**:
    - Guard: if `capturing` is true, return early (prevent double-tap)
    - Guard: if `!pageLoaded`, show `Alert.alert('Please Wait', 'The page is still loading.')` and return
    - Set `capturing = true`
    - Call `webViewRef.current?.injectJavaScript(buildCaptureScript())`
  - **Rewrite `handleMessage` function**:
    - Parse JSON, check for `type === 'qr_capture_result'`
    - If `msg.image` is null: `Alert.alert('Capture Failed', 'Could not find QR code. Make sure the QR code is visible on screen.')`, reset `capturing = false`
    - If `msg.image` exists:
      - Set `capturedImage = msg.image`
      - Set `extractedPrice = msg.price || 0`
      - Call `decodeQR(msg.image)` from `../api/qr` in try/catch
        - On success: `setDecodedData(result.decoded_data)`
        - On error: `setDecodedData(null)` (decode failure is non-fatal)
      - Set `showPreview = true`
      - Set `capturing = false`
  - **Add preview overlay Modal**:
    - `<Modal visible={showPreview} transparent animationType="fade">`
    - Dark semi-transparent backdrop
    - White/dark card (respect isDark theme) centered on screen containing:
      - Title: "QR Code Captured"
      - `<Image source={{ uri: capturedImage }} style={{ width: 200, height: 200 }} resizeMode="contain" />` showing the captured QR
      - If `decodedData`: `<Text>Data: {decodedData}</Text>`
      - If `extractedPrice > 0`: `<Text>Price: $ {extractedPrice}</Text>`
      - Two buttons side by side:
        - **Retry**: Closes modal (`setShowPreview(false)`), resets `capturedImage/decodedData/extractedPrice` to null/0, allows re-capture
        - **Confirm**: Navigates to OrderConfirm with `{ canteen, qrCodeImage: capturedImage, qrCodeData: decodedData, totalPrice: extractedPrice, items: [] }`
    - Style the card with rounded corners, padding, shadow — follow existing card patterns
  - **Add imports**: `Modal`, `Image` from `react-native`; `decodeQR` from `../api/qr`
  - **Keep existing**: `SafeAreaView`, `StatusBar`, header with back button + canteen title, WebView with `ref`, `source`, `javaScriptEnabled`, `domStorageEnabled`, `startInLoadingState`, `renderLoading`, `onMessage`, `style`

  **Must NOT do**:
  - DO NOT add `react-native-view-shot` or any new dependencies
  - DO NOT modify the food ordering website DOM (read-only capture)
  - DO NOT add WebView navigation controls (forward, back, refresh)
  - DO NOT add `any` types — type the message payload
  - DO NOT use `eval()` or `document.write()` in the injected JS
  - DO NOT reload the WebView on retry — just re-inject JS
  - DO NOT modify `RootStackParamList` in `types/index.ts`

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex multi-concern rewrite: JS injection logic, async API calls, Modal overlay UI, state machine (idle/capturing/preview), error handling with retries.
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Preview overlay Modal needs polished design — centered card, theme-aware colors, image display, button layout.
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not a browser testing task — this is WebView component code
    - `dev-browser`: Not browser automation — this is React Native

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (solo — after Wave 1)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1 (backend endpoint must exist), Task 2 (API client must exist)

  **References**:

  **Pattern References** (existing code to follow):
  - `mobile/src/screens/CanteenWebViewScreen.tsx` (CURRENT FILE) — Keep the SafeAreaView + header + WebView structure. Remove lines 30-69 (INJECTED_JS) and line 126 (injectedJavaScript prop). Keep lines 95-131 (JSX structure) but modify.
  - `mobile/src/screens/OrderConfirmScreen.tsx:95-140` — Card styling pattern with dark/light mode
  - `mobile/src/screens/DashboardScreen.tsx` — Modal usage example if any; otherwise use standard React Native Modal pattern

  **API/Type References**:
  - `mobile/src/api/qr.ts` (Task 2 creates this) — `decodeQR(imageBase64: string): Promise<{ decoded_data: string | null }>` — import and call after capture
  - `mobile/src/types/index.ts:74-80` — `OrderConfirm` params in `RootStackParamList`: `{ items: OrderItem[], totalPrice: number, canteen: string, qrCodeImage: string | null, qrCodeData: string | null }`
  - `react-native-webview` — WebView ref methods: `injectJavaScript(script: string): void`, `onMessage` handler

  **External References**:
  - react-native-webview docs: `injectJavaScript()` runs JS in WebView context, results come via `onMessage` / `window.ReactNativeWebView.postMessage()`
  - Canvas API: `canvas.toDataURL('image/png')` returns base64 data URL
  - Cross-origin: `canvas.toDataURL()` throws SecurityError on tainted canvas — must wrap in try/catch

  **WHY Each Reference Matters**:
  - Current file structure: Preserve the header/WebView layout, only rewrite capture logic
  - `api/qr.ts`: This is the decode API to call after image capture
  - `types/index.ts:74-80`: These are the EXACT params the navigation expects — must match
  - WebView docs: Confirms `injectJavaScript` returns void, results come via message

  **Acceptance Criteria**:

  ```
  Scenario: Passive injection removed
    Tool: Bash (grep)
    Preconditions: File rewritten
    Steps:
      1. grep "injectedJavaScript=" mobile/src/screens/CanteenWebViewScreen.tsx
      2. Assert NO match found
    Expected Result: injectedJavaScript prop is gone
    Failure Indicators: Prop still exists on WebView
    Evidence: .sisyphus/evidence/task-5-passive-removed.txt

  Scenario: On-demand injection present
    Tool: Bash (grep)
    Preconditions: File rewritten
    Steps:
      1. grep "injectJavaScript" mobile/src/screens/CanteenWebViewScreen.tsx
      2. Assert match found (the method call, not the prop)
    Expected Result: webViewRef.current?.injectJavaScript() call exists
    Evidence: .sisyphus/evidence/task-5-ondemand.txt

  Scenario: Modal preview overlay exists
    Tool: Bash (grep)
    Preconditions: File rewritten
    Steps:
      1. grep "Modal" mobile/src/screens/CanteenWebViewScreen.tsx
      2. grep "showPreview" mobile/src/screens/CanteenWebViewScreen.tsx
      3. Assert both found
    Expected Result: Modal component imported and controlled by showPreview state
    Evidence: .sisyphus/evidence/task-5-modal.txt

  Scenario: QR decode API is called
    Tool: Bash (grep)
    Preconditions: File rewritten
    Steps:
      1. grep "decodeQR\|decodeQr" mobile/src/screens/CanteenWebViewScreen.tsx
      2. Assert match found
    Expected Result: API function imported and called
    Evidence: .sisyphus/evidence/task-5-decode-api.txt

  Scenario: Capturing state prevents double-tap
    Tool: Bash (grep)
    Preconditions: File rewritten
    Steps:
      1. grep "capturing" mobile/src/screens/CanteenWebViewScreen.tsx
      2. Assert match found (state variable + guard check)
    Expected Result: capturing boolean state exists
    Evidence: .sisyphus/evidence/task-5-capturing.txt

  Scenario: TypeScript type check passes
    Tool: Bash
    Preconditions: File rewritten
    Steps:
      1. cd mobile && npx tsc --noEmit
      2. Assert exit code 0
    Expected Result: No type errors
    Failure Indicators: Missing imports, wrong types, any usage
    Evidence: .sisyphus/evidence/task-5-tsc.txt
  ```

  **Commit**: YES (groups with Wave 2-3)
  - Message: `feat(mobile): rewrite QR capture with on-demand injection, preview overlay, price auto-fill`
  - Files: `mobile/src/screens/CanteenWebViewScreen.tsx`
  - Pre-commit: `npx tsc --noEmit` passes

- [x] 6. OrderConfirmScreen Price Auto-fill

  **What to do**:
  - In `mobile/src/screens/OrderConfirmScreen.tsx`:
    - Line 21: Change `const { canteen, qrCodeImage, qrCodeData } = route.params;` to `const { canteen, qrCodeImage, qrCodeData, totalPrice: passedPrice } = route.params;`
      - Rename to `passedPrice` to avoid conflict with the computed `totalPrice` on line 34
    - Line 29: Change `const [items, setItems] = useState<OrderItem[]>([{ name: '', qty: 1, price: 0 }]);` to `const [items, setItems] = useState<OrderItem[]>([{ name: '', qty: 1, price: passedPrice > 0 ? passedPrice : 0 }]);`
      - This pre-fills the price field when coming from WebView with a captured price
  - Total change: 2 lines modified.

  **Must NOT do**:
  - DO NOT rename the computed `totalPrice` variable on line 34
  - DO NOT restructure the screen layout
  - DO NOT add new UI elements
  - DO NOT change navigation or form logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 2-line change in one file.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - All: Too trivial

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (solo — after Wave 2)
  - **Blocks**: None
  - **Blocked By**: Task 5 (CanteenWebViewScreen must pass totalPrice in navigation)

  **References**:

  **Pattern References**:
  - `mobile/src/screens/OrderConfirmScreen.tsx:21` — Current destructuring: `const { canteen, qrCodeImage, qrCodeData } = route.params;` — add `totalPrice`
  - `mobile/src/screens/OrderConfirmScreen.tsx:29` — Current items init: `[{ name: '', qty: 1, price: 0 }]` — use `passedPrice`
  - `mobile/src/screens/OrderConfirmScreen.tsx:34` — Computed `totalPrice` — DO NOT rename this

  **API/Type References**:
  - `mobile/src/types/index.ts:76` — `totalPrice: number` is already in `RootStackParamList.OrderConfirm` — no type changes needed

  **WHY Each Reference Matters**:
  - Lines 21, 29, 34: These are the EXACT lines affected. The executor must understand the naming conflict between `route.params.totalPrice` and the computed `totalPrice`

  **Acceptance Criteria**:

  ```
  Scenario: totalPrice destructured from route.params
    Tool: Bash (grep)
    Preconditions: File modified
    Steps:
      1. grep "passedPrice\|totalPrice.*route.params" mobile/src/screens/OrderConfirmScreen.tsx
      2. Assert match found in destructuring
    Expected Result: totalPrice (or alias) is extracted from route.params
    Failure Indicators: Only canteen, qrCodeImage, qrCodeData destructured
    Evidence: .sisyphus/evidence/task-6-price-destructure.txt

  Scenario: Price is used in items initialization
    Tool: Bash (grep)
    Preconditions: File modified
    Steps:
      1. grep "passedPrice" mobile/src/screens/OrderConfirmScreen.tsx
      2. Assert appears in useState initializer
    Expected Result: passedPrice used to set initial item price
    Evidence: .sisyphus/evidence/task-6-price-init.txt

  Scenario: TypeScript type check passes
    Tool: Bash
    Preconditions: File modified
    Steps:
      1. cd mobile && npx tsc --noEmit
      2. Assert exit code 0
    Expected Result: No type errors
    Evidence: .sisyphus/evidence/task-6-tsc.txt
  ```

  **Commit**: YES (groups with Wave 2-3)
  - Message: `feat(mobile): rewrite QR capture with on-demand injection, preview overlay, price auto-fill`
  - Files: `mobile/src/screens/OrderConfirmScreen.tsx`
  - Pre-commit: `npx tsc --noEmit` passes

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `quick`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (grep file, curl endpoint). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check all deliverable files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `quick`
  Run `npx tsc --noEmit` in `mobile/`. Review all changed files for: `as any`/`@ts-ignore`, empty catches without comment, console.log in prod, commented-out code, unused imports. Check Python files for `from typing import Optional`, bare `except:`. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `TypeCheck [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Full Integration QA** — `quick`
  Start backend (`uvicorn main:app` from `backend/`). Verify: `/health` returns ok, `POST /qr/decode` returns 403 unauthenticated. Run `npx tsc --noEmit` in `mobile/`. Grep all changed files for required patterns (see individual task acceptance criteria).
  Output: `Backend [UP/DOWN] | Endpoints [N/N] | TypeCheck [PASS/FAIL] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `quick`
  For each task: read "What to do", verify actual file changes match spec. Verify nothing beyond spec was built. Check "Must NOT do" compliance: no `react-native-view-shot`, no `qr_service.py` modifications, no `types/index.ts` modifications, no `any` types. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `fix: add QR decode endpoint, API client, back button, header padding` — `backend/schemas/qr.py`, `backend/routers/qr.py`, `backend/main.py`, `mobile/src/api/qr.ts`, `mobile/src/screens/DelivererQueueScreen.tsx`, `mobile/src/screens/OrderDetailScreen.tsx`
  - Pre-commit: `npx tsc --noEmit` passes, backend starts cleanly
- **Wave 2-3**: `feat(mobile): rewrite QR capture with on-demand injection, preview overlay, price auto-fill` — `mobile/src/screens/CanteenWebViewScreen.tsx`, `mobile/src/screens/OrderConfirmScreen.tsx`
  - Pre-commit: `npx tsc --noEmit` passes

---

## Success Criteria

### Verification Commands
```bash
# Frontend type check
cd mobile && npx tsc --noEmit
# Expected: exit 0, no errors

# Backend health
curl http://localhost:8000/health
# Expected: {"status":"ok"}

# QR decode endpoint exists (not 404)
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/qr/decode -H "Content-Type: application/json" -d '{"image":"test"}'
# Expected: 403

# DelivererQueue back button
grep "goBack" mobile/src/screens/DelivererQueueScreen.tsx
# Expected: match found

# OrderDetail header fix
grep "paddingTop: 60" mobile/src/screens/OrderDetailScreen.tsx
# Expected: match found
grep "paddingVertical: 12" mobile/src/screens/OrderDetailScreen.tsx
# Expected: NO match (line 322 replaced)

# Passive injection removed
grep "injectedJavaScript=" mobile/src/screens/CanteenWebViewScreen.tsx
# Expected: NO match

# On-demand injection present
grep "injectJavaScript" mobile/src/screens/CanteenWebViewScreen.tsx
# Expected: match found

# OrderConfirm uses totalPrice
grep "totalPrice" mobile/src/screens/OrderConfirmScreen.tsx | head -3
# Expected: appears in destructuring from route.params
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] `npx tsc --noEmit` passes
- [ ] Backend starts cleanly
- [ ] QR decode endpoint accessible
