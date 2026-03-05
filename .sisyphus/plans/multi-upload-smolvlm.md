# Multi-Photo Upload + SmolVLM Receipt Understanding

## TL;DR

> **Quick Summary**: Enable multi-photo upload for receipts, remove restaurant field from form, integrate SmolVLM 2B for intelligent receipt parsing (understanding meal components, add-ons, hierarchical structure).
> 
> **Deliverables**:
> - Multiple photo upload (select 1-10 receipt screenshots)
> - SmolVLM backend integration (replaces RapidOCR + regex parsing)
> - Combined receipt processing (merge items from multiple photos into one order)
> - Simplified form (no restaurant field, HKUST validation behind the scenes)
> 
> **Estimated Effort**: Medium (2-4 hours implementation + testing)
> **Parallel Execution**: YES - 2 waves (frontend multi-upload + backend VLM can be developed in parallel)
> **Critical Path**: Research → Frontend changes → Backend VLM → Integration testing

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

### User Requirements
1. **Multiple photo upload**: Large orders may require 2-3 screenshots to capture all items
2. **Remove restaurant field**: Only serving HKUST, no need for user input (validate automatically behind the scenes)
3. **Better parsing**: Use SmolVLM to understand receipt structure, not just extract text
4. **Fallback strategy**: If SmolVLM fails (timeout, error), try OCR parsing; if both fail, let user manually enter items

### Research Findings

**SmolVLM Discovery** (key sources: HuggingFace, debuggercafe.com):
- ✅ **Fine-tuned receipt OCR model exists**: Pre-trained SmolVLM for receipt understanding
- ✅ **GGUF Q4 quantization available**: `ggml-org/SmolVLM2-2.2B-Instruct-GGUF` (~1.5GB memory, CPU-runnable)
- ✅ **llama.cpp integration**: Best inference engine for GGUF models (C++ backend, Python bindings)
- ⚠️ **vLLM not recommended**: Experimental GGUF support, under-optimized

**Current Data Flow** (from explore agent):
- Frontend: Single image picker → single `imageUri` string
- Loading screen: Calls `uploadReceipt(imageUri)` (single image)
- Backend: `/api/ocr` endpoint accepts one file
- Form: Displays `restaurant` field (lines 157-172), validates it as required (lines 69-72)

---

## Work Objectives

### Core Objective
Enable users to upload multiple receipt photos and use SmolVLM to intelligently parse them into a single combined order with accurate item understanding.

### Concrete Deliverables
1. **Frontend**:
   - `DashboardScreen.tsx`: Multi-select image picker (1-10 photos)
   - `LoadingScreen.tsx`: Process multiple images (parallel or sequential)
   - `FormCorrectionScreen.tsx`: Remove restaurant field, display combined items
   - `types/navigation.ts`: Update `OCRResult` and route params for arrays

2. **Backend**:
   - `backend/app/services/vlm_service.py`: NEW - SmolVLM inference service
   - `backend/app/api/ocr.py`: Accept multiple files, call VLM service, merge results
   - `backend/app/models/schemas.py`: Remove `restaurant` from response schema

### Definition of Done
- [ ] User can select 2-5 photos from gallery in one action
- [ ] Loading screen processes all photos (shows progress: "Processing image 2 of 3...")
- [ ] Backend runs SmolVLM on each image, extracts structured JSON (order_number, items[], subtotal, total)
- [ ] Items from multiple photos are merged into one list (no duplicates, quantities summed if same item)
- [ ] Totals are summed across all receipts
- [ ] Form displays combined order WITHOUT restaurant field
- [ ] HKUST validation happens automatically (check any photo for HKUST keywords, set `is_valid` flag)
- [ ] TypeScript and Python type checks pass
- [ ] Manual QA: Upload testrun.jpg (single photo) → correctly identifies meal structure
- [ ] Manual QA: Upload 2-3 receipt screenshots → correctly merges items

### Must Have
- Multi-photo upload (at least 2, max 10)
- SmolVLM Q4 quantized model (memory-efficient, CPU-runnable)
- Fallback to OCR if VLM fails
- Combined items list (merge logic for duplicates)
- HKUST validation (behind the scenes, no user input)

### Must NOT Have (Guardrails)
- Do NOT require restaurant field in form (remove it completely)
- Do NOT use vLLM (experimental GGUF support, not production-ready)
- Do NOT let users edit HKUST validation status (it's automatic)
- Do NOT show "Processing complete" until ALL photos are processed
- Do NOT crash if user uploads non-receipt images (return empty items[], add error message)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION for unit tests** — Manual QA required for VLM accuracy verification.

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

> Wave 1 (frontend) and Wave 2 (backend VLM research) can run in parallel.
> Wave 3 (integration) requires both to complete.

```
Wave 1 (Frontend Multi-Upload — START IMMEDIATELY):
├── Task 1: Update image picker to multi-select [quick]
├── Task 2: Update types for imageUri[] [quick]
├── Task 3: Update LoadingScreen for multiple images [unspecified-high]
└── Task 4: Remove restaurant field from FormCorrectionScreen [quick]

Wave 2 (Backend SmolVLM Setup — PARALLEL with Wave 1):
├── Task 5: Install SmolVLM dependencies (transformers/llama.cpp) [unspecified-high]
├── Task 6: Download SmolVLM Q4 GGUF model [quick]
├── Task 7: Create vlm_service.py with inference function [deep]
└── Task 8: Test VLM with testrun.jpg (verify accuracy) [unspecified-high]

Wave 3 (Backend Integration — AFTER Wave 2):
├── Task 9: Update /api/ocr to accept multiple files [unspecified-high]
├── Task 10: Implement merge logic (combine items, sum totals) [deep]
├── Task 11: Add fallback to OCR if VLM fails [unspecified-high]
└── Task 12: Remove restaurant from OCRResponse schema [quick]

Wave 4 (End-to-End Testing — AFTER Wave 3):
├── Task 13: Integration test with single photo (testrun.jpg) [unspecified-high]
├── Task 14: Integration test with 2-3 photos (real receipts) [unspecified-high]
└── Task 15: Manual QA on physical device (iPhone) [unspecified-high]

Critical Path: Task 5 → Task 7 → Task 8 → Task 9 → Task 10 → Task 13 → Task 15
Parallel Speedup: ~40% faster than sequential (Wave 1 || Wave 2)
Max Concurrent: 4 tasks (Wave 1) + 4 tasks (Wave 2) = 8 parallel
```

---

## TODOs

### Wave 1: Frontend Multi-Upload (4 tasks, parallel-safe)

- [ ] 1. Update image picker to multi-select mode

  **What to do**:
  - Open `frontend/src/screens/DashboardScreen.tsx`
  - Find `launchImageLibraryAsync` call (line ~41)
  - Add option: `allowsMultipleSelection: true`
  - Add option: `selectionLimit: 10` (max 10 photos)
  - Update navigation call to pass array of URIs instead of single URI
  - Handle `result.assets` array (currently only uses `result.assets[0]`)

  **Must NOT do**:
  - Do NOT change upload button style (already #0055de)
  - Do NOT change other image picker options (quality, mediaTypes)
  - Do NOT add progress bar yet (that's LoadingScreen's job)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple config change to existing ImagePicker, pass array instead of single value
  - **Skills**: []
    - No special skills needed for API option change

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Task 3 (LoadingScreen needs imageUris[] to iterate)
  - **Blocked By**: None (can start immediately)

  **References**:
  
  **File to Edit**:
  - `frontend/src/screens/DashboardScreen.tsx:41-44` - ImagePicker config
  - `frontend/src/screens/DashboardScreen.tsx:48-52` - Navigation call

  **API Reference**:
  - expo-image-picker docs: https://docs.expo.dev/versions/latest/sdk/imagepicker/#imagepickerlaunchimagelibraryasyncoptions
  - `allowsMultipleSelection` (boolean) - enables multi-select
  - `selectionLimit` (number) - max photos (iOS only, Android unlimited by default)

  **Current Code** (lines 41-52):
  ```typescript
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    navigation.navigate('Loading', {
      imageUri: result.assets[0].uri,  // ← SINGLE URI
    });
  }
  ```

  **Target Code**:
  ```typescript
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,  // ← ADD
    selectionLimit: 10,             // ← ADD
    quality: 0.8,
  });

  if (!result.canceled && result.assets.length > 0) {  // ← CHECK length
    navigation.navigate('Loading', {
      imageUris: result.assets.map(asset => asset.uri),  // ← ARRAY
    });
  }
  ```

  **Acceptance Criteria**:
  - [ ] `allowsMultipleSelection: true` added to picker config
  - [ ] `selectionLimit: 10` added to picker config
  - [ ] Navigation passes `imageUris` (array) instead of `imageUri` (string)
  - [ ] TypeScript compiles (may need to update types first — see Task 2)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: User can select multiple photos
    Tool: Read
    Preconditions: File edited
    Steps:
      1. Read DashboardScreen.tsx lines 41-52
      2. Verify: allowsMultipleSelection: true present
      3. Verify: selectionLimit: 10 present
      4. Verify: navigation.navigate passes imageUris array
    Expected Result: Config updated, navigation uses array
    Failure Indicators: Still uses single imageUri, selectionLimit missing
    Evidence: .sisyphus/evidence/task-1-multi-select.txt
  ```

  **Evidence to Capture**:
  - [ ] Grep output showing `allowsMultipleSelection: true`
  - [ ] Grep output showing `imageUris:` in navigation call

  **Commit**: YES
  - Message: `feat(ui): enable multi-photo upload for receipts (max 10)`
  - Files: `frontend/src/screens/DashboardScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 2. Update TypeScript types for multi-upload

  **What to do**:
  - Open `frontend/src/types/navigation.ts`
  - Find `RootStackParamList` interface (around line 19-22)
  - Change `Loading: { imageUri: string }` to `Loading: { imageUris: string[] }`
  - Update `OCRResult` interface if needed (explore agent says it already supports items[] array)
  - Verify no other types reference `imageUri` as a single string

  **Must NOT do**:
  - Do NOT change other route param types (Dashboard, FormCorrection)
  - Do NOT change OCRResult structure yet (that's backend Task 12)
  - Do NOT rename the Loading route

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single type change in interface definition
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Task 1 (TypeScript will error if types don't match navigation call)
  - **Blocked By**: None

  **References**:
  
  **File to Edit**:
  - `frontend/src/types/navigation.ts:19-22` - RootStackParamList.Loading

  **Current Type** (from explore agent):
  ```typescript
  export type RootStackParamList = {
    Dashboard: undefined;
    Loading: { imageUri: string };  // ← SINGLE STRING
    FormCorrection: { ocrResult: OCRResult };
  };
  ```

  **Target Type**:
  ```typescript
  export type RootStackParamList = {
    Dashboard: undefined;
    Loading: { imageUris: string[] };  // ← ARRAY
    FormCorrection: { ocrResult: OCRResult };
  };
  ```

  **Acceptance Criteria**:
  - [ ] `Loading: { imageUris: string[] }` (array type)
  - [ ] TypeScript compiles: `npx tsc --noEmit` exits with code 0
  - [ ] No other files reference `imageUri` as single string in Loading context

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Type definition updated for multi-upload
    Tool: Read + Bash
    Preconditions: File edited
    Steps:
      1. Read navigation.ts lines 15-25
      2. Verify: Loading: { imageUris: string[] }
      3. Run: npx tsc --noEmit
      4. Assert: Exit code 0, no errors
    Expected Result: Type is array, TypeScript clean
    Failure Indicators: Still single string, type errors in DashboardScreen
    Evidence: .sisyphus/evidence/task-2-types.txt
  ```

  **Evidence to Capture**:
  - [ ] Grep showing `imageUris: string[]`
  - [ ] TypeScript compilation output (clean)

  **Commit**: YES (group with Task 1)
  - Message: `feat(types): update Loading route for multi-image upload`
  - Files: `frontend/src/types/navigation.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 3. Update LoadingScreen to process multiple images

  **What to do**:
  - Open `frontend/src/screens/LoadingScreen.tsx`
  - Change `const { imageUri } = route.params;` to `const { imageUris } = route.params;`
  - Add state for progress: `const [currentImage, setCurrentImage] = useState(1);`
  - Update OCR call to loop through all images (either sequential or parallel)
  - Update loading messages to show progress: "Processing image 2 of 3..."
  - Merge OCR results from all images (combine items arrays, sum totals)
  - Pass merged result to FormCorrectionScreen

  **Must NOT do**:
  - Do NOT change spinner color (#0055de already set)
  - Do NOT add file upload progress (that's handled by axios)
  - Do NOT show individual errors for each image (collect all errors, show once at end)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Moderate complexity — loop logic, progress tracking, result merging
  - **Skills**: []
    - No special skills needed (React state + async logic)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Parallel Group**: Wave 1
  - **Blocks**: None (Wave 3 integration tests need this, but that's later)
  - **Blocked By**: Task 1 (needs imageUris[] to exist), Task 2 (types must match)

  **References**:
  
  **File to Edit**:
  - `frontend/src/screens/LoadingScreen.tsx:26` - Extract imageUris from params
  - `frontend/src/screens/LoadingScreen.tsx:54-89` - OCR processing useEffect
  - `frontend/src/screens/LoadingScreen.tsx:17-22` - Update MESSAGES array

  **Current Code** (lines 54-89 — simplified):
  ```typescript
  useEffect(() => {
    const process = async () => {
      try {
        const result = await uploadReceipt(imageUri);  // ← SINGLE IMAGE
        navigation.replace('FormCorrection', { ocrResult: result });
      } catch (error) {
        // ... error handling
      }
    };
    process();
  }, [imageUri, navigation]);
  ```

  **Target Code**:
  ```typescript
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
      5. Grep for "Processing image" in MESSAGES
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
  - Do NOT change form layout/styling (only remove restaurant field)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Remove a few lines (state, validation, input field)
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: None
  - **Blocked By**: None (independent change)

  **References**:
  
  **File to Edit**:
  - `frontend/src/screens/FormCorrectionScreen.tsx:24` - Remove restaurant state
  - `frontend/src/screens/FormCorrectionScreen.tsx:69-72` - Remove validation
  - `frontend/src/screens/FormCorrectionScreen.tsx:80` - Remove from payload
  - `frontend/src/screens/FormCorrectionScreen.tsx:157-172` - Remove TextInput

  **Lines to Remove** (from grep results):
  ```typescript
  // Line 24
  const [restaurant, setRestaurant] = useState(ocrResult.restaurant);
  
  // Lines 69-72
  if (!restaurant.trim()) {
    Alert.alert('Missing Info', 'Please enter the restaurant name.');
    return;
  }
  
  // Line 80
  restaurant: restaurant.trim(),
  
  // Lines 157-172 (entire TextInput for restaurant)
  <TextInput
    style={...}
    value={restaurant}
    onChangeText={setRestaurant}
    placeholder="Restaurant name"
  />
  ```

  **Acceptance Criteria**:
  - [ ] No `restaurant` state variable
  - [ ] No restaurant validation in submit handler
  - [ ] No restaurant in submission payload
  - [ ] No restaurant TextInput in render
  - [ ] `isValid` flag still displayed (read-only, shows HKUST validation status)
  - [ ] TypeScript compiles cleanly

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Restaurant field removed from form
    Tool: Read + Grep
    Preconditions: File edited
    Steps:
      1. Grep for "restaurant" in FormCorrectionScreen.tsx
      2. Assert: Only appears in ocrResult.restaurant reference (if any)
      3. Read lines 60-90 (submit handler)
      4. Verify: No restaurant validation, not in payload
      5. Run: npx tsc --noEmit
    Expected Result: Zero restaurant references, TypeScript clean
    Failure Indicators: restaurant state/validation still present, type errors
    Evidence: .sisyphus/evidence/task-4-remove-restaurant.txt
  ```

  **Evidence to Capture**:
  - [ ] Grep output (should find minimal/no matches)
  - [ ] TypeScript compilation output

  **Commit**: YES
  - Message: `refactor(ui): remove restaurant field (HKUST-only service)`
  - Files: `frontend/src/screens/FormCorrectionScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

### Wave 2: Backend SmolVLM Setup (4 tasks, parallel with Wave 1)

- [ ] 5. Install SmolVLM dependencies and download model

  **What to do**:
  - Add to `backend/requirements.txt`:
    - `transformers>=4.40.0` (HuggingFace Transformers for model loading)
    - `torch>=2.0.0` (PyTorch for inference)
    - `pillow>=10.0.0` (PIL for image handling)
    - Optional: `llama-cpp-python` (if using llama.cpp instead of transformers)
  - Run `pip install -r requirements.txt`
  - Download SmolVLM Q4 GGUF model:
    - Model: `ggml-org/SmolVLM2-2.2B-Instruct-GGUF`
    - File: `SmolVLM2-2.2B-Instruct-Q4_K_M.gguf` (~1.5GB)
    - Save to: `backend/models/` (create directory if not exists)
  - Verify model loads without errors

  **Must NOT do**:
  - Do NOT install vLLM (experimental GGUF support, not production-ready)
  - Do NOT download full-precision model (f16.gguf is 4GB+, too large)
  - Do NOT commit the model file to git (add `backend/models/` to .gitignore)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Model download takes time, need to verify it loads correctly
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Wave 1 tasks)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7 (vlm_service needs dependencies installed)
  - **Blocked By**: None

  **References**:
  
  **HuggingFace Model Card**:
  - URL: https://huggingface.co/ggml-org/SmolVLM2-2.2B-Instruct-GGUF
  - Files: SmolVLM2-2.2B-Instruct-Q4_K_M.gguf (recommended for CPU)
  - Also need: `mmproj-SmolVLM2-2.2B-Instruct-Q4_K_M.gguf` (multimodal projection weights)

  **Download Commands**:
  ```bash
  mkdir -p backend/models
  cd backend/models
  
  # Using huggingface-cli (recommended)
  pip install huggingface_hub
  huggingface-cli download ggml-org/SmolVLM2-2.2B-Instruct-GGUF \
    SmolVLM2-2.2B-Instruct-Q4_K_M.gguf \
    mmproj-SmolVLM2-2.2B-Instruct-Q4_K_M.gguf \
    --local-dir . \
    --local-dir-use-symlinks False
  ```

  **requirements.txt additions**:
  ```
  # Vision Language Model
  transformers>=4.40.0
  torch>=2.0.0
  pillow>=10.0.0
  huggingface_hub>=0.20.0
  
  # Optional: llama.cpp Python bindings (if using llama-cpp-python)
  # llama-cpp-python>=0.2.0
  ```

  **Acceptance Criteria**:
  - [ ] Dependencies added to requirements.txt
  - [ ] `pip install -r requirements.txt` succeeds
  - [ ] Model files downloaded to `backend/models/`
  - [ ] `backend/models/` added to `.gitignore`
  - [ ] Test: Can import transformers and torch in Python REPL

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Dependencies installed successfully
    Tool: Bash
    Preconditions: requirements.txt updated
    Steps:
      1. cd backend
      2. pip install -r requirements.txt
      3. python -c "import transformers, torch, PIL; print('OK')"
      4. Assert: Prints "OK", exit code 0
    Expected Result: All imports work
    Failure Indicators: Import errors, version conflicts
    Evidence: .sisyphus/evidence/task-5-deps.txt
  
  Scenario: Model downloaded successfully
    Tool: Bash
    Preconditions: Model download complete
    Steps:
      1. ls -lh backend/models/
      2. Verify: SmolVLM2-2.2B-Instruct-Q4_K_M.gguf exists (~1.5GB)
      3. Verify: mmproj-SmolVLM2-2.2B-Instruct-Q4_K_M.gguf exists
    Expected Result: Both files present, sizes correct
    Failure Indicators: Files missing, sizes way off (incomplete download)
    Evidence: .sisyphus/evidence/task-5-model.txt
  ```

  **Evidence to Capture**:
  - [ ] pip install output (success)
  - [ ] ls -lh output showing model files
  - [ ] Import test output

  **Commit**: YES
  - Message: `build(deps): add SmolVLM dependencies and model download`
  - Files: `backend/requirements.txt`, `.gitignore`
  - Pre-commit: `pip install -r requirements.txt` (verify no errors)

---

- [ ] 6. Create vlm_service.py with SmolVLM inference

  **What to do**:
  - Create new file: `backend/app/services/vlm_service.py`
  - Implement `extract_receipt_data(image_bytes: bytes) -> dict` function
  - Load SmolVLM Q4 model (singleton pattern, initialize once)
  - Run inference: image → SmolVLM → structured JSON
  - Parse model output to extract: order_number, items (with quantities, prices), subtotal, total
  - Return same structure as current OCRResponse (compatible with existing schema)
  - Handle errors: timeout, invalid output, parsing failures

  **Must NOT do**:
  - Do NOT modify existing ocr_service.py (keep it as fallback)
  - Do NOT use synchronous blocking calls (use async or separate thread)
  - Do NOT skip error handling (VLM can hallucinate or return invalid JSON)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex integration — model loading, inference, output parsing, error handling
  - **Skills**: []
    - No special skills needed (Python + transformers knowledge sufficient)

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Task 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8 (testing needs this service to exist)
  - **Blocked By**: Task 5 (needs dependencies installed, model downloaded)

  **References**:
  
  **Example Integration** (from debuggercafe.com + HuggingFace):
  ```python
  from transformers import AutoProcessor, AutoModelForVision2Seq
  from PIL import Image
  import io
  
  # Singleton pattern (load once)
  _model = None
  _processor = None
  
  def _get_model():
      global _model, _processor
      if _model is None:
          model_path = "path/to/SmolVLM2-2.2B-Instruct-GGUF"
          _processor = AutoProcessor.from_pretrained(model_path)
          _model = AutoModelForVision2Seq.from_pretrained(model_path)
      return _model, _processor
  
  def extract_receipt_data(image_bytes: bytes) -> dict:
      image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
      model, processor = _get_model()
      
      prompt = "Extract the following from this McDonald's receipt: order number, items (with quantities and prices), subtotal, total. Return as JSON."
      
      inputs = processor(text=prompt, images=image, return_tensors="pt")
      outputs = model.generate(**inputs, max_new_tokens=500)
      text = processor.decode(outputs[0], skip_special_tokens=True)
      
      # Parse JSON from model output
      parsed = parse_vlm_output(text)
      return parsed
  ```

  **Output Format** (must match OCRResponse):
  ```python
  {
      "order_number": "206",
      "items": [
          {"name": "Chicken McNuggets Meal (6pcs) w Filet-O-Fish", "quantity": 1, "price": 43.0}
      ],
      "subtotal": 43.0,
      "total": 43.0,
      "is_valid": True,  # HKUST validation
      "errors": []
  }
  ```

  **Prompt Engineering** (critical for good results):
  ```
  You are a receipt parser. Extract structured data from this McDonald's receipt image.

  Required fields:
  - order_number: string (e.g., "206")
  - items: array of {name: string, quantity: int, price: float}
  - subtotal: float
  - total: float

  Important:
  - Understand meal structure: "Chicken McNuggets Meal w Filet-O-Fish" is ONE item, not two
  - Ignore messages like "No add-on, thank you!"
  - Return ONLY valid JSON, no explanations
  
  Format:
  {"order_number": "...", "items": [...], "subtotal": 0.0, "total": 0.0}
  ```

  **Acceptance Criteria**:
  - [ ] File created: `backend/app/services/vlm_service.py`
  - [ ] Function signature: `extract_receipt_data(image_bytes: bytes) -> dict`
  - [ ] Model loads successfully (singleton pattern)
  - [ ] Returns dict matching OCRResponse structure
  - [ ] Handles errors gracefully (returns errors[] list, doesn't crash)
  - [ ] Python type checks pass: `mypy vlm_service.py` (if mypy configured)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: VLM service loads model without errors
    Tool: Bash (Python REPL)
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
  - Message: `feat(backend): add SmolVLM service for receipt parsing`
  - Files: `backend/app/services/vlm_service.py`
  - Pre-commit: Python syntax check

---

- [ ] 7. Test VLM with testrun.jpg (verify accuracy)

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
  - Compare to current OCR output (which incorrectly parses it)

  **Must NOT do**:
  - Do NOT skip manual verification (VLM can hallucinate)
  - Do NOT proceed to Wave 3 if output is inaccurate (fix prompt first)
  - Do NOT commit test script (temporary debugging tool)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Testing + manual verification required
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Task 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Wave 3 (Task 9 — can't integrate until VLM is proven accurate)
  - **Blocked By**: Task 6 (needs vlm_service to exist)

  **References**:
  
  **Test Script Template**:
  ```python
  # backend/test_vlm.py
  import sys
  sys.path.insert(0, '.')
  
  from app.services.vlm_service import extract_receipt_data
  import json
  
  with open('../testrun.jpg', 'rb') as f:
      image_bytes = f.read()
  
  result = extract_receipt_data(image_bytes)
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
  - [ ] **Manual verification**: Output matches actual receipt content

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: VLM correctly parses testrun.jpg
    Tool: Bash + Manual Verification
    Preconditions: Test script created, testrun.jpg exists
    Steps:
      1. cd backend
      2. python test_vlm.py
      3. Save output to .sisyphus/evidence/task-7-vlm-output.json
      4. **MANUAL**: Compare output to testrun.jpg image
      5. Verify: Order number, items, prices match exactly
    Expected Result: JSON output matches receipt, no parsing errors
    Failure Indicators: Wrong items, split meal into multiple items, incorrect prices
    Evidence: .sisyphus/evidence/task-7-vlm-output.json
  ```

  **Evidence to Capture**:
  - [ ] VLM output JSON (save to evidence file)
  - [ ] Manual verification notes (text file: correct/incorrect fields)

  **Commit**: NO (test script is temporary debugging tool)

---

### Wave 3: Backend Integration (4 tasks, sequential after Wave 2)

- [ ] 8. Update /api/ocr to accept multiple files

  **What to do**:
  - Open `backend/app/api/ocr.py`
  - Change endpoint signature to accept multiple files: `files: list[UploadFile]`
  - Loop through all files, call VLM service for each
  - Collect results in a list
  - Return combined result (merge logic happens in next task)
  - Update error handling to collect errors from all images

  **Must NOT do**:
  - Do NOT remove single-file support yet (keep backward compatibility if needed)
  - Do NOT merge results in this task (that's Task 9)
  - Do NOT skip HKUST validation (still check any image for HKUST keywords)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: API signature change, loop logic, error handling
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: Task 9 (merge logic needs multi-file endpoint)
  - **Blocked By**: Task 7 (VLM must be verified accurate)

  **References**:
  
  **File to Edit**:
  - `backend/app/api/ocr.py` - Entire endpoint function

  **Current Signature**:
  ```python
  @router.post("/ocr", response_model=OCRResponse)
  async def process_receipt(file: UploadFile = File(...)):
      # Process single file
      pass
  ```

  **Target Signature**:
  ```python
  @router.post("/ocr", response_model=OCRResponse)
  async def process_receipt(files: list[UploadFile] = File(...)):
      # Process multiple files
      results = []
      for file in files:
          image_bytes = await file.read()
          result = vlm_service.extract_receipt_data(image_bytes)
          results.append(result)
      
      # Merge results (implement in Task 9)
      merged = merge_ocr_results(results)
      return merged
  ```

  **Acceptance Criteria**:
  - [ ] Endpoint accepts `list[UploadFile]`
  - [ ] Loops through all files
  - [ ] Calls VLM service for each image
  - [ ] Collects results in list
  - [ ] Returns merged result (merge function called, even if stub)
  - [ ] Python type checks pass

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Endpoint accepts multiple files
    Tool: Bash (curl)
    Preconditions: Endpoint updated, backend running
    Steps:
      1. Start FastAPI server: uvicorn app.main:app --reload
      2. Upload single file: curl -F "files=@testrun.jpg" http://localhost:8000/api/ocr
      3. Assert: Returns OCRResponse JSON
      4. Upload 2 files: curl -F "files=@test1.jpg" -F "files=@test2.jpg" http://localhost:8000/api/ocr
      5. Assert: Returns merged OCRResponse
    Expected Result: Both single and multi-file uploads work
    Failure Indicators: 422 validation error, crash on multiple files
    Evidence: .sisyphus/evidence/task-8-multi-upload.txt
  ```

  **Evidence to Capture**:
  - [ ] curl single-file output
  - [ ] curl multi-file output
  - [ ] Server logs (no errors)

  **Commit**: YES
  - Message: `feat(api): accept multiple receipt images in /api/ocr`
  - Files: `backend/app/api/ocr.py`
  - Pre-commit: Python syntax check

---

- [ ] 9. Implement merge logic (combine items, sum totals)

  **What to do**:
  - Create helper function: `merge_ocr_results(results: list[dict]) -> dict`
  - Combine `items` arrays from all results (simple concatenation for now)
  - Sum `subtotal` values from all results
  - Sum `total` values from all results
  - Take first `order_number` (or concatenate if different)
  - Collect all `errors` into one list
  - Set `is_valid = any(r['is_valid'] for r in results)` (HKUST validation)
  - Optional enhancement: deduplicate items (same name → sum quantities)

  **Must NOT do**:
  - Do NOT skip deduplication (if user uploads same receipt twice, don't double items)
  - Do NOT lose errors from individual images (collect all)
  - Do NOT crash if results list is empty (return empty OCRResponse)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Merge logic is complex — deduplication, summing, handling edge cases
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: Task 10 (fallback needs merge to exist)
  - **Blocked By**: Task 8 (needs multi-file endpoint)

  **References**:
  
  **Merge Function Signature**:
  ```python
  def merge_ocr_results(results: list[dict]) -> dict:
      """Merge multiple OCR results into one combined order."""
      pass
  ```

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

- [ ] 10. Add fallback to OCR if VLM fails

  **What to do**:
  - Wrap VLM call in try-except
  - If VLM raises exception (timeout, CUDA error, invalid output), fall back to current OCR
  - Call `ocr_service.extract_text()` + `receipt_parser.parse_receipt()`
  - Return OCR result with error message: "VLM failed, used OCR fallback"
  - Log VLM failures for debugging
  - If BOTH VLM and OCR fail, return empty items[] with both errors

  **Must NOT do**:
  - Do NOT remove VLM as primary method (it's more accurate)
  - Do NOT skip logging VLM errors (need to debug failures)
  - Do NOT crash endpoint if both methods fail (return valid OCRResponse with errors)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Error handling, fallback logic, logging
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: None (last backend task)
  - **Blocked By**: Task 9 (needs merge logic to exist)

  **References**:
  
  **Fallback Pattern**:
  ```python
  for file in files:
      image_bytes = await file.read()
      
      try:
          # Try VLM first (more accurate)
          result = vlm_service.extract_receipt_data(image_bytes)
      except Exception as e:
          logger.warning(f"VLM failed: {e}, falling back to OCR")
          try:
              # Fallback to OCR
              text_lines = ocr_service.extract_text(image_bytes)
              result = receipt_parser.parse_receipt(text_lines)
              result["errors"].append("VLM unavailable, used OCR fallback")
          except Exception as e2:
              logger.error(f"Both VLM and OCR failed: {e2}")
              result = {
                  "order_number": "",
                  "items": [],
                  "subtotal": 0.0,
                  "total": 0.0,
                  "is_valid": False,
                  "errors": [f"VLM error: {str(e)}", f"OCR error: {str(e2)}"]
              }
      
      results.append(result)
  ```

  **Acceptance Criteria**:
  - [ ] VLM wrapped in try-except
  - [ ] Falls back to OCR on VLM failure
  - [ ] Adds error message to results: "VLM unavailable, used OCR fallback"
  - [ ] Logs VLM failures (logger.warning or logger.error)
  - [ ] Returns valid OCRResponse even if both methods fail
  - [ ] Python type checks pass

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Fallback to OCR when VLM fails
    Tool: Bash + Manual Simulation
    Preconditions: Fallback logic implemented
    Steps:
      1. Temporarily break VLM (comment out model loading)
      2. Start backend: uvicorn app.main:app --reload
      3. Upload testrun.jpg: curl -F "files=@testrun.jpg" http://localhost:8000/api/ocr
      4. Verify: Returns OCRResponse (from OCR fallback)
      5. Check errors: Should contain "VLM unavailable, used OCR fallback"
      6. Restore VLM (uncomment model loading)
    Expected Result: Fallback activates, OCR result returned
    Failure Indicators: Endpoint crashes, 500 error, no fallback
    Evidence: .sisyphus/evidence/task-10-fallback.txt
  ```

  **Evidence to Capture**:
  - [ ] curl output with fallback error message
  - [ ] Server logs showing VLM failure + OCR fallback

  **Commit**: YES
  - Message: `feat(backend): add OCR fallback if VLM fails`
  - Files: `backend/app/api/ocr.py`
  - Pre-commit: Python syntax check

---

- [ ] 11. Remove restaurant from OCRResponse schema

  **What to do**:
  - Open `backend/app/models/schemas.py`
  - Find `OCRResponse` class (around line 10-18)
  - Remove `restaurant: str` field
  - Keep `is_valid: bool` field (HKUST validation result)
  - Update any code that references `restaurant` field (grep for it)
  - Backend no longer returns restaurant in API response

  **Must NOT do**:
  - Do NOT remove `is_valid` field (still needed for HKUST validation)
  - Do NOT change other fields (order_number, items, subtotal, total, errors)
  - Do NOT skip grep search (might be referenced in other files)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Remove a field from Pydantic schema
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (can be done anytime after Wave 2)
  - **Parallel Group**: Wave 3 (but independent)
  - **Blocks**: None
  - **Blocked By**: None (independent schema change)

  **References**:
  
  **File to Edit**:
  - `backend/app/models/schemas.py:10-18` - OCRResponse class

  **Current Schema** (from explore agent):
  ```python
  class OCRResponse(BaseModel):
      order_number: str
      restaurant: str  # ← REMOVE THIS
      items: list[OrderItem]
      subtotal: float
      total: float
      is_valid: bool
      errors: list[str]
      raw_text: str | None = None
  ```

  **Target Schema**:
  ```python
  class OCRResponse(BaseModel):
      order_number: str
      # restaurant removed — HKUST-only service
      items: list[OrderItem]
      subtotal: float
      total: float
      is_valid: bool  # ← KEEP THIS (HKUST validation result)
      errors: list[str]
      raw_text: str | None = None
  ```

  **Acceptance Criteria**:
  - [ ] `restaurant` field removed from OCRResponse
  - [ ] `is_valid` field still present
  - [ ] Grep search confirms no other files reference `restaurant` in OCRResponse context
  - [ ] Python type checks pass
  - [ ] Backend starts without errors

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Schema updated, restaurant field removed
    Tool: Read + Bash
    Preconditions: File edited
    Steps:
      1. Read schemas.py lines 10-18
      2. Verify: No "restaurant:" field in OCRResponse
      3. Verify: "is_valid:" field still present
      4. cd backend && python -m app.main
      5. Assert: Backend starts without errors
    Expected Result: Schema updated, no import/validation errors
    Failure Indicators: restaurant still present, is_valid removed, startup errors
    Evidence: .sisyphus/evidence/task-11-schema.txt
  ```

  **Evidence to Capture**:
  - [ ] Grep output confirming field removed
  - [ ] Backend startup logs (no errors)

  **Commit**: YES
  - Message: `refactor(backend): remove restaurant field from OCRResponse`
  - Files: `backend/app/models/schemas.py`
  - Pre-commit: Python syntax check

---

### Wave 4: End-to-End Testing (3 tasks, sequential after Wave 3)

- [ ] 12. Integration test: Single photo (testrun.jpg)

  **What to do**:
  - Start backend: `uvicorn app.main:app --reload`
  - Start frontend: `npm start` (Expo dev server)
  - Test on device/simulator:
    1. Open app → Dashboard
    2. Tap "Upload Receipt"
    3. Select testrun.jpg (single photo)
    4. Verify: LoadingScreen shows "Processing image 1 of 1..."
    5. Verify: FormCorrectionScreen displays:
       - Order number: 206
       - Item: "Chicken McNuggets Meal (6pcs) w Filet-O-Fish" (ONE item, not split)
       - Subtotal: 43.00
       - Total: 43.00
       - No restaurant field visible
       - HKUST validation indicator (green checkmark or similar)
  - Save screenshot evidence

  **Must NOT do**:
  - Do NOT skip manual testing (automated tests can't verify VLM accuracy)
  - Do NOT proceed if VLM output is incorrect (fix prompt/model first)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Manual QA required
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential)
  - **Blocks**: Task 13 (multi-photo test)
  - **Blocked By**: All Wave 3 tasks

  **References**:
  
  **Test Checklist**:
  - [ ] Backend running on localhost:8000
  - [ ] Frontend running (Expo dev server)
  - [ ] Device/simulator connected
  - [ ] testrun.jpg accessible in photo library

  **Expected Behavior**:
  1. Dashboard → "Upload Receipt" button (#0055de blue)
  2. Image picker opens → Select testrun.jpg
  3. LoadingScreen shows (#0055de spinner, "Processing image 1 of 1...")
  4. FormCorrectionScreen displays:
     - Order #: 206
     - Item: Chicken McNuggets Meal (6pcs) w Filet-O-Fish
     - Quantity: 1
     - Subtotal: HK$ 43.00
     - Total: HK$ 43.00
     - NO restaurant field
     - HKUST validation: ✓ (or "Valid" indicator)

  **Acceptance Criteria**:
  - [ ] App flow completes without crashes
  - [ ] VLM correctly parses testrun.jpg (meal structure preserved)
  - [ ] Form displays correct data (order number, items, totals)
  - [ ] No restaurant field visible
  - [ ] HKUST validation works (is_valid indicator shown)
  - [ ] Screenshot evidence captured

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Single-photo upload end-to-end
    Tool: Manual (device testing)
    Preconditions: Backend + frontend running
    Steps:
      1. Open app on device
      2. Tap "Upload Receipt"
      3. Select testrun.jpg
      4. Wait for processing
      5. Verify form displays correct data
      6. Take screenshot of FormCorrectionScreen
    Expected Result: Correct parsing, no errors, data matches receipt
    Failure Indicators: Wrong items, split meal, incorrect totals, crash
    Evidence: .sisyphus/evidence/task-12-single-photo.png (screenshot)
  ```

  **Evidence to Capture**:
  - [ ] Screenshot of FormCorrectionScreen with parsed data
  - [ ] Backend logs (VLM call, no errors)

  **Commit**: NO (testing only, no code changes)

---

- [ ] 13. Integration test: Multiple photos (2-3 receipts)

  **What to do**:
  - Prepare 2-3 different McDonald's receipt screenshots
  - Test on device/simulator:
    1. Open app → Dashboard
    2. Tap "Upload Receipt"
    3. Select 2-3 photos (multi-select)
    4. Verify: LoadingScreen shows progress ("Processing image 2 of 3...")
    5. Verify: FormCorrectionScreen displays:
       - Combined items from all receipts
       - Summed subtotal and total
       - No duplicate items (or quantities summed if same item)
       - HKUST validation (true if ANY photo is HKUST)
  - Test edge cases:
    - Upload same photo twice (should deduplicate or sum quantities)
    - Upload non-receipt image (should return errors, not crash)
  - Save screenshot evidence

  **Must NOT do**:
  - Do NOT skip edge case testing (duplicate/invalid images)
  - Do NOT proceed if merge logic is incorrect (items lost, totals wrong)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Manual QA with multiple scenarios
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential)
  - **Blocks**: None (last testing task)
  - **Blocked By**: Task 12 (single-photo test must pass first)

  **References**:
  
  **Test Scenarios**:
  1. **Happy path**: 2 different receipts → items combined, totals summed
  2. **Duplicate**: Same receipt twice → quantities summed OR deduplicated
  3. **Invalid**: 1 receipt + 1 non-receipt → valid items from receipt, error for invalid image

  **Expected Behavior** (2 receipts, $43 + $58):
  1. Select 2 photos → LoadingScreen "Processing image 1 of 2...", then "Processing image 2 of 2..."
  2. FormCorrectionScreen:
     - Items: Combined list from both receipts
     - Subtotal: 101.00 (43 + 58)
     - Total: 101.00
     - HKUST validation: ✓ (if any receipt is HKUST)

  **Acceptance Criteria**:
  - [ ] Multi-photo upload works (select 2-3 images)
  - [ ] LoadingScreen shows progress for each image
  - [ ] Items combined correctly (no lost items)
  - [ ] Totals summed correctly
  - [ ] Duplicate detection works (same item → quantity summed)
  - [ ] Invalid images handled gracefully (errors shown, no crash)
  - [ ] Screenshot evidence captured

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Multi-photo upload with combined results
    Tool: Manual (device testing)
    Preconditions: Backend + frontend running, 2+ receipt images ready
    Steps:
      1. Open app
      2. Tap "Upload Receipt", select 2-3 photos
      3. Observe LoadingScreen progress
      4. Verify form shows combined items + summed totals
      5. Take screenshot
    Expected Result: All items present, totals correct, no errors
    Failure Indicators: Lost items, wrong totals, crash, no progress shown
    Evidence: .sisyphus/evidence/task-13-multi-photo.png
  
  Scenario: Duplicate image handling
    Tool: Manual
    Steps:
      1. Upload same receipt twice
      2. Verify: Items deduplicated OR quantities doubled
    Expected Result: No lost items, totals correct
    Evidence: .sisyphus/evidence/task-13-duplicate.png
  
  Scenario: Invalid image handling
    Tool: Manual
    Steps:
      1. Upload 1 receipt + 1 random photo (not a receipt)
      2. Verify: Valid items from receipt, error for invalid image
      3. App doesn't crash
    Expected Result: Graceful error handling
    Evidence: .sisyphus/evidence/task-13-invalid.png
  ```

  **Evidence to Capture**:
  - [ ] Screenshot: multi-photo combined result
  - [ ] Screenshot: duplicate handling
  - [ ] Screenshot: invalid image error

  **Commit**: NO (testing only)

---

### Final Verification

After all tasks complete, perform comprehensive end-to-end verification:

**Manual QA Checklist**:
- [ ] Single-photo upload: testrun.jpg parsed correctly (meal structure preserved)
- [ ] Multi-photo upload: 2-3 receipts combined (items merged, totals summed)
- [ ] Duplicate handling: Same receipt twice doesn't duplicate items incorrectly
- [ ] Invalid image: Non-receipt image returns error, doesn't crash
- [ ] Form: No restaurant field visible, HKUST validation indicator works
- [ ] UI: Upload button #0055de, spinner #0055de, title "DeliverU"

**Technical Verification**:
```bash
# Frontend
cd frontend && npx tsc --noEmit  # Zero TypeScript errors

# Backend
cd backend && python -m app.main  # Starts without errors
```

**Fallback Verification**:
- [ ] Temporarily break VLM → upload receipt → OCR fallback activates → result still returned

**Performance Check**:
- [ ] Single photo: <5 seconds end-to-end (upload → VLM → display)
- [ ] 3 photos: <15 seconds end-to-end

---

## Success Criteria

**User Validation**:
1. User can select multiple receipt photos (2-10) in one action
2. Loading screen shows progress for each image
3. FormCorrectionScreen displays combined order without restaurant field
4. VLM correctly understands meal structure (no split items, correct add-ons)
5. HKUST validation works automatically (no user input needed)

**Technical Validation**:
- Zero TypeScript errors
- Zero Python type errors
- Backend starts without errors
- All manual QA scenarios pass
- Evidence files saved to `.sisyphus/evidence/`

**VLM Quality Threshold**:
- ≥90% accuracy on testrun.jpg (order number, items, totals)
- ≥80% accuracy on 5 random McDonald's receipts
- If below threshold → adjust prompt, consider fine-tuning

---

## Rollback Plan

If SmolVLM integration fails (poor accuracy, performance issues):

1. **Keep multi-photo frontend** (Task 1-4 complete, no rollback needed)
2. **Revert backend to OCR** (use current `ocr_service.py` + `receipt_parser.py`)
3. **User manually corrects items** (form already allows editing)
4. **Future**: Research alternative VLMs (GPT-4o-mini API, Claude 3.5 Haiku API, Qwen2.5-VL)

---

## Notes for Future Enhancements

1. **Fine-tune SmolVLM** on McDonald's receipts (if base model accuracy <90%)
2. **Optimize inference** with llama.cpp for faster CPU inference
3. **Add progress bar** for multi-photo uploads (not just "image N of M")
4. **Smart deduplication** (fuzzy matching for item names, not just exact match)
5. **Receipt validation** (verify total = sum of items + tax)
6. **Image quality check** (warn if image is blurry/unreadable before processing)
