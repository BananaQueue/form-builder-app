# Thank-you Review + Resubmit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a public form is submitted, let the respondent review a summary of their answers and start a fresh submission on the same form.

**Architecture:** Purely client-side additions to the existing `submitted` branch of `FormDisplay.jsx`. All data (`form.questions`, `answers`) is already in React state after submit, so the summary and reset need no server call and no page reload. New CSS classes follow the existing `fd-*` convention and design tokens.

**Tech Stack:** React (Vite), plain CSS with design tokens, Playwright for E2E.

## Global Constraints

- Follow the existing `fd-*` CSS class-naming convention in `form-display.css`.
- Use existing CSS design tokens (`var(--space-*)`, `var(--accent)`, `var(--text-primary)`, `var(--text-secondary)`, etc.) — no hard-coded colors or pixel spacing where a token exists.
- Do not add a server round-trip or page reload for either feature.
- Reuse the existing `isQuestionVisible` and `isAnsweredForQuestion` predicates for summary filtering — do not reimplement visibility/answered logic.
- E2E tests reset the DB via `resetTestDatabase(request)` in `beforeEach` and run against `form_builder_test`.

---

### Task 1: Thank-you page review summary + submit-another

**Files:**
- Modify: `form-builder-app/src/FormDisplay.jsx` (add state near line 73; replace the `submitted` block at lines 368-377)
- Modify: `form-builder-app/src/styles/form-display.css` (add rules after the `.fd-submitted-message` block, around line 58)
- Test: `form-builder-app/tests/thankyou-review-resubmit.spec.js` (create)

**Interfaces:**
- Consumes (already defined in `FormDisplay.jsx`): `form` (state; `form.questions` array of `{id, question_text, question_type, ...}`), `answers` (state; `{[id]: string}`), `submitted`/`setSubmitted`, `currentStep`/`setCurrentStep`, `dateRangeEnabled`/`setDateRangeEnabled`, `privacyAccepted`/`setPrivacyAccepted`, `isQuestionVisible(question)`, `isAnsweredForQuestion(question, value)`, `scrollPublicFormToTop(behavior)`.
- Produces: new state `showSummary`/`setShowSummary` and function `resetForm()`, both used only inside this component.

---

- [ ] **Step 1: Write the failing E2E test**

Create `form-builder-app/tests/thankyou-review-resubmit.spec.js`:

```javascript
import { expect, test } from '@playwright/test';
import { E2E_SUPER_ADMIN, getFormFromApi, resetTestDatabase } from './e2e-helpers';

async function loginAsSuperAdmin(page) {
  await page.goto('/');
  await page.locator('#login-username').fill(E2E_SUPER_ADMIN.username);
  await page.locator('#login-password').fill(E2E_SUPER_ADMIN.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('button', { name: 'All Forms' })).toBeVisible();
}

async function createTextQuestionForm(page, formTitle, questionText) {
  await page.getByRole('button', { name: '+ New Form' }).click();
  const formDetails = page.locator('.fb-paper').filter({ hasText: 'Form Details' });
  await formDetails.locator('input[placeholder="Enter form title"]').fill(formTitle);
  await formDetails.locator('textarea[placeholder="Enter form description"]').fill(
    'Created by Playwright against form_builder_test.',
  );
  const addQuestion = page.locator('.fb-paper').filter({ hasText: 'Add Question' });
  await addQuestion.locator('input[placeholder="Enter your question"]').fill(questionText);
  await addQuestion.locator('.fb-select').selectOption('text');
  await page.getByRole('button', { name: '+ Add Question to Form' }).click();
  await expect(page.locator('.fb-preview-card')).toContainText(questionText);
  await page.getByRole('button', { name: /Save Form to Database/ }).click();
  await expect(page.getByText('Form saved successfully')).toBeVisible();
}

async function submitOnce(page, answerText) {
  await page.locator('input[placeholder="Your answer"]').fill(answerText);
  await page.getByRole('button', { name: 'Submit' }).click();
  // Privacy notice may or may not be enabled; confirm it if present.
  const privacyHeading = page.getByRole('heading', { name: /Privacy Notice/ });
  if (await privacyHeading.isVisible().catch(() => false)) {
    await page.locator('.fd-privacy-checkbox').check();
    await page.getByRole('button', { name: 'Confirm & Submit' }).click();
  }
  await expect(page.getByRole('heading', { name: /Thank You/ })).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await resetTestDatabase(request);
});

test('respondent can review their response and submit another', async ({ page }) => {
  const formTitle = `E2E ThankYou Form ${Date.now()}`;
  const questionText = 'What is your office?';
  const answerText = 'Regional NGA Test Office';

  await loginAsSuperAdmin(page);
  await createTextQuestionForm(page, formTitle, questionText);

  const savedForm = await getFormFromApi(page, formTitle);
  expect(savedForm?.form_code).toBeTruthy();

  await page.goto(`/form/${savedForm.form_code}`);
  await expect(page.getByRole('heading', { name: formTitle })).toBeVisible();
  await submitOnce(page, answerText);

  // Review summary is hidden until requested.
  await expect(page.locator('.fd-summary')).toHaveCount(0);
  await page.getByRole('button', { name: 'Review your response' }).click();
  const summary = page.locator('.fd-summary');
  await expect(summary).toContainText(questionText);
  await expect(summary).toContainText(answerText);

  // Toggle hides it again.
  await page.getByRole('button', { name: 'Hide response' }).click();
  await expect(page.locator('.fd-summary')).toHaveCount(0);

  // Submit another response returns to a blank form.
  await page.getByRole('button', { name: 'Submit another response' }).click();
  const input = page.locator('input[placeholder="Your answer"]');
  await expect(input).toBeVisible();
  await expect(input).toHaveValue('');

  // A second submission works end to end.
  await submitOnce(page, 'Second Office Answer');
  await expect(page.getByRole('heading', { name: /Thank You/ })).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd form-builder-app && npx playwright test thankyou-review-resubmit.spec.js`
Expected: FAIL — no "Review your response" button exists yet (timeout locating the button).

- [ ] **Step 3: Add the `showSummary` state**

In `form-builder-app/src/FormDisplay.jsx`, after the `dateRangeEnabled` state (line 75), add:

```javascript
  const [showSummary, setShowSummary] = useState(false);
```

- [ ] **Step 4: Add the `resetForm` helper**

In `FormDisplay.jsx`, add this function right after `submitFormData` (after line 333, before the `useEffect`):

```javascript
  // ── resetForm ────────────────────────────────────────────────────────────
  // Returns the form to a pristine state on the SAME loaded form so the
  // respondent can submit another response without a page reload.
  // privacyAccepted is reset so handleSubmit re-shows the privacy modal
  // for privacy_notice forms on the next submit.
  function resetForm() {
    const cleared = {};
    form.questions.forEach((q) => {
      cleared[q.id] = "";
    });
    setAnswers(cleared);
    setCurrentStep(0);
    setDateRangeEnabled({});
    setPrivacyAccepted(false);
    setShowSummary(false);
    setSubmitted(false);
    scrollPublicFormToTop("auto");
  }
```

- [ ] **Step 5: Replace the `submitted` render block**

In `FormDisplay.jsx`, replace the entire `if (submitted) { ... }` block (lines 368-377) with:

```javascript
  if (submitted) {
    const summaryItems = form.questions.filter(
      (q) =>
        q.question_type !== "section" &&
        isQuestionVisible(q) &&
        isAnsweredForQuestion(q, answers[q.id]),
    );

    return (
      <div className="fd-state-screen">
        <h1 className="fd-submitted-title">✓ Thank You!</h1>
        <p className="fd-submitted-message">
          Your response has been submitted successfully.
        </p>

        <div className="fd-thankyou-actions">
          <button
            type="button"
            className="fd-thankyou-btn"
            onClick={() => setShowSummary((v) => !v)}
          >
            {showSummary ? "Hide response" : "Review your response"}
          </button>
          <button
            type="button"
            className="fd-thankyou-btn fd-thankyou-btn--primary"
            onClick={resetForm}
          >
            Submit another response
          </button>
        </div>

        {showSummary && (
          <div className="fd-summary">
            {summaryItems.length === 0 ? (
              <p className="fd-summary-empty">No answers to show.</p>
            ) : (
              <ul className="fd-summary-list">
                {summaryItems.map((q) => (
                  <li key={q.id} className="fd-summary-item">
                    <div className="fd-summary-q">{q.question_text}</div>
                    <div className="fd-summary-a">
                      {(answers[q.id] || "").split(",").join(", ")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }
```

- [ ] **Step 6: Add the CSS**

In `form-builder-app/src/styles/form-display.css`, add after the `.fd-submitted-message { ... }` rule (after line 58):

```css
/* Thank-you page actions + response summary */
.fd-thankyou-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-6);
}

.fd-thankyou-btn {
  padding: var(--space-3) var(--space-5);
  border: 1px solid var(--accent);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--accent);
  font-weight: 600;
  cursor: pointer;
}

.fd-thankyou-btn:hover {
  background: var(--accent-soft, rgba(0, 0, 0, 0.04));
}

.fd-thankyou-btn--primary {
  background: var(--accent);
  color: var(--on-accent, #fff);
}

.fd-thankyou-btn--primary:hover {
  filter: brightness(0.95);
}

.fd-summary {
  margin: var(--space-6) auto 0;
  max-width: 640px;
  text-align: left;
  border: 1px solid var(--border, rgba(0, 0, 0, 0.12));
  border-radius: var(--radius-md);
  padding: var(--space-5);
  background: var(--surface-1, rgba(0, 0, 0, 0.02));
}

.fd-summary-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.fd-summary-item {
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border, rgba(0, 0, 0, 0.08));
}

.fd-summary-item:last-child {
  border-bottom: none;
}

.fd-summary-q {
  font-weight: 600;
  color: var(--text-primary);
}

.fd-summary-a {
  margin-top: var(--space-1);
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

.fd-summary-empty {
  color: var(--text-secondary);
  margin: 0;
}
```

Note: `--accent-soft`, `--on-accent`, `--border`, `--surface-1`, and `--radius-md` use CSS fallback values in case a token is absent. If the file already defines these tokens, the fallbacks are ignored. Before committing, grep `form-display.css` and the shared token file for the real token names (e.g. `--radius`, `--surface`, `--card-bg`) and swap the fallback references to match what the file actually uses.

- [ ] **Step 7: Run lint**

Run: `cd form-builder-app && npm run lint`
Expected: PASS (no new eslint errors).

- [ ] **Step 8: Run the E2E test to verify it passes**

Run: `cd form-builder-app && npx playwright test thankyou-review-resubmit.spec.js`
Expected: PASS — review summary shows the question and answer, toggles off, resubmit clears the field, and a second submit reaches the Thank You screen.

- [ ] **Step 9: Manual spot-check (stepper + conditional forms)**

Start the app (`npm run dev` with the api running) and verify manually, since the E2E test only covers a single continuous text form:
- A **stepper-mode** form (`step_mode == 1`): after submit, "Submit another response" returns to Step 1.
- A form with a **conditional question** that stayed hidden: it does NOT appear in the review summary.
- A **checkbox** question with multiple selections: the summary shows them comma-space separated.
Expected: all three behave as described.

- [ ] **Step 10: Commit**

```bash
cd form-builder-app
git add src/FormDisplay.jsx src/styles/form-display.css tests/thankyou-review-resubmit.spec.js docs/superpowers/specs/2026-07-21-thankyou-review-resubmit-design.md docs/superpowers/plans/2026-07-21-thankyou-review-resubmit.md
git commit -m "feat: add response review and submit-another on thank-you page"
```

---

## Self-Review

**Spec coverage:**
- Review your response (inline toggle, answered-only) → Steps 3, 5 (state + summary render) ✓
- Submit another response (reset same form) → Steps 4, 5 ✓
- Privacy re-consent on resubmit → covered by `resetForm` setting `privacyAccepted=false` (Step 4), which the existing `handleSubmit` already acts on ✓
- Client-side only, no reload → confirmed in Global Constraints and `resetForm` ✓
- CSS `fd-thankyou-*` / `fd-summary-*` with tokens → Step 6 ✓
- Testing (manual + optional E2E) → E2E is Step 1/8, manual is Step 9 ✓

**Placeholder scan:** No TBD/TODO. The token-name caveat in Step 6 is a concrete verification instruction with real fallbacks, not a placeholder.

**Type consistency:** `showSummary`/`setShowSummary`, `resetForm`, `summaryItems` used consistently. `isQuestionVisible`/`isAnsweredForQuestion` signatures match `FormDisplay.jsx`. CSS class names in the test (`.fd-summary`, button role names "Review your response" / "Hide response" / "Submit another response") match the JSX in Step 5.
