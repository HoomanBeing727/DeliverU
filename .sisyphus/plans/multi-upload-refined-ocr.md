# Multi-Photo Upload + Refined OCR Parsing (Structural Understanding)

## TL;DR

> **Quick Summary**: Enable multi-photo upload, refine OCR parsing to understand receipt structure via font metadata (bold = item title, indented = components). Fast, accurate, deterministic.
> 
> **Deliverables**:
> - Multiple photo upload (select 1-10 receipt screenshots) ✅ DONE (Wave 1)
> - Refined OCR parsing with section boundaries + font metadata
> - Sequential image processing with text concatenation
> - Combined receipt processing (merge items from multiple photos)
> - Simplified form (no restaurant field) ✅ DONE (Wave 1)
> 
> **Estimated Effort**: Short (1-2 hours implementation + testing)
> **Parallel Execution**: YES - 2 waves (backend OCR refinement + integration)
> **Critical Path**: OCR service update → Parser rewrite → API integration → Testing
> **Performance Target**: 5 images in ≤7 seconds (OCR is ~1-2s per image)

---

## Context

### Original Problem
Current OCR system (RapidOCR + basic regex) fails on complex McDonald's receipts:
- Cannot understand meal components (treats "Filet-O-Fish" in meal name as separate item instead of add-on)
- Extracts "No add-on, thank you!" as item property instead of recognizing it as a message
- No hierarchical understanding of receipt structure

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

### VLM Approach Failed
SmolVLM 2.2B Q4 tested (Task 7) with catastrophic results:
- **Performance**: 11.6s per image (8.3x slower than 1.4s target)
- **Accuracy**: Wrong order number, zero prices, failed validation
- **Decision**: Abandoned (archived to `.sisyphus/plans/archived/`)

### User's Breakthrough Insight 💡

**"The items should be between Order Summary and Payment Details, and item titles are bolded while descriptions are indented."**

This insight reveals the key: **OCR already captures visual structure via font metadata** (bounding box heights encode bold vs regular text). We just need to parse it correctly!

### Receipt Visual Structure
```
Order Summary               ← Section boundary (large, bold)
  
Chicken McNuggets®Meal      ← ITEM TITLE (bold, larger bbox)
(6pcs) w Filet-O-Fish       ← ITEM TITLE continued
  Chicken McNuggets® (6pcs) ← Component (indented, smaller bbox)
  Hot Mustard Sauce          ← Component
  Filet-O-Fish              ← Component
  Fries (M)                 ← Component
  Coca-Cola® No Sugar(M)    ← Component
  No add-on, thank you!     ← Message (filter out)

Payment Details             ← Section boundary (large, bold)
  Subtotal: HK$ 43.00
  Total: HK$ 43.00
```

### Research Findings

**RapidOCR Capabilities**:
- ✅ Returns bounding boxes `(x1,y1), (x2,y2), (x3,y3), (x4,y4)` for each text line
- ✅ Bounding box height encodes font size: `height = y3 - y1`
- ✅ Bold text typically has `height > 25px`, regular text `15-20px`
- ✅ Already fast: ~1-2 seconds per image on CPU

**Parsing Strategy**:
1. Extract text from all images first (concatenate for multi-image orders)
2. Find section boundaries: "Order Summary" → "Payment Details"
3. Detect bold lines via bounding box height (item titles)
4. Group indented lines under each title (components)
5. Filter messages ("No add-on, thank you!")
6. Extract prices from Payment Details section

---

## Work Objectives

### Core Objective
Enable users to upload multiple receipt photos and use refined OCR parsing with structural understanding (via font metadata) to accurately extract items with meal components. Fast, deterministic, no hallucinations.

### Concrete Deliverables
1. **Frontend** (✅ COMPLETE - Wave 1):
   - `DashboardScreen.tsx`: Multi-select image picker (1-10 photos)
   - `LoadingScreen.tsx`: Process multiple images sequentially
   - `FormCorrectionScreen.tsx`: Remove restaurant field
   - `types/navigation.ts`: Update types for arrays

2. **Backend**:
   - `backend/app/services/ocr_service.py`: Return font metadata (bounding boxes)
   - `backend/app/services/receipt_parser.py`: Rewrite with section extraction + bold detection
   - `backend/app/api/ocr.py`: Multi-file processing with text concatenation
   - `backend/app/models/schemas.py`: Remove `restaurant` field

### Definition of Done
- [ ] User can select 2-5 photos from gallery in one action ✅ DONE
- [ ] Backend extracts text from all images with bounding box metadata
- [ ] Parser correctly identifies item titles (bold) vs components (indented)
- [ ] Single meal item extracted: "Chicken McNuggets Meal (6pcs) w Filet-O-Fish"
- [ ] Components listed separately (not as separate items)
- [ ] Messages like "No add-on, thank you!" filtered out
- [ ] Items from multiple photos merged (no duplicates, quantities summed)
- [ ] Totals summed across all receipts
- [ ] Form displays combined order WITHOUT restaurant field ✅ DONE
- [ ] HKUST validation automatic (check any photo for keywords)
- [ ] Performance: 5 images processed in ≤7 seconds
- [ ] TypeScript and Python type checks pass

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (no pytest/jest configs)
- **Automated tests**: NONE (manual QA only)
- **Framework**: N/A

### QA Policy
Every task includes manual QA scenarios with evidence saved to `.sisyphus/evidence/`.

- **Backend parsing**: Use Bash (python REPL) to test functions
- **API endpoints**: Use Bash (curl) to send test images
- **Frontend**: Manual testing on physical iPhone

---

## Execution Strategy

### Parallel Execution Waves

> Frontend complete (Wave 1). Backend has 2 waves.

```
Wave 1: Frontend Multi-Upload (✅ COMPLETE - 4 tasks)
├── Task 1: Update image picker to multi-select ✅
├── Task 2: Update TypeScript types for arrays ✅
├── Task 3: Update LoadingScreen for multiple images ✅
└── Task 4: Remove restaurant field from form ✅

Wave 2: OCR Service Enhancement (3 tasks, sequential)
├── Task 5: Update ocr_service to return bounding boxes [quick]
├── Task 6: Rewrite receipt_parser with structural parsing [deep]
└── Task 7: Test parser with testrun.jpg (verify ONE meal item) [unspecified-high]

Wave 3: Backend Integration (3 tasks, sequential after Wave 2)
├── Task 8: Update /api/ocr for multi-file processing [unspecified-high]
├── Task 9: Implement text concatenation + merge logic [unspecified-high]
└── Task 10: Remove restaurant from OCRResponse schema [quick]

Wave 4: Testing + Cleanup (3 tasks, sequential after Wave 3)
├── Task 11: Integration test - single photo (testrun.jpg) [unspecified-high]
├── Task 12: Integration test - multiple photos (2-3 receipts) [deep]
└── Task 13: Manual QA on physical iPhone (end-to-end) [unspecified-high]

Critical Path: Task 1 → Task 5 → Task 6 → Task 7 → Task 8 → Task 11 → Task 12 → Task 13
Parallel Speedup: Minimal (mostly sequential due to dependencies)
Max Concurrent: 1 (backend tasks are serial)
```

---

## TODOs

> Wave 1 complete (4/4). Starting Wave 2.

### Wave 1: Frontend Multi-Upload (✅ COMPLETE)

- [x] 1. Update image picker to multi-select
- [x] 2. Update TypeScript types for image arrays
- [x] 3. Update LoadingScreen for multiple images
- [x] 4. Remove restaurant field from FormCorrectionScreen

**Commit**: `04e10d9` - "feat(ui): enable multi-photo upload, remove restaurant field"

---

### Wave 2: OCR Service Enhancement (3 tasks, sequential)



- [ ] 5. Update ocr_service to return bounding box metadata

  **What to do**:
  - Open `backend/app/services/ocr_service.py`
  - Modify `extract_text(image_bytes: bytes)` to return full OCR results
  - Instead of returning just text strings, return structured data:
    ```python
    [
      {
        "text": "Chicken McNuggets",
        "bbox": [(x1,y1), (x2,y2), (x3,y3), (x4,y4)],
        "height": 28,  # y3 - y1
        "confidence": 0.95
      },
      ...
    ]
    ```
  - Calculate `height` from bounding box: `bbox[2][1] - bbox[0][1]`
  - Keep function signature compatible (return dict with `ocr_results` key)

  **Must NOT do**:
  - Do NOT change function name (parser depends on it)
  - Do NOT remove text extraction (still needed for simple parsing)
  - Do NOT skip confidence values (useful for filtering low-quality OCR)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple data transformation, no complex logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Wave 1)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6 (parser needs bbox data)
  - **Blocked By**: Wave 1 (frontend complete)

  **References**:
  
  **RapidOCR Output Format**:
  ```python
  # rapidocr returns: List[Tuple[List[List[float]], str, float]]
  # Example: [([[x1,y1],[x2,y2],[x3,y3],[x4,y4]], "text", 0.95), ...]
  result = rapidocr.ocr(image_bytes)
  for bbox_list, text, confidence in result:
      height = bbox_list[2][1] - bbox_list[0][1]  # Bottom-left Y - Top-left Y
  ```

  **Current Implementation** (`backend/app/services/ocr_service.py`):
  ```python
  def extract_text(image_bytes: bytes) -> str:
      result = rapidocr_ocr.ocr(image_bytes)
      return "\n".join([item[1] for item in result])
  ```

  **Updated Implementation**:
  ```python
  def extract_text_with_metadata(image_bytes: bytes) -> dict:
      result = rapidocr_ocr.ocr(image_bytes)
      ocr_results = []
      for bbox_list, text, confidence in result:
          height = bbox_list[2][1] - bbox_list[0][1]
          ocr_results.append({
              "text": text,
              "bbox": bbox_list,
              "height": height,
              "confidence": confidence
          })
      return {
          "ocr_results": ocr_results,
          "full_text": "\n".join([r["text"] for r in ocr_results])
      }
  ```

  **Acceptance Criteria**:
  - [ ] Function returns dict with `ocr_results` and `full_text` keys
  - [ ] Each OCR result has `text`, `bbox`, `height`, `confidence` fields
  - [ ] `height` calculated correctly from bounding box
  - [ ] Python imports work (no errors)
  - [ ] Backward compatible (can still extract plain text via `full_text` key)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: OCR service returns bounding box metadata
    Tool: Bash (python REPL)
    Preconditions: testrun.jpg exists
    Steps:
      1. cd backend
      2. python -c "
         from app.services.ocr_service import extract_text_with_metadata
         with open('../testrun.jpg', 'rb') as f:
             result = extract_text_with_metadata(f.read())
         print(f'OCR results: {len(result[\"ocr_results\"])} lines')
         print(f'First result height: {result[\"ocr_results\"][0][\"height\"]}')
         print(f'Full text length: {len(result[\"full_text\"])}')
         "
      3. Assert: Prints OCR count, first height (should be ~20-30), full text length
    Expected Result: Metadata extracted, heights vary (bold=larger, regular=smaller)
    Failure Indicators: Missing keys, zero heights, errors
    Evidence: .sisyphus/evidence/task-5-ocr-metadata.txt
  ```

  **Evidence to Capture**:
  - [ ] Sample OCR result (first 3 lines with bbox data)
  - [ ] Height distribution (min, max, avg)

  **Commit**: YES
  - Message: `feat(backend): add bounding box metadata to OCR service`
  - Files: `backend/app/services/ocr_service.py`
  - Pre-commit: Python syntax check

---

- [ ] 6. Rewrite receipt_parser with structural understanding

  **What to do**:
  - Open `backend/app/services/receipt_parser.py`
  - Complete rewrite with new parsing strategy:
    1. **Section extraction**: Find text between "Order Summary" and "Payment Details"
    2. **Bold detection**: Use bbox height to identify item titles (height > 25px)
    3. **Component grouping**: Group indented lines (height 15-20px) under titles
    4. **Message filtering**: Skip lines like "No add-on, thank you!"
    5. **Multi-line titles**: Merge consecutive bold lines (e.g., "Chicken\nMcNuggets\nMeal")
  - New function: `parse_receipt_structured(ocr_results: list[dict]) -> dict`
  - Keep backward compatibility: Old `parse_receipt(text: str)` calls new function

  **Must NOT do**:
  - Do NOT remove old function entirely (API still calls it)
  - Do NOT hardcode font heights (receipts vary - use relative thresholds)
  - Do NOT skip price extraction from Payment Details section
  - Do NOT parse items outside Order Summary boundary

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex parsing logic, edge cases, meal structure understanding
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Task 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7, 8 (testing and API integration)
  - **Blocked By**: Task 5 (needs bbox metadata)

  **References**:
  
  **Parsing Algorithm**:
  ```python
  def parse_receipt_structured(ocr_results: list[dict]) -> dict:
      # Step 1: Find section boundaries
      summary_start = None
      payment_start = None
      for i, result in enumerate(ocr_results):
          text = result["text"].lower()
          if "order summary" in text or "訂單摘要" in text:
              summary_start = i
          if "payment details" in text or "付款詳情" in text:
              payment_start = i
              break
      
      if not summary_start or not payment_start:
          return {"error": "Section boundaries not found"}
      
      # Step 2: Extract items between boundaries
      item_section = ocr_results[summary_start+1:payment_start]
      
      # Step 3: Calculate height threshold (median of all heights)
      heights = [r["height"] for r in item_section]
      median_height = sorted(heights)[len(heights)//2]
      title_threshold = median_height * 1.3  # Titles are 30% taller than median
      
      # Step 4: Parse items (bold = title, indented = component)
      items = []
      current_item = None
      
      for result in item_section:
          text = result["text"].strip()
          height = result["height"]
          
          if not text:
              continue
          
          # Filter messages
          if "add-on" in text.lower() or "thank you" in text.lower():
              continue
          
          # Bold text = new item title
          if height > title_threshold:
              if current_item:
                  items.append(current_item)
              current_item = {
                  "name": text,
                  "quantity": 1,
                  "price": 0.0,
                  "components": []
              }
          # Regular text = component
          elif current_item:
              current_item["components"].append(text)
      
      if current_item:
          items.append(current_item)
      
      # Step 5: Merge multi-line titles
      for item in items:
          # If next item has no components, merge into previous
          pass  # TODO: implement merge logic
      
      # Step 6: Extract prices from Payment Details
      payment_section = ocr_results[payment_start:]
      subtotal = 0.0
      total = 0.0
      for result in payment_section:
          text = result["text"]
          if "subtotal" in text.lower() or "小計" in text:
              subtotal = extract_price(text)
          if "total" in text.lower() or "總計" in text:
              total = extract_price(text)
      
      return {
          "items": items,
          "subtotal": subtotal,
          "total": total,
          "errors": []
      }
  ```

  **Helper Functions**:
  ```python
  def extract_price(text: str) -> float:
      # Extract HK$ XX.XX pattern
      match = re.search(r"HK\$?\s*(\d+\.\d+)", text)
      return float(match.group(1)) if match else 0.0
  ```

  **Acceptance Criteria**:
  - [ ] Function `parse_receipt_structured` exists
  - [ ] Section boundaries correctly identified
  - [ ] Bold text detected via height threshold (adaptive, not hardcoded)
  - [ ] Items grouped with components
  - [ ] Messages filtered out
  - [ ] Prices extracted from Payment Details
  - [ ] No crashes on edge cases (missing sections, empty text)
  - [ ] Python imports work (no errors)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Parser correctly identifies meal structure
    Tool: Bash (python REPL)
    Preconditions: Task 5 complete, testrun.jpg available
    Steps:
      1. cd backend
      2. python -c "
         from app.services.ocr_service import extract_text_with_metadata
         from app.services.receipt_parser import parse_receipt_structured
         with open('../testrun.jpg', 'rb') as f:
             ocr_data = extract_text_with_metadata(f.read())
         result = parse_receipt_structured(ocr_data['ocr_results'])
         print(f'Items: {len(result[\"items\"])}')
         print(f'First item: {result[\"items\"][0][\"name\"]}')
         print(f'Components: {len(result[\"items\"][0][\"components\"])}')
         print(f'Subtotal: {result[\"subtotal\"]}')
         "
      3. Assert: 1 item, name contains "McNuggets", 5 components, subtotal=43.0
    Expected Result: ONE meal item with 5 components (McNuggets, Sauce, Filet, Fries, Coke)
    Failure Indicators: Multiple items, components as separate items, wrong prices
    Evidence: .sisyphus/evidence/task-6-parser-output.json
  ```

  **Evidence to Capture**:
  - [ ] Parsed output JSON (save full result)
  - [ ] Height threshold calculation (show median and threshold)
  - [ ] Item count (should be 1 for testrun.jpg)

  **Commit**: YES
  - Message: `feat(backend): rewrite receipt parser with structural understanding`
  - Files: `backend/app/services/receipt_parser.py`
  - Pre-commit: Python syntax check

---

- [ ] 7. Test parser with testrun.jpg (verify meal structure)

  **What to do**:
  - Create `backend/test_parser.py` script
  - Load testrun.jpg
  - Call OCR service → Parser
  - Verify output matches expected structure:
    - Order #: 206
    - Items: 1 (not multiple items)
    - Item name: "Chicken McNuggets Meal (6pcs) w Filet-O-Fish" (or multi-line equivalent)
    - Components: 5 (McNuggets, Sauce, Filet, Fries, Coke)
    - NO "No add-on, thank you!" in components
    - Subtotal: 43.00
    - Total: 43.00
  - Save output to evidence directory
  - Document any issues found

  **Must NOT do**:
  - Do NOT proceed to Wave 3 if parsing is wrong (fix parser first)
  - Do NOT skip manual verification (compare output to actual receipt image)
  - Do NOT commit test script (temporary debugging tool)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Manual verification + debugging if issues found
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Task 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Wave 3 (can't integrate until parsing proven correct)
  - **Blocked By**: Task 6 (needs parser)

  **References**:
  
  **Test Script Template**:
  ```python
  # backend/test_parser.py
  import sys
  import json
  sys.path.insert(0, '.')
  
  from app.services.ocr_service import extract_text_with_metadata
  from app.services.receipt_parser import parse_receipt_structured
  
  with open('../testrun.jpg', 'rb') as f:
      image_bytes = f.read()
  
  # Step 1: OCR extraction
  ocr_data = extract_text_with_metadata(image_bytes)
  print(f"OCR extracted {len(ocr_data['ocr_results'])} lines")
  
  # Step 2: Parse receipt
  result = parse_receipt_structured(ocr_data['ocr_results'])
  print("\nParsed Output:")
  print(json.dumps(result, indent=2, ensure_ascii=False))
  
  # Step 3: Verification
  print("\n=== MANUAL VERIFICATION ====")
  print(f"Items count: {len(result['items'])} (expected: 1)")
  if result['items']:
      item = result['items'][0]
      print(f"Item name: {item['name']}")
      print(f"Components: {len(item['components'])} (expected: 5)")
      print(f"  - {item['components']}")
  print(f"Subtotal: ${result['subtotal']:.2f} (expected: $43.00)")
  print(f"Total: ${result['total']:.2f} (expected: $43.00)")
  
  # Check for filtered message
  for comp in item['components']:
      if 'add-on' in comp.lower() or 'thank you' in comp.lower():
          print("❌ ERROR: Message not filtered!")
          break
  else:
      print("✅ Messages correctly filtered")
  ```

  **Expected Output**:
  ```json
  {
    "items": [
      {
        "name": "Chicken McNuggets Meal (6pcs) w Filet-O-Fish",
        "quantity": 1,
        "price": 0.0,
        "components": [
          "Chicken McNuggets® (6pcs)",
          "Hot Mustard Sauce",
          "Filet-O-Fish",
          "Fries (M)",
          "Coca-Cola® No Sugar(M)"
        ]
      }
    ],
    "subtotal": 43.0,
    "total": 43.0,
    "errors": []
  }
  ```

  **Acceptance Criteria**:
  - [ ] Test script runs without errors
  - [ ] Output is valid JSON
  - [ ] Items count: 1 (not multiple items)
  - [ ] Item name contains "McNuggets" and "Filet-O-Fish"
  - [ ] Components count: 5 (exactly)
  - [ ] No "No add-on, thank you!" in components list
  - [ ] Subtotal: 43.00
  - [ ] Total: 43.00
  - [ ] Manual verification: Output matches visual receipt structure

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Parser correctly extracts ONE meal item with components
    Tool: Bash + Manual Verification
    Preconditions: Test script created, testrun.jpg exists
    Steps:
      1. cd backend
      2. python test_parser.py > ../.sisyphus/evidence/task-7-parser-test.txt 2>&1
      3. cat ../.sisyphus/evidence/task-7-parser-test.txt
      4. MANUAL: Compare output to testrun.jpg image
      5. Verify: Item count=1, components=5, NO message in components
    Expected Result: ONE meal item, 5 components, correct prices, message filtered
    Failure Indicators: Multiple items, message in components, wrong prices
    Evidence: .sisyphus/evidence/task-7-parser-test.txt
  ```

  **Evidence to Capture**:
  - [ ] Test script output (full JSON + verification messages)
  - [ ] Manual verification notes (correct/incorrect fields)

  **Commit**: NO (test script is temporary debugging tool)

---

### Wave 3: Backend Integration (3 tasks, sequential after Wave 2)


- [ ] 8. Update /api/ocr to accept multiple files with text concatenation

  **What to do**:
  - Open `backend/app/api/ocr.py`
  - Change endpoint signature: `files: list[UploadFile]` (currently accepts single file)
  - Loop through files sequentially:
    1. Extract OCR data from each file
    2. Concatenate all `ocr_results` into one big list
    3. Parse the combined list as ONE receipt
  - Return single OCRResponse (merged from all images)
  - Handle errors gracefully (if one image fails, log but continue)

  **Must NOT do**:
  - Do NOT process images in parallel (sequential for simplicity)
  - Do NOT merge items in this task (parser handles that)
  - Do NOT skip error handling (collect errors from all images)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: API endpoint changes, multi-file handling, error collection
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Wave 2)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 11, 12 (testing needs this endpoint)
  - **Blocked By**: Task 7 (parser must be proven correct first)

  **References**:
  
  **Current Implementation**:
  ```python
  @router.post("/ocr", response_model=OCRResponse)
  async def ocr_endpoint(file: UploadFile = File(...)):
      image_bytes = await file.read()
      text = extract_text(image_bytes)
      parsed = parse_receipt(text)
      return OCRResponse(**parsed)
  ```

  **Updated Implementation**:
  ```python
  @router.post("/ocr", response_model=OCRResponse)
  async def ocr_endpoint(files: list[UploadFile] = File(...)):
      all_ocr_results = []
      all_errors = []
      
      # Extract OCR from all images
      for file in files:
          try:
              image_bytes = await file.read()
              ocr_data = extract_text_with_metadata(image_bytes)
              all_ocr_results.extend(ocr_data['ocr_results'])
          except Exception as e:
              all_errors.append(f"OCR failed for {file.filename}: {str(e)}")
      
      # Parse combined OCR results
      parsed = parse_receipt_structured(all_ocr_results)
      parsed['errors'].extend(all_errors)
      
      return OCRResponse(**parsed)
  ```

  **Acceptance Criteria**:
  - [ ] Endpoint accepts `files: list[UploadFile]`
  - [ ] All files processed sequentially
  - [ ] OCR results concatenated before parsing
  - [ ] Errors collected from all images
  - [ ] Returns single OCRResponse
  - [ ] Python type checks pass

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Endpoint processes single file
    Tool: Bash (curl)
    Preconditions: Backend running (uvicorn), testrun.jpg available
    Steps:
      1. cd backend && uvicorn app.main:app --reload &
      2. sleep 3
      3. curl -X POST http://localhost:8000/api/ocr \
           -F "files=@../testrun.jpg" \
           -H "Content-Type: multipart/form-data"
      4. Assert: Returns JSON with items array, subtotal, total
    Expected Result: Single-file upload works, response matches parser output
    Failure Indicators: 422 error, empty response, wrong structure
    Evidence: .sisyphus/evidence/task-8-single-file.json
  
  Scenario: Endpoint processes multiple files (stub test)
    Tool: Bash (curl)
    Preconditions: Backend running
    Steps:
      1. curl -X POST http://localhost:8000/api/ocr \
           -F "files=@../testrun.jpg" \
           -F "files=@../testrun.jpg" \
           -H "Content-Type: multipart/form-data"
      2. Assert: Returns JSON, no errors
    Expected Result: Multi-file upload works (stub: same file twice)
    Failure Indicators: 422 error, crash
    Evidence: .sisyphus/evidence/task-8-multi-file.json
  ```

  **Evidence to Capture**:
  - [ ] Single-file API response
  - [ ] Multi-file API response (stub test)

  **Commit**: YES
  - Message: `feat(backend): update OCR API for multi-file upload`
  - Files: `backend/app/api/ocr.py`
  - Pre-commit: Python syntax check

---

- [ ] 9. Implement item merge logic for multiple receipts

  **What to do**:
  - Open `backend/app/services/receipt_parser.py`
  - Add function: `merge_items(items: list[dict]) -> list[dict]`
  - Merge duplicate items:
    - Same name → sum quantities
    - Different names → keep separate
  - Deduplicate components within each item
  - Called automatically by parser when multiple receipts detected

  **Must NOT do**:
  - Do NOT merge items with different names
  - Do NOT lose components during merge
  - Do NOT modify original items (return new list)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Merge logic, deduplication, edge cases
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (can be done alongside Task 8)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 12 (multi-photo testing)
  - **Blocked By**: Task 6 (needs parser structure)

  **References**:
  
  **Merge Algorithm**:
  ```python
  def merge_items(items: list[dict]) -> list[dict]:
      merged = {}
      
      for item in items:
          name = item['name']
          if name in merged:
              # Merge quantities
              merged[name]['quantity'] += item['quantity']
              # Merge components (deduplicate)
              for comp in item['components']:
                  if comp not in merged[name]['components']:
                      merged[name]['components'].append(comp)
          else:
              # New item
              merged[name] = item.copy()
      
      return list(merged.values())
  ```

  **Acceptance Criteria**:
  - [ ] Function `merge_items` exists
  - [ ] Duplicate items merged (quantities summed)
  - [ ] Components deduplicated
  - [ ] Different items kept separate
  - [ ] No data loss
  - [ ] Python type checks pass

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Merge logic combines duplicate items
    Tool: Bash (python REPL)
    Preconditions: merge_items function exists
    Steps:
      1. cd backend
      2. python -c "
         from app.services.receipt_parser import merge_items
         items = [
             {'name': 'Item A', 'quantity': 1, 'components': ['X', 'Y']},
             {'name': 'Item A', 'quantity': 2, 'components': ['Y', 'Z']},
             {'name': 'Item B', 'quantity': 1, 'components': ['P']}
         ]
         merged = merge_items(items)
         print(f'Items: {len(merged)}')  # Expected: 2
         print(f'Item A qty: {merged[0][\"quantity\"]}')  # Expected: 3
         print(f'Item A comps: {len(merged[0][\"components\"])}')  # Expected: 3 (X,Y,Z)
         "
      3. Assert: 2 items, Item A qty=3, 3 unique components
    Expected Result: Items merged, quantities summed, components deduplicated
    Failure Indicators: Wrong count, lost components, duplicates
    Evidence: .sisyphus/evidence/task-9-merge-test.txt
  ```

  **Evidence to Capture**:
  - [ ] Merge test output

  **Commit**: YES
  - Message: `feat(backend): add item merge logic for multi-receipt processing`
  - Files: `backend/app/services/receipt_parser.py`
  - Pre-commit: Python syntax check

---

- [ ] 10. Remove restaurant field from OCRResponse schema

  **What to do**:
  - Open `backend/app/models/schemas.py`
  - Remove `restaurant: str` field from `OCRResponse` class
  - Keep `is_valid` field (HKUST validation flag)
  - Update any references in API/services

  **Must NOT do**:
  - Do NOT remove `is_valid` field (still needed for HKUST validation)
  - Do NOT skip type checks

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple schema change
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (independent of other Wave 3 tasks)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 11 (testing)
  - **Blocked By**: None

  **References**:
  
  **Current Schema**:
  ```python
  class OCRResponse(BaseModel):
      order_number: str
      restaurant: str  # ← REMOVE THIS
      items: list[OrderItem]
      subtotal: float
      total: float
      is_valid: bool
      errors: list[str]
  ```

  **Updated Schema**:
  ```python
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
  - [ ] `is_valid` field retained
  - [ ] Python type checks pass
  - [ ] No references to `restaurant` in parser/API

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Schema change doesn't break API
    Tool: Bash (curl)
    Preconditions: Backend running
    Steps:
      1. curl -X POST http://localhost:8000/api/ocr -F "files=@../testrun.jpg"
      2. Assert: Response JSON has no "restaurant" key
      3. Assert: Response has "is_valid" key
    Expected Result: API works, no restaurant field in response
    Failure Indicators: 500 error, restaurant field still present
    Evidence: .sisyphus/evidence/task-10-schema-test.json
  ```

  **Evidence to Capture**:
  - [ ] API response (verify no restaurant field)

  **Commit**: YES
  - Message: `refactor(backend): remove restaurant field from OCR response`
  - Files: `backend/app/models/schemas.py`
  - Pre-commit: Python type check

---

### Wave 4: Testing + Cleanup (3 tasks, sequential after Wave 3)


- [ ] 11. Integration test - single photo (testrun.jpg)

  **What to do**:
  - End-to-end test:
    1. Start backend server
    2. Upload testrun.jpg via curl
    3. Verify response matches expected output
  - Check:
    - Order number: 206
    - Items: 1
    - Item name contains "McNuggets" and "Filet-O-Fish"
    - Components: 5
    - Subtotal: 43.00
    - Total: 43.00
    - is_valid: true (HKUST receipt)
    - No errors
  - Save response to evidence

  **Must NOT do**:
  - Do NOT proceed to Task 12 if this fails
  - Do NOT skip manual comparison to actual receipt

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: End-to-end testing, debugging if issues
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Wave 3)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 12 (multi-photo test)
  - **Blocked By**: Wave 3 (all integration tasks)

  **References**:
  
  **Test Commands**:
  ```bash
  # Start backend
  cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
  sleep 3
  
  # Upload single photo
  curl -X POST http://localhost:8000/api/ocr \
       -F "files=@../testrun.jpg" \
       -H "Content-Type: multipart/form-data" \
       | jq . > ../.sisyphus/evidence/task-11-single-photo.json
  
  # Verify
  cat ../.sisyphus/evidence/task-11-single-photo.json
  ```

  **Expected Response**:
  ```json
  {
    "order_number": "206",
    "items": [
      {
        "name": "Chicken McNuggets Meal (6pcs) w Filet-O-Fish",
        "quantity": 1,
        "price": 43.0,
        "components": [
          "Chicken McNuggets® (6pcs)",
          "Hot Mustard Sauce",
          "Filet-O-Fish",
          "Fries (M)",
          "Coca-Cola® No Sugar(M)"
        ]
      }
    ],
    "subtotal": 43.0,
    "total": 43.0,
    "is_valid": true,
    "errors": []
  }
  ```

  **Acceptance Criteria**:
  - [ ] Backend starts successfully
  - [ ] API accepts upload
  - [ ] Response is valid JSON
  - [ ] Order number: 206
  - [ ] Items: 1 (not multiple)
  - [ ] Components: 5
  - [ ] Subtotal: 43.00
  - [ ] Total: 43.00
  - [ ] is_valid: true
  - [ ] No errors in response

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: End-to-end single photo upload
    Tool: Bash (curl + jq)
    Preconditions: Backend running, testrun.jpg exists
    Steps:
      1. Upload testrun.jpg to /api/ocr
      2. Save response to evidence file
      3. MANUAL: Compare response to testrun.jpg image
      4. Verify all fields match expected values
    Expected Result: Response matches expected JSON structure, all values correct
    Failure Indicators: Wrong order number, multiple items, incorrect prices
    Evidence: .sisyphus/evidence/task-11-single-photo.json
  ```

  **Evidence to Capture**:
  - [ ] API response JSON
  - [ ] Manual verification notes

  **Commit**: NO (integration test, no code changes)

---

- [ ] 12. Integration test - multiple photos (2-3 receipts)

  **What to do**:
  - Multi-photo test:
    1. Prepare 2-3 receipt screenshots (or duplicate testrun.jpg)
    2. Upload all photos in one request
    3. Verify items merged correctly
    4. Measure performance (should be ≤7s for 5 images)
  - Check:
    - Items merged if duplicates
    - Totals summed across receipts
    - Components preserved
    - Performance: ~1-2s per image
  - Save response to evidence

  **Must NOT do**:
  - Do NOT skip performance measurement
  - Do NOT proceed to Task 13 if performance > 7s for 5 images

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-photo testing, merge verification, performance check
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Task 11)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 13 (manual QA)
  - **Blocked By**: Task 11 (single photo must work first)

  **References**:
  
  **Test Commands**:
  ```bash
  # Upload 3 photos (stub: same file 3x)
  time curl -X POST http://localhost:8000/api/ocr \
       -F "files=@../testrun.jpg" \
       -F "files=@../testrun.jpg" \
       -F "files=@../testrun.jpg" \
       | jq . > ../.sisyphus/evidence/task-12-multi-photo.json
  
  # Note: "time" command shows elapsed time
  # Target: ≤5-6 seconds for 3 images (~2s per image)
  ```

  **Acceptance Criteria**:
  - [ ] Multi-photo upload works
  - [ ] Items merged correctly (if duplicates)
  - [ ] Totals summed
  - [ ] Components preserved
  - [ ] Performance: ≤2s per image average
  - [ ] Response is valid JSON

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Multi-photo upload with merge
    Tool: Bash (curl + time)
    Preconditions: Backend running
    Steps:
      1. Upload 3 copies of testrun.jpg
      2. Measure elapsed time
      3. Save response to evidence
      4. Verify: Items merged (qty=3 for same item), totals summed (43*3=129)
    Expected Result: Items merged, totals correct, time ≤6s
    Failure Indicators: Items not merged, wrong totals, too slow
    Evidence: .sisyphus/evidence/task-12-multi-photo.json, task-12-performance.txt
  ```

  **Evidence to Capture**:
  - [ ] Multi-photo API response
  - [ ] Performance measurement (elapsed time)

  **Commit**: NO (integration test)

---

- [ ] 13. Manual QA on physical iPhone (end-to-end)

  **What to do**:
  - Full end-to-end test on user's iPhone:
    1. Start backend on LAN (192.168.3.103:8000)
    2. Open app on iPhone
    3. Navigate to Dashboard
    4. Select 2-3 receipt screenshots from Photos
    5. Upload and wait for processing
    6. Verify FormCorrectionScreen shows:
       - Combined items (merged if duplicates)
       - No restaurant field
       - Correct totals
       - HKUST validation status
    7. Submit order
  - Document any issues
  - Test with real multi-screenshot order if available

  **Must NOT do**:
  - Do NOT skip this test (only way to verify full flow)
  - Do NOT test only on simulator (physical device required)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Manual testing, real device, documentation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (final verification)
  - **Parallel Group**: Wave 4
  - **Blocks**: None (last task)
  - **Blocked By**: Task 12 (backend must be proven working)

  **References**:
  
  **Test Checklist**:
  - [ ] Backend reachable from iPhone (192.168.3.103:8000)
  - [ ] Multi-select image picker works
  - [ ] Loading screen shows progress ("Processing 2 of 3...")
  - [ ] FormCorrectionScreen displays combined order
  - [ ] No restaurant field visible
  - [ ] Items correct (merged if duplicates)
  - [ ] Totals correct
  - [ ] HKUST validation indicator visible
  - [ ] Submit button works
  - [ ] No crashes or errors

  **Acceptance Criteria**:
  - [ ] Full flow works on physical iPhone
  - [ ] Multi-photo upload functional
  - [ ] Parsing correct (meal structure preserved)
  - [ ] UI displays combined order
  - [ ] No restaurant field
  - [ ] Performance acceptable (≤10s for 2-3 photos)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Full end-to-end flow on iPhone
    Tool: Manual testing + screenshots
    Preconditions: Backend running on LAN, app installed on iPhone
    Steps:
      1. Open app on iPhone
      2. Go to Dashboard
      3. Tap "Upload Receipt"
      4. Select 2-3 photos
      5. Wait for processing
      6. Verify FormCorrectionScreen
      7. Take screenshots at each step
    Expected Result: Full flow works, correct data displayed
    Failure Indicators: Crashes, wrong data, network errors
    Evidence: .sisyphus/evidence/task-13-iphone-screenshots/ (photos from device)
  ```

  **Evidence to Capture**:
  - [ ] Screenshots from iPhone (each step)
  - [ ] Manual verification notes

  **Commit**: NO (manual QA)

---

## Commit Strategy

**Wave 1**: 1 commit (frontend complete) ✅ DONE
- `04e10d9` - "feat(ui): enable multi-photo upload, remove restaurant field"

**Wave 2**: 2 commits (OCR + parser)
- Task 5: `feat(backend): add bounding box metadata to OCR service`
- Task 6: `feat(backend): rewrite receipt parser with structural understanding`

**Wave 3**: 3 commits (API integration)
- Task 8: `feat(backend): update OCR API for multi-file upload`
- Task 9: `feat(backend): add item merge logic for multi-receipt processing`
- Task 10: `refactor(backend): remove restaurant field from OCR response`

**Wave 4**: 0 commits (testing only)

---

## Success Criteria

### Verification Commands
```bash
# Backend type check
cd backend && python -m py_compile app/**/*.py

# Single photo test
curl -X POST http://localhost:8000/api/ocr -F "files=@testrun.jpg"

# Multi-photo test
time curl -X POST http://localhost:8000/api/ocr \
  -F "files=@testrun.jpg" \
  -F "files=@testrun.jpg" \
  -F "files=@testrun.jpg"

# Expected: ≤6 seconds for 3 images
```

### Final Checklist
- [ ] Multi-photo upload works (frontend) ✅ DONE
- [ ] OCR returns bounding box metadata
- [ ] Parser detects bold text (item titles)
- [ ] Parser groups components under titles
- [ ] Messages filtered ("No add-on, thank you!")
- [ ] ONE meal item extracted (not split)
- [ ] Multi-file API works
- [ ] Items merged across photos
- [ ] Restaurant field removed
- [ ] Performance: ≤7s for 5 images
- [ ] Full flow works on iPhone
- [ ] All type checks pass

---

## Notes

### Why This Works
1. **Font metadata encodes structure**: Bold = titles, regular = components
2. **Section boundaries are clear**: "Order Summary" → "Payment Details"
3. **Fast**: OCR ~1-2s per image (meets performance target)
4. **Deterministic**: Rule-based parsing, no hallucinations
5. **Multi-photo ready**: Concatenate text before parsing

### Advantages Over VLM
- ✅ **8x faster**: 1-2s vs 11.6s per image
- ✅ **No GPU needed**: CPU OCR is fast enough
- ✅ **Proven accurate**: RapidOCR reliably extracts text
- ✅ **No model downloads**: RapidOCR already in dependencies
- ✅ **Deterministic output**: No hallucinations or random errors

### Edge Cases Handled
- Multi-line item titles (e.g., "Chicken\nMcNuggets\nMeal")
- Messages mixed with components ("No add-on, thank you!")
- Multiple receipts with duplicate items (merge logic)
- Missing section boundaries (error handling)
- OCR failures on individual images (collect errors, continue)

### VLM Archived
- Original VLM plan archived to `.sisyphus/plans/archived/multi-upload-smolvlm-vlm-only-FAILED.md`
- Failure analysis documented in `WHY_VLM_FAILED.md`
- Reason: 8.3x slower than required, poor output quality
- May revisit if lighter models emerge or GPU becomes available
