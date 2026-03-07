# UI Fixes: DelivererQueue Back Button + OrderDetail Header Padding

## TL;DR

> **Quick Summary**: Add a missing back button to the DelivererQueueScreen header and fix the OrderDetailScreen header being too high (missing status bar padding).
> 
> **Deliverables**:
> - DelivererQueueScreen with functional ← back button
> - OrderDetailScreen header pushed down with proper `paddingTop: 60`
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO — single combined task
> **Critical Path**: Edit 2 files → `npx tsc --noEmit`

---

## Context

### Original Request
User reported two UI issues after testing the order management system:
1. "there's no button that i can quit the available order page" — DelivererQueueScreen has no back button
2. "when i click the order details the 'order details' title and the return button is too high" — OrderDetailScreen header lacks status bar padding

### Interview Summary
**Key Discussions**:
- User chose to fix these 2 trivial issues immediately while investigating QR code capture issues (1-3) separately

**Research Findings**:
- DelivererQueueScreen.tsx line 2: `TouchableOpacity` NOT imported — must add
- DelivererQueueScreen.tsx header (lines 56-58): Only has `<Text>`, no back button
- OrderDetailScreen.tsx header style (line 322): Has `paddingVertical: 12` but no `paddingTop` for status bar
- Project pattern for status bar: `paddingTop: 60` (used in DelivererQueueScreen line 100, OrderConfirmScreen line 230)
- Back button pattern: OrderDetailScreen lines 174-175 + styles 325-331

### Metis Review
**Identified Gaps** (addressed):
- `TouchableOpacity` import needed in DelivererQueueScreen — added to edits
- Header needs `flexDirection: 'row'` + `alignItems: 'center'` for back button layout — specified in edits
- `backButton` and `backArrow` styles need to be added to DelivererQueueScreen — copied from OrderDetailScreen pattern
- `borderBottomColor` duplication risk — resolved by keeping it in stylesheet only

---

## Work Objectives

### Core Objective
Fix 2 trivial UI issues: add back navigation to DelivererQueueScreen and correct header positioning on OrderDetailScreen.

### Concrete Deliverables
- Modified `mobile/src/screens/DelivererQueueScreen.tsx` with back button
- Modified `mobile/src/screens/OrderDetailScreen.tsx` with corrected header padding

### Definition of Done
- [ ] `npx tsc --noEmit` in `mobile/` exits with code 0
- [ ] DelivererQueueScreen header shows ← back arrow that calls `navigation.goBack()`
- [ ] OrderDetailScreen header has `paddingTop: 60` (not `paddingVertical: 12`)

### Must Have
- ← back button on DelivererQueueScreen that navigates back
- Proper status bar offset (`paddingTop: 60`) on OrderDetailScreen header

### Must NOT Have (Guardrails)
- DO NOT touch any file other than `DelivererQueueScreen.tsx` and `OrderDetailScreen.tsx`
- DO NOT add `SafeAreaView` or `StatusBar` components — use `paddingTop: 60` pattern
- DO NOT change title text or font size on either screen (DelivererQueue stays `fontSize: 24`, OrderDetail stays `fontSize: 18`)
- DO NOT add right-side spacer elements to DelivererQueueScreen header
- DO NOT refactor other screen headers for consistency
- DO NOT add any new dependencies or packages
- DO NOT modify navigation stack configuration

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: None
- **Only check**: `npx tsc --noEmit`

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/`.

- **Frontend**: Use `npx tsc --noEmit` for type checking + Grep for content verification

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Single Task — both fixes are trivial):
└── Task 1: Fix DelivererQueueScreen back button + OrderDetailScreen header [quick]

Wave FINAL (After Task 1):
└── Verification: npx tsc --noEmit

Critical Path: Task 1 → tsc verification
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1    | None      | FINAL  |

### Agent Dispatch Summary

- **Wave 1**: 1 task → `quick`, skills: `[]`

---

## TODOs

- [ ] 1. Fix DelivererQueueScreen back button + OrderDetailScreen header padding

  **What to do**:

  **FILE 1: `mobile/src/screens/DelivererQueueScreen.tsx`**

  1. **Line 2** — Add `TouchableOpacity` to the `react-native` import:
     ```tsx
     import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
     ```

  2. **Lines 56-58** — Replace header content with back button + title:
     ```tsx
     <View style={[styles.header, { borderBottomColor: 'rgba(150, 150, 150, 0.1)' }]}>
       <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
         <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
       </TouchableOpacity>
       <Text style={[styles.title, { color: colors.text }]}>Available Orders</Text>
     </View>
     ```

  3. **Lines 98-103** — Update `header` style to add flexDirection and alignItems:
     ```tsx
     header: {
       flexDirection: 'row',
       alignItems: 'center',
       padding: 16,
       paddingTop: 60,
       borderBottomWidth: 1,
       borderBottomColor: 'rgba(150, 150, 150, 0.1)',
     },
     ```

  4. **After line 107** (after `title` style closing brace) — Add two new styles:
     ```tsx
     backButton: {
       padding: 8,
     },
     backArrow: {
       fontSize: 24,
       fontWeight: 'bold',
     },
     ```

  **FILE 2: `mobile/src/screens/OrderDetailScreen.tsx`**

  5. **Line 322** — Replace `paddingVertical: 12` with:
     ```tsx
     paddingTop: 60,
     paddingBottom: 12,
     ```

  6. **Run verification**: `npx tsc --noEmit` in `mobile/` directory — must exit 0.

  **Must NOT do**:
  - Touch any other files
  - Change title text or font sizes
  - Add SafeAreaView/StatusBar
  - Add right-side spacer to DelivererQueueScreen
  - Add any new packages

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Trivial edits — import addition, JSX insertion, style property changes across 2 files
  - **Skills**: `[]`
    - No specialized skills needed for these straightforward edits
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Overkill — copy-paste pattern fixes, not design work
    - `playwright`: No browser verification needed — `npx tsc --noEmit` is sufficient
    - `git-master`: No git operations requested

  **Parallelization**:
  - **Can Run In Parallel**: NO (single task)
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Final verification
  - **Blocked By**: None — can start immediately

  **References** (CRITICAL):

  **Pattern References** (existing code to follow):
  - `mobile/src/screens/OrderDetailScreen.tsx:174-175` — Back button JSX pattern: `<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>` + arrow Text
  - `mobile/src/screens/OrderDetailScreen.tsx:325-331` — `backButton` and `backArrow` style definitions to copy
  - `mobile/src/screens/DelivererQueueScreen.tsx:100` — `paddingTop: 60` pattern for status bar offset

  **API/Type References**:
  - `mobile/src/screens/DelivererQueueScreen.tsx:2` — Current react-native import (needs `TouchableOpacity` added)
  - `mobile/src/screens/DelivererQueueScreen.tsx:12` — `navigation` prop already destructured

  **WHY Each Reference Matters**:
  - OrderDetailScreen:174-175 → Copy the exact JSX pattern for the back button (arrow character, goBack call, style references)
  - OrderDetailScreen:325-331 → Copy the exact style values for consistency between screens
  - DelivererQueueScreen:100 → Confirms `paddingTop: 60` is the project pattern for status bar offset

  **Acceptance Criteria**:

  ```
  Scenario: DelivererQueueScreen back button exists and works
    Tool: Bash (grep)
    Preconditions: Edits applied to DelivererQueueScreen.tsx
    Steps:
      1. Grep DelivererQueueScreen.tsx for "TouchableOpacity" in import line
         Expected: Line contains "TouchableOpacity"
      2. Grep DelivererQueueScreen.tsx for "navigation.goBack()"
         Expected: At least 1 match in header JSX
      3. Grep DelivererQueueScreen.tsx for "backButton" in styles
         Expected: Style definition exists with "padding: 8"
      4. Grep DelivererQueueScreen.tsx for "backArrow" in styles
         Expected: Style definition exists with "fontSize: 24"
    Expected Result: All 4 grep checks find matches
    Failure Indicators: Any grep returns 0 matches
    Evidence: .sisyphus/evidence/task-1-deliverer-back-button.txt

  Scenario: OrderDetailScreen header has correct padding
    Tool: Bash (grep)
    Preconditions: Edits applied to OrderDetailScreen.tsx
    Steps:
      1. Grep OrderDetailScreen.tsx for "paddingTop: 60"
         Expected: Match found in header style
      2. Grep OrderDetailScreen.tsx for "paddingBottom: 12"
         Expected: Match found in header style
      3. Grep OrderDetailScreen.tsx for "paddingVertical: 12"
         Expected: ZERO matches (this line should be removed)
    Expected Result: paddingTop: 60 and paddingBottom: 12 present; paddingVertical: 12 absent
    Failure Indicators: paddingVertical: 12 still exists OR paddingTop: 60 missing
    Evidence: .sisyphus/evidence/task-1-orderdetail-header.txt

  Scenario: TypeScript type-check passes
    Tool: Bash
    Preconditions: Both files edited
    Steps:
      1. Run `npx tsc --noEmit` in mobile/ directory
    Expected Result: Exit code 0, no type errors
    Failure Indicators: Non-zero exit code or type error output
    Evidence: .sisyphus/evidence/task-1-tsc-check.txt
  ```

  **Commit**: YES
  - Message: `fix(mobile): add back button to DelivererQueue and fix OrderDetail header padding`
  - Files: `mobile/src/screens/DelivererQueueScreen.tsx`, `mobile/src/screens/OrderDetailScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> Single verification pass since there's only 1 task.

- [ ] F1. **TypeScript Verification** — `quick`
  Run `npx tsc --noEmit` in `mobile/` directory. Verify exit code 0. Read both modified files and confirm: (1) DelivererQueueScreen has TouchableOpacity import, back button JSX with goBack(), backButton/backArrow styles, and header has flexDirection:'row'. (2) OrderDetailScreen header has paddingTop:60, paddingBottom:12, and NO paddingVertical:12.
  Output: `tsc [PASS/FAIL] | DelivererQueue back button [YES/NO] | OrderDetail padding [FIXED/NOT FIXED] | VERDICT`

---

## Commit Strategy

- **Task 1**: `fix(mobile): add back button to DelivererQueue and fix OrderDetail header padding`
  - Files: `mobile/src/screens/DelivererQueueScreen.tsx`, `mobile/src/screens/OrderDetailScreen.tsx`
  - Pre-commit check: `npx tsc --noEmit`

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit  # Expected: exit 0, no errors (run in mobile/)
```

### Final Checklist
- [ ] DelivererQueueScreen has ← back button with `navigation.goBack()`
- [ ] OrderDetailScreen header has `paddingTop: 60` instead of `paddingVertical: 12`
- [ ] `npx tsc --noEmit` passes clean
- [ ] No other files modified
