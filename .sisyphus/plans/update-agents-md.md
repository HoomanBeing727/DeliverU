# Update AGENTS.md

## TL;DR

> **Quick Summary**: Replace existing AGENTS.md with improved version containing build/test commands, code style guidelines, and domain knowledge based on actual codebase analysis.
> 
> **Deliverables**:
> - Updated AGENTS.md (150 lines, comprehensive agent reference)
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO - single file
> **Critical Path**: Read draft → Replace file

---

## Context

### Original Request
User requested analysis of codebase to create/improve AGENTS.md with:
1. Build/lint/test commands (especially single test execution)
2. Code style guidelines (imports, formatting, types, naming, error handling)
3. ~150 lines long
4. Include any Cursor/Copilot rules (none found)

### Analysis Completed
Analyzed entire codebase:
- Backend: FastAPI + Python 3.13, RapidOCR, no test framework
- Frontend: React Native (Expo) + TypeScript strict mode
- No linter/formatter configs found
- Existing AGENTS.md is outdated (claims "no code yet")

### Draft Created
Comprehensive AGENTS.md content drafted in `.sisyphus/drafts/agents-md-update.md` with:
- Build/run commands for backend + frontend
- Python style guide (type hints, imports, naming)
- TypeScript/React Native style guide (no semicolons, single quotes, hooks)
- Error handling patterns
- Domain knowledge (OCR flow, HKUST validation)
- Business rules and anti-patterns

---

## Work Objectives

### Core Objective
Update AGENTS.md to reflect actual codebase conventions and provide clear guidance for coding agents working in this repository.

### Concrete Deliverables
- `C:\Users\Embarrass\Desktop\vscode\UST_Delivery\AGENTS.md` (replaced with new content)

### Definition of Done
- [ ] AGENTS.md contains build/run commands (verified by running them)
- [ ] Code style guidelines match actual codebase patterns
- [ ] File is ~150 lines (acceptable range: 140-180)
- [ ] No broken references or outdated information

### Must Have
- Build commands for backend (uvicorn) and frontend (expo)
- Code style extracted from existing files (not assumed)
- Domain knowledge about OCR flow and validation

### Must NOT Have (Guardrails)
- Generic advice not grounded in this codebase
- References to tools/frameworks not actually used
- Claims about linters/formatters that don't exist

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: N/A (documentation update only)

### QA Policy
Task includes agent-executed QA scenarios (see TODO below).
Evidence saved to `.sisyphus/evidence/task-1-*.txt`.

---

## Execution Strategy

### Single Task (Sequential)
- Task 1: Replace AGENTS.md with new content

---

## TODOs

- [ ] 1. Replace AGENTS.md with improved content

  **What to do**:
  - Read the new content from `.sisyphus/drafts/agents-md-update.md`
  - Replace `AGENTS.md` in project root with new content
  - Verify file was written successfully

  **Must NOT do**:
  - Don't modify any other files
  - Don't add content not in the draft
  - Don't change the draft location

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file replacement, straightforward task
  - **Skills**: []
    - Reason: No specialized skills needed for file replacement

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (only task)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - **Source**: `.sisyphus/drafts/agents-md-update.md` — New AGENTS.md content (complete file)
  - **Target**: `C:\Users\Embarrass\Desktop\vscode\UST_Delivery\AGENTS.md` — File to replace

  **Acceptance Criteria**:
  - [ ] File exists: `C:\Users\Embarrass\Desktop\vscode\UST_Delivery\AGENTS.md`
  - [ ] File length: 140-180 lines (verify with `wc -l` or equivalent)
  - [ ] Content includes "BUILD/RUN COMMANDS" section
  - [ ] Content includes "CODE STYLE" section

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Verify AGENTS.md was updated
    Tool: Bash (read/grep)
    Preconditions: Task completed
    Steps:
      1. Read AGENTS.md: cat AGENTS.md | head -20
      2. Check line count: wc -l AGENTS.md (or equivalent Windows command)
      3. Verify structure: grep -c "## BUILD/RUN COMMANDS" AGENTS.md
      4. Verify structure: grep -c "## CODE STYLE" AGENTS.md
    Expected Result: 
      - Line count between 140-180
      - Both section headers present (grep returns 1 for each)
      - File starts with "# PROJECT KNOWLEDGE BASE"
    Failure Indicators:
      - Line count outside range
      - Missing expected sections
      - File unchanged (still says "no code yet")
    Evidence: .sisyphus/evidence/task-1-verify-update.txt

  Scenario: Verify build commands are correct
    Tool: Bash
    Preconditions: Task completed
    Steps:
      1. Extract backend section: sed -n '/### Backend/,/### Frontend/p' AGENTS.md
      2. Verify mentions: grep -c "uvicorn" AGENTS.md
      3. Verify mentions: grep -c "expo start" AGENTS.md
    Expected Result:
      - "uvicorn" found at least once
      - "expo start" found at least once
      - Both backend and frontend commands documented
    Failure Indicators:
      - Missing commands for either stack
      - Generic commands not specific to this project
    Evidence: .sisyphus/evidence/task-1-verify-commands.txt
  ```

  **Evidence to Capture:**
  - [ ] task-1-verify-update.txt: File structure verification
  - [ ] task-1-verify-commands.txt: Build command verification

  **Commit**: YES
  - Message: `docs: update AGENTS.md with build commands and code style`
  - Files: `AGENTS.md`
  - Pre-commit: None (documentation only)

---

## Final Verification Wave

N/A (single trivial task, no final wave needed)

---

## Commit Strategy

Single commit after completing the file replacement.

---

## Success Criteria

### Verification Commands
```bash
# Check file exists and has correct structure
cat AGENTS.md | head -20
wc -l AGENTS.md  # Should be ~150 lines

# Verify key sections present
grep "## BUILD/RUN COMMANDS" AGENTS.md
grep "## CODE STYLE" AGENTS.md
grep "## DOMAIN KNOWLEDGE" AGENTS.md
```

### Final Checklist
- [ ] AGENTS.md updated with new content
- [ ] File length approximately 150 lines
- [ ] All sections from draft included
- [ ] Changes committed to git
