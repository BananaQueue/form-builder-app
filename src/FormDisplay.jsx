import { useState, useEffect } from "react";
import { apiUrl } from "./apiBase";

// ── buildSteps ────────────────────────────────────────────────────────────────
// Converts the flat questions array into an array of step objects.
// Each section block starts a new step and becomes that step's title.
// Questions that appear before the first section block form Step 1
// with the default title "General".
//
// Example input:
//   [Q1, Q2, {type:"section", text:"Employment"}, Q3, Q4]
// Example output:
//   [
//     { title: "General",    index: 0, questions: [Q1, Q2] },
//     { title: "Employment", index: 1, questions: [Q3, Q4] },
//   ]
//
// If there are NO section blocks, all questions go into one step.
// This means step mode still works safely on forms without sections.
function buildSteps(questions) {
  const steps = [];
  let currentStep = null;

  for (const question of questions) {
    if (question.question_type === "section") {
      // This section starts a new step.
      // Push whatever we've accumulated so far (if anything).
      if (currentStep) steps.push(currentStep);
      currentStep = {
        title: question.question_text,
        description: question.description || '',
        sectionId: question.id,
        questions: [],
      };
    } else {
      // Regular question — add to the current step.
      // If no step exists yet (questions before the first section),
      // create the implicit "General" step now.
      if (!currentStep) {
        currentStep = { title: "General", description: '', sectionId: null, questions: [] };
      }
      currentStep.questions.push(question);
    }
  }

  // Push the last step (the loop ends without pushing it)
  if (currentStep) steps.push(currentStep);

  // Add a numeric index to each step for easy reference
  return steps.map((step, idx) => ({ ...step, index: idx }));
}

function FormDisplay({ formCode, formId, isMobile = false, showToast }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const DATE_RANGE_SEPARATOR = " to ";
  const [dateRangeEnabled, setDateRangeEnabled] = useState({});

  // NEW: which step the user is currently on (0-indexed).
  // Only used when form.step_mode == 1.
  const [currentStep, setCurrentStep] = useState(0);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [bannerTs] = useState(() => Date.now());

  async function fetchFormDetails() {
    try {
      const url = formCode
        ? apiUrl(`/api/public/forms/${encodeURIComponent(formCode)}`)
        : apiUrl(`/api/forms/${formId}`);

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setForm(result.form);
        const initialAnswers = {};
        result.form.questions.forEach((q) => {
          initialAnswers[q.id] = "";
        });
        setAnswers(initialAnswers);
      } else {
        setError(result.error || "Failed to load form");
      }
    } catch (err) {
      setError("Could not connect to server: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleAnswerChange(questionId, value) {
    setAnswers({ ...answers, [questionId]: value });
  }

  function parseDateRangeAnswer(value) {
    const raw = value || "";
    const idx = raw.indexOf(DATE_RANGE_SEPARATOR);
    if (idx === -1) return { start: raw, end: "" };
    return {
      start: raw.slice(0, idx),
      end: raw.slice(idx + DATE_RANGE_SEPARATOR.length),
    };
  }

  function buildDateRangeAnswer(start, end) {
    const s = (start || "").trim();
    const e = (end || "").trim();
    if (!s && !e) return "";
    return `${s}${DATE_RANGE_SEPARATOR}${e}`;
  }

  function isAnsweredForQuestion(question, value) {
    const raw = (value ?? "").toString();
    if (
      question.question_type === "datetime" &&
      dateRangeEnabled[question.id]
    ) {
      const { start, end } = parseDateRangeAnswer(raw);
      return start.trim() !== "" && end.trim() !== "";
    }
    return raw.trim() !== "";
  }

  function isQuestionVisible(question) {
    if (!question.condition_question_id) return true;

    const conditionType = question.condition_type || "equals";
    const conditionAnswer = answers[question.condition_question_id];

    if (conditionType === "is_answered") {
      return conditionAnswer && conditionAnswer.trim() !== "";
    }
    if (!conditionAnswer || conditionAnswer.trim() === "") return false;

    const conditionQuestion = form.questions.find(
      (q) => q.id === question.condition_question_id,
    );

    if (
      conditionType === "option_selected" &&
      conditionQuestion &&
      conditionQuestion.question_type === "checkbox"
    ) {
      const selectedOptions = conditionAnswer.split(",").map((s) => s.trim());
      return selectedOptions.includes(question.condition_value);
    }

    if (conditionType === "contains") {
      const selectedOptions = conditionAnswer.split(",").map((s) => s.trim());
      return selectedOptions.includes(String(question.condition_value ?? ""));
    }

    if (conditionType === "not_contains") {
      const selectedOptions = conditionAnswer.split(",").map((s) => s.trim());
      return !selectedOptions.includes(String(question.condition_value ?? ""));
    }

    const conditionValue = String(question.condition_value ?? "").trim();

    if (conditionType === "equals") {
      if (conditionQuestion && conditionQuestion.question_type === "checkbox") {
        const selectedOptions = conditionAnswer.split(",").map((s) => s.trim());
        return selectedOptions.includes(question.condition_value);
      }
      return conditionAnswer.trim() === conditionValue;
    }

    if (conditionType === "not_equals") {
      if (conditionQuestion && conditionQuestion.question_type === "checkbox") {
        const selectedOptions = conditionAnswer.split(",").map((s) => s.trim());
        return !selectedOptions.includes(question.condition_value);
      }
      return conditionAnswer.trim() !== conditionValue;
    }

    return true;
  }

  // ── validateStep ─────────────────────────────────────────────────────────
  // Checks whether all required visible questions in a given step are answered.
  // Returns an array of question numbers that are missing answers.
  // An empty array means the step is valid and the user can proceed.
  function validateStep(stepQuestions) {
    // We need the global question counter for meaningful error messages
    // ("Please answer questions 3 and 5") rather than step-local numbers.
    const unanswered = stepQuestions.filter((q) => {
      const isRequired =
        q.is_required === 1 || q.is_required === "1" || q.is_required === true;
      const isVisible = isQuestionVisible(q);
      const isAnswered = isAnsweredForQuestion(q, answers[q.id]);
      return isRequired && isVisible && !isAnswered;
    });

    if (unanswered.length > 0) {
      // Find the global position of each unanswered question
      const questionNumbers = unanswered.map((uq) => {
        let counter = 0;
        for (const q of form.questions) {
          if (q.question_type === "section") continue;
          counter++;
          if (q.id === uq.id) return counter;
        }
        return "?";
      });
      showToast(`Please answer required questions: ${questionNumbers.join(", ")}`, "warning");
      return questionNumbers;
    }
    return [];
  }

  // ── handleNext ───────────────────────────────────────────────────────────
  // Called when the user clicks "Next" in stepper mode.
  // Validates the current step's required questions before advancing.
  function handleNext(steps) {
    const missing = validateStep(steps[currentStep].questions);
    if (missing.length > 0) {
       showToast?.(`Please answer required questions: ${missing.join(", ")}`, "warning");
      return;
    }
    setCurrentStep(currentStep + 1);
    // Scroll to top of form so the next step starts at the top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── handleBack ───────────────────────────────────────────────────────────
  // Goes to the previous step. No validation needed going backwards.
  function handleBack() {
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── handleSubmit ─────────────────────────────────────────────────────────
  // Called by the form's onSubmit (continuous mode) or the final step's
  // Submit button (stepper mode). Validates all required questions,
  // then shows the privacy modal if needed, or submits directly.
  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    // Validate ALL required questions (across all steps in stepper mode)
    const unansweredRequired = form.questions.filter((q) => {
      if (q.question_type === "section") return false;
      const isRequired =
        q.is_required === 1 || q.is_required === "1" || q.is_required === true;
      const isVisible = isQuestionVisible(q);
      const isAnswered = isAnsweredForQuestion(q, answers[q.id]);
      return isRequired && isVisible && !isAnswered;
    });

    if (unansweredRequired.length > 0) {
      const questionNumbers = unansweredRequired.map((q) => {
        let counter = 0;
        for (const fq of form.questions) {
          if (fq.question_type === "section") continue;
          counter++;
          if (fq.id === q.id) return counter;
        }
        return "?";
      });
      showToast(`Please answer required questions: ${questionNumbers.join(", ")}`, "warning");
      return;
    }

    if (form.privacy_notice == 1) {
      setPrivacyAccepted(false);
      setShowPrivacyModal(true);
      return;
    }

    await submitFormData();
  }

  async function handleConfirmSubmit() {
    setShowPrivacyModal(false);
    await submitFormData();
  }

  async function submitFormData() {
    setSubmitting(true);

    const submissionData = {
      form_id: form.id,
      answers: form.questions.map((q) => ({
        question_id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        answer_text: answers[q.id] ?? '',
      })),
    };

    try {
      const response = await fetch(apiUrl("/submit_response.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        showToast("Error submitting form: " + (result.error || "Unknown error"), "error");
      }
    } catch (error) {
       showToast("Failed to connect to server: " + error.message, "error");
      console.error("Error:", error);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    fetchFormDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formCode, formId]);

  if (loading) {
    return (
      <div className="fd-state-screen fd-state-screen--loading">
        <div className="form-list-loading">
          <div className="form-list-loading__dots">
            <span className="form-list-dot" />
            <span className="form-list-dot" />
            <span className="form-list-dot" />
          </div>
          <p className="afl-td-loading">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fd-state-screen fd-state-screen--error">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!form) {
    return <div className="fd-state-screen">Form not found</div>;
  }

  if (submitted) {
    return (
      <div className="fd-state-screen">
        <h1 className="fd-submitted-title">✓ Thank You!</h1>
        <p className="fd-submitted-message">
          Your response has been submitted successfully.
        </p>
      </div>
    );
  }

  // ── Stepper mode ──────────────────────────────────────────────────────────
  // Build steps now — we need this for both rendering paths below.
  // buildSteps is called every render but it's cheap (just array iteration).
  const steps = buildSteps(form.questions);
  const isStepMode = form.step_mode == 1 && steps.length > 0;
  const isLastStep = isStepMode && currentStep === steps.length - 1;
  const progressPercent = isStepMode
    ? Math.round((currentStep / steps.length) * 100)
    : 0;

  // ── renderQuestion ────────────────────────────────────────────────────────
  // Shared question rendering logic used by both continuous and stepper modes.
  // Takes a question and its visible index (number shown to the user).
  function renderQuestion(question, visibleIndex) {
    if (!isQuestionVisible(question)) return null;

    return (
      <div key={question.id} className="fd-question-card">
        <label className="fd-question-label">
          <strong className="fd-question-title">
            {visibleIndex}. {question.question_text}
          </strong>
          {(question.is_required === 1 ||
            question.is_required === "1" ||
            question.is_required === true) && (
            <span className="fd-required-star">*</span>
          )}
          {!(
            question.is_required === 1 ||
            question.is_required === "1" ||
            question.is_required === true
          ) && (
            <span className="fd-optional-text">(optional)</span>
          )}
        </label>

        {question.question_type === "text" && (
          <input
            type="text"
            value={answers[question.id] || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="fd-input"
            placeholder="Your answer"
          />
        )}

        {question.question_type === "email" && (
          <input
            type="email"
            value={answers[question.id] || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="fd-input"
            placeholder="Enter your email address"
          />
        )}

        {question.question_type === "number" && (
          <input
            type="number"
            step="1"
            value={answers[question.id] || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            min={question.number_min || undefined}
            max={question.number_max || undefined}
            // step={
            //   question.number_step === "any"
            //     ? "any"
            //     : question.number_step || "1"
            // }
            className="fd-input"
            placeholder={
              question.number_min && question.number_max
                ? `Enter number (${question.number_min} - ${question.number_max})`
                : "Enter number"
            }
          />
        )}

        {question.question_type === "datetime" && (
          <>
            <label className="fd-date-range-toggle">
              <input
                type="checkbox"
                checked={Boolean(dateRangeEnabled[question.id])}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDateRangeEnabled((prev) => ({
                    ...prev,
                    [question.id]: checked,
                  }));
                  if (!checked) {
                    const { start } = parseDateRangeAnswer(
                      answers[question.id] || "",
                    );
                    handleAnswerChange(question.id, (start || "").trim());
                  }
                }}
              />
              <span className="fd-date-range-toggle-label">Range</span>
              <span className="fd-date-range-toggle-hint">
                (pick start and end)
              </span>
            </label>

            {dateRangeEnabled[question.id] ? (
              (() => {
                const inputType = question.datetime_type || "date";
                const { start, end } = parseDateRangeAnswer(
                  answers[question.id] || "",
                );
                return (
                  <div className="fd-date-range-grid">
                    <div>
                      <div className="fd-date-range-sublabel">Start</div>
                      <input
                        type={inputType}
                        value={start}
                        onChange={(e) =>
                          handleAnswerChange(
                            question.id,
                            buildDateRangeAnswer(e.target.value, end),
                          )
                        }
                        className="fd-input"
                      />
                    </div>
                    <div>
                      <div className="fd-date-range-sublabel">End</div>
                      <input
                        type={inputType}
                        value={end}
                        min={start || undefined}
                        onChange={(e) =>
                          handleAnswerChange(
                            question.id,
                            buildDateRangeAnswer(start, e.target.value),
                          )
                        }
                        className="fd-input"
                      />
                    </div>
                  </div>
                );
              })()
            ) : (
              <input
                type={question.datetime_type || "date"}
                value={answers[question.id] || ""}
                onChange={(e) =>
                  handleAnswerChange(question.id, e.target.value)
                }
                className="fd-input"
              />
            )}
          </>
        )}

        {question.question_type === "multiple_choice" && (
          <div className="fd-options-row">
            {(Array.isArray(question.options) ? question.options : []).map((option, optIndex) => (
              <div key={optIndex} className="fd-option-item">
                <label className="fd-option-label">
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value={option}
                    checked={answers[question.id] === option}
                    onChange={(e) =>
                      handleAnswerChange(question.id, e.target.value)
                    }
                    className="fd-option-input"
                  />
                  <span>{option}</span>
                </label>
              </div>
            ))}
          </div>
        )}

        {question.question_type === "checkbox" && (
          <div className="fd-options-row">
            {(Array.isArray(question.options) ? question.options : []).map((option, optIndex) => (
              <div key={optIndex} className="fd-option-item">
                <label className="fd-option-label">
                  <input
                    type="checkbox"
                    value={option}
                    checked={(answers[question.id] || "")
                      .split(",")
                      .includes(option)}
                    onChange={(e) => {
                      const currentAnswers = answers[question.id]
                        ? answers[question.id].split(",")
                        : [];
                      const newAnswers = e.target.checked
                        ? [...currentAnswers, option]
                        : currentAnswers.filter((a) => a !== option);
                      handleAnswerChange(question.id, newAnswers.join(","));
                    }}
                    className="fd-option-input"
                  />
                  <span>{option}</span>
                </label>
              </div>
            ))}
          </div>
        )}

        {question.question_type === "rating" && (
          <div className="fd-rating-row">
            {(Array.isArray(question.options) ? question.options : []).map((option, optIndex) => (
              <label
                key={optIndex}
                className={`fd-rating-label ${
                  answers[question.id] === option
                    ? "fd-rating-label--selected"
                    : "fd-rating-label--unselected"
                }`}
              >
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  value={option}
                  checked={answers[question.id] === option}
                  onChange={(e) =>
                    handleAnswerChange(question.id, e.target.value)
                  }
                  style={{ display: "none" }}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={isMobile ? "fd-shell fd-shell--mobile" : "fd-shell"}>

      {/* ── Agency Banner ── */}
      <div className="fd-banner" style={{ display: bannerLoaded ? 'block' : 'none' }}>
        <img
          src={`${apiUrl('/uploads/banner.png')}?t=${bannerTs}`}
          alt="Agency banner"
          className="fd-banner-img"
          onLoad={() => setBannerLoaded(true)}
          onError={() => setBannerLoaded(false)}
        />
      </div>

      {/* ── Privacy Modal ── */}
      {showPrivacyModal && (
        <div className="fd-modal-overlay">
          <div className="fd-modal-card">
            <h2 className="fd-modal-title">🔒 Privacy Notice</h2>
            <p className="fd-modal-subtitle">
              Please read the following before submitting your response.
            </p>
            <div className="fd-notice-box">
              <p>Data Privacy Notice</p>
              <p>
                In compliance with the{" "}
                <strong>
                  Data Privacy Act of 2012 (Republic Act No. 10173)
                </strong>{" "}
                of the Philippines, we are committed to protecting and
                respecting your privacy.
              </p>
              <p>
                <strong>What we collect:</strong> By completing and submitting
                this form, you consent to the collection of the personal
                information you provide. This may include, but is not limited
                to, your name, contact details, and any other information
                entered in this form.
              </p>
              <p>
                <strong>How we use it:</strong> Your information will be used
                solely for the purpose for which this form was created. It may
                be shared with authorized third parties where necessary to
                fulfill that purpose, and will not be used for any other purpose
                without your consent.
              </p>
              <p>
                <strong>How we store it:</strong> Your responses will be stored
                securely and accessed only by authorized personnel. We apply
                reasonable technical and organizational measures to protect your
                data against unauthorized access, loss, or misuse.
              </p>
              <p>
                <strong>Your rights:</strong> Under the Data Privacy Act of
                2012, you have the right to access, correct, and request the
                deletion of your personal data. To exercise these rights, please
                contact the administrator of this form.
              </p>
              <p>
                By clicking <strong>"Confirm & Submit"</strong>, you acknowledge
                that you have read and understood this notice and give your
                informed consent to the collection and processing of your
                personal information as described above.
              </p>
            </div>
            <label className="fd-privacy-label">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="fd-privacy-checkbox"
              />
              <span className="fd-consent-text">
                I have read and understood the privacy notice above, and I give
                my consent to the collection and processing of my personal
                information.
              </span>
            </label>
            <div className="fd-modal-btn-row">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="fd-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={!privacyAccepted || submitting}
                className={`fd-btn-confirm ${
                  privacyAccepted
                    ? "fd-btn-confirm--active"
                    : "fd-btn-confirm--disabled"
                }`}
              >
                {submitting ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Form Header ── */}
      <div className="fd-form-header">
        <h1 className="fd-form-title">{form.title}</h1>
        {form.description && (
          <p className="fd-form-description">{form.description}</p>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STEPPER MODE
          Everything inside this block only renders when step_mode == 1.
          It replaces the regular <form> tag with step-aware navigation.
      ══════════════════════════════════════════════════════════════════════ */}
      {isStepMode ? (
        <div>
          {/* ── Step Overview Bar ──────────────────────────────────────────
              Shows all step names in a horizontal row.
              - Completed steps: solid filled circle with a checkmark
              - Current step: outlined circle, bold label, blue accent
              - Upcoming steps: dimmed circle and label
              Not clickable — read-only progress indicator. */}
          <div className="fd-stepper">
            <div className="fd-stepper-row">
              {steps.map((step, idx) => {
                const isCompleted = idx < currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={idx} className="fd-step-item">
                    {/* Connector line between steps */}
                    {idx < steps.length - 1 && (
                      <div
                        className={`fd-step-connector ${
                          isCompleted ? "fd-step-connector--done" : ""
                        }`}
                      />
                    )}

                    {/* Step circle */}
                    <div
                      className={`fd-step-circle ${
                        isCompleted
                          ? "fd-step-circle--completed"
                          : isCurrent
                            ? "fd-step-circle--current"
                            : "fd-step-circle--upcoming"
                      }`}
                    >
                      {isCompleted ? "✓" : idx + 1}
                    </div>

                    {/* Step label */}
                    <span
                      className={`fd-step-label ${
                        isCompleted
                          ? "fd-step-label--completed"
                          : isCurrent
                            ? "fd-step-label--current"
                            : "fd-step-label--upcoming"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Progress Bar ──────────────────────────────────────────────── */}
          <div className="fd-progress-track">
            <div
              className="fd-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* ── Step Counter ──────────────────────────────────────────────── */}
          <div className="fd-current-step-heading">
            <p className="fd-step-counter">
              Step {currentStep + 1} of {steps.length}
            </p>
            {steps[currentStep]?.description && (
              <div className="fd-step-note">
                <p className="fd-step-description">
                  {steps[currentStep].description}
                </p>
              </div>
            )}
          </div>

          {/* ── Current Step Questions ────────────────────────────────────── */}
          {(() => {
            // We need a global question counter so numbers are consistent
            // with what the respondent sees in error messages.
            // Count how many non-section questions appear before this step.
            const questionsBeforeThisStep = steps
              .slice(0, currentStep)
              .flatMap((s) => s.questions)
              .filter((q) => q.question_type !== "section").length;

            let localCounter = questionsBeforeThisStep;

            return steps[currentStep].questions.map((question) => {
              if (question.question_type === "section") return null;
              localCounter++;
              return renderQuestion(question, localCounter);
            });
          })()}

          {/* ── Step Navigation ───────────────────────────────────────────── */}
          <div className="fd-step-nav">
            {/* Back button — hidden on the first step */}
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`fd-btn-back ${
                currentStep === 0 ? "fd-btn-back--hidden" : "fd-btn-back--visible"
              }`}
            >
              ← Back
            </button>

            {/* Next or Submit button */}
            {isLastStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className={`fd-btn-submit ${
                  submitting ? "fd-btn-submit--submitting" : "fd-btn-submit--ready"
                }`}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNext(steps)}
                className="fd-btn-next"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════
            CONTINUOUS MODE
            Original single-page form rendering — completely unchanged.
            Section blocks render as glassmorphism dividers.
        ══════════════════════════════════════════════════════════════════ */
        <form onSubmit={handleSubmit} noValidate>
          {(() => {
            let questionCounter = 0;

            return form.questions
              .filter((q) => isQuestionVisible(q))
              .map((question) => {
                if (question.question_type === "section") {
                  return (
                    <div key={question.id} className="fd-section-divider">
                      <span className="fd-section-label"></span>
                      <h3 className="fd-section-heading">
                        {question.question_text}
                      </h3>
                      {question.description && (
                        <p className="fd-section-description">
                          {question.description}
                        </p>
                      )}
                    </div>
                  );
                }

                questionCounter++;
                return renderQuestion(question, questionCounter);
              });
          })()}

          <button
            type="submit"
            disabled={submitting}
            className={`fd-btn-submit-continuous ${
              submitting
                ? "fd-btn-submit-continuous--submitting"
                : "fd-btn-submit-continuous--ready"
            }`}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
}

export default FormDisplay;
