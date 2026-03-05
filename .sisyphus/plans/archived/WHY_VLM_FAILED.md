# VLM Approach Failure Analysis

## Date: 2026-02-26

## Original Goal
Replace OCR+regex with SmolVLM 2.2B Q4 for intelligent receipt parsing that understands meal structure.

## Performance Target
- ≤1.4 seconds per image
- 5 images in ≤7 seconds total

## Actual Results
- **11.6 seconds per image** (8.3x slower than target)
- **58 seconds for 5 images** (8.3x slower than target)

## Accuracy Issues
- Order number: Wrong ("1" instead of "206")
- Prices: All zero (0.0 instead of 43.0)
- HKUST validation: Failed (false instead of true)
- Item structure: Correct (ONE meal item ✅)

## Root Causes
1. **Model size**: 2.2B parameters too heavy for fast CPU inference
2. **Handler mismatch**: `Llava15ChatHandler` doesn't format prompts correctly for SmolVLM
3. **No GPU**: CPU-only inference on 2B model is inherently slow
4. **Quantization limitations**: Q4 still not aggressive enough for speed

## Why We Can't Fix It Quickly
- Lighter models (Moondream2) unproven for receipt parsing
- GPU acceleration requires deployment infrastructure changes
- Alternative handlers require llama.cpp Python bindings research
- Performance gap (8.3x) too large to close with minor optimizations

## Decision
**Revert to OCR + refined regex parsing** with structural understanding via font metadata (bold = title, indented = components).

## Lessons Learned
- VLM = slow but accurate (when properly configured)
- OCR = fast but needs smart parsing
- Font metadata from OCR encodes visual structure (bold, indentation)
- User's insight: "bolded items = titles" is the key to meal structure parsing

## Archive Reason
Plan archived (not deleted) for future reference if:
- Lighter VLM models emerge (<1B parameters)
- GPU deployment becomes available
- Performance requirements change (accept 1-minute processing)
