# Update App Branding: DeliverU + #0055de Accent Color

## TL;DR

> **Quick Summary**: Change app title to "DeliverU" and update upload button + loading spinner to use #0055de blue.
> 
> **Deliverables**:
> - App title displays "DeliverU" instead of "UST McDelivery"
> - Upload button background color is #0055de (both light/dark modes)
> - Loading spinner uses #0055de as primary color
> 
> **Estimated Effort**: Quick (5-10 minutes)
> **Parallel Execution**: NO - sequential (3 tiny edits)
> **Critical Path**: Task 1 → Task 2 → Task 3 → Verification

---

## Context

### Original Request
User wants to rebrand the app from "UST McDelivery" to "DeliverU" and use #0055de (vibrant blue) for key interactive elements (upload button and loading spinner), while keeping the existing theme colors for everything else (backgrounds, text, cards).

### Current State
- App title: "UST McDelivery" (line 68 in `DashboardScreen.tsx`)
- Upload button: Uses `colors.primary` from theme (McDonald's red #DA291C for light mode, yellow #FFC72C for dark mode)
- Loading screen: Uses default system spinner (no custom color specified)

### User Requirements
- **Title**: "DeliverU" (exact spelling, no spaces)
- **Upload button**: #0055de background color, same for light and dark modes
- **Loading spinner**: #0055de color
- **Keep current theme**: Do NOT change theme colors (primary, accent, etc.) — only the specific button and spinner

---

## Work Objectives

### Core Objective
Update app branding to "DeliverU" and apply #0055de blue to upload button and loading spinner for consistent visual identity.

### Concrete Deliverables
- `frontend/src/screens/DashboardScreen.tsx` - Title text changed to "DeliverU", upload button uses #0055de
- `frontend/src/screens/LoadingScreen.tsx` - Spinner color changed to #0055de

### Definition of Done
- [ ] App displays "DeliverU" as title on dashboard (verified by reading DashboardScreen.tsx line 68)
- [ ] Upload button background is #0055de in both light and dark modes (no dependency on theme colors)
- [ ] Loading spinner is #0055de (verified by reading LoadingScreen.tsx)
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)

### Must Have
- Exact title: "DeliverU" (case-sensitive)
- Exact color: #0055de (no variations)
- Button color consistent across light/dark modes

### Must NOT Have (Guardrails)
- Do NOT change theme colors in `ThemeContext.tsx` (primary, accent, background, text, etc.)
- Do NOT change other button colors (FAQ, Profile, Logout)
- Do NOT change text colors or card backgrounds
- Do NOT add gradients, shadows, or other visual effects beyond the color change

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO automated tests for UI components
- **Automated tests**: None required (trivial UI changes)
- **Framework**: N/A

### QA Policy
Every task includes agent-executed QA scenarios verifying the actual rendered output.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

---

## Execution Strategy

### Sequential Execution

```
Task 1: Change app title to DeliverU [quick]
  ↓
Task 2: Update upload button color to #0055de [quick]
  ↓
Task 3: Update loading spinner color to #0055de [quick]
  ↓
Verification: TypeScript compile check [quick]
```

**Why Sequential**: Each task is trivial (1-2 line changes). No benefit to parallelization. Total time < 10 minutes.

---

## TODOs

- [ ] 1. Change app title from "UST McDelivery" to "DeliverU"

  **What to do**:
  - Open `frontend/src/screens/DashboardScreen.tsx`
  - Find line 68: `<Text style={[styles.title, { color: colors.text }]}>UST McDelivery</Text>`
  - Change text content to: `DeliverU`
  - Result: `<Text style={[styles.title, { color: colors.text }]}>DeliverU</Text>`

  **Must NOT do**:
  - Do NOT change the style, className, or any other attributes
  - Do NOT add emojis or special characters
  - Do NOT change line 69-71 (subtitle text should remain "Student-to-Student Delivery")

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line text change, no logic or styling modifications
  - **Skills**: []
    - No special skills needed for text replacement

  **Parallelization**:
  - **Can Run In Parallel**: NO (but task is so trivial it doesn't matter)
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2 (for cleaner commit grouping)
  - **Blocked By**: None (can start immediately)

  **References**:
  
  **File to Edit**:
  - `frontend/src/screens/DashboardScreen.tsx:68` - Title text content (inside `<Text>` tag)
  
  **Context Lines**:
  - Line 67: `<View style={styles.header}>`
  - Line 68: **TARGET LINE** - Change "UST McDelivery" to "DeliverU"
  - Line 69-71: Subtitle (leave unchanged)

  **No External References Needed**: This is a pure text string replacement.

  **Acceptance Criteria**:
  
  **Verification**:
  - [ ] Read `frontend/src/screens/DashboardScreen.tsx` line 68
  - [ ] Confirm text content is exactly "DeliverU" (no extra spaces or characters)
  - [ ] Confirm style attributes unchanged: `[styles.title, { color: colors.text }]`

  **QA Scenarios (MANDATORY)**:
  
  ```
  Scenario: App title displays "DeliverU" on dashboard
    Tool: Bash (grep)
    Preconditions: File edited and saved
    Steps:
      1. Run: grep -n "DeliverU" frontend/src/screens/DashboardScreen.tsx
      2. Verify line 68 contains: <Text style={[styles.title, { color: colors.text }]}>DeliverU</Text>
      3. Run: grep -n "UST McDelivery" frontend/src/screens/DashboardScreen.tsx
      4. Assert: No matches found (old name removed)
    Expected Result: Line 68 has "DeliverU", no occurrences of "UST McDelivery"
    Failure Indicators: Old name still present, typo in new name, style attributes modified
    Evidence: .sisyphus/evidence/task-1-title-change.txt
  ```

  **Evidence to Capture**:
  - [ ] Grep output showing line 68 with "DeliverU"
  - [ ] Grep output confirming "UST McDelivery" removed
  - [ ] Save to: `task-1-title-change.txt`

  **Commit**: YES
  - Message: `chore(ui): rebrand app title to DeliverU`
  - Files: `frontend/src/screens/DashboardScreen.tsx`
  - Pre-commit: `npx tsc --noEmit` (in frontend directory)

---

- [ ] 2. Update upload button background color to #0055de

  **What to do**:
  - Open `frontend/src/screens/DashboardScreen.tsx`
  - Find line 96-100 (upload button `<TouchableOpacity>`)
  - Currently: `style={[styles.uploadButton, { backgroundColor: colors.primary }]}`
  - Change to: `style={styles.uploadButton}` (remove inline backgroundColor)
  - Open `styles` section at bottom of file (line 199-208: `uploadButton` style definition)
  - Add: `backgroundColor: '#0055de',` to the `uploadButton` style object
  - Result: Button uses hardcoded #0055de instead of theme color

  **Must NOT do**:
  - Do NOT change button text ("Upload Receipt")
  - Do NOT change button icon (📸)
  - Do NOT modify shadow, padding, or other style properties
  - Do NOT change `ThemeContext.tsx` (theme colors remain unchanged)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple style modification, 2 small edits in same file
  - **Skills**: []
    - No special skills needed for style updates

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: Task 1 (for commit grouping)

  **References**:
  
  **File to Edit**:
  - `frontend/src/screens/DashboardScreen.tsx:96-100` - Button component (remove inline backgroundColor)
  - `frontend/src/screens/DashboardScreen.tsx:199-208` - Style definition (add backgroundColor property)
  
  **Current Code**:
  ```typescript
  // Line 96-100 (button component)
  <TouchableOpacity
    style={[styles.uploadButton, { backgroundColor: colors.primary }]}
    onPress={handleUploadReceipt}
    activeOpacity={0.8}
  >
  
  // Line 199-208 (style definition)
  uploadButton: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  ```
  
  **Target Code**:
  ```typescript
  // Line 96-100 (button component) - REMOVE inline backgroundColor
  <TouchableOpacity
    style={styles.uploadButton}
    onPress={handleUploadReceipt}
    activeOpacity={0.8}
  >
  
  // Line 199-208 (style definition) - ADD backgroundColor property
  uploadButton: {
    backgroundColor: '#0055de',  // ← ADD THIS LINE
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  ```

  **Acceptance Criteria**:
  
  **Verification**:
  - [ ] Read line 96-100: Confirm `style={styles.uploadButton}` (no inline backgroundColor)
  - [ ] Read line 199-208: Confirm `backgroundColor: '#0055de',` present in style object
  - [ ] Run `npx tsc --noEmit` in frontend directory: Zero errors

  **QA Scenarios (MANDATORY)**:
  
  ```
  Scenario: Upload button uses #0055de color
    Tool: Bash (grep)
    Preconditions: File edited and saved
    Steps:
      1. Run: grep -A 3 "style={styles.uploadButton}" frontend/src/screens/DashboardScreen.tsx
      2. Verify: No inline backgroundColor in the style prop (line ~97)
      3. Run: grep -A 10 "uploadButton: {" frontend/src/screens/DashboardScreen.tsx
      4. Verify: backgroundColor: '#0055de', present in style definition
    Expected Result: Inline color removed, #0055de in styles object
    Failure Indicators: Still uses colors.primary, wrong color code, backgroundColor missing
    Evidence: .sisyphus/evidence/task-2-button-color.txt
  
  Scenario: TypeScript compiles cleanly
    Tool: Bash (npx tsc)
    Preconditions: Edits applied
    Steps:
      1. cd frontend
      2. Run: npx tsc --noEmit
      3. Assert: Exit code 0, no output
    Expected Result: TypeScript compilation succeeds with zero errors
    Failure Indicators: Type errors, syntax errors, missing imports
    Evidence: .sisyphus/evidence/task-2-typecheck.txt
  ```

  **Evidence to Capture**:
  - [ ] Grep output showing style changes
  - [ ] TypeScript compilation output (should be empty/success)
  - [ ] Save to: `task-2-button-color.txt`, `task-2-typecheck.txt`

  **Commit**: YES
  - Message: `style(ui): change upload button to #0055de blue`
  - Files: `frontend/src/screens/DashboardScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 3. Update loading spinner color to #0055de

  **What to do**:
  - Open `frontend/src/screens/LoadingScreen.tsx`
  - Find the `<ActivityIndicator>` component (likely around line 20-30)
  - Add or update the `color` prop to: `color="#0055de"`
  - Result: Spinner displays in #0055de blue instead of default system color

  **Must NOT do**:
  - Do NOT change spinner size
  - Do NOT change loading text ("Processing your receipt...")
  - Do NOT add animations or other visual effects
  - Do NOT modify layout or spacing

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single prop update on existing component
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Task 2)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 2 (for commit grouping)

  **References**:
  
  **File to Edit**:
  - `frontend/src/screens/LoadingScreen.tsx` - ActivityIndicator component
  
  **Pattern to Follow**:
  - React Native ActivityIndicator API: `<ActivityIndicator size="large" color="#HEXCODE" />`
  - Docs: https://reactnative.dev/docs/activityindicator
  
  **Expected Location**:
  - The file imports `ActivityIndicator` from 'react-native'
  - Component is likely in a centered View, showing while OCR processes
  - May already have a `size` prop (keep it), just add/update `color`

  **Acceptance Criteria**:
  
  **Verification**:
  - [ ] Read `frontend/src/screens/LoadingScreen.tsx`
  - [ ] Confirm `<ActivityIndicator>` has prop: `color="#0055de"`
  - [ ] Run `npx tsc --noEmit` in frontend directory: Zero errors

  **QA Scenarios (MANDATORY)**:
  
  ```
  Scenario: Loading spinner has #0055de color
    Tool: Bash (grep)
    Preconditions: File edited and saved
    Steps:
      1. Run: grep -n "ActivityIndicator" frontend/src/screens/LoadingScreen.tsx
      2. Run: grep -B 2 -A 2 "ActivityIndicator" frontend/src/screens/LoadingScreen.tsx
      3. Verify: color="#0055de" prop present in ActivityIndicator component
    Expected Result: ActivityIndicator component includes color="#0055de"
    Failure Indicators: No color prop, wrong hex code, prop commented out
    Evidence: .sisyphus/evidence/task-3-spinner-color.txt
  
  Scenario: TypeScript compiles cleanly
    Tool: Bash (npx tsc)
    Preconditions: All edits complete
    Steps:
      1. cd frontend
      2. Run: npx tsc --noEmit
      3. Assert: Exit code 0, no output
    Expected Result: TypeScript compilation succeeds with zero errors
    Failure Indicators: Type errors, syntax errors
    Evidence: .sisyphus/evidence/task-3-typecheck.txt
  ```

  **Evidence to Capture**:
  - [ ] Grep output showing ActivityIndicator with color prop
  - [ ] TypeScript compilation output
  - [ ] Save to: `task-3-spinner-color.txt`, `task-3-typecheck.txt`

  **Commit**: YES
  - Message: `style(ui): change loading spinner to #0055de blue`
  - Files: `frontend/src/screens/LoadingScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

## Final Verification

After all tasks complete, verify the changes are correct:

### Verification Commands
```bash
# Check title change
grep -n "DeliverU" frontend/src/screens/DashboardScreen.tsx

# Check button color
grep -n "#0055de" frontend/src/screens/DashboardScreen.tsx

# Check spinner color
grep -n "#0055de" frontend/src/screens/LoadingScreen.tsx

# Compile check
cd frontend && npx tsc --noEmit
```

**Expected Output**:
- Line 68 contains "DeliverU"
- uploadButton style contains `backgroundColor: '#0055de'`
- ActivityIndicator has `color="#0055de"`
- TypeScript: No errors

### Final Checklist
- [ ] App title is "DeliverU" (exact spelling)
- [ ] Upload button background is #0055de
- [ ] Loading spinner is #0055de
- [ ] TypeScript compiles with zero errors
- [ ] No other visual elements changed (theme colors, text, cards remain unchanged)

---

## Success Criteria

**User Validation**:
1. Open app on device/simulator
2. Dashboard shows "DeliverU" as title
3. Upload button is vibrant blue (#0055de), consistent in light and dark modes
4. Tap upload, navigate to loading screen
5. Spinner animates in #0055de blue

**Technical Validation**:
- Zero TypeScript errors
- All three files modified correctly
- Git history shows 3 clean commits with descriptive messages
