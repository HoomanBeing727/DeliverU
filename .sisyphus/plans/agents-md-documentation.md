# Create Comprehensive AGENTS.md Documentation

## TL;DR

> **Quick Summary**: Generate a comprehensive AGENTS.md file containing build/test/lint commands and code style guidelines for the UST_Delivery project.
> 
> **Deliverables**:
> - Updated AGENTS.md file at project root with ~150 lines
> - Build/run/test commands for both frontend and backend
> - Code style conventions derived from actual codebase patterns
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO - single file write
> **Critical Path**: Single task

---

## Context

### Original Request
User requested analysis of the codebase to create an AGENTS.md file containing:
1. Build/lint/test commands (especially for running a single test)
2. Code style guidelines including imports, formatting, types, naming conventions, error handling

The file will be given to agentic coding agents operating in this repository. Target length: ~150 lines.

### Analysis Findings

**Backend (Python + FastAPI):**
- FastAPI app with OCR receipt processing
- Uses modern Python 3.10+ type hints (`list[str]`, `dict`, `float | None`)
- RapidOCR (ONNX) for text extraction
- No test framework configured yet (pytest recommended)
- No linter configured yet (ruff recommended)
- Import pattern: stdlib → third-party → local (`app.*`)

**Frontend (TypeScript + React Native + Expo):**
- React Native with Expo framework
- TypeScript strict mode enabled
- Navigation via `@react-navigation/native-stack`
- Theme context for styling
- Axios for API calls
- No test framework configured yet (jest recommended)
- No linter configured yet (eslint/prettier recommended)

**Current State:**
- Existing AGENTS.md is outdated (pre-development spec only)
- Need to replace with actual implementation details

---

## Work Objectives

### Core Objective
Create a comprehensive AGENTS.md file that documents build/test/lint commands and code style conventions for both frontend and backend.

### Concrete Deliverables
- `AGENTS.md` file at project root (`C:\Users\Embarrass\Desktop\vscode\UST_Delivery\AGENTS.md`)

### Definition of Done
- [x] File contains all build/run commands for frontend and backend
- [x] File contains test commands (with notes about setup if not configured)
- [x] File includes code style guidelines (imports, types, naming, formatting)
- [x] File documents project structure and conventions
- [x] File is approximately 150 lines long

### Must Have
- Accurate build/run commands tested in the actual environment
- Code style patterns derived from actual codebase
- Clear distinction between "implemented" vs "not yet configured"

### Must NOT Have (Guardrails)
- No invented/assumed conventions not present in codebase
- No outdated information from old AGENTS.md if contradicted by code
- No excessive verbosity - keep concise and actionable

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None (this is a documentation task)
- **Framework**: N/A

### QA Policy
Manual verification only (documentation task).

---

## Execution Strategy

### Parallel Execution Waves

Single task - no parallelization needed.

---

## TODOs

- [x] 1. Create Comprehensive AGENTS.md File

  **What to do**:
  - Delete existing outdated `AGENTS.md` file
  - Write new `AGENTS.md` with the following sections:
    - Project overview and status
    - Build/run/test commands for backend (Python)
    - Build/run/test commands for frontend (React Native)
    - Code style guidelines for Python (imports, types, naming, docstrings, error handling, formatting)
    - Code style guidelines for TypeScript (imports, types, naming, components, error handling, formatting)
    - Project structure diagram
    - API conventions and workflow
    - Domain concepts table
    - Anti-patterns to avoid
    - Notes for agents (what's implemented vs planned)
  - Target length: ~150 lines (flexible)

  **Must NOT do**:
  - Invent commands or conventions not present in codebase
  - Include outdated information contradicted by actual code

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file write task, content already prepared
  - **Skills**: []
    - No specialized skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Single task
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Codebase Files Analyzed**:
  - `frontend/package.json` - Build scripts and dependencies
  - `frontend/tsconfig.json` - TypeScript configuration
  - `frontend/src/services/api.ts` - API client patterns
  - `frontend/src/screens/FormCorrectionScreen.tsx` - Component structure
  - `frontend/src/types/navigation.ts` - Type definition patterns
  - `backend/requirements.txt` - Python dependencies
  - `backend/app/main.py` - FastAPI entry point and CORS config
  - `backend/app/api/ocr.py` - API route patterns
  - `backend/app/services/ocr_service.py` - Service layer patterns
  - `backend/app/services/receipt_parser.py` - Business logic patterns
  - `backend/app/models/schemas.py` - Pydantic schema patterns

  **Commands to Document**:
  - Backend: `python -m app.main`, `uvicorn app.main:app --reload`
  - Frontend: `npm start`, `npm run android`, `npm run ios`, `npm run web`
  - Type checking: `npx tsc --noEmit`
  - Future linting: `ruff check .`, `npx eslint . --fix`
  - Future testing: `pytest`, `npm test`

  **Content Template**:
  ```markdown
  # PROJECT KNOWLEDGE BASE
  
  ## OVERVIEW
  [Project description and status]
  
  ## BUILD/RUN/TEST COMMANDS
  ### Backend (FastAPI + Python)
  [Commands with examples]
  
  ### Frontend (React Native + Expo)
  [Commands with examples]
  
  ## CODE STYLE GUIDELINES
  ### Python Backend
  [Imports, types, naming, docstrings, error handling, formatting]
  
  ### TypeScript/React Native Frontend
  [Imports, types, naming, components, error handling, formatting]
  
  ## PROJECT STRUCTURE
  [Directory tree]
  
  ## CONVENTIONS
  [API patterns, workflows]
  
  ## DOMAIN CONCEPTS
  [Table of terms]
  
  ## ANTI-PATTERNS
  [What to avoid]
  
  ## NOTES FOR AGENTS
  [Implementation status, gotchas]
  ```

  **Acceptance Criteria**:

  \`\`\`
  Scenario: Verify AGENTS.md file is created with correct content
    Tool: Bash (cat)
    Preconditions: Working directory is project root
    Steps:
      1. Run: cat AGENTS.md | head -20
      2. Verify file starts with "# PROJECT KNOWLEDGE BASE"
      3. Verify sections present: OVERVIEW, BUILD/RUN/TEST, CODE STYLE, etc.
      4. Run: wc -l AGENTS.md
      5. Verify line count is approximately 150-200 lines
    Expected Result: File exists with all sections, ~150-200 lines
    Failure Indicators: File missing, wrong sections, way too short/long
    Evidence: .sisyphus/evidence/task-1-agents-md-created.txt

  Scenario: Verify commands are accurate
    Tool: Bash
    Preconditions: Backend and frontend environments set up
    Steps:
      1. cd backend && python -m app.main --help (verify command exists)
      2. cd frontend && npm start --help (verify command exists)
      3. cd frontend && npx tsc --noEmit (verify type checking works)
    Expected Result: Commands execute without "command not found" errors
    Failure Indicators: Any command fails with "not found"
    Evidence: .sisyphus/evidence/task-1-commands-verified.txt
  \`\`\`

  **Evidence to Capture:**
  - [ ] File content verification: task-1-agents-md-created.txt
  - [ ] Command verification: task-1-commands-verified.txt

  **Commit**: YES
  - Message: `docs: create comprehensive AGENTS.md with build/test commands and code style guidelines`
  - Files: `AGENTS.md`
  - Pre-commit: None (documentation only)

---

## Final Verification Wave

- [x] F1. **Documentation Quality Review** — `quick`
  Read AGENTS.md end-to-end. Verify: (1) All commands are real and match package.json/actual setup, (2) Code style guidelines match patterns in actual source files, (3) No contradictions with existing code, (4) Clear distinction between implemented vs planned features, (5) Approximately 150 lines (flexible).
  Output: `Accuracy [PASS/FAIL] | Completeness [PASS/FAIL] | Length [N lines] | VERDICT: APPROVE/REJECT`

---

## Commit Strategy

- **1 commit**: `docs: create comprehensive AGENTS.md with build/test commands and code style guidelines` — `AGENTS.md`

---

## Success Criteria

### Verification Commands
```bash
# Verify file exists and has content
cat AGENTS.md | head -20
wc -l AGENTS.md  # Expected: ~150-200 lines

# Verify commands are documented correctly
grep "npm start" AGENTS.md
grep "python -m app.main" AGENTS.md
grep "npx tsc --noEmit" AGENTS.md
```

### Final Checklist
- [x] AGENTS.md file created at project root
- [x] Contains accurate build/run/test commands
- [x] Contains code style guidelines from actual codebase
- [x] Approximately 150 lines
- [x] Clear and actionable for coding agents
