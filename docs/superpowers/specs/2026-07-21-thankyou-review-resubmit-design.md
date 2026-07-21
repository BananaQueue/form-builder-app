# Thank-you page: review response + submit another

**Date:** 2026-07-21
**Scope:** `form-builder-app/src/FormDisplay.jsx` + `form-builder-app/src/styles/form-display.css`

## Goal

After a public form is submitted, the thank-you screen currently shows only a
static "✓ Thank You!" message. Add two respondent affordances:

1. **Review your response** — reveal an inline summary of the questions the
   respondent answered, with their answers.
2. **Submit another response** — reset the form to a fresh blank state so the
   same respondent can submit again on the same device.

## Non-goals (YAGNI)

- No server round-trip for the summary. All data (`form.questions`, `answers`)
  is already in React state after submit.
- No full page reload for "submit another" — the loaded form definition is
  reused.
- No editing of the submitted answers. Review is read-only.
- No printing / PDF / email of the summary.

## Current behavior

`FormDisplay.jsx:368-377` renders, when `submitted === true`:

```jsx
<div className="fd-state-screen">
  <h1 className="fd-submitted-title">✓ Thank You!</h1>
  <p className="fd-submitted-message">Your response has been submitted successfully.</p>
</div>
```

After a successful submit, component state is left intact — `answers`,
`form`, `currentStep`, `dateRangeEnabled`, `privacyAccepted` still hold the
submitted values. This is what makes a client-side summary and reset possible.

## Design

### State

Add one piece of local state near the existing `useState` calls:

```js
const [showSummary, setShowSummary] = useState(false);
```

### Reset helper

Add a `resetForm()` function that returns the form to a pristine state on the
same form definition:

```js
function resetForm() {
  const cleared = {};
  form.questions.forEach((q) => { cleared[q.id] = ""; });
  setAnswers(cleared);
  setCurrentStep(0);
  setDateRangeEnabled({});
  setPrivacyAccepted(false);
  setShowSummary(false);
  setSubmitted(false);
  scrollPublicFormToTop("auto");
}
```

Because `privacyAccepted` is reset to `false` and `handleSubmit` already
re-opens the privacy modal whenever `form.privacy_notice == 1`, each new
submission re-collects consent with no extra code.

### Summary data

The summary lists only questions that were **visible and answered**, reusing
the existing predicates so hidden conditional questions and blanks are skipped:

```js
const summaryItems = form.questions.filter(
  (q) =>
    q.question_type !== "section" &&
    isQuestionVisible(q) &&
    isAnsweredForQuestion(q, answers[q.id]),
);
```

Answers render as their stored string form. Checkbox answers are already a
comma-joined string; date-range answers are already joined with `" to "`.
For display, checkbox commas are shown as ", " (comma-space) for readability.

### Rendered thank-you screen

```jsx
if (submitted) {
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

Note: the summary block must be computed inside the `submitted` branch (or
before it) so `summaryItems` is in scope.

### Styling

Add to `form-display.css`, using existing design tokens (`--space-*`,
`--accent`, `--text-*`, `--surface-*`, radius/border vars already in the file):

- `.fd-thankyou-actions` — flex row, centered, gap, wraps on mobile,
  top margin.
- `.fd-thankyou-btn` — neutral/outline button matching existing button feel.
- `.fd-thankyou-btn--primary` — accent-filled variant for "Submit another".
- `.fd-summary` — left-aligned container, max-width, top margin, subtle
  surface background + border.
- `.fd-summary-list` / `.fd-summary-item` — stacked rows with separators.
- `.fd-summary-q` — question text, emphasized.
- `.fd-summary-a` — answer text, secondary color.
- `.fd-summary-empty` — muted fallback line.

Exact token values chosen to match the surrounding file during implementation.

## Testing

- **Manual:** submit a form (both continuous and stepper mode; with and
  without a privacy notice; with conditional questions), then:
  - "Review your response" toggles an accurate summary of answered questions;
    hidden/unanswered questions are absent.
  - "Submit another response" clears all fields, returns to step 1, and a
    subsequent submit re-shows the privacy modal when applicable.
- **E2E (if added to existing Playwright suite):** extend a form-lifecycle
  spec to assert the two buttons appear post-submit and that the summary
  lists a known answer.

## Files touched

- `form-builder-app/src/FormDisplay.jsx` — state, `resetForm`, summary
  computation, thank-you JSX.
- `form-builder-app/src/styles/form-display.css` — new `fd-thankyou-*` and
  `fd-summary-*` rules.
