# Restore upgraded UI + Leaderboard tabs/deep-linking (safe-area)

## TL;DR
> **Summary**: Rebuild a centralized Cupertino-like theme system and apply it across all mobile screens/components, while fixing and wiring up the Leaderboard screen (orderers/deliverers tabs, dashboard deep-linking, safe-area header).
> **Deliverables**:
> - `mobile/src/constants/theme.ts` (tokens + `useTheme()`)
> - `mobile/src/components/AppHeader.tsx` (safe-area aware header)
> - Leaderboard navigable + correct metrics + lowered header
> - All screens/components refactored to use theme tokens (no per-screen `colors` objects)
> **Effort**: Large
> **Parallel**: YES — 4 waves
> **Critical Path**: Theme tokens → AppHeader → Navigation/types → Leaderboard correctness → Screen/component refactor sweep → typecheck gates

## Context
### Original Request
- Restore the previously “upgraded UI” (was not committed; must be rebuilt).
- Leaderboard: separate Orderers/Deliverers leaderboards + header/back button lower.

### Interview Summary (decisions locked)
- UI recovery approach: **Rebuild from spec** (not recoverable from git history).
- Deliverers leaderboard secondary metric: **show ratings count** (`total_ratings`).
- Header spacing: **safe-area aware** (not fixed `paddingTop`).
- Accent color: **keep navy `#003366`**.
- Refactor scope: **all mobile screens + shared components**.
- Header pattern: **use a reusable `AppHeader` component**.

### Metis Review (gaps addressed)
- Prevent scope creep: limit to tokens + consistent header + wiring/correctness; no redesign beyond specified “upgraded UI” intent.
- Contract alignment: remove `total_deliveries` assumption; align with backend `total_orders` / `total_ratings`.
- Safe-area consistency: standardize on `react-native-safe-area-context` and avoid double-padding.
- Acceptance gates: rely on `cd mobile && npx tsc --noEmit` + repo-wide static checks (no jest/pytest/eslint).

## Work Objectives
### Core Objective
Deliver a consistent, Cupertino-like design system across the app while keeping functionality intact, and make Leaderboard fully navigable and correct.

### Deliverables
1. Theme system:
   - `mobile/src/constants/theme.ts` exporting **stable** light/dark theme objects, tokens (colors/spacing/radius/typography/shadows), and `useTheme()`.
2. Reusable header:
   - `mobile/src/components/AppHeader.tsx` using `react-native-safe-area-context` (safe area) and theme tokens.
3. Leaderboard:
   - `Leaderboard` added to `RootStackParamList` and registered in `RootNavigator`.
   - `LeaderboardScreen`:
     - orderers vs deliverers tabs
     - `initialTab` route param supported
     - correct field rendering (order count vs rating ★; `total_ratings` shown as “N ratings”)
     - header/back button positioned via safe-area (remove hardcoded `paddingTop: 60`).
   - `DashboardScreen`: deep-links into `Leaderboard` with `initialTab` based on which preview section was tapped.
4. Refactor sweep:
   - All 14 screens in `mobile/src/screens/` and 5 components in `mobile/src/components/` consume theme tokens; remove per-file color palettes.

### Definition of Done (agent-verifiable)
- [ ] `cd mobile && npx tsc --noEmit` exits 0.
- [ ] `mobile/src/constants/theme.ts` exists and exports `useTheme` + theme tokens (verified by Node script).
- [ ] `RootStackParamList` includes `Leaderboard` and `RootNavigator` registers it (compile-verified).
- [ ] No occurrences of `paddingTop: 60` in `mobile/src/**/*.tsx`.
- [ ] No `const colors = isDark ? ...` palettes remain in `mobile/src/screens/**/*.tsx` (allowlist: NONE).

### Must Have
- No new UI libraries.
- No backend contract changes.
- Leaderboard UI must match backend schema: `value`, `total_orders?`, `total_ratings?`.
- Theme objects must be **stable references** to reduce rerenders.
- If adopting safe-area headers via `react-native-safe-area-context`, ensure the app root includes `SafeAreaProvider`.

### Must NOT Have (guardrails)
- Do NOT change business logic, API endpoints, auth gating, or navigation structure beyond adding the Leaderboard route.
- Do NOT introduce animations or redesign layouts beyond applying theme tokens (spacing/radius/shadows/typography/colors).
- Do NOT add/enable linters or test frameworks.
- Do NOT leave inconsistent dark mode sources (e.g., ChatScreen using `useColorScheme()` while others use profile dark mode).

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Primary gate: `cd mobile && npx tsc --noEmit`
- Static gates (Python/Node scripts):
  - `theme.ts` exists and is importable
  - no hardcoded `paddingTop: 60`
  - no per-screen `isDark`/`colors` palette blocks
- Evidence files written by executor:
  - `.sisyphus/evidence/task-*-*.txt` (command outputs)

## Execution Strategy
### Parallel Execution Waves
Wave 1 (foundation): theme tokens + AppHeader + navigation/types + leaderboard correctness.

Wave 2 (shared components): refactor 5 reusable components to theme.

Wave 3 (screen refactor sweep A): Auth/Profile + Dashboard + Leaderboard.

Wave 4 (screen refactor sweep B): Orders/Deliveries/Chat/WebView screens.

### Dependency Matrix (high level)
- Theme (`T1`) blocks all UI refactor tasks.
- AppHeader (`T2`) blocks screens that adopt the standard header.
- Navigation/types (`T3`) blocks Dashboard deep-links and reachable Leaderboard.

## TODOs
> Implementation + Verification are ONE task. Do not split.

- [x] 1. Define the rebuilt theme contract (`theme.ts`) and migration rules

  **What to do**:
  - Create `mobile/src/constants/theme.ts` exporting:
    - `type ThemeMode = 'light' | 'dark'`
    - `const LIGHT_THEME` and `const DARK_THEME` as **module-level constants** (stable references)
    - `export type Theme = typeof LIGHT_THEME`
    - `export function useTheme(): Theme` which:
      - reads `user?.dark_mode` via `useAuth()` if available
      - if no authenticated user, defaults to **light** (no `useColorScheme()` fallback) to avoid inconsistency with profile-based dark mode
    - Tokens (exact names + values) below.
  - Tokens to include (executor must use these exact keys across refactor):
    - `colors`: `bg`, `card`, `text`, `subtext`, `accent`, `border`, `danger`, `success`, `warning`, `muted`
    - `spacing`: `xs=4`, `sm=8`, `md=16`, `lg=24`, `xl=32`
    - `radius`: `sm=8`, `md=12`, `lg=16`, `pill=999`
    - `typography`:
      - `title1: { fontSize: 28, fontWeight: '700' }`
      - `title2: { fontSize: 20, fontWeight: '700' }`
      - `body: { fontSize: 15, fontWeight: '400' }`
      - `subhead: { fontSize: 15, fontWeight: '600' }`
      - `caption: { fontSize: 12, fontWeight: '400' }`
    - `shadow`:
      - `card`: `{ shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.08, shadowRadius:4, elevation:2 }`
      - `floating`: `{ shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.12, shadowRadius:12, elevation:6 }`
  - Color palette (locked):
    - Light: `bg '#F5F5F5'`, `card '#FFFFFF'`, `text '#333333'`, `subtext '#666666'`, `border '#E0E0E0'`, `accent '#003366'`
    - Dark: `bg '#1A1A2E'`, `card '#16213E'`, `text '#EEEEEE'`, `subtext '#AAAAAA'`, `border '#2A2A40'`, `accent '#0F3460'`
    - Shared status: `danger '#CC3333'`, `success '#2E7D32'`, `warning '#ED6C02'`, `muted '#999999'`
  - Migration rule (enforced later by static gate): remove per-screen `isDark` + `colors` objects; all screens must use `const t = useTheme()`.

  **Must NOT do**:
  - Do not introduce new dependencies.
  - Do not use system color scheme anywhere in screens (except where explicitly approved later; default is NONE).

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: design-system + RN styling refactor
  - Skills: [`frontend-ui-ux`] — ensure Cupertino-like consistency without mockups

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-10 | Blocked By: —

  **References**:
  - Current repeated palette example: `mobile/src/screens/DashboardScreen.tsx:27-31`
  - Existing dark-mode source: `mobile/src/context/AuthContext.tsx` (user profile `dark_mode`)
  - Components to migrate: `mobile/src/components/*.tsx`

  **Acceptance Criteria**:
  - [ ] File exists: `mobile/src/constants/theme.ts`
  - [ ] `cd mobile && npx tsc --noEmit` passes
  - [ ] `cd mobile && node -e "require('fs').accessSync('src/constants/theme.ts'); console.log('ok')"` prints `ok`

  **QA Scenarios**:
  ```
  Scenario: theme module is importable
    Tool: Bash
    Steps:
      1) cd mobile
      2) node -e "require('fs').accessSync('src/constants/theme.ts'); console.log('ok')"
    Expected: prints ok, exit code 0
    Evidence: .sisyphus/evidence/task-1-theme-import.txt

  Scenario: typecheck gate
    Tool: Bash
    Steps:
      1) cd mobile
      2) npx tsc --noEmit
    Expected: exit code 0
    Evidence: .sisyphus/evidence/task-1-tsc.txt
  ```

  **Commit**: NO

- [x] 2. Add safe-area aware `AppHeader` component (single standard)

  **What to do**:
  - Update `mobile/App.tsx` to wrap the app in `SafeAreaProvider` from `react-native-safe-area-context` (required for `useSafeAreaInsets`).
  - Create `mobile/src/components/AppHeader.tsx`:
    - Uses `useSafeAreaInsets()` from `react-native-safe-area-context`
    - Props:
      - `title: string`
      - `onBack?: () => void` (if provided, show back button)
      - `right?: React.ReactNode` (optional right-side actions)
    - Layout rules:
      - container paddingTop = `insets.top + t.spacing.md`
      - horizontal padding = `t.spacing.lg`
      - title uses `t.typography.title2`
      - back button: use text `←` or `Ionicons` if already used (prefer text to avoid extra icon decisions)
  - Add a shared `Screen` container pattern (optional): if used, keep it in the same file or a simple helper export; do NOT add new directories.

  **Must NOT do**:
  - Do not add hardcoded `paddingTop` like 60 anywhere.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5-10 | Blocked By: 1

  **References**:
  - Existing too-high header: `mobile/src/screens/LeaderboardScreen.tsx:177-182`
  - Safe-area dependency already present: `mobile/package.json` includes `react-native-safe-area-context`

  **Acceptance Criteria**:
  - [ ] `mobile/App.tsx` uses `SafeAreaProvider`
  - [ ] `mobile/src/components/AppHeader.tsx` exists
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: header component compiles
    Tool: Bash
    Steps:
      1) cd mobile
      2) npx tsc --noEmit
    Expected: exit code 0
    Evidence: .sisyphus/evidence/task-2-tsc.txt

  Scenario: no hardcoded header padding remains
    Tool: Bash
    Steps:
      1) python -c "import pathlib,re; p=pathlib.Path('mobile/src'); bad=[]; [bad.append(str(f)) for f in p.rglob('*.tsx') if re.search(r'paddingTop\\s*:\\s*60', f.read_text(encoding='utf-8'))]; print('\\n'.join(bad)); raise SystemExit(1 if bad else 0)"
    Expected: exit code 0 (prints nothing)
    Evidence: .sisyphus/evidence/task-2-no-paddingTop-60.txt
  ```

  **Commit**: NO

- [x] 3. Wire Leaderboard into navigation + types (reachable screen)

  **What to do**:
  - Update `mobile/src/types/index.ts` `RootStackParamList` to include:
    - `Leaderboard: { initialTab?: 'orderers' | 'deliverers' } | undefined`
  - Update `mobile/src/navigation/RootNavigator.tsx` to:
    - import `LeaderboardScreen`
    - register `<Stack.Screen name="Leaderboard" component={LeaderboardScreen} />` in the authenticated block (same region as Dashboard, OrderDetail, etc.).
  - Ensure `mobile/src/screens/LeaderboardScreen.tsx` is tracked (it is currently untracked per `git status`).

  **Must NOT do**:
  - Do not change auth gating logic; only add the route.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: small, localized type+nav changes
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4-5 | Blocked By: —

  **References**:
  - RootNavigator screen list: `mobile/src/navigation/RootNavigator.tsx:35-59`
  - Current RootStackParamList: `mobile/src/types/index.ts:99-119`
  - Leaderboard screen path: `mobile/src/screens/LeaderboardScreen.tsx`

  **Acceptance Criteria**:
  - [ ] `cd mobile && npx tsc --noEmit` passes
  - [ ] `git status --porcelain` no longer lists `LeaderboardScreen.tsx` as untracked (it may still be modified, but must be tracked)

  **QA Scenarios**:
  ```
  Scenario: navigation types compile
    Tool: Bash
    Steps:
      1) cd mobile
      2) npx tsc --noEmit
    Expected: exit code 0
    Evidence: .sisyphus/evidence/task-3-tsc.txt

  Scenario: file is tracked
    Tool: Bash
    Steps:
      1) git status --porcelain=v1
    Expected: no line starting with "?? mobile/src/screens/LeaderboardScreen.tsx"
    Evidence: .sisyphus/evidence/task-3-git-status.txt
  ```

  **Commit**: NO

- [x] 4. Fix LeaderboardScreen data rendering + adopt AppHeader + theme

  **What to do**:
  - Update `mobile/src/screens/LeaderboardScreen.tsx`:
    - Replace local `isDark` + `colors` with `const t = useTheme()`.
    - Replace hardcoded header `View` with `<AppHeader title="Leaderboard" onBack={navigation.goBack} />`.
    - Fix field usage:
      - Orderers: primary should show **order count** (no ★). Use either `entry.total_orders ?? entry.value` as integer.
      - Deliverers: primary shows `entry.value.toFixed(1) + ' ★'` (average rating). Secondary shows `entry.total_ratings ?? 0` as “N ratings”.
      - Remove the cast to `{ total_deliveries?: number }`.
    - Ensure empty states:
      - If list empty, show themed caption like “No data yet”.
    - Keep tabs (orderers/deliverers) but restyle using theme tokens:
      - container bg = `t.colors.bg`
      - cards = `t.colors.card` + `t.shadow.card`
      - borders = `t.colors.border`

  **Must NOT do**:
  - Do not change backend; mobile must match existing `LeaderboardResponse`.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6-10 | Blocked By: 1,2,3

  **References**:
  - Backend schema: `backend/schemas/stats.py`
  - Backend endpoint logic: `backend/routers/stats.py`
  - Mobile API: `mobile/src/api/stats.ts`
  - Current LeaderboardScreen mismatches: `mobile/src/screens/LeaderboardScreen.tsx:121-145`

  **Acceptance Criteria**:
  - [ ] `cd mobile && npx tsc --noEmit` passes
  - [ ] No `paddingTop: 60` remains in LeaderboardScreen
  - [ ] No references to `total_deliveries` remain in mobile code

  **QA Scenarios**:
  ```
  Scenario: typecheck
    Tool: Bash
    Steps:
      1) cd mobile
      2) npx tsc --noEmit
    Expected: exit code 0
    Evidence: .sisyphus/evidence/task-4-tsc.txt

  Scenario: contract alignment (static)
    Tool: Bash
    Steps:
      1) python -c "import pathlib,re; p=pathlib.Path('mobile/src'); s='\n'.join(f.read_text(encoding='utf-8') for f in p.rglob('*.ts*')); assert 'total_deliveries' not in s; print('ok')"
    Expected: prints ok
    Evidence: .sisyphus/evidence/task-4-no-total-deliveries.txt
  ```

  **Commit**: NO

- [x] 5. Add Dashboard deep-links into Leaderboard tabs (two entry points)

  **What to do**:
  - Update `mobile/src/screens/DashboardScreen.tsx`:
    - Make the Top Orderers card tappable → `navigation.navigate('Leaderboard', { initialTab: 'orderers' })`.
    - Make the Top Deliverers card tappable → `navigation.navigate('Leaderboard', { initialTab: 'deliverers' })`.
    - Do not change the existing preview rendering beyond wrapping in `TouchableOpacity` and minor theme styling alignment if needed.

  **Must NOT do**:
  - Do not alter leaderboard fetch timing or logic.

  **Recommended Agent Profile**:
  - Category: `quick`
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: — | Blocked By: 3

  **References**:
  - Dashboard leaderboard preview cards: `mobile/src/screens/DashboardScreen.tsx:209-250`

  **Acceptance Criteria**:
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: typecheck after adding navigation calls
    Tool: Bash
    Steps:
      1) cd mobile
      2) npx tsc --noEmit
    Expected: exit code 0
    Evidence: .sisyphus/evidence/task-5-tsc.txt
  ```

  **Commit**: NO

- [x] 6. Refactor shared components to theme tokens (5 files)

  **What to do**:
  - Update each component to use `const t = useTheme()` and replace hardcoded colors/radius/shadows with tokens:
    - `mobile/src/components/ChipSelector.tsx`
    - `mobile/src/components/RadioGroup.tsx`
    - `mobile/src/components/StarRating.tsx` (currently uses Ionicons; align icon color to theme)
    - `mobile/src/components/Toast.tsx`
    - `mobile/src/components/OrderCard.tsx` (remove passing `colors` prop; derive from theme; keep status coloring via theme status tokens)
  - If any component currently expects colors via props (OrderCard), update call sites in screens accordingly (batched with screen waves).

  **Must NOT do**:
  - Do not introduce inline style objects; continue using `StyleSheet.create()`.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7-8 | Blocked By: 1

  **References**:
  - Component directory listing: `mobile/src/components/`

  **Acceptance Criteria**:
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: typecheck after component migration
    Tool: Bash
    Steps:
      1) cd mobile
      2) npx tsc --noEmit
    Expected: exit code 0
    Evidence: .sisyphus/evidence/task-6-tsc.txt
  ```

  **Commit**: NO

- [x] 7. Screen refactor sweep A (Auth/Profile + Dashboard + Leaderboard)

  **What to do**:
  - Refactor these screens to use theme tokens (no per-screen `colors` objects; no `isDark` derivations):
    - `LoginScreen.tsx`
    - `RegisterScreen.tsx`
    - `ProfileSetupScreen.tsx`
    - `EditProfileScreen.tsx`
    - `DashboardScreen.tsx`
    - `LeaderboardScreen.tsx` (already covered; ensure consistency)
  - Apply `AppHeader` to back-stack screens (at minimum: EditProfile, Leaderboard).
  - Replace card shadows/radius/spacing with theme tokens.

  **Must NOT do**:
  - Do not change copy or flows.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8 | Blocked By: 1,2,6

  **References**:
  - Example of hardcoded accent in Login: `mobile/src/screens/LoginScreen.tsx:106-107,126-130`

  **Acceptance Criteria**:
  - [ ] `cd mobile && npx tsc --noEmit` passes
  - [ ] Static gate: no `const colors =` or `const isDark` remain in any `mobile/src/screens/*.tsx`

  **QA Scenarios**:
  ```
  Scenario: static gate — eliminate per-screen palettes
    Tool: Bash
    Steps:
      1) python -c "import pathlib,re; p=pathlib.Path('mobile/src/screens'); hits=[]; pat=re.compile(r'\bconst\s+isDark\b|\bconst\s+colors\s*='); [hits.append(str(f)) for f in p.rglob('*.tsx') if pat.search(f.read_text(encoding='utf-8'))]; print('\\n'.join(hits)); raise SystemExit(1 if hits else 0)"
    Expected: exit code 0
    Evidence: .sisyphus/evidence/task-7-no-inline-palettes.txt

  Scenario: typecheck
    Tool: Bash
    Steps:
      1) cd mobile
      2) npx tsc --noEmit
    Expected: exit code 0
    Evidence: .sisyphus/evidence/task-7-tsc.txt
  ```

  **Commit**: NO

- [x] 8. Screen refactor sweep B (Orders/Deliveries/Chat/WebView)

  **What to do**:
  - Refactor these screens to use theme tokens and remove local palettes:
    - `CanteenSelectScreen.tsx`
    - `CanteenWebViewScreen.tsx`
    - `OrderConfirmScreen.tsx`
    - `OrderDetailScreen.tsx`
    - `MyOrdersScreen.tsx`
    - `MyDeliveriesScreen.tsx`
    - `DelivererQueueScreen.tsx`
    - `ChatScreen.tsx` (replace `useColorScheme()` usage with `useTheme()`; keep behavior consistent)
  - Apply `AppHeader` to back-stack screens (OrderDetail, OrderConfirm, MyOrders, MyDeliveries, DelivererQueue, Chat, CanteenWebView).
  - If any of these screens use `SafeAreaView`, ensure the safe-area strategy does not double-pad with AppHeader:
    - Prefer `View` root + AppHeader handles top inset.

  **Must NOT do**:
  - Do not change WebView behavior or order flow.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: — | Blocked By: 1,2,6

  **References**:
  - Chat uses system scheme today: `mobile/src/screens/ChatScreen.tsx` (remove inconsistency)

  **Acceptance Criteria**:
  - [ ] `cd mobile && npx tsc --noEmit` passes
  - [ ] Static gate: no per-screen palettes remain (same script as Task 7)

  **QA Scenarios**:
  ```
  Scenario: typecheck after sweep
    Tool: Bash
    Steps:
      1) cd mobile
      2) npx tsc --noEmit
    Expected: exit code 0
    Evidence: .sisyphus/evidence/task-8-tsc.txt
  ```

  **Commit**: NO

- [x] 9. Final static compliance gates (must pass before review)

  **What to do**:
  - Run and capture outputs of:
    - no `paddingTop: 60`
    - no `total_deliveries` string
    - no per-screen palette blocks
  - Save outputs to evidence files.

  **Recommended Agent Profile**:
  - Category: `quick`
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 4 (end) | Blocks: Final Verification Wave | Blocked By: 1-8

  **Acceptance Criteria**:
  - [ ] All scripts exit 0
  - [ ] `cd mobile && npx tsc --noEmit` exit 0

  **QA Scenarios**:
  ```
  Scenario: compliance scripts
    Tool: Bash
    Steps:
      1) python -c "import pathlib,re; p=pathlib.Path('mobile/src'); bad=[]; [bad.append(str(f)) for f in p.rglob('*.tsx') if re.search(r'paddingTop\\s*:\\s*60', f.read_text(encoding='utf-8'))]; print('\\n'.join(bad)); raise SystemExit(1 if bad else 0)"
      2) python -c "import pathlib; p=pathlib.Path('mobile/src'); s='\n'.join(f.read_text(encoding='utf-8') for f in p.rglob('*.ts*')); assert 'total_deliveries' not in s; print('ok')"
      3) python -c "import pathlib,re; p=pathlib.Path('mobile/src/screens'); hits=[]; pat=re.compile(r'\bconst\s+isDark\b|\bconst\s+colors\s*='); [hits.append(str(f)) for f in p.rglob('*.tsx') if pat.search(f.read_text(encoding='utf-8'))]; print('\\n'.join(hits)); raise SystemExit(1 if hits else 0)"
      4) cd mobile && npx tsc --noEmit
    Expected: all steps succeed (exit 0)
    Evidence: .sisyphus/evidence/task-9-compliance.txt
  ```

  **Commit**: NO

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle (TIMEOUT - skipped after 10min)
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. App Behavior QA (typecheck + static gates) — unspecified-high
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- No commits unless the user explicitly requests.
- If asked to commit: 1 atomic commit for foundation (theme/header/nav/leaderboard), then 1–2 commits for refactor sweeps.

## Success Criteria
- App compiles (`npx tsc --noEmit`) and Leaderboard is wired, correct, and theme-consistent across all screens/components.
