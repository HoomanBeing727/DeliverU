# Multi-Photo Upload + SmolVLM Receipt Understanding (VLM-ONLY)

## TL;DR

> **Quick Summary**: Enable multi-photo upload for receipts, remove restaurant field from form, integrate SmolVLM 2.2B Q4 for intelligent receipt parsing. **NO OCR FALLBACK** — VLM-only approach for simplicity and performance.
> 
> **Deliverables**:
> - Multiple photo upload (select 1-10 receipt screenshots)
> - SmolVLM backend integration (replaces RapidOCR + regex parsing completely)
> - Sequential image processing (5 images in ≤7 seconds, ~1.4s per image)
> - Combined receipt processing (merge items from multiple photos into one order)
> - Simplified form (no restaurant field, HKUST validation behind the scenes)
> 
> **Estimated Effort**: Medium (2-3 hours implementation + testing)
> **Parallel Execution**: YES - 2 waves (frontend multi-upload + backend VLM can be developed in parallel)
> **Critical Path**: Frontend changes → Backend VLM → Integration testing
> **Performance Target**: 5 images in ≤7 seconds (sequential processing)

---

## Context

### Original Problem
Current OCR system (RapidOCR + regex parsing) fails on complex McDonald's receipts:
- Cannot understand meal components (e.g., "Chicken McNuggets Meal (6pcs) w Filet-O-Fish" → treats "Filet-O-Fish" as separate item instead of add-on)
- Extracts "No add-on, thank you!" as item property instead of recognizing it as a message
- No hierarchical understanding of meal structure

**Example from testrun.jpg**:
```
Meal: Chicken McNuggets Meal (6pcs) w Filet-O-Fish
  ├─ Chicken McNuggets (6pcs)
  ├─ Hot Mustard Sauce
  ├─ Filet-O-Fish  ← This is an ADD-ON, not a separate item
  ├─ Fries (M)
  └─ Coca-Cola No Sugar (M)
Message: "No add-on, thank you!"  ← This is NOT an item property
```

Current regex parsing sees flat text and cannot infer structure.

### User Requirements (Updated)
1. **Multiple photo upload**: Large orders may require 2-3 screenshots to capture all items
2. **Remove restaurant field**: Only serving HKUST, no need for user input (validate automatically behind the scenes)
3. **Better parsing**: Use SmolVLM to understand receipt structure, not just extract text
4. **NO OCR FALLBACK**: Ditch OCR completely — VLM-only approach for simplicity
5. **Performance target**: 5 images in ≤7 seconds total (sequential processing, ~1.4s per image)

### Research Findings

**SmolVLM Discovery** (key sources: HuggingFace, debuggercafe.com):
- ✅ **Fine-tuned receipt OCR model exists**: Pre-trained SmolVLM for receipt understanding
- ✅ **GGUF Q4 quantization available**: `ggml-org/SmolVLM2-2.2B-Instruct-GGUF` (~1.5GB memory, CPU-runnable)
- ✅ **llama.cpp integration**: Best inference engine for GGUF models (C++ backend, Python bindings)
- ⚠️ **vLLM not recommended**: Experimental GGUF support, under-optimized
- ✅ **Performance**: Q4 model should hit ~1-1.5s per image on modern CPU (meets 7s/5 images target)

**Current Data Flow** (from explore agent):
- Frontend: Single image picker → single `imageUri` string
- Loading screen: Calls `uploadReceipt(imageUri)` (single image)
- Backend: `/api/ocr` endpoint accepts one file
- Form: Displays `restaurant` field (lines 157-172), validates it as required (lines 69-72)

**Files to Delete**:
- `backend/app/services/ocr_service.py` — RapidOCR service (no longer needed)
- `backend/app/services/receipt_parser.py` — Regex parsing (no longer needed)

---

## Work Objectives

### Core Objective
Enable users to upload multiple receipt photos and use SmolVLM to intelligently parse them into a single combined order with accurate item understanding. **Remove OCR dependency completely.**

### Concrete Deliverables
1. **Frontend**:
   - `DashboardScreen.tsx`: Multi-select image picker (1-10 photos)
   - `LoadingScreen.tsx`: Process multiple images sequentially (show progress)
   - `FormCorrectionScreen.tsx`: Remove restaurant field, display combined items
   - `types/navigation.ts`: Update `OCRResult` and route params for arrays

2. **Backend**:
   - `backend/app/services/vlm_service.py`: NEW - SmolVLM inference service (VLM-only)
   - `backend/app/api/ocr.py`: Accept multiple files, call VLM service sequentially, merge results
   - `backend/app/models/schemas.py`: Remove `restaurant` from response schema
   - **DELETE**: `ocr_service.py`, `receipt_parser.py` (no longer needed)

### Definition of Done
- [ ] User can select 2-5 photos from gallery in one action
- [ ] Loading screen processes all photos sequentially (shows progress: "Processing image 2 of 3...")
- [ ] Backend runs SmolVLM on each image, extracts structured JSON (order_number, items[], subtotal, total)
- [ ] Items from multiple photos are merged into one list (no duplicates, quantities summed if same item)
- [ ] Totals are summed across all receipts
- [ ] Form displays combined order WITHOUT restaurant field
- [ ] HKUST validation happens automatically (check any photo for HKUST keywords, set `is_valid` flag)
- [ ] Performance: 5 images processed in ≤7 seconds (sequential, ~1.4s per image)
- [ ] TypeScript and Python type checks pass
- [ ] Manual QA: Upload testrun.jpg (single photo) → correctly identifies meal structure
- [ ] Manual QA: Upload 2-3 receipt screenshots → correctly merges items

### Must Have
- Multi-photo upload (at least 2, max 10)
- SmolVLM Q4 quantized model (memory-efficient, CPU-runnable)
- **VLM-only approach** (no OCR fallback — simpler, faster)
- Sequential processing (predictable latency, meets 7s/5 images target)
- Combined items list (merge logic for duplicates)
- HKUST validation (behind the scenes, no user input)
- Delete old OCR code (`ocr_service.py`, `receipt_parser.py`)

### Must NOT Have (Guardrails)
- Do NOT require restaurant field in form (remove it completely)
- Do NOT use vLLM (experimental GGUF support, not production-ready)
- Do NOT keep OCR as fallback (VLM-only approach)
- Do NOT let users edit HKUST validation status (it's automatic)
- Do NOT show "Processing complete" until ALL photos are processed
- Do NOT crash if user uploads non-receipt images (VLM returns parsing error → show in UI)

---

## Verification Strategy

> **Manual QA required** for VLM output quality (receipt understanding accuracy).

### Test Decision
- **Infrastructure exists**: NO tests for UI or backend OCR
- **Automated tests**: Minimal (API contract tests only — verify JSON schema)
- **Manual QA**: **MANDATORY** for VLM output quality (receipt understanding accuracy)

### QA Policy
Every task includes agent-executed QA for technical correctness (TypeScript/Python compilation, API response structure).

**Manual QA required**: Upload real receipt images (testrun.jpg + 2-3 more) and verify SmolVLM correctly identifies:
- Meal components vs separate items
- Add-ons vs standalone items
- Quantities and prices
- Total correctness

Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

---

## Execution Strategy

### Parallel Execution Waves

> Wave 1 (frontend) and Wave 2 (backend VLM) can run in parallel.
> Wave 3 (integration) requires both to complete.
> Wave 4 (cleanup + testing) runs after Wave 3.

```
Wave 1 (Frontend Multi-Upload — START IMMEDIATELY):
├── Task 1: Update image picker to multi-select [quick]
├── Task 2: Update types for imageUri[] [quick]
├── Task 3: Update LoadingScreen for multiple images [unspecified-high]
└── Task 4: Remove restaurant field from FormCorrectionScreen [quick]

Wave 2 (Backend SmolVLM Setup — PARALLEL with Wave 1):
├── Task 5: Install dependencies + download SmolVLM Q4 model [quick]
├── Task 6: Create vlm_service.py with VLM-only inference [unspecified-high]
└── Task 7: Test VLM with testrun.jpg + performance benchmark [unspecified-high]

Wave 3 (Backend Integration — AFTER Waves 1+2):
├── Task 8: Update /api/ocr to accept multiple files [unspecified-high]
├── Task 9: Implement merge logic (combine items, sum totals) [unspecified-high]
└── Task 10: Remove restaurant from OCRResponse schema [quick]

Wave 4 (Cleanup + Testing — AFTER Wave 3):
├── Task 11: Delete old OCR code (ocr_service.py, receipt_parser.py) [quick]
├── Task 12: Integration test - single photo (testrun.jpg) [unspecified-high]
├── Task 13: Integration test - multiple photos (2-3 receipts) [unspecified-high]
└── Task 14: Manual QA on physical iPhone [unspecified-high]

Critical Path: Task 1-4 → Task 5-7 → Task 8-10 → Task 11-14
Parallel Speedup: Wave 1 + Wave 2 run together (~50% faster than sequential)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|------------|--------|------|
| 1-4  | —          | 12-14  | 1    |
| 5    | —          | 6      | 2    |
| 6    | 5          | 7, 8   | 2    |
| 7    | 6          | 8      | 2    |
| 8    | 6, 7       | 9, 12  | 3    |
| 9    | 8          | 12     | 3    |
| 10   | 8          | —      | 3    |
| 11   | 8, 9, 10   | —      | 4    |
| 12   | 1-4, 8-10  | —      | 4    |
| 13   | 12         | 14     | 4    |
| 14   | 13         | —      | 4    |

### Agent Dispatch Summary

- **Wave 1**: 4 tasks (3x `quick`, 1x `unspecified-high`)
- **Wave 2**: 3 tasks (1x `quick`, 2x `unspecified-high`)
- **Wave 3**: 3 tasks (1x `quick`, 2x `unspecified-high`)
- **Wave 4**: 4 tasks (1x `quick`, 3x `unspecified-high`)

---

## TODOs

### Wave 1: Frontend Multi-Upload (4 tasks, can start immediately)

- [ ] 1. Update image picker to multi-select

  **What to do**:
  - Open `frontend/src/screens/DashboardScreen.tsx`
  - Find the `ImagePicker.launchImageLibraryAsync` call (around line 41-50)
  - Add `allowsMultipleSelection: true` option
  - Add `selectionLimit: 10` option (max 10 photos)
  - Update the result handling: change `result.assets[0]` to `result.assets.map(asset => asset.uri)`
  - Navigate to Loading screen with `imageUris: string[]` instead of single `imageUri`

  **Must NOT do**:
  - Do NOT change the image quality setting (keep `quality: 0.8`)
  - Do NOT re-add `allowsEditing` or `aspect` (those were removed earlier)
  - Do NOT change theme colors or branding (already done in previous session)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small change, single file, well-defined API change
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3, 4)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 12-14 (integration tests need multi-upload to work)
  - **Blocked By**: None (can start immediately)

  **References**:
  
  **Current Code**:
  - `frontend/src/screens/DashboardScreen.tsx:41-50` - Image picker call
  - expo-image-picker docs: https://docs.expo.dev/versions/latest/sdk/imagepicker/#imagepickerlaunchimagelibraryasyncoptions

  **Target Code**:
  ```typescript
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,  // ADD THIS
    selectionLimit: 10,             // ADD THIS
    quality: 0.8,
  });
  
  if (!result.canceled && result.assets.length > 0) {
    navigation.navigate('Loading', {
      imageUris: result.assets.map(asset => asset.uri)  // CHANGE THIS
    });
  }
  ```

  **Acceptance Criteria**:
  - [ ] `allowsMultipleSelection: true` added to picker options
  - [ ] `selectionLimit: 10` added to picker options
  - [ ] Result handling extracts array of URIs (`result.assets.map(...)`)
  - [ ] Navigation passes `imageUris: string[]` to Loading screen
  - [ ] TypeScript compiles cleanly

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: DashboardScreen enables multi-select
    Tool: Read + Grep
    Preconditions: File edited
    Steps:
      1. Read DashboardScreen.tsx lines 40-55
      2. Grep for "allowsMultipleSelection" → should find "true"
      3. Grep for "selectionLimit" → should find "10"
      4. Grep for "imageUris" in navigation call
      5. npx tsc --noEmit (check TypeScript compilation)
    Expected Result: Multi-select enabled, navigation updated, TS compiles
    Failure Indicators: Missing options, still uses single imageUri, TS errors
    Evidence: .sisyphus/evidence/task-1-dashboard-multi.txt
  ```

  **Evidence to Capture**:
  - [ ] Grep output showing multi-select options
  - [ ] TypeScript compilation output

  **Commit**: YES
  - Message: `feat(ui): enable multi-photo upload in dashboard`
  - Files: `frontend/src/screens/DashboardScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 2. Update TypeScript types for image arrays

  **What to do**:
  - Open `frontend/src/types/navigation.ts`
  - Find the `RootStackParamList` type definition
  - Change `Loading: { imageUri: string }` to `Loading: { imageUris: string[] }`
  - Verify `OCRResult` interface already supports arrays (it does — `items: OrderItem[]`)
  - Run TypeScript type check

  **Must NOT do**:
  - Do NOT change OCRResult interface (items array already correct)
  - Do NOT change FormCorrection route params (uses OCRResult, which is already correct)
  - Do NOT change Dashboard route params (no params needed)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single type change, minimal risk
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 3, 4)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 3 (LoadingScreen uses this type)
  - **Blocked By**: None (can start immediately)

  **References**:
  
  **Current Types**:
  - `frontend/src/types/navigation.ts:20` - Loading route params

  **Target Code**:
  ```typescript
  // BEFORE
  export type RootStackParamList = {
    Dashboard: undefined;
    Loading: { imageUri: string };  // ← CHANGE THIS
    FormCorrection: { ocrResult: OCRResult };
  };

  // AFTER
  export type RootStackParamList = {
    Dashboard: undefined;
    Loading: { imageUris: string[] };  // ← TO THIS
    FormCorrection: { ocrResult: OCRResult };
  };
  ```

  **Acceptance Criteria**:
  - [ ] Loading route param changed to `imageUris: string[]`
  - [ ] TypeScript compiles cleanly
  - [ ] No changes to OCRResult interface (already correct)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Types updated for multi-image
    Tool: Read + Bash
    Preconditions: File edited
    Steps:
      1. Read navigation.ts lines 15-25
      2. Verify: Loading route has imageUris: string[]
      3. npx tsc --noEmit
      4. Assert: No type errors
    Expected Result: Types correct, TypeScript compiles
    Failure Indicators: Still uses imageUri (singular), TS errors in other files
    Evidence: .sisyphus/evidence/task-2-types-update.txt
  ```

  **Evidence to Capture**:
  - [ ] TypeScript compilation output

  **Commit**: YES
  - Message: `refactor(types): update Loading route for multi-image array`
  - Files: `frontend/src/types/navigation.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 3. Update LoadingScreen for multiple images

  **What to do**:
  - Open `frontend/src/screens/LoadingScreen.tsx`
  - Extract `imageUris: string[]` from route params (change from single `imageUri`)
  - Add state: `const [currentImage, setCurrentImage] = useState(1)`
  - Add state: `const [totalImages, setTotalImages] = useState(imageUris.length)`
  - Update progress text: `"Processing image {currentImage} of {totalImages}..."`
  - In `useEffect`, loop through `imageUris`, call `uploadReceipt` for each
  - Implement `mergeOCRResults` helper function (combines items, sums totals)
  - Pass merged result to FormCorrectionScreen

  **Must NOT do**:
  - Do NOT process images in parallel (sequential processing for predictable latency)
  - Do NOT skip error handling (show errors from all images)
  - Do NOT change spinner color (already #0055de from previous session)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multi-step logic (loop, merge, error handling), moderate complexity
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 2, 4)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 12-14 (integration tests)
  - **Blocked By**: Task 2 (needs imageUris type)

  **References**:
  
  **Current Code**:
  - `frontend/src/screens/LoadingScreen.tsx:26` - Route param extraction
  - `frontend/src/screens/LoadingScreen.tsx:54-89` - useEffect with single upload

  **Target Code**:
  ```typescript
  const { imageUris } = route.params;  // CHANGE: array now
  const [currentImage, setCurrentImage] = useState(1);

  useEffect(() => {
    const process = async () => {
      try {
        const results: OCRResult[] = [];
        for (let i = 0; i < imageUris.length; i++) {
          setCurrentImage(i + 1);  // Update progress
          const result = await uploadReceipt(imageUris[i]);
          results.push(result);
        }
        
        // Merge results (combine items, sum totals)
        const merged = mergeOCRResults(results);
        navigation.replace('FormCorrection', { ocrResult: merged });
      } catch (error) {
        // ... error handling
      }
    };
    process();
  }, [imageUris, navigation]);
  ```

  **Merge Logic** (helper function to add):
  ```typescript
  function mergeOCRResults(results: OCRResult[]): OCRResult {
    const allItems: OrderItem[] = [];
    let totalSubtotal = 0;
    let totalAmount = 0;
    const allErrors: string[] = [];
    let anyValid = false;
    
    for (const result of results) {
      allItems.push(...result.items);
      totalSubtotal += result.subtotal;
      totalAmount += result.total;
      allErrors.push(...result.errors);
      if (result.is_valid) anyValid = true;
    }
    
    return {
      order_number: results[0]?.order_number || '',
      items: allItems,
      subtotal: totalSubtotal,
      total: totalAmount,
      is_valid: anyValid,
      errors: allErrors,
    };
  }
  ```

  **Acceptance Criteria**:
  - [ ] Extracts `imageUris` array from route params
  - [ ] Loops through all images, calls uploadReceipt for each
  - [ ] Shows progress: "Processing image {N} of {total}..."
  - [ ] Merges results: combines items[], sums subtotal/total, collects errors
  - [ ] Passes merged result to FormCorrectionScreen
  - [ ] TypeScript compiles cleanly

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: LoadingScreen processes multiple images
    Tool: Read + Grep
    Preconditions: File edited
    Steps:
      1. Read LoadingScreen.tsx lines 50-90
      2. Verify: Extracts imageUris (array) from params
      3. Verify: Loop through imageUris with for/map
      4. Verify: mergeOCRResults function exists
      5. Grep for "Processing image" in Messages
    Expected Result: Multi-image logic present, merge function defined
    Failure Indicators: Still uses single imageUri, no merge logic, no progress
    Evidence: .sisyphus/evidence/task-3-loading-multi.txt
  ```

  **Evidence to Capture**:
  - [ ] Grep showing `imageUris` extraction
  - [ ] Grep showing merge function definition
  - [ ] TypeScript compilation output

  **Commit**: YES
  - Message: `feat(ui): process multiple receipt images with progress tracking`
  - Files: `frontend/src/screens/LoadingScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 4. Remove restaurant field from FormCorrectionScreen

  **What to do**:
  - Open `frontend/src/screens/FormCorrectionScreen.tsx`
  - Remove `const [restaurant, setRestaurant] = useState(...)` (line 24)
  - Remove restaurant validation (lines 69-72)
  - Remove restaurant from submission payload (line 80)
  - Remove restaurant TextInput from render (lines 157-172 per grep results)
  - Keep HKUST validation display (`isValid` indicator) — but don't let user edit it

  **Must NOT do**:
  - Do NOT remove `isValid` flag (still needed to show HKUST validation status)
  - Do NOT remove order number, items, subtotal, total fields
  - Do NOT change form layout/styling

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward deletion, well-defined scope
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 2, 3)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 12-14 (integration tests)
  - **Blocked By**: None (can start immediately)

  **References**:
  
  **Lines to Remove** (from explore agent session):
  - `frontend/src/screens/FormCorrectionScreen.tsx:24` - State declaration
  - `frontend/src/screens/FormCorrectionScreen.tsx:69-72` - Validation
  - `frontend/src/screens/FormCorrectionScreen.tsx:80` - Payload field
  - `frontend/src/screens/FormCorrectionScreen.tsx:157-172` - TextInput component

  **Acceptance Criteria**:
  - [ ] Restaurant state variable removed
  - [ ] Restaurant validation removed
  - [ ] Restaurant field removed from UI
  - [ ] Restaurant removed from submission payload
  - [ ] HKUST validation display preserved (`isValid` indicator)
  - [ ] TypeScript compiles cleanly

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Restaurant field completely removed
    Tool: Grep + Bash
    Preconditions: File edited
    Steps:
      1. grep -n "restaurant" FormCorrectionScreen.tsx
      2. Verify: ZERO matches (except comments, if any)
      3. grep -n "isValid" FormCorrectionScreen.tsx
      4. Verify: isValid still exists (HKUST validation preserved)
      5. npx tsc --noEmit
    Expected Result: Restaurant completely removed, isValid preserved, TS compiles
    Failure Indicators: Restaurant references remain, isValid removed, TS errors
    Evidence: .sisyphus/evidence/task-4-no-restaurant.txt
  ```

  **Evidence to Capture**:
  - [ ] Grep output (should show zero "restaurant" matches)
  - [ ] TypeScript compilation output

  **Commit**: YES
  - Message: `refactor(ui): remove restaurant field (HKUST-only service)`
  - Files: `frontend/src/screens/FormCorrectionScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

### Wave 2: Backend SmolVLM Setup (3 tasks, parallel with Wave 1)

- [ ] 5. Install dependencies + download SmolVLM Q4 model

  **What to do**:
  - Add to `backend/requirements.txt`:
    - `transformers>=4.40.0`
    - `torch>=2.0.0`
    - `pillow>=10.0.0`
    - `huggingface_hub>=0.20.0`
  - Run `pip install -r requirements.txt`
  - Create `backend/models/` directory
  - Download SmolVLM Q4 model from HuggingFace:
    - Model: `ggml-org/SmolVLM2-2.2B-Instruct-GGUF`
    - File: `SmolVLM2-2.2B-Instruct-Q4_K_M.gguf` (~1.5GB)
    - Projection: `mmproj-SmolVLM2-2.2B-Instruct-Q4_K_M.gguf`
  - Add `backend/models/` to `.gitignore` (large binary files)

  **Must NOT do**:
  - Do NOT download full model (non-quantized) — use Q4 version only (~1.5GB)
  - Do NOT use vLLM (experimental GGUF support)
  - Do NOT commit model files to git (add to .gitignore)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward setup, well-documented process
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Wave 1 tasks)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6 (VLM service needs model files)
  - **Blocked By**: None (can start immediately)

  **References**:
  
  **HuggingFace Model**:
  - Repo: https://huggingface.co/ggml-org/SmolVLM2-2.2B-Instruct-GGUF
  - Files needed:
    - `SmolVLM2-2.2B-Instruct-Q4_K_M.gguf` (main model weights)
    - `mmproj-SmolVLM2-2.2B-Instruct-Q4_K_M.gguf` (multimodal projection)

  **Download Command**:
  ```bash
  cd backend
  mkdir -p models
  cd models
  # Using huggingface-cli or curl to download
  huggingface-cli download ggml-org/SmolVLM2-2.2B-Instruct-GGUF SmolVLM2-2.2B-Instruct-Q4_K_M.gguf --local-dir .
  huggingface-cli download ggml-org/SmolVLM2-2.2B-Instruct-GGUF mmproj-SmolVLM2-2.2B-Instruct-Q4_K_M.gguf --local-dir .
  ```

  **Acceptance Criteria**:
  - [ ] Dependencies added to requirements.txt
  - [ ] `pip install` succeeds (no errors)
  - [ ] `backend/models/` directory created
  - [ ] Model files downloaded (~1.5GB each)
  - [ ] `.gitignore` includes `backend/models/`

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Dependencies and model files ready
    Tool: Bash
    Preconditions: requirements.txt updated
    Steps:
      1. cd backend
      2. pip install -r requirements.txt
      3. ls models/ | grep "SmolVLM2-2.2B-Instruct-Q4_K_M.gguf"
      4. ls models/ | grep "mmproj-SmolVLM2-2.2B-Instruct-Q4_K_M.gguf"
      5. du -h models/*.gguf (check file sizes ~1.5GB each)
    Expected Result: All dependencies installed, model files present
    Failure Indicators: pip errors, missing model files, wrong file sizes
    Evidence: .sisyphus/evidence/task-5-setup.txt
  ```

  **Evidence to Capture**:
  - [ ] pip install output
  - [ ] ls models/ output (showing downloaded files)
  - [ ] File sizes (du -h output)

  **Commit**: YES
  - Message: `chore(backend): add SmolVLM dependencies and model setup`
  - Files: `backend/requirements.txt`, `.gitignore`
  - Pre-commit: None (model download happens after commit)

---

- [ ] 6. Create vlm_service.py with VLM-only inference

  **What to do**:
  - Create `backend/app/services/vlm_service.py`
  - Implement `extract_receipt_data(image_bytes: bytes) -> dict` function
  - Load SmolVLM Q4 model as singleton (load once, reuse for all requests)
  - Use transformers `AutoProcessor` + `AutoModelForVision2Seq`
  - Prompt: "Extract structured data from this McDonald's receipt. Return ONLY JSON: {order_number, items[], subtotal, total}. Meals with add-ons are ONE item."
  - Parse JSON from VLM output
  - Add HKUST validation logic (check if receipt mentions HKUST keywords)
  - Return dict with `is_valid`, `errors[]` fields
  - **NO OCR FALLBACK** — if VLM fails, raise exception (let caller handle)

  **Must NOT do**:
  - Do NOT add OCR fallback in this service (VLM-only)
  - Do NOT load model on every request (use singleton pattern)
  - Do NOT skip HKUST validation (check keywords: "HKUST", "Hong Kong University", "科技大學")

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Model loading, prompt engineering, JSON parsing, error handling
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Task 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7, 8 (testing and integration need this service)
  - **Blocked By**: Task 5 (needs model files)

  **References**:
  
  **Model Loading Pattern** (singleton):
  ```python
  from transformers import AutoProcessor, AutoModelForVision2Seq
  from PIL import Image
  import io, json

  # Singleton (load once)
  _model = None
  _processor = None

  def _load_model():
      global _model, _processor
      if _model is None:
          model_path = "backend/models/SmolVLM2-2.2B-Instruct-Q4_K_M.gguf"
          _processor = AutoProcessor.from_pretrained(model_path)
          _model = AutoModelForVision2Seq.from_pretrained(model_path)

  def extract_receipt_data(image_bytes: bytes) -> dict:
      _load_model()
      
      image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
      
      prompt = """Extract structured data from this McDonald's receipt.
      Return ONLY JSON: {"order_number": "...", "items": [{"name":"...", "quantity":1, "price":0.0}], "subtotal": 0.0, "total": 0.0}
      IMPORTANT: Meals like "Chicken McNuggets Meal w Filet-O-Fish" are ONE item, not multiple."""
      
      inputs = _processor(text=prompt, images=image, return_tensors="pt")
      outputs = _model.generate(**inputs, max_new_tokens=500)
      text = _processor.decode(outputs[0], skip_special_tokens=True)
      
      # Parse JSON from output
      parsed = json.loads(text)  # Add error handling
      
      # HKUST validation
      # TODO: Check if image contains HKUST keywords
      parsed["is_valid"] = True  # Placeholder
      parsed["errors"] = []
      
      return parsed
  ```

  **HKUST Validation**:
  ```python
  def _check_hkust(text: str) -> bool:
      keywords = ["HKUST", "Hong Kong University of Science", "科技大學"]
      return any(kw.lower() in text.lower() for kw in keywords)
  ```

  **Acceptance Criteria**:
  - [ ] File created: `backend/app/services/vlm_service.py`
  - [ ] Function signature: `extract_receipt_data(image_bytes: bytes) -> dict`
  - [ ] Model loads as singleton (cached after first call)
  - [ ] Returns structured dict: `{order_number, items[], subtotal, total, is_valid, errors[]}`
  - [ ] HKUST validation implemented
  - [ ] No OCR fallback (raises exception on VLM failure)
  - [ ] Python imports work (no errors)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: VLM service loads and imports cleanly
    Tool: Bash
    Preconditions: File created, dependencies installed
    Steps:
      1. cd backend
      2. python -c "from app.services.vlm_service import extract_receipt_data; print('OK')"
      3. Assert: Prints "OK", no import errors
    Expected Result: Import succeeds, model loads on first call
    Failure Indicators: Import errors, model loading fails, CUDA errors
    Evidence: .sisyphus/evidence/task-6-vlm-load.txt
  ```

  **Evidence to Capture**:
  - [ ] Import test output
  - [ ] Model loading logs (first call timing)

  **Commit**: YES
  - Message: `feat(backend): add SmolVLM service for receipt parsing (VLM-only)`
  - Files: `backend/app/services/vlm_service.py`
  - Pre-commit: Python syntax check

---

- [ ] 7. Test VLM with testrun.jpg + performance benchmark

  **What to do**:
  - Create test script: `backend/test_vlm.py`
  - Load `testrun.jpg` (from project root)
  - Call `vlm_service.extract_receipt_data(image_bytes)`
  - Print structured output
  - **Manually verify** the output is correct:
    - Order number: 206
    - Item: "Chicken McNuggets Meal (6pcs) w Filet-O-Fish" (ONE item, not split)
    - Subtotal: 43.00
    - Total: 43.00
  - **Performance benchmark**: Run 5 times, measure average inference time
  - **Target**: ≤1.4 seconds per image (to meet 5 images in 7 seconds goal)
  - If too slow, investigate prompt optimization or model tuning

  **Must NOT do**:
  - Do NOT skip manual verification (VLM can hallucinate)
  - Do NOT proceed to Wave 3 if output is inaccurate (fix prompt first)
  - Do NOT commit test script (temporary debugging tool)
  - Do NOT skip performance benchmark (critical to meet 7s/5 images target)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Testing + manual verification + performance tuning
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Task 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Wave 3 (Task 8 — can't integrate until VLM is proven accurate and fast)
  - **Blocked By**: Task 6 (needs vlm_service to exist)

  **References**:
  
  **Test Script Template**:
  ```python
  # backend/test_vlm.py
  import sys
  import time
  sys.path.insert(0, '.')
  
  from app.services.vlm_service import extract_receipt_data
  import json
  
  with open('../testrun.jpg', 'rb') as f:
      image_bytes = f.read()
  
  # Performance benchmark (5 runs)
  times = []
  for i in range(5):
      start = time.time()
      result = extract_receipt_data(image_bytes)
      elapsed = time.time() - start
      times.append(elapsed)
      print(f"Run {i+1}: {elapsed:.2f}s")
  
  avg_time = sum(times) / len(times)
  print(f"\nAverage inference time: {avg_time:.2f}s")
  print(f"Target: ≤1.4s per image (5 images in 7s)")
  print(f"Performance: {'✓ PASS' if avg_time <= 1.4 else '✗ FAIL (too slow)'}")
  
  print("\nParsed output:")
  print(json.dumps(result, indent=2))
  ```

  **Expected Output** (from testrun.jpg):
  ```json
  {
    "order_number": "206",
    "items": [
      {
        "name": "Chicken McNuggets Meal (6pcs) w Filet-O-Fish",
        "quantity": 1,
        "price": 43.0
      }
    ],
    "subtotal": 43.0,
    "total": 43.0,
    "is_valid": true,
    "errors": []
  }
  ```

  **Acceptance Criteria**:
  - [ ] Test script runs without errors
  - [ ] Output is valid JSON
  - [ ] Order number correct (206)
  - [ ] Item name correct (meal with Filet-O-Fish as ONE item)
  - [ ] Subtotal and total correct (43.00)
  - [ ] HKUST validation works (is_valid: true)
  - [ ] **Performance**: Average inference time ≤1.4s per image
  - [ ] **Manual verification**: Output matches actual receipt content

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: VLM correctly parses testrun.jpg with acceptable performance
    Tool: Bash + Manual Verification
    Preconditions: Test script created, testrun.jpg exists
    Steps:
      1. cd backend
      2. python test_vlm.py
      3. Save output to .sisyphus/evidence/task-7-vlm-output.json
      4. **MANUAL**: Compare output to testrun.jpg image
      5. Verify: Order number, items, prices match exactly
      6. Verify: Average inference time ≤1.4s per image
    Expected Result: JSON output matches receipt, no parsing errors, performance target met
    Failure Indicators: Wrong items, split meal into multiple items, incorrect prices, too slow (>1.4s)
    Evidence: .sisyphus/evidence/task-7-vlm-output.json, task-7-performance.txt
  ```

  **Evidence to Capture**:
  - [ ] VLM output JSON (save to evidence file)
  - [ ] Performance benchmark results (5 runs + average)
  - [ ] Manual verification notes (text file: correct/incorrect fields)

  **Commit**: NO (test script is temporary debugging tool)

---

### Wave 3: Backend Integration (3 tasks, sequential after Waves 1+2)

- [ ] 8. Update /api/ocr to accept multiple files (VLM-only)

  **What to do**:
  - Open `backend/app/api/ocr.py`
  - Change endpoint signature to accept multiple files: `files: list[UploadFile]`
  - Loop through all files sequentially (not parallel — for predictable latency)
  - For each file: read bytes, call `vlm_service.extract_receipt_data()`
  - If VLM raises exception: return error in response dict (don't crash endpoint)
  - Collect all results in a list
  - **NO OCR FALLBACK** — VLM-only approach
  - Return list of results (merge happens in frontend or next task)

  **Must NOT do**:
  - Do NOT process images in parallel (sequential for predictable latency)
  - Do NOT add OCR fallback (VLM-only approach)
  - Do NOT merge results in this task (that's Task 9)
  - Do NOT skip error handling (collect errors from all images)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: API signature change, loop logic, error handling
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: Task 9 (merge logic needs multi-file endpoint)
  - **Blocked By**: Task 6, 7 (VLM must be verified accurate and fast)

  **References**:
  
  **Current Endpoint**:
  - `backend/app/api/ocr.py` - Single file endpoint

  **Target Code**:
  ```python
  from fastapi import APIRouter, UploadFile, HTTPException
  from app.services import vlm_service
  from app.models.schemas import OCRResponse
  
  router = APIRouter()
  
  @router.post("/ocr", response_model=list[OCRResponse])
  async def process_receipts(files: list[UploadFile]):
      results = []
      
      for file in files:
          image_bytes = await file.read()
          
          try:
              # VLM-only (no OCR fallback)
              result = vlm_service.extract_receipt_data(image_bytes)
          except Exception as e:
              # VLM failed — return error in response
              result = {
                  "order_number": "",
                  "items": [],
                  "subtotal": 0.0,
                  "total": 0.0,
                  "is_valid": False,
                  "errors": [f"VLM parsing failed: {str(e)}"]
              }
          
          results.append(result)
      
      return results
  ```

  **Acceptance Criteria**:
  - [ ] Endpoint accepts `files: list[UploadFile]`
  - [ ] Loops through files sequentially (not parallel)
  - [ ] Calls VLM service for each file
  - [ ] Collects errors without crashing endpoint
  - [ ] Returns `list[OCRResponse]`
  - [ ] No OCR fallback (VLM-only)
  - [ ] Python type checks pass

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Endpoint accepts multiple files
    Tool: Bash (curl test)
    Preconditions: Endpoint updated, backend running
    Steps:
      1. cd backend && python -m app.main (start server)
      2. curl -X POST http://localhost:8000/api/ocr \
         -F "files=@../testrun.jpg" \
         -F "files=@../testrun.jpg"
      3. Assert: Returns JSON array with 2 elements
      4. Verify: Each element has order_number, items[], subtotal, total
    Expected Result: Multi-file upload works, returns array of results
    Failure Indicators: 400/500 error, single result instead of array, server crash
    Evidence: .sisyphus/evidence/task-8-multi-file-api.json
  ```

  **Evidence to Capture**:
  - [ ] curl test output (JSON response)
  - [ ] Server logs (no errors)

  **Commit**: YES
  - Message: `feat(backend): accept multiple receipt images in /api/ocr (VLM-only)`
  - Files: `backend/app/api/ocr.py`
  - Pre-commit: Python syntax check

---

- [ ] 9. Implement merge logic (combine items, sum totals)

  **What to do**:
  - Add `merge_ocr_results(results: list[dict]) -> dict` function to `ocr.py`
  - Deduplicate items by name (if same item appears in multiple receipts, sum quantities)
  - Sum subtotals and totals across all results
  - Collect all errors from all results
  - HKUST validation: true if ANY result is valid
  - Take first order number (or concatenate if different)
  - Return single merged `OCRResponse`

  **Must NOT do**:
  - Do NOT lose items (all items from all receipts must be included)
  - Do NOT skip deduplication (same item name → sum quantities)
  - Do NOT average totals (SUM, not average)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex merge logic, deduplication, edge cases
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: Task 12 (integration tests need merge to work)
  - **Blocked By**: Task 8 (needs multi-file endpoint)

  **References**:
  
  **Merge Logic**:
  ```python
  def merge_ocr_results(results: list[dict]) -> dict:
      if not results:
          return {
              "order_number": "",
              "items": [],
              "subtotal": 0.0,
              "total": 0.0,
              "is_valid": False,
              "errors": ["No images processed"]
          }
      
      all_items: list[dict] = []
      item_map: dict[str, dict] = {}  # For deduplication
      
      for result in results:
          for item in result.get("items", []):
              name = item["name"].strip()
              if name in item_map:
                  # Duplicate item — sum quantities
                  item_map[name]["quantity"] += item["quantity"]
              else:
                  item_map[name] = item.copy()
      
      all_items = list(item_map.values())
      
      total_subtotal = sum(r.get("subtotal", 0.0) for r in results)
      total_amount = sum(r.get("total", 0.0) for r in results)
      all_errors = []
      for r in results:
          all_errors.extend(r.get("errors", []))
      
      any_valid = any(r.get("is_valid", False) for r in results)
      
      # Take first order number (or concatenate if different)
      order_numbers = [r.get("order_number", "") for r in results if r.get("order_number")]
      order_number = order_numbers[0] if order_numbers else ""
      
      return {
          "order_number": order_number,
          "items": all_items,
          "subtotal": total_subtotal,
          "total": total_amount,
          "is_valid": any_valid,
          "errors": all_errors
      }
  ```

  **Acceptance Criteria**:
  - [ ] Function signature: `merge_ocr_results(results: list[dict]) -> dict`
  - [ ] Combines items arrays (deduplicates by name, sums quantities)
  - [ ] Sums subtotal and total across all results
  - [ ] Collects all errors
  - [ ] HKUST validation: true if ANY result is valid
  - [ ] Handles empty results list (returns empty response)
  - [ ] Python type checks pass

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Merge combines items and sums totals
    Tool: Bash (Python REPL test)
    Preconditions: Function implemented
    Steps:
      1. cd backend
      2. python -c "
         from app.api.ocr import merge_ocr_results
         r1 = {'order_number': '206', 'items': [{'name': 'Item A', 'quantity': 1, 'price': 10.0}], 'subtotal': 10.0, 'total': 10.0, 'is_valid': True, 'errors': []}
         r2 = {'order_number': '207', 'items': [{'name': 'Item B', 'quantity': 2, 'price': 20.0}], 'subtotal': 20.0, 'total': 20.0, 'is_valid': False, 'errors': ['OCR warning']}
         merged = merge_ocr_results([r1, r2])
         assert len(merged['items']) == 2
         assert merged['subtotal'] == 30.0
         assert merged['total'] == 30.0
         assert merged['is_valid'] == True
         print('OK')
      "
      3. Assert: Prints "OK", all assertions pass
    Expected Result: Merge logic correct
    Failure Indicators: Assertion errors, wrong totals, lost items
    Evidence: .sisyphus/evidence/task-9-merge-logic.txt
  ```

  **Evidence to Capture**:
  - [ ] Unit test output
  - [ ] Manual test with 2-3 sample results

  **Commit**: YES
  - Message: `feat(backend): implement OCR result merging with deduplication`
  - Files: `backend/app/api/ocr.py` (or separate `merge_utils.py`)
  - Pre-commit: Python syntax check

---

- [ ] 10. Remove restaurant from OCRResponse schema

  **What to do**:
  - Open `backend/app/models/schemas.py`
  - Find `OCRResponse` class (around line 10-18)
  - Remove `restaurant: str` field (line 13 per AGENTS.md)
  - Keep all other fields: `order_number`, `items`, `subtotal`, `total`, `is_valid`, `errors`
  - Run Python type checks

  **Must NOT do**:
  - Do NOT remove other fields
  - Do NOT change frontend types (already handled in Wave 1)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single field removal, well-defined
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Task 8)
  - **Parallel Group**: Wave 3
  - **Blocks**: None (last schema change)
  - **Blocked By**: Task 8 (API must be updated first)

  **References**:
  
  **Current Schema**:
  - `backend/app/models/schemas.py:10-18` - OCRResponse class

  **Target Code**:
  ```python
  # BEFORE
  class OCRResponse(BaseModel):
      order_number: str
      restaurant: str  # ← DELETE THIS
      items: list[OrderItem]
      subtotal: float
      total: float
      is_valid: bool
      errors: list[str]

  # AFTER
  class OCRResponse(BaseModel):
      order_number: str
      items: list[OrderItem]
      subtotal: float
      total: float
      is_valid: bool
      errors: list[str]
  ```

  **Acceptance Criteria**:
  - [ ] `restaurant` field removed from OCRResponse
  - [ ] All other fields preserved
  - [ ] Python type checks pass
  - [ ] FastAPI startup succeeds (no Pydantic errors)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Schema no longer includes restaurant
    Tool: Bash
    Preconditions: File edited
    Steps:
      1. grep -n "restaurant" backend/app/models/schemas.py
      2. Verify: ZERO matches in OCRResponse class
      3. cd backend && python -m app.main (start server)
      4. Assert: Server starts without errors
    Expected Result: Restaurant removed, server starts cleanly
    Failure Indicators: Restaurant still in schema, Pydantic validation errors
    Evidence: .sisyphus/evidence/task-10-schema-update.txt
  ```

  **Evidence to Capture**:
  - [ ] Grep output (zero matches)
  - [ ] Server startup logs (no errors)

  **Commit**: YES
  - Message: `refactor(backend): remove restaurant field from OCRResponse`
  - Files: `backend/app/models/schemas.py`
  - Pre-commit: Python syntax check

---

### Wave 4: Cleanup + Testing (4 tasks, sequential after Wave 3)

- [ ] 11. Delete old OCR code (VLM-only approach)

  **What to do**:
  - Delete `backend/app/services/ocr_service.py` (RapidOCR service)
  - Delete `backend/app/services/receipt_parser.py` (regex parsing)
  - Remove RapidOCR dependency from `requirements.txt`: `rapidocr-onnxruntime`
  - Verify no imports of deleted modules remain in codebase

  **Must NOT do**:
  - Do NOT delete `vlm_service.py` (that's the new VLM service)
  - Do NOT delete other services (only OCR-related)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward file deletion, cleanup task
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential)
  - **Blocks**: None
  - **Blocked By**: Task 8, 9, 10 (must complete integration first)

  **References**:
  
  **Files to Delete**:
  - `backend/app/services/ocr_service.py` (31 lines, RapidOCR wrapper)
  - `backend/app/services/receipt_parser.py` (255 lines, regex parsing)

  **Grep Check** (verify no imports remain):
  ```bash
  grep -r "from app.services.ocr_service" backend/
  grep -r "from app.services.receipt_parser" backend/
  # Should return ZERO matches
  ```

  **Acceptance Criteria**:
  - [ ] `ocr_service.py` deleted
  - [ ] `receipt_parser.py` deleted
  - [ ] `rapidocr-onnxruntime` removed from requirements.txt
  - [ ] No imports of deleted modules remain (grep returns zero matches)
  - [ ] Backend starts without import errors

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Old OCR code completely removed
    Tool: Bash
    Preconditions: Files deleted
    Steps:
      1. ls backend/app/services/ | grep "ocr_service"
      2. Verify: File not found
      3. ls backend/app/services/ | grep "receipt_parser"
      4. Verify: File not found
      5. grep -r "ocr_service\|receipt_parser" backend/app/
      6. Verify: ZERO matches
      7. cd backend && python -m app.main
      8. Assert: Server starts without import errors
    Expected Result: Old OCR code removed, server starts cleanly
    Failure Indicators: Files still exist, import errors, server crash
    Evidence: .sisyphus/evidence/task-11-cleanup.txt
  ```

  **Evidence to Capture**:
  - [ ] ls output (files not found)
  - [ ] grep output (zero matches)
  - [ ] Server startup logs

  **Commit**: YES
  - Message: `refactor(backend): remove old OCR code (VLM-only approach)`
  - Files: Delete `ocr_service.py`, `receipt_parser.py`; edit `requirements.txt`
  - Pre-commit: Python syntax check

---

- [ ] 12. Integration test - single photo (testrun.jpg)

  **What to do**:
  - Start backend server: `cd backend && python -m app.main`
  - Start frontend: `cd frontend && npm start`
  - **Manual QA**:
    1. Open app on physical iPhone (user's device)
    2. Tap "Upload Receipt Photo"
    3. Select testrun.jpg from gallery (single photo)
    4. Verify Loading screen shows "Processing image 1 of 1..."
    5. Verify FormCorrectionScreen displays:
       - Order number: 206
       - Item: "Chicken McNuggets Meal (6pcs) w Filet-O-Fish" (ONE item)
       - Subtotal: $43.00
       - Total: $43.00
       - HKUST validation: ✓ (is_valid: true)
       - NO restaurant field visible
    6. Verify item structure is correct (meal NOT split into multiple items)

  **Must NOT do**:
  - Do NOT skip manual verification (automated tests can't verify VLM accuracy)
  - Do NOT proceed to Task 13 if output is incorrect

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: End-to-end testing, manual verification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential)
  - **Blocks**: Task 13 (multi-photo test)
  - **Blocked By**: Wave 1-3 (all implementation complete)

  **References**:
  
  **Test Image**: `testrun.jpg` (McDonald's receipt, Order #206)

  **Expected Result**:
  - Order #206
  - 1 item: "Chicken McNuggets Meal (6pcs) w Filet-O-Fish"
  - Subtotal: $43.00
  - Total: $43.00
  - HKUST validation: ✓

  **Acceptance Criteria**:
  - [ ] Backend and frontend running
  - [ ] Single photo upload works
  - [ ] Loading screen shows correct progress
  - [ ] FormCorrectionScreen displays correct data
  - [ ] Meal NOT split into multiple items (VLM understands structure)
  - [ ] No restaurant field visible
  - [ ] HKUST validation displayed correctly

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Single photo end-to-end test
    Tool: Manual QA on physical iPhone
    Preconditions: Backend + frontend running, testrun.jpg on device
    Steps:
      1. Open app on iPhone
      2. Tap "Upload Receipt Photo"
      3. Select testrun.jpg
      4. Wait for Loading screen
      5. Verify progress: "Processing image 1 of 1..."
      6. Wait for FormCorrectionScreen
      7. Verify: Order #206, 1 item (meal not split), $43.00, no restaurant field
      8. Take screenshot
    Expected Result: Correct parsing, meal structure preserved, no restaurant field
    Failure Indicators: Meal split into items, wrong totals, restaurant field visible, parsing errors
    Evidence: .sisyphus/evidence/task-12-single-photo-test.png (screenshot)
  ```

  **Evidence to Capture**:
  - [ ] Screenshot of FormCorrectionScreen (showing parsed data)
  - [ ] Backend logs (VLM inference time)

  **Commit**: NO (manual testing, no code changes)

---

- [ ] 13. Integration test - multiple photos (2-3 receipts)

  **What to do**:
  - Prepare 2-3 receipt screenshots (testrun.jpg + 2 more McDonald's receipts)
  - **Manual QA**:
    1. Open app on physical iPhone
    2. Tap "Upload Receipt Photo"
    3. Select 3 photos from gallery (multi-select)
    4. Verify Loading screen shows progress: "Processing image 1 of 3...", "2 of 3...", "3 of 3..."
    5. Verify FormCorrectionScreen displays:
       - Items from ALL receipts merged
       - If same item appears twice, quantity summed
       - Subtotal: sum of all receipts
       - Total: sum of all receipts
       - HKUST validation: ✓ (if ANY receipt is HKUST)
       - NO restaurant field visible
    6. Measure total processing time (should be ≤7 seconds for 3 images)

  **Must NOT do**:
  - Do NOT skip performance check (must meet 7s/5 images target)
  - Do NOT proceed to Task 14 if performance is too slow (>7s for 3 images)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multi-image testing, performance verification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential)
  - **Blocks**: Task 14 (final QA)
  - **Blocked By**: Task 12 (single photo must work first)

  **References**:
  
  **Test Images**: testrun.jpg + 2 more McDonald's receipts (user to provide)

  **Performance Target**: 3 images in ≤~4-5 seconds (scales to 5 images in ~7s)

  **Acceptance Criteria**:
  - [ ] Multi-photo upload works (3 photos selected)
  - [ ] Loading screen shows correct progress (1/3, 2/3, 3/3)
  - [ ] Items from all receipts merged correctly
  - [ ] Duplicate items deduplicated (quantities summed)
  - [ ] Totals summed across all receipts
  - [ ] HKUST validation works (ANY receipt valid → is_valid: true)
  - [ ] No restaurant field visible
  - [ ] Performance: 3 images in ≤5 seconds (meets target)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Multi-photo end-to-end test
    Tool: Manual QA on physical iPhone + stopwatch
    Preconditions: Backend + frontend running, 3 receipt images on device
    Steps:
      1. Open app on iPhone
      2. Tap "Upload Receipt Photo"
      3. Select 3 photos (multi-select)
      4. Start stopwatch when "Loading" screen appears
      5. Verify progress updates: 1/3, 2/3, 3/3
      6. Stop stopwatch when FormCorrectionScreen appears
      7. Verify: All items merged, totals summed, no restaurant field
      8. Record processing time
      9. Take screenshot
    Expected Result: Correct merge, performance ≤5s for 3 images, no restaurant field
    Failure Indicators: Lost items, wrong totals, >5s processing time, restaurant field visible
    Evidence: .sisyphus/evidence/task-13-multi-photo-test.png (screenshot), task-13-performance.txt (timing)
  ```

  **Evidence to Capture**:
  - [ ] Screenshot of FormCorrectionScreen (merged data)
  - [ ] Processing time (stopwatch measurement)
  - [ ] Backend logs (VLM inference times for each image)

  **Commit**: NO (manual testing, no code changes)

---

- [ ] 14. Manual QA on physical iPhone (final check)

  **What to do**:
  - Full end-to-end QA session on user's physical iPhone
  - Test all user flows:
    1. Single photo upload (testrun.jpg)
    2. Multi-photo upload (2-5 photos)
    3. Error handling (upload non-receipt image, verify graceful error)
    4. Form correction (edit items, quantities, prices)
    5. HKUST validation (verify indicator shows correctly)
    6. Performance (5 images in ≤7 seconds)
  - Verify UI polish:
    - No restaurant field anywhere
    - Loading spinner is #0055de blue
    - Upload button is #0055de blue
    - App title is "DeliverU"
    - Progress text updates correctly
  - Document any bugs or issues

  **Must NOT do**:
  - Do NOT skip any test scenarios
  - Do NOT mark complete if critical bugs found

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Comprehensive QA, user acceptance testing
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (final task)
  - **Blocks**: None (last task)
  - **Blocked By**: Task 13 (multi-photo must work first)

  **References**:
  
  **Test Scenarios**:
  1. Single photo upload
  2. Multi-photo upload (2-5 photos)
  3. Error handling (non-receipt image)
  4. Form correction
  5. HKUST validation
  6. Performance benchmark (5 images in ≤7s)

  **Acceptance Criteria**:
  - [ ] All test scenarios pass
  - [ ] No critical bugs found
  - [ ] UI polish verified (colors, branding, layout)
  - [ ] Performance target met (5 images in ≤7s)
  - [ ] No restaurant field visible anywhere
  - [ ] HKUST validation works correctly
  - [ ] Error handling graceful (no crashes)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Full end-to-end QA on physical iPhone
    Tool: Manual QA + checklist
    Preconditions: All tasks complete, app deployed to device
    Steps:
      1. Test single photo upload (testrun.jpg)
      2. Test multi-photo upload (2-5 photos)
      3. Test error handling (non-receipt image)
      4. Test form correction (edit items)
      5. Test HKUST validation (verify indicator)
      6. Test performance (5 images, stopwatch)
      7. Verify UI polish (colors, branding, no restaurant field)
      8. Document any bugs or issues
    Expected Result: All scenarios pass, no critical bugs, performance target met
    Failure Indicators: Crashes, wrong data, slow performance, UI issues, restaurant field visible
    Evidence: .sisyphus/evidence/task-14-final-qa-report.md (comprehensive test report)
  ```

  **Evidence to Capture**:
  - [ ] Comprehensive test report (all scenarios + results)
  - [ ] Screenshots of key screens
  - [ ] Performance measurements (5 images timing)
  - [ ] Bug list (if any)

  **Commit**: NO (QA only, no code changes)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` (frontend) + `python -m py_compile` (backend). Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check VLM prompt quality. Verify model files in .gitignore.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (multi-upload → VLM → merge → form). Test edge cases: empty receipts, non-receipt images, network errors. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Verify OCR code deleted. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

**Commits per task** (14 commits total):
1. `feat(ui): enable multi-photo upload in dashboard`
2. `refactor(types): update Loading route for multi-image array`
3. `feat(ui): process multiple receipt images with progress tracking`
4. `refactor(ui): remove restaurant field (HKUST-only service)`
5. `chore(backend): add SmolVLM dependencies and model setup`
6. `feat(backend): add SmolVLM service for receipt parsing (VLM-only)`
7. (No commit — test script)
8. `feat(backend): accept multiple receipt images in /api/ocr (VLM-only)`
9. `feat(backend): implement OCR result merging with deduplication`
10. `refactor(backend): remove restaurant field from OCRResponse`
11. `refactor(backend): remove old OCR code (VLM-only approach)`
12-14. (No commits — manual testing)

**Final commit** (after all tasks + final verification):
```
chore: VLM-only multi-photo receipt parsing complete

- Frontend: Multi-select upload (1-10 photos), sequential processing
- Backend: SmolVLM 2.2B Q4 integration, VLM-only approach
- Removed: Old OCR code (ocr_service.py, receipt_parser.py)
- Performance: 5 images in ≤7 seconds (sequential, ~1.4s per image)
- HKUST validation: Automatic, no user input
- Restaurant field: Removed from UI and schema
```

---

## Success Criteria

### Verification Commands

**Frontend**:
```bash
cd frontend
npx tsc --noEmit  # Expected: No errors
grep -r "restaurant" src/screens/FormCorrectionScreen.tsx  # Expected: Zero matches
grep "imageUris" src/types/navigation.ts  # Expected: Found (array type)
```

**Backend**:
```bash
cd backend
python -m py_compile app/**/*.py  # Expected: No syntax errors
ls app/services/ | grep "ocr_service\|receipt_parser"  # Expected: Not found
ls models/*.gguf  # Expected: 2 files (~1.5GB each)
python test_vlm.py  # Expected: Correct parsing, ≤1.4s per image
```

**Integration**:
```bash
# Backend running on localhost:8000
curl -X POST http://localhost:8000/api/ocr \
  -F "files=@testrun.jpg" \
  -F "files=@testrun.jpg"
# Expected: JSON array with 2 elements, merged correctly
```

### Final Checklist
- [ ] User can upload 1-10 photos in one action
- [ ] Loading screen shows progress (1/N, 2/N, ...)
- [ ] SmolVLM correctly parses meal structure (not split into items)
- [ ] Items from multiple photos merged (duplicates summed)
- [ ] Totals summed across all receipts
- [ ] No restaurant field visible in UI or API
- [ ] HKUST validation automatic (no user input)
- [ ] Performance: 5 images in ≤7 seconds
- [ ] Old OCR code deleted (ocr_service.py, receipt_parser.py)
- [ ] All "Must Have" delivered, all "Must NOT Have" absent
- [ ] TypeScript and Python type checks pass
- [ ] Manual QA passes on physical iPhone
