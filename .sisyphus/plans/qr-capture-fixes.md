# QR Code Capture: On-Demand Capture + Preview + Backend Decode

## TL;DR

> **Quick Summary**: Rewrite the WebView QR capture flow so the Done button actively captures the QR code image, decodes it via backend, extracts the price, shows a preview, then navigates to OrderConfirm with all data pre-filled.
> 
> **Deliverables**:
> - Backend `POST /qr/decode` endpoint exposing the existing `qr_service`
> - Rewritten `CanteenWebViewScreen` with on-demand JS injection, preview overlay, price extraction
> - Updated `OrderConfirmScreen` to auto-fill price from nav params
> - Frontend API client function for QR decode
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: Limited — mostly sequential due to backend→frontend dependency
> **Critical Path**: Task 1 (backend endpoint) → Task 2 (API client) → Task 3 (WebView rewrite) → Task 4 (OrderConfirm update) → Task 5 (verification)

---

## Context

### Original Request
User reported 3 related issues with QR code capture in the WebView ordering flow:
1. QR data fetching failed — the passive JS injection doesn't find the QR code element
2. Done button should actively trigger QR capture (user is on the QR page when they press Done)
3. Need to capture a screenshot of the QR code and store it (for future chat system)

### Interview Summary
**Key Discussions**:
- QR page (from screenshot): dark red header → "等待付款中" title → "$ 30" price → white card with large QR code image
- User wants BOTH: QR image as base64 AND decoded QR data
- Done button flow: tap Done → capture → show preview with Retry/Confirm → then navigate
- Extract price from the page to auto-fill OrderConfirm
- On capture failure: Alert + retry (stay on WebView)
- Chat system deferred — screenshot captured and stored for later

**Research Findings**:
- JS injection via `injectJavaScript()` is the recommended primary method (precise, fast)
- `react-native-view-shot` is unreliable on iOS for WebView content (GitHub issue #278)
- `expo-screen-capture` is for PREVENTING screenshots, not taking them — wrong tool
- `jsQR` doesn't work in React Native (needs Canvas API) — backend decode with pyzbar is better
- Cross-origin images may cause "tainted canvas" error — need error handling

### Metis Review
**Identified Gaps** (addressed):
- **NO backend route for QR decode**: `qr_service.py` exists but no router exposes it → Task 1 adds endpoint
- **OrderConfirmScreen ignores `totalPrice` param**: Line 21 only destructures `canteen, qrCodeImage, qrCodeData` → Task 4 fixes this
- **DOM selectors are guesses**: Current `img[src*="qr"]` likely doesn't match → Task 3 uses broad selector strategy
- **Cross-origin tainted canvas risk**: Payment QR likely from different domain → Task 3 adds try/catch with error message
- **Large base64 in nav params**: 50-200KB is fine for React Navigation but noted

---

## Work Objectives

### Core Objective
Replace the broken passive QR capture with an on-demand capture flow triggered by the Done button, with preview overlay and backend QR decoding.

### Concrete Deliverables
- `backend/schemas/qr.py` — Request/response schemas for QR decode
- `backend/routers/qr.py` — `POST /qr/decode` endpoint
- `backend/main.py` — Register QR router
- `mobile/src/api/qr.ts` — Frontend API client for QR decode
- `mobile/src/screens/CanteenWebViewScreen.tsx` — Full rewrite of capture logic
- `mobile/src/screens/OrderConfirmScreen.tsx` — Auto-fill price from nav params

### Definition of Done
- [ ] `npx tsc --noEmit` passes clean in `mobile/`
- [ ] Backend starts without import errors
- [ ] `POST /qr/decode` endpoint returns proper response (not 404)
- [ ] Done button triggers active JS injection (not passive)
- [ ] Preview overlay shows captured QR with Retry/Confirm buttons
- [ ] OrderConfirm pre-fills price when passed via nav params

### Must Have
- On-demand QR capture triggered by Done button press
- Broad DOM selector strategy (canvas → img → any large image) with cross-origin error handling
- Preview overlay with captured QR image + Retry and Confirm buttons
- Backend decode endpoint using existing `qr_service.decode_qr_from_base64()`
- Price extraction from the QR page
- Error alert + retry on capture failure
- Auto-fill OrderConfirm price from extracted value

### Must NOT Have (Guardrails)
- DO NOT add `react-native-view-shot` — unreliable on iOS for WebView, adds complexity for uncertain benefit
- DO NOT add any chat/messaging features (deferred)
- DO NOT add `expo-camera` or barcode scanner — this is image capture from web page, not camera scanning
- DO NOT modify `RootStackParamList` — existing params already support all needed data
- DO NOT add a new screen for preview — use a Modal/overlay within CanteenWebViewScreen
- DO NOT restructure OrderConfirmScreen layout beyond minimal price pre-fill
- DO NOT add payment processing, escrow, or transaction logic
- DO NOT add WebView cookie/session management
- DO NOT add any `any` types or `@ts-ignore`
- DO NOT add `SafeAreaView` or `StatusBar` changes to CanteenWebViewScreen (already has them)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: None
- **Only checks**: `npx tsc --noEmit` (frontend), `curl` (backend endpoints), backend startup verification

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/`.

- **Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Frontend**: Use Bash (`npx tsc --noEmit`) + Grep for content verification

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — backend + API client in parallel):
├── Task 1: Backend QR decode endpoint (schemas + router + main.py) [quick]
└── Task 2: Frontend API client for QR decode [quick]

Wave 2 (After Wave 1 — core frontend work):
└── Task 3: Rewrite CanteenWebViewScreen with on-demand capture + preview [deep]

Wave 3 (After Wave 2 — minor follow-up):
└── Task 4: Update OrderConfirmScreen to auto-fill price [quick]

Wave FINAL (After ALL tasks):
├── F1: Plan compliance audit [quick]
└── F2: Full type-check + backend startup verification [quick]

Critical Path: Task 1 → Task 3 → Task 4 → F1/F2
Parallel Speedup: Task 1 + Task 2 run in parallel (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1    | None      | 3      |
| 2    | None      | 3      |
| 3    | 1, 2      | 4      |
| 4    | 3         | FINAL  |

### Agent Dispatch Summary

- **Wave 1**: 2 tasks → Task 1: `quick`, Task 2: `quick`
- **Wave 2**: 1 task → Task 3: `deep` + `frontend-ui-ux` skill
- **Wave 3**: 1 task → Task 4: `quick`
- **FINAL**: 2 tasks → F1: `quick`, F2: `quick`

---

## TODOs

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [ ] F1. **Plan Compliance Audit** — `quick`
  Read the plan. For each "Must Have": verify implementation exists (grep file, curl endpoint). For each "Must NOT Have": search codebase for forbidden patterns. Check all changed files exist and are non-empty.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **TypeScript + Backend Verification** — `quick`
  Run `npx tsc --noEmit` in `mobile/`. Start backend with `uvicorn main:app` and verify: health endpoint works, `/qr/decode` returns 401 (not 404), no import errors. Grep all changed files for `any` types, bare `except:`, `@ts-ignore`.
  Output: `tsc [PASS/FAIL] | Backend [PASS/FAIL] | Code quality [PASS/FAIL] | VERDICT`

---

## Commit Strategy

- **Task 1**: `feat(backend): add POST /qr/decode endpoint for QR image decoding`
  - Files: `backend/schemas/qr.py`, `backend/routers/qr.py`, `backend/main.py`
  - Pre-commit: Backend starts without errors

- **Tasks 2-4**: `feat(mobile): rewrite QR capture with on-demand injection, preview overlay, and price auto-fill`
  - Files: `mobile/src/api/qr.ts`, `mobile/src/screens/CanteenWebViewScreen.tsx`, `mobile/src/screens/OrderConfirmScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

## Success Criteria

### Verification Commands
```bash
# Frontend type check
cd mobile && npx tsc --noEmit  # Expected: exit 0, no errors

# Backend health
curl http://localhost:8000/health  # Expected: {"status":"ok"}

# QR decode endpoint exists (returns 403, not 404)
curl -X POST http://localhost:8000/qr/decode -H "Content-Type: application/json" -d '{"image":"test"}'
# Expected: 403 (not authenticated), NOT 404
```

### Final Checklist
- [ ] Done button triggers active QR capture via `injectJavaScript()`
- [ ] Passive `injectedJavaScript` prop removed from WebView
- [ ] Preview overlay shows captured QR image with Retry/Confirm
- [ ] Backend `/qr/decode` endpoint works with auth
- [ ] OrderConfirm auto-fills price from nav params
- [ ] `npx tsc --noEmit` passes clean
- [ ] No `any` types, no `@ts-ignore`, no bare `except:`
