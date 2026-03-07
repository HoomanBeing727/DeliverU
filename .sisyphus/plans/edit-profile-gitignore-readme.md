# Edit Profile Screen + Gitignore Cleanup + README

## TL;DR

> **Quick Summary**: Add an Edit Profile screen (dark-mode aware), clean up `.gitignore` to stop tracking secrets/temp files, and create a standard dev README.
> 
> **Deliverables**:
> - `EditProfileScreen.tsx` — full edit profile with dark mode, pre-filled from current user data
> - Updated navigation (types, navigator, dashboard link)
> - Cleaned `.gitignore` + `backend/.env.example` + untracked secrets
> - `README.md` — 100-150 line standard dev README
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Wave 1 (3 parallel tasks) → Wave 2 (final verification)

---

## Context

### Original Request
User requested three tasks together:
1. Implement Edit Profile page (frontend only — backend API already exists)
2. Update .gitignore (fix tracked secrets, temp files)
3. Create a README.md

### Interview Summary
**Key Discussions**:
- **Dark mode**: User confirmed Edit Profile should support dark/light theme matching Dashboard pattern
- **Remove .env from tracking**: User approved removing `backend/.env` from git tracking and creating `.env.example`
- **README scope**: Standard dev README (~100-150 lines) with setup instructions, tech stack, project structure

**Research Findings**:
- `PUT /users/me/profile` backend endpoint already exists with full validation
- `setupProfile()` frontend API function already exists — reuse it
- `ProfileSetupScreen.tsx` (273 lines) is the exact template to follow
- `backend/.env` is tracked in git and contains `JWT_SECRET` and `DATABASE_URL` (secrets!)
- `mobile/tsc-output.txt` and 2 stale `.sisyphus/evidence/` files are tracked unnecessarily
- `models/` gitignore rule catches `backend/models/` — known gotcha, NOT touching it

### Metis Review
**Identified Gaps** (addressed):
- ChipSelector/RadioGroup have hardcoded light colors → Accept light-colored components in dark shell (no component modification)
- `setupProfile()` is PUT (full replace) → All fields must be sent every call, pre-fill from user state
- Null coalescing needed for array fields → Use `user?.field ?? []` pattern
- `models/` gitignore issue → Explicitly out of scope (separate concern)
- `.sisyphus/plans/*.md` tracked despite gitignore → Out of scope

---

## Work Objectives

### Core Objective
Ship three quality-of-life improvements: profile editing, security hygiene (gitignore), and developer onboarding (README).

### Concrete Deliverables
- `mobile/src/screens/EditProfileScreen.tsx` — New screen (~250 lines)
- `mobile/src/types/index.ts` — `EditProfile: undefined` added to `RootStackParamList`
- `mobile/src/navigation/RootNavigator.tsx` — New `Stack.Screen` for EditProfile
- `mobile/src/screens/DashboardScreen.tsx` — "Coming Soon" alert replaced with navigation
- `.gitignore` — `backend/.env` and `tsc-output.txt` rules added
- `backend/.env.example` — Placeholder env file created
- `README.md` — 100-150 line standard dev README
- Files untracked: `backend/.env`, `mobile/tsc-output.txt`, 2 stale evidence files

### Definition of Done
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `git ls-files --cached -- backend/.env` returns empty
- [ ] `git ls-files --cached -- mobile/tsc-output.txt` returns empty
- [ ] `backend/.env.example` exists with placeholder values
- [ ] `README.md` exists, 80-150 lines
- [ ] Edit Profile screen navigable from Dashboard profile section

### Must Have
- Dark mode support matching Dashboard's `isDark` pattern
- Pre-filled form fields from current user data
- All fields sent on save (PUT full replace)
- Back button at top of Edit Profile
- `refreshUser()` call after successful save
- `.env.example` with all env var keys but placeholder values

### Must NOT Have (Guardrails)
- DO NOT modify `ChipSelector.tsx`, `RadioGroup.tsx`, or `ProfileSetupScreen.tsx`
- DO NOT add new API functions — reuse `setupProfile()`
- DO NOT add new types — reuse `ProfileSetupPayload` from `users.ts`
- DO NOT use `any` type anywhere
- DO NOT delete `backend/.env` from disk (only untrack from git)
- DO NOT touch the `models/` gitignore rule
- DO NOT document individual API endpoints in README
- DO NOT add deployment or contributing guidelines to README
- DO NOT invoke pytest, jest, ruff, eslint, prettier (they don't exist)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (no test frameworks)
- **Automated tests**: None
- **Framework**: None — only `npx tsc --noEmit` available
- **QA Strategy**: Agent-executed QA scenarios per task

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use `npx tsc --noEmit` for type checking
- **Git operations**: Use `git ls-files --cached` and `git status` for verification
- **File existence**: Use `test -f` and `wc -l` commands

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — all 3 tasks independent):
├── Task 1: Edit Profile Screen (new screen + navigation wiring + dashboard link) [visual-engineering]
├── Task 2: Gitignore Cleanup (update rules, untrack files, create .env.example) [quick]
└── Task 3: README.md (create standard dev readme) [writing]

Wave 2 (After Wave 1 — verification):
└── Task 4: Final Verification (tsc, git status, evidence capture) [quick]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Real Manual QA (unspecified-high)
└── Task F4: Scope Fidelity Check (deep)

Critical Path: Wave 1 (parallel) → Wave 2 → Wave FINAL
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 3 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 4, F1-F4 |
| 2 | — | 4, F1-F4 |
| 3 | — | 4, F1-F4 |
| 4 | 1, 2, 3 | F1-F4 |
| F1-F4 | 4 | — |

### Agent Dispatch Summary

- **Wave 1**: **3** — T1 → `visual-engineering`, T2 → `quick`, T3 → `writing`
- **Wave 2**: **1** — T4 → `quick`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Edit Profile Screen + Navigation Wiring

  **What to do**:
  - Create `mobile/src/screens/EditProfileScreen.tsx` (~250 lines) modeled on `ProfileSetupScreen.tsx`
  - Add dark mode support using Dashboard's pattern: `const isDark = user?.dark_mode ?? false; const colors = isDark ? { background: '#1a1a2e', card: '#16213e', text: '#e0e0e0', ... } : { background: '#f0f4f8', card: '#ffffff', text: '#1a1a2e', ... }`
  - Pre-fill ALL form fields from `useAuth().user` with null coalescing: `user?.nickname ?? ''`, `user?.hall ?? ''`, `user?.order_times ?? []`, `user?.available_return_times ?? []`, `user?.take_order_locations ?? []`, `user?.delivery_habits ?? []`
  - Include fields: nickname (TextInput), hall (RadioGroup with HKUST_HALLS), order_times (ChipSelector with TIME_SLOTS), available_return_times (ChipSelector with TIME_SLOTS), take_order_locations (ChipSelector with TAKE_ORDER_LOCATIONS), delivery_habits (ChipSelector with DELIVERY_HABITS)
  - Title: "Edit Profile", Save button: "Save Changes"
  - Add back button at top: `TouchableOpacity` with `← Back` text calling `navigation.goBack()`
  - On save: call `setupProfile(payload)` from `mobile/src/api/users.ts`, then `refreshUser()`, then `navigation.goBack()`
  - Wrap save in `try/catch` with `Alert.alert('Error', 'Failed to update profile. Please try again.')`
  - Add `ScrollView` wrapper for content, `KeyboardAvoidingView` for input handling
  - Add `EditProfile: undefined` to `RootStackParamList` in `mobile/src/types/index.ts`
  - Add `<Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />` in `mobile/src/navigation/RootNavigator.tsx` inside the authenticated block (after line 52, alongside other authenticated screens)
  - In `mobile/src/screens/DashboardScreen.tsx`, replace the "Coming Soon" alert at line 250 with: `navigation.navigate('EditProfile')`
  - Import `EditProfileScreen` in RootNavigator

  **Must NOT do**:
  - DO NOT modify `ChipSelector.tsx`, `RadioGroup.tsx`, or `ProfileSetupScreen.tsx`
  - DO NOT create new API functions — reuse `setupProfile()` from `mobile/src/api/users.ts`
  - DO NOT add new types — reuse existing `ProfileSetupPayload` type (or inline the object shape)
  - DO NOT use `any` type
  - DO NOT use inline style objects — use `StyleSheet.create()` at file bottom
  - DO NOT add excessive comments (1-2 section comments max)

  **Recommended Agent Profile**:
  > This task creates a new React Native screen with dark mode theming and form UI.
  - **Category**: `visual-engineering`
    - Reason: New UI screen creation with dark/light theme support, form layout, styling
  - **Skills**: `[]`
    - No special skills needed — standard React Native screen
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — no browser testing, only `tsc` type check
    - `frontend-ui-ux`: Would be useful for design polish but scope is clear (copy ProfileSetup pattern)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4 (Final Verification)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `mobile/src/screens/ProfileSetupScreen.tsx` (entire file) — PRIMARY TEMPLATE. Copy field layout, validation flow, component usage. Key sections: state declarations (lines 20-30), form fields with ChipSelector/RadioGroup (lines 80-200), save handler (lines 50-75), StyleSheet (lines 240-273)
  - `mobile/src/screens/DashboardScreen.tsx:26-29` — Dark mode color pattern to copy exactly. Also line 250 — the "Coming Soon" alert to replace with `navigation.navigate('EditProfile')`
  - `mobile/src/screens/DashboardScreen.tsx:30-60` — Full dark/light color object structure to replicate

  **API/Type References** (contracts to implement against):
  - `mobile/src/api/users.ts:setupProfile()` — The API function to call on save. Takes `{ nickname, hall, order_times, available_return_times, take_order_locations, delivery_habits }`. Returns void on success, throws on error.
  - `mobile/src/types/index.ts:RootStackParamList` — Add `EditProfile: undefined` here. Currently at line 103-117.
  - `mobile/src/types/index.ts:UserProfile` — Shape of `user` object from `useAuth()`. Fields: `nickname`, `hall`, `order_times`, `available_return_times`, `take_order_locations`, `delivery_habits`, `dark_mode`.
  - `backend/schemas/user.py:ProfileSetupRequest` — Backend validation rules: nickname 2-20 chars no spaces, hall must be in VALID_HALLS, at least 1 item in each array field

  **Component References** (UI components to use as-is):
  - `mobile/src/components/ChipSelector.tsx` — Multi-select chip component. Props: `label`, `options`, `selected`, `onToggle`. DO NOT MODIFY.
  - `mobile/src/components/RadioGroup.tsx` — Single-select radio component. Props: `label`, `options`, `selected`, `onSelect`. DO NOT MODIFY.

  **Context References** (hooks to use):
  - `mobile/src/context/AuthContext.tsx:useAuth()` — Returns `{ user, refreshUser }`. Call `refreshUser()` after successful save.
  - `mobile/src/navigation/RootNavigator.tsx:43-52` — Authenticated screen block. Add EditProfile screen here.

  **Constants References** (data for form options):
  - `mobile/src/constants/dorms.ts` — Exports: `HKUST_HALLS`, `TIME_SLOTS`, `TAKE_ORDER_LOCATIONS`, `DELIVERY_HABITS`. Import all four.

  **WHY Each Reference Matters**:
  - ProfileSetupScreen is the exact template — same fields, same components, same validation, same API call. EditProfile is essentially ProfileSetupScreen + dark mode + pre-filled data + back button.
  - DashboardScreen dark mode pattern must be copied exactly for visual consistency.
  - Backend schema defines validation rules the form must respect (nickname length, required arrays).
  - Constants provide the options arrays for ChipSelector and RadioGroup components.

  **Acceptance Criteria**:

  - [ ] `EditProfileScreen.tsx` created in `mobile/src/screens/`
  - [ ] `EditProfile: undefined` added to `RootStackParamList` in `types/index.ts`
  - [ ] `Stack.Screen` for EditProfile added in `RootNavigator.tsx`
  - [ ] Dashboard "Coming Soon" alert replaced with `navigation.navigate('EditProfile')`
  - [ ] `npx tsc --noEmit` passes with zero errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript compilation passes
    Tool: Bash
    Preconditions: All files saved
    Steps:
      1. Run `npx tsc --noEmit` from `mobile/` directory
      2. Check exit code is 0
      3. Check stdout/stderr for zero errors
    Expected Result: Exit code 0, no error output
    Failure Indicators: Non-zero exit code, any line containing "error TS"
    Evidence: .sisyphus/evidence/task-1-tsc-check.txt

  Scenario: EditProfileScreen file structure is correct
    Tool: Bash
    Preconditions: Task implementation complete
    Steps:
      1. Run `test -f mobile/src/screens/EditProfileScreen.tsx && echo EXISTS`
      2. Search file for `StyleSheet.create` — must appear (no inline styles)
      3. Search file for `isDark` — must appear (dark mode support)
      4. Search file for `setupProfile` — must appear (API call)
      5. Search file for `refreshUser` — must appear (state refresh)
      6. Search file for `goBack` — must appear (back navigation)
      7. Search file for `any` type usage — must NOT appear
    Expected Result: File exists, all required patterns found, no `any` types
    Failure Indicators: Missing file, missing patterns, `any` type found
    Evidence: .sisyphus/evidence/task-1-file-structure.txt

  Scenario: Navigation wiring is correct
    Tool: Bash
    Preconditions: Task implementation complete
    Steps:
      1. Search `types/index.ts` for `EditProfile` — must appear in RootStackParamList
      2. Search `RootNavigator.tsx` for `EditProfile` — must appear as Stack.Screen
      3. Search `DashboardScreen.tsx` line ~250 for `navigate.*EditProfile` — must replace old alert
      4. Confirm `DashboardScreen.tsx` does NOT contain `Coming Soon` text anymore
    Expected Result: All navigation points wired correctly
    Failure Indicators: Missing route, missing screen registration, old alert still present
    Evidence: .sisyphus/evidence/task-1-navigation-wiring.txt

  Scenario: No forbidden modifications
    Tool: Bash
    Preconditions: Task implementation complete
    Steps:
      1. Run `git diff --name-only` and verify ChipSelector.tsx is NOT listed
      2. Verify RadioGroup.tsx is NOT listed
      3. Verify ProfileSetupScreen.tsx is NOT listed
    Expected Result: None of the forbidden files appear in git diff
    Failure Indicators: Any forbidden file appears in diff output
    Evidence: .sisyphus/evidence/task-1-no-forbidden-changes.txt
  ```

  **Evidence to Capture:**
  - [ ] `task-1-tsc-check.txt` — tsc output
  - [ ] `task-1-file-structure.txt` — file existence and pattern checks
  - [ ] `task-1-navigation-wiring.txt` — navigation verification
  - [ ] `task-1-no-forbidden-changes.txt` — git diff check

  **Commit**: YES
  - Message: `feat(mobile): add Edit Profile screen with dark mode support`
  - Files: `mobile/src/screens/EditProfileScreen.tsx`, `mobile/src/types/index.ts`, `mobile/src/navigation/RootNavigator.tsx`, `mobile/src/screens/DashboardScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 2. Gitignore Cleanup + Untrack Secrets

  **What to do**:
  - Add these lines to the root `.gitignore` file:
    ```
    # Secrets
    backend/.env
    
    # Temp files
    tsc-output.txt
    ```
  - Run `git rm --cached backend/.env` (untrack from git, keep on disk)
  - Run `git rm --cached mobile/tsc-output.txt` (untrack from git, keep on disk)
  - Run `git rm --cached .sisyphus/evidence/task-5-ocr-metadata.txt .sisyphus/evidence/task-6-parser-final.txt` (stale evidence files)
  - Create `backend/.env.example` with placeholder values:
    ```
    DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/ust_delivery
    JWT_SECRET=change-me-to-a-random-secret
    JWT_ALGORITHM=HS256
    JWT_EXPIRY_HOURS=24
    ```
  - Verify `backend/.env` still exists on disk after untracking

  **Must NOT do**:
  - DO NOT delete `backend/.env` from disk
  - DO NOT modify `backend/.env` contents
  - DO NOT touch the `models/` gitignore rule
  - DO NOT modify `mobile/.gitignore`
  - DO NOT untrack `.sisyphus/plans/` files (separate concern)

  **Recommended Agent Profile**:
  > Git operations + file creation. Simple, well-scoped task.
  - **Category**: `quick`
    - Reason: Small number of shell commands + one new file creation. No complex logic.
  - **Skills**: `['git-master']`
    - `git-master`: Needed for `git rm --cached` operations and ensuring correct git state
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not relevant — no browser interaction

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4 (Final Verification)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `.gitignore` (root, entire file) — Current gitignore rules. Add new rules at the end. Currently 59 lines. Has sections with comments.
  - `mobile/.gitignore` (entire file) — Reference only, DO NOT MODIFY. Shows mobile-specific ignore patterns.

  **File References** (files to untrack):
  - `backend/.env` — Contains `DATABASE_URL`, `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRY_HOURS`. These are secrets that should not be in git.
  - `mobile/tsc-output.txt` — Temp file from TypeScript compilation. Should not be tracked.
  - `.sisyphus/evidence/task-5-ocr-metadata.txt` — Stale evidence file from completed cart-extraction work.
  - `.sisyphus/evidence/task-6-parser-final.txt` — Stale evidence file from completed cart-extraction work.

  **Config References** (for .env.example):
  - `backend/config.py` — Pydantic Settings class showing all env vars used: `database_url`, `jwt_secret`, `jwt_algorithm`, `jwt_expiry_hours`. Use these exact names.
  - `backend/.env` — Current values (DO NOT copy secrets, only key names). Use placeholder values in .env.example.

  **WHY Each Reference Matters**:
  - Root `.gitignore` is where new rules go (not mobile/.gitignore)
  - `backend/config.py` defines the authoritative list of env vars the app needs — .env.example must match
  - The stale evidence files are tracked despite `.sisyphus/evidence/` being in .gitignore because they were added before the rule

  **Acceptance Criteria**:

  - [ ] `git ls-files --cached -- backend/.env` returns empty output
  - [ ] `git ls-files --cached -- mobile/tsc-output.txt` returns empty output
  - [ ] `git ls-files --cached -- .sisyphus/evidence/task-5-ocr-metadata.txt` returns empty output
  - [ ] `git ls-files --cached -- .sisyphus/evidence/task-6-parser-final.txt` returns empty output
  - [ ] `backend/.env` still exists on disk
  - [ ] `backend/.env.example` exists with 4 placeholder env vars
  - [ ] `.gitignore` contains `backend/.env` rule

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Secrets are untracked from git
    Tool: Bash
    Preconditions: git rm --cached commands have been run
    Steps:
      1. Run `git ls-files --cached -- backend/.env` — expect empty output
      2. Run `git ls-files --cached -- mobile/tsc-output.txt` — expect empty output
      3. Run `git ls-files --cached -- .sisyphus/evidence/task-5-ocr-metadata.txt` — expect empty output
      4. Run `git ls-files --cached -- .sisyphus/evidence/task-6-parser-final.txt` — expect empty output
    Expected Result: All 4 commands return empty output (files untracked)
    Failure Indicators: Any command returns a file path (still tracked)
    Evidence: .sisyphus/evidence/task-2-untrack-verify.txt

  Scenario: Files still exist on disk after untracking
    Tool: Bash
    Preconditions: git rm --cached commands have been run
    Steps:
      1. Run `test -f backend/.env && echo EXISTS || echo MISSING`
      2. Expect output: EXISTS
    Expected Result: backend/.env still exists on disk
    Failure Indicators: Output is MISSING (file was deleted, not just untracked)
    Evidence: .sisyphus/evidence/task-2-disk-verify.txt

  Scenario: .env.example has correct structure
    Tool: Bash
    Preconditions: backend/.env.example created
    Steps:
      1. Run `test -f backend/.env.example && echo EXISTS`
      2. Search for `DATABASE_URL=` in backend/.env.example — must be present
      3. Search for `JWT_SECRET=` in backend/.env.example — must be present
      4. Search for `JWT_ALGORITHM=` in backend/.env.example — must be present
      5. Search for `JWT_EXPIRY_HOURS=` in backend/.env.example — must be present
      6. Verify file does NOT contain actual secret values (no real JWT secret)
    Expected Result: File exists with all 4 env var keys and placeholder values
    Failure Indicators: Missing file, missing keys, or real secrets in placeholder file
    Evidence: .sisyphus/evidence/task-2-env-example.txt

  Scenario: .gitignore rules are added correctly
    Tool: Bash
    Preconditions: .gitignore has been updated
    Steps:
      1. Search `.gitignore` for `backend/.env` — must be present
      2. Search `.gitignore` for `tsc-output.txt` — must be present
    Expected Result: Both rules present in .gitignore
    Failure Indicators: Rules missing from .gitignore
    Evidence: .sisyphus/evidence/task-2-gitignore-rules.txt
  ```

  **Evidence to Capture:**
  - [ ] `task-2-untrack-verify.txt` — git ls-files output for all 4 files
  - [ ] `task-2-disk-verify.txt` — file existence check
  - [ ] `task-2-env-example.txt` — .env.example content verification
  - [ ] `task-2-gitignore-rules.txt` — .gitignore rule verification

  **Commit**: YES
  - Message: `chore: clean gitignore and untrack secrets`
  - Files: `.gitignore`, `backend/.env.example`
  - Note: The `git rm --cached` operations will also show as deletions in the commit (files removed from tracking)
  - Pre-commit: `git ls-files --cached -- backend/.env` (should be empty)

---

- [x] 3. Create Project README

  **What to do**:
  - Create `README.md` at project root (100-150 lines)
  - Include these sections:
    1. **Project Title + Description** — UST Delivery: peer-to-peer campus food delivery app for HKUST
    2. **Tech Stack** — React Native (Expo SDK 54, React 19) + FastAPI (Python 3.10+) + PostgreSQL (async SQLAlchemy + asyncpg)
    3. **Prerequisites** — Node.js, Python 3.10+, Docker, Expo CLI/Expo Go app
    4. **Getting Started** — Step-by-step:
       - Clone repo
       - Database setup: `cd backend && docker compose up -d`
       - Backend setup: venv, pip install, uvicorn command
       - Frontend setup: `cd mobile && npm install && npm start`
       - Health check: `curl http://localhost:8000/health`
    5. **Project Structure** — Simplified tree showing backend/, mobile/src/ key directories
    6. **Environment Variables** — Reference to `backend/.env.example`, list of required vars
    7. **Known Gotchas** — `models/` gitignore issue (must force-add backend model files)
    8. **Available Scripts** — Key npm scripts and backend commands
  - Use AGENTS.md as the authoritative source for all commands and structure
  - Keep it concise: no API endpoint docs, no deployment guide, no contributing guidelines

  **Must NOT do**:
  - DO NOT document individual API endpoints
  - DO NOT add deployment instructions
  - DO NOT add contributing guidelines
  - DO NOT exceed 150 lines
  - DO NOT copy AGENTS.md verbatim — synthesize into README format
  - DO NOT include code style guides (that's what AGENTS.md is for)

  **Recommended Agent Profile**:
  > Pure documentation writing task. No code changes.
  - **Category**: `writing`
    - Reason: Documentation creation, no code logic involved
  - **Skills**: `[]`
    - No special skills needed — straightforward markdown writing
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not relevant — no browser interaction
    - `git-master`: No git operations needed for this task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 4 (Final Verification)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Source of Truth** (PRIMARY):
  - `AGENTS.md` (entire file) — THE authoritative source for all build commands, project structure, tech stack, conventions, and known gotchas. Extract README content from here.

  **Supplementary References**:
  - `backend/docker-compose.yml` — Docker setup details for PostgreSQL section
  - `backend/requirements.txt` — Python dependencies list
  - `mobile/package.json` — Node dependencies and available scripts
  - `mobile/app.json` — Expo config (app name, version)
  - `backend/.env.example` — (created by Task 2) Reference for environment variables section. If Task 2 hasn't run yet, use env var names from `backend/config.py`
  - `backend/config.py` — Pydantic Settings showing all required env vars

  **WHY Each Reference Matters**:
  - AGENTS.md is the single source of truth — README must be consistent with it, not contradict it
  - docker-compose.yml confirms exact PostgreSQL version and port
  - The .env.example provides the template users should copy

  **Acceptance Criteria**:

  - [ ] `README.md` exists at project root
  - [ ] Line count between 80 and 150: `wc -l < README.md` returns 80-150
  - [ ] Contains all required sections: title, tech stack, prerequisites, setup, structure, env vars, gotchas
  - [ ] Does NOT contain API endpoint documentation
  - [ ] Does NOT contain deployment instructions
  - [ ] `models/` gitignore gotcha is mentioned

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: README exists with correct length
    Tool: Bash
    Preconditions: README.md has been created
    Steps:
      1. Run `test -f README.md && echo EXISTS`
      2. Run `wc -l < README.md` — expect 80-150
    Expected Result: File exists, line count in range 80-150
    Failure Indicators: File missing or line count out of range
    Evidence: .sisyphus/evidence/task-3-readme-exists.txt

  Scenario: README contains all required sections
    Tool: Bash
    Preconditions: README.md has been created
    Steps:
      1. Search for `# UST` or project title heading — must be present
      2. Search for `Tech Stack` or equivalent heading — must be present
      3. Search for `Prerequisites` or equivalent — must be present
      4. Search for `Getting Started` or `Setup` or equivalent — must be present
      5. Search for `docker compose` — must be present (database setup)
      6. Search for `uvicorn` — must be present (backend setup)
      7. Search for `npm` — must be present (frontend setup)
      8. Search for `models/` or `gitignore` — must mention the gotcha
      9. Search for `.env.example` or `environment` — must reference env vars
    Expected Result: All required sections and key commands present
    Failure Indicators: Any required section or command missing
    Evidence: .sisyphus/evidence/task-3-readme-sections.txt

  Scenario: README does NOT contain out-of-scope content
    Tool: Bash
    Preconditions: README.md has been created
    Steps:
      1. Search for `POST /` or `GET /` or `PUT /` — should NOT be present (no API docs)
      2. Search for `deploy` (case insensitive) — should NOT be present (no deployment guide)
      3. Search for `contributing` (case insensitive) — should NOT be present
    Expected Result: No out-of-scope content found
    Failure Indicators: API endpoints, deployment, or contributing content found
    Evidence: .sisyphus/evidence/task-3-readme-no-extras.txt
  ```

  **Evidence to Capture:**
  - [ ] `task-3-readme-exists.txt` — file existence and line count
  - [ ] `task-3-readme-sections.txt` — section verification
  - [ ] `task-3-readme-no-extras.txt` — out-of-scope content check

  **Commit**: YES
  - Message: `docs: add project README`
  - Files: `README.md`
  - Pre-commit: `wc -l < README.md` (verify 80-150 lines)

---

- [x] 4. Final Verification

  **What to do**:
  - Run `npx tsc --noEmit` from `mobile/` directory — must pass with zero errors
  - Run `git status` — review all changes for correctness
  - Verify all evidence files from Tasks 1-3 exist in `.sisyphus/evidence/`
  - Run all verification commands from Success Criteria section
  - If any check fails, identify which task needs fixing and report

  **Must NOT do**:
  - DO NOT modify any source files — only verify
  - DO NOT commit — commits are handled per-task

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure verification — run commands and check output
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential, after Wave 1)
  - **Blocks**: F1-F4 (Final Verification Wave)
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - This plan's "Success Criteria" section — contains all verification commands
  - `.sisyphus/evidence/` directory — all task evidence files should be here

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` returns exit code 0
  - [ ] All evidence files from Tasks 1-3 exist
  - [ ] All verification commands from Success Criteria pass

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All verification commands pass
    Tool: Bash
    Preconditions: Tasks 1-3 completed
    Steps:
      1. Run `npx tsc --noEmit` from mobile/ — expect exit 0
      2. Run `git ls-files --cached -- backend/.env` — expect empty
      3. Run `git ls-files --cached -- mobile/tsc-output.txt` — expect empty
      4. Run `test -f backend/.env.example && echo EXISTS` — expect EXISTS
      5. Run `wc -l < README.md` — expect 80-150
      6. Run `test -f backend/.env && echo EXISTS` — expect EXISTS (not deleted)
      7. Verify `.sisyphus/evidence/` contains task-1-*, task-2-*, task-3-* files
    Expected Result: All commands pass
    Failure Indicators: Any command fails
    Evidence: .sisyphus/evidence/task-4-final-verification.txt
  ```

  **Evidence to Capture:**
  - [ ] `task-4-final-verification.txt` — all verification command outputs

  **Commit**: NO (verification only)

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify dark mode colors are consistent.
  Output: `Build [PASS/FAIL] | TSC [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Verify: EditProfile screen renders, fields pre-filled, save works, back button works. Verify `backend/.env` is untracked. Verify `README.md` content is accurate. Save evidence to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Commit 1** (after Task 1): `feat(mobile): add Edit Profile screen with dark mode support` — EditProfileScreen.tsx, types/index.ts, RootNavigator.tsx, DashboardScreen.tsx
- **Commit 2** (after Task 2): `chore: clean gitignore and untrack secrets` — .gitignore, backend/.env.example, git rm --cached files
- **Commit 3** (after Task 3): `docs: add project README` — README.md

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit                                          # Expected: zero errors
git ls-files --cached -- backend/.env                     # Expected: empty (untracked)
git ls-files --cached -- mobile/tsc-output.txt            # Expected: empty (untracked)
git ls-files --cached -- .sisyphus/evidence/              # Expected: empty (untracked)
test -f backend/.env.example && echo EXISTS               # Expected: EXISTS
wc -l < README.md                                        # Expected: 80-150
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] `npx tsc --noEmit` passes
- [ ] `backend/.env` untracked from git
- [ ] Edit Profile accessible from Dashboard
- [ ] README accurate and complete
