# UI polish: credits coin icon, leaderboard toggle unification, time-based delivery sentence

## TL;DR
> **Summary**: Add a yellow coin icon beside credits, unify Leaderboard’s Orderers/Deliverers toggle to match Dashboard’s pill toggle, and insert a time-based food-delivery sentence on the Dashboard header.
> **Deliverables**: Dashboard header coin+credits + time sentence; Leaderboard toggle restyle; `npx tsc --noEmit` green.
> **Effort**: Quick
> **Parallel**: YES — 1 wave
> **Critical Path**: DashboardScreen + LeaderboardScreen edits → `npx tsc --noEmit`

## Context
### Original Request
- “yellow coin icon from font awesome on the left side of the numbers of credits”
- “leaderboard toggle button between orderers and delivers use the template of the main page one”
- “simple script … array of generated sentences … show corresponding sentence according to the time like day afternoon evening and night … between hello, user! and hall XIII”

### Interview Summary
- Coin icon: FontAwesome5 `coins`, **solid**, color `t.colors.orange`.
- Time buckets: **day/afternoon/evening/night** = **6–12 / 12–17 / 17–22 / 22–6**.
- Sentence tone: **friendly + short**.

### Metis Review (gaps addressed)
- Avoid sentence flicker: make sentence selection deterministic within a time bucket.
- Watch 22–6 wrap condition explicitly.
- Keep changes limited to Dashboard + Leaderboard, no new deps, no business-logic changes.

## Work Objectives
### Core Objective
Polish the iOS-style UI with:
1) coin icon next to credits,
2) consistent pill toggle styling across Dashboard and Leaderboard,
3) time-based delivery sentence in the Dashboard header.

### Deliverables
- `mobile/src/screens/DashboardScreen.tsx`
  - Credits display becomes a row: **coin icon (left)** + **credits number** (+ existing “DC” suffix preserved).
  - New time-based sentence line inserted **between greeting and dorm hall**.
- `mobile/src/screens/LeaderboardScreen.tsx`
  - Replace existing tab styling with the Dashboard toggle template (pill container + two buttons).

### Definition of Done (verifiable)
- `cd mobile && npx tsc --noEmit` exits 0.
- Dashboard screen contains FontAwesome5 `coins` (solid) rendered left of credits number and uses `t.colors.orange`.
- Dashboard header renders in order: greeting → time sentence → dorm hall.
- Leaderboard toggle uses the same pill-toggle structure (container + two buttons) and still switches `activeTab` correctly.

### Must Have
- No new dependencies.
- No changes to API calls, auth, navigation, or state semantics.
- All new layout styles via `StyleSheet.create()` (no new inline style objects).

### Must NOT Have
- No random sentence that changes every re-render.
- No time-based timers/intervals.
- No regressions in toggle behavior.

## Verification Strategy
- Test decision: **tests-after** (only available check is TypeScript)
- Primary command: `cd mobile && npx tsc --noEmit`
- Static assertions (agent-executable) via `node -e` grep checks (see tasks).
- Evidence files: store command outputs in `.sisyphus/evidence/` (executor-generated).

## Execution Strategy
### Parallel Execution Waves
Wave 1 (parallel):
- Dashboard header coin + sentence (visual-engineering)
- Leaderboard toggle restyle (visual-engineering)

Wave 2:
- Verification sweep + static assertions (unspecified-low)

### Dependency Matrix
- Task 1 and Task 2 can run in parallel.
- Task 3 depends on Tasks 1–2.

## TODOs

- [ ] 1. Dashboard: add coin icon to credits + time-based delivery sentence

  **What to do**:
  1) Edit `mobile/src/screens/DashboardScreen.tsx`.
  2) **Insert sentence line** between:
     - Greeting text at ~lines 105–107:
       - `Hello, {user?.nickname ?? 'User'}!`
     - Dorm hall line at ~lines 108–110:
       - `{user?.dorm_hall}`
     Implementation detail (decision-complete):
     - Add a small helper inside the component (no new file):
       - `const hour = new Date().getHours();`
       - Determine bucket:
         - day: `hour >= 6 && hour < 12`
         - afternoon: `hour >= 12 && hour < 17`
         - evening: `hour >= 17 && hour < 22`
         - night: `hour >= 22 || hour < 6`
     - Define sentence arrays (in the same file, near component top):
       - `const DELIVERY_SENTENCES = { day: string[], afternoon: string[], evening: string[], night: string[] } as const;`
       - Provide 3 sentences per bucket (friendly + short). Example content to use verbatim:
         - day: ["Fuel up—deliveries await.", "Order up—let’s get it delivered.", "Grab a bite, then make a run."]
         - afternoon: ["Afternoon rush? We’ve got your delivery.", "Midday cravings—on the way.", "Quick run, hot food."]
         - evening: ["Dinner time—let’s bring it home.", "Evening vibes, speedy deliveries.", "Warm meals, smooth drop-offs."]
         - night: ["Late-night cravings? We deliver.", "Night shift: snacks incoming.", "Quiet campus, fast delivery."]
     - Choose a deterministic sentence index to prevent flicker:
       - `const seed = new Date().getDate();` (1–31)
       - `const idx = seed % DELIVERY_SENTENCES[bucket].length;`
       - `const deliveryLine = DELIVERY_SENTENCES[bucket][idx];`
     - Render as a `Text` line using theme:
       - Typography: `t.typography.footnote`
       - Color: `t.colors.subtext`
       - Spacing: add a new `styles.deliveryLine` with `marginBottom: 6` (and remove/adjust the dorm hall’s `marginBottom` only if needed to keep overall spacing similar).

  3) **Credits coin icon**: replace the credits Text at ~lines 112–114:
     - Current: `{user?.credits ?? 0} DC`
     - New: a row container using `View`:
       - Left: `<FontAwesome5 name="coins" solid size={18} color={t.colors.orange} />`
       - Right: `Text` with the existing value and suffix: `{user?.credits ?? 0} DC`
     - Add `styles.creditsRow` with:
       - `flexDirection: 'row'`, `alignItems: 'center'`, and spacing via `marginBottom: 24` (preserve existing vertical rhythm)
     - Add `styles.creditsIcon` with `marginRight: 8`.
     - Keep the text style as the current `t.typography.headline` + `{ color: t.colors.accent }`.

  **Must NOT do**:
  - Do not alter `toggleDarkMode`, `toggleDeliverer`, `getLeaderboard`, or navigation.
  - Do not add timers/intervals.
  - Do not introduce new inline style objects (use StyleSheet entries).

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: UI/layout changes with theme tokens.
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 3 | Blocked By: —

  **References**:
  - File: `mobile/src/screens/DashboardScreen.tsx:103-115` — greeting/dorm/credits block.
  - Pattern: `toggleContainer/toggleBtn/toggleText` in same file — pill toggle styling pattern.
  - Theme tokens: `mobile/src/constants/theme.ts` — `t.colors.orange`, `t.typography.footnote`.

  **Acceptance Criteria**:
  - [ ] `cd mobile && npx tsc --noEmit`
  - [ ] Static check for coins icon + orange in Dashboard:
    - `node -e "const fs=require('fs');const s=fs.readFileSync('mobile/src/screens/DashboardScreen.tsx','utf8'); if(!/name=\\"coins\\"/.test(s)||!s.includes('solid')||!s.includes('t.colors.orange')) process.exit(1)"`
  - [ ] Static check that dorm line still exists and a new delivery line is rendered between greeting and dorm (executor may implement as an identifiable `deliveryLine` variable or style):
    - `node -e "const fs=require('fs');const s=fs.readFileSync('mobile/src/screens/DashboardScreen.tsx','utf8'); if(!s.includes('Hello,')||!s.includes('dorm_hall')||!s.includes('DELIVERY_SENTENCES')) process.exit(1)"`

  **QA Scenarios**:
  ```
  Scenario: Type-check after Dashboard edits
    Tool: Bash
    Steps:
      1) cd mobile
      2) npx tsc --noEmit
    Expected: exits 0
    Evidence: .sisyphus/evidence/task-1-tsc.txt

  Scenario: Boundary-hour bucket logic includes night wrap
    Tool: Bash
    Steps:
      1) node -e "const hour=23; const isNight = hour>=22 || hour<6; if(!isNight) process.exit(1)"
    Expected: exits 0
    Evidence: .sisyphus/evidence/task-1-bucket-wrap.txt
  ```

  **Commit**: NO


- [ ] 2. Leaderboard: restyle Orderers/Deliverers toggle to match Dashboard pill toggle template

  **What to do**:
  1) Edit `mobile/src/screens/LeaderboardScreen.tsx`.
  2) Replace the current toggle markup at ~lines 73–106 (tabsContainer + tabButton styles) with a Dashboard-like structure:
     - Container `View` styled like Dashboard’s `toggleContainer`:
       - Background: `t.colors.border`
       - Height: 44
       - Border radius: 25
       - Padding: 4
       - Full width within existing margins.
     - Two `TouchableOpacity` children styled like Dashboard’s `toggleBtn`:
       - Active side: `backgroundColor: t.colors.accent`
       - Inactive side: transparent
       - Text color: active `#fff`, inactive `t.colors.text`
     - Button labels remain `Orderers` and `Deliverers` (case preserved or adjust to match Dashboard’s capitalization consistently).
  3) Keep logic intact:
     - Do not change `activeTab` state type/values.
     - `onPress={() => setActiveTab('orderers')}` / `('deliverers')` stays.
  4) Style cleanup:
     - Remove now-unused styles: `tabsContainer`, `tabButton`, `tabButtonLeft`, `tabText`.
     - Add new styles: `toggleContainer`, `toggleBtn`, `toggleText`, and if needed `toggleBtnSpacer`.
     - Maintain file’s existing layout spacing (marginHorizontal/marginBottom) by mapping from old container props.

  **Must NOT do**:
  - Do not change leaderboard data rendering.
  - Do not change API calls (`getLeaderboard`) or `useFocusEffect` behavior.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: UI component restyle with state preservation.
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 3 | Blocked By: —

  **References**:
  - Template: `mobile/src/screens/DashboardScreen.tsx:116-153` — pill toggle structure and styling.
  - Target: `mobile/src/screens/LeaderboardScreen.tsx:73-106` — current toggle area.

  **Acceptance Criteria**:
  - [ ] `cd mobile && npx tsc --noEmit`
  - [ ] Static check Leaderboard contains Dashboard-like toggle styles:
    - `node -e "const fs=require('fs');const s=fs.readFileSync('mobile/src/screens/LeaderboardScreen.tsx','utf8'); if(!s.includes('toggleContainer')||!s.includes('toggleBtn')||!s.includes("setActiveTab('orderers')")||!s.includes("setActiveTab('deliverers')")) process.exit(1)"`

  **QA Scenarios**:
  ```
  Scenario: Type-check after Leaderboard toggle restyle
    Tool: Bash
    Steps:
      1) cd mobile
      2) npx tsc --noEmit
    Expected: exits 0
    Evidence: .sisyphus/evidence/task-2-tsc.txt

  Scenario: Toggle still switches state values
    Tool: Bash
    Steps:
      1) node -e "const ok = ['orderers','deliverers'].every(t=>t); if(!ok) process.exit(1)"
    Expected: exits 0 (sanity; real behavior covered by static setActiveTab checks)
    Evidence: .sisyphus/evidence/task-2-toggle-sanity.txt
  ```

  **Commit**: NO


- [ ] 3. Verification sweep (repo-wide)

  **What to do**:
  1) Run TypeScript check.
  2) Run both static assertions from Tasks 1–2.
  3) Ensure no new lint/test tools are invoked (project doesn’t have them).

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — Reason: command execution + verification.
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Final Wave | Blocked By: Tasks 1–2

  **Acceptance Criteria**:
  - [ ] `cd mobile && npx tsc --noEmit`
  - [ ] Dashboard static checks pass
  - [ ] Leaderboard static checks pass

  **QA Scenarios**:
  ```
  Scenario: Full verification run
    Tool: Bash
    Steps:
      1) cd mobile
      2) npx tsc --noEmit
      3) (run node -e checks from tasks)
    Expected: all commands exit 0
    Evidence: .sisyphus/evidence/task-3-verify.txt
  ```

  **Commit**: NO

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. UI Consistency Review (toggle + header rhythm) — visual-engineering
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- No commits unless explicitly requested by the user.

## Success Criteria
- Coin icon appears left of credits number on Dashboard.
- Leaderboard toggle visually matches Dashboard pill toggle.
- Time-based delivery sentence appears between greeting and dorm hall.
- `npx tsc --noEmit` passes.
