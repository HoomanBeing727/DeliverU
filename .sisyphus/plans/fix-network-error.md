# Fix Expo Go Network Error

## TL;DR

> **Quick Summary**: Frontend cannot connect to backend because IP address is wrong (`192.168.3.103` → should be `192.168.3.201`) and backend may not be running.
> 
> **Deliverables**: 
> - Updated IP in `frontend/src/services/api.ts`
> - Backend running and accessible from phone
> - Successful OCR test from Expo Go
> 
> **Estimated Effort**: Quick (5 minutes)
> **Parallel Execution**: NO - sequential steps required
> **Critical Path**: Update IP → Test connection → Verify in Expo Go

---

## Context

### Original Request
User updated `receipt_parser.py` and tested on Expo Go (physical phone) but got "Network Error".

### Root Cause Analysis
1. **Wrong IP Address**: `frontend/src/services/api.ts` line 12 has `192.168.3.103`, but user's WiFi IP is `192.168.3.201`
2. **Backend Status**: Server log shows it started then immediately shut down (likely user pressed Ctrl+C)
3. **Device Type**: Physical phone on Expo Go requires LAN IP, not localhost

### Evidence
- User's `ipconfig` shows: `無線區域網路介面卡 Wi-Fi: IPv4 位址 . . . . . . . . . . . . : 192.168.3.201`
- Backend log: `INFO: Application startup complete. INFO: Shutting down` (server not running)
- `curl http://192.168.3.201:8000/` failed (connection refused)

---

## Work Objectives

### Core Objective
Fix network connectivity between Expo Go (physical phone) and FastAPI backend.

### Concrete Deliverables
- `frontend/src/services/api.ts` updated with correct IP (`192.168.3.201`)
- Backend running on `http://0.0.0.0:8000`
- Health check accessible from `http://192.168.3.201:8000/`

### Definition of Done
- [ ] `curl http://192.168.3.201:8000/` returns `{"status":"ok","service":"UST McDelivery API"}`
- [ ] Expo Go can upload receipt image without network error
- [ ] FormCorrectionScreen displays parsed OCR data

### Must Have
- Correct WiFi IP address in frontend config
- Backend server running and not crashed

### Must NOT Have (Guardrails)
- Do NOT change API endpoint paths (keep `/api/ocr`)
- Do NOT modify port number (keep 8000)
- Do NOT add firewall rules without user confirmation

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO (no automated tests)
- **Automated tests**: None
- **Framework**: Manual verification only

### QA Policy
Each task includes agent-executed QA scenarios using `bash` (curl for API testing).
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

---

## Execution Strategy

### Sequential Execution (NO parallelism - backend must start first)

```
Task 1: Update frontend IP address (quick)
  ↓
Task 2: Start backend server (quick)
  ↓
Task 3: Test connection from network (quick)
  ↓
Task 4: Guide user to test in Expo Go (quick)
```

---

## TODOs

- [ ] 1. Update Frontend IP Configuration

  **What to do**:
  - Edit `frontend/src/services/api.ts` line 12
  - Change `const DEV_MACHINE_IP = '192.168.3.103';` to `const DEV_MACHINE_IP = '192.168.3.201';`
  - Save file

  **References**:
  - `frontend/src/services/api.ts:12` - Current IP configuration line
  - User's ipconfig output shows WiFi IP is `192.168.3.201`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Simple one-line text replacement

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Task 1)
  - **Blocks**: Task 4 (Expo must reload after IP change)
  - **Blocked By**: None (can start immediately)

  **Acceptance Criteria**:
  - [ ] Line 12 reads: `const DEV_MACHINE_IP = '192.168.3.201';`
  - [ ] File saved successfully

  **QA Scenarios**:
  ```
  Scenario: Verify IP address updated correctly
    Tool: Bash (grep)
    Steps:
      1. Run: grep "DEV_MACHINE_IP" frontend/src/services/api.ts
      2. Assert output contains: "192.168.3.201"
    Expected Result: Line shows correct IP: const DEV_MACHINE_IP = '192.168.3.201';
    Evidence: .sisyphus/evidence/task-1-ip-updated.txt
  ```

  **Commit**: NO

---

- [ ] 2. Start Backend Server

  **What to do**:
  - Navigate to `backend/` directory
  - Run: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
  - Verify server starts without errors
  - **IMPORTANT**: Server must keep running (do NOT stop it)

  **Must NOT do**:
  - Do NOT press Ctrl+C after starting
  - Do NOT change port or host settings

  **References**:
  - `backend/app/main.py` - FastAPI app entry point
  - User's previous log shows server started successfully before being stopped

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Simple command execution

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Task 2)
  - **Blocks**: Task 3, Task 4 (must be running for tests)
  - **Blocked By**: None (independent of Task 1)

  **Acceptance Criteria**:
  - [ ] Server log shows: "Application startup complete"
  - [ ] Server log does NOT show: "Shutting down"
  - [ ] Port 8000 is listening (verified by netstat)

  **QA Scenarios**:
  ```
  Scenario: Server starts and stays running
    Tool: Bash (uvicorn in background + curl)
    Steps:
      1. cd backend
      2. Start: uvicorn app.main:app --host 0.0.0.0 --port 8000 &
      3. Wait 3 seconds for startup
      4. Check: curl http://localhost:8000/
      5. Assert: Response contains "status":"ok"
    Expected Result: {"status":"ok","service":"UST McDelivery API"}
    Evidence: .sisyphus/evidence/task-2-server-started.json
  ```

  **Commit**: NO

---

- [ ] 3. Test Network Connectivity

  **What to do**:
  - Test health check from localhost: `curl http://localhost:8000/`
  - Test health check from WiFi IP: `curl http://192.168.3.201:8000/`
  - Test OCR endpoint with sample image: `curl -X POST http://192.168.3.201:8000/api/ocr -F "files=@mcdonald_order_eng.PNG"`
  - If WiFi IP test fails, check Windows Firewall

  **References**:
  - `backend/app/main.py:24-26` - Health check endpoint
  - `backend/app/api/ocr.py:13-59` - OCR endpoint

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Simple curl commands

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Task 3)
  - **Blocks**: Task 4 (must pass before user tests)
  - **Blocked By**: Task 2 (server must be running)

  **Acceptance Criteria**:
  - [ ] Localhost health check returns 200 OK
  - [ ] WiFi IP health check returns 200 OK
  - [ ] OCR endpoint accepts file upload (200 or 422 acceptable)

  **QA Scenarios**:
  ```
  Scenario: Health check accessible from network
    Tool: Bash (curl)
    Steps:
      1. curl -v http://192.168.3.201:8000/
      2. Assert: Status code 200
      3. Assert: Response body contains "status":"ok"
    Expected Result: HTTP 200 with {"status":"ok","service":"UST McDelivery API"}
    Failure Indicators: Connection refused, timeout, 404
    Evidence: .sisyphus/evidence/task-3-health-check.json

  Scenario: OCR endpoint reachable
    Tool: Bash (curl)
    Steps:
      1. curl -X POST http://192.168.3.201:8000/api/ocr -F "files=@mcdonald_order_eng.PNG" -v
      2. Assert: Status code is 200 or 422 (422 = validation error, but endpoint exists)
      3. Assert: NOT connection refused
    Expected Result: Server responds (any response = endpoint reachable)
    Evidence: .sisyphus/evidence/task-3-ocr-reachable.json
  ```

  **Commit**: NO

---

- [ ] 4. Guide User to Test in Expo Go

  **What to do**:
  - Instruct user to reload Expo app (press `r` in Metro Bundler or shake phone)
  - User should upload a receipt image in DashboardScreen
  - Verify LoadingScreen appears
  - Verify FormCorrectionScreen displays OCR results (or error message if parsing fails)

  **Must NOT do**:
  - Do NOT stop backend server during testing

  **References**:
  - `frontend/src/screens/DashboardScreen.tsx:37-53` - Upload handler
  - `frontend/src/screens/LoadingScreen.tsx:30-66` - API call logic
  - `frontend/src/services/api.ts:36-58` - uploadReceipt function

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: User instruction only (no code changes)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Task 4)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 1 (IP must be updated), Task 2 (server must run), Task 3 (connection verified)

  **Acceptance Criteria**:
  - [ ] User confirms Expo reloaded successfully
  - [ ] User can upload receipt without "Network Error"
  - [ ] FormCorrectionScreen displays (or user sees OCR parsing error)

  **QA Scenarios**:
  ```
  Scenario: User receives clear reload instructions
    Tool: Manual (user confirmation)
    Steps:
      1. Tell user: "In Expo Go, shake your phone and tap 'Reload'"
      2. Alternative: "In Metro Bundler terminal, press 'r'"
      3. Ask user: "Did the app reload successfully?"
    Expected Result: User confirms reload
    Evidence: User response in chat
  ```

  **Commit**: YES
  - Message: `fix(frontend): update DEV_MACHINE_IP to correct WiFi address`
  - Files: `frontend/src/services/api.ts`

---

## Success Criteria

### Verification Commands
```bash
# Backend health check (from computer)
curl http://192.168.3.201:8000/
# Expected: {"status":"ok","service":"UST McDelivery API"}

# Backend running check
netstat -ano | findstr ":8000"
# Expected: Shows LISTENING on port 8000
```

### Final Checklist
- [ ] Frontend has correct IP (192.168.3.201)
- [ ] Backend server running without crashes
- [ ] Health check accessible from WiFi IP
- [ ] User can upload receipt in Expo Go without network error

---

## Commit Strategy

- **Task 4**: `fix(frontend): update DEV_MACHINE_IP to correct WiFi address`
  - File: `frontend/src/services/api.ts`
  - Pre-commit: None (TypeScript type check already passes)
