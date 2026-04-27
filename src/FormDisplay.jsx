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
        sectionId: question.id,
        questions: [],
      };
    } else {
      // Regular question — add to the current step.
      // If no step exists yet (questions before the first section),
      // create the implicit "General" step now.
      if (!currentStep) {
        currentStep = { title: "General", sectionId: null, questions: [] };
      }
      currentStep.questions.push(question);
    }
  }

  // Push the last step (the loop ends without pushing it)
  if (currentStep) steps.push(currentStep);

  // Add a numeric index to each step for easy reference
  return steps.map((step, idx) => ({ ...step, index: idx }));
}

function FormDisplay({ formCode, formId }) {
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

  async function fetchFormDetails() {
    try {
      const url = formCode
        ? apiUrl(`/get_form_by_code.php?code=${formCode}`)
        : apiUrl(`/get_form_details.php?id=${formId}`);

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
    if (question.question_type === "datetime" && dateRangeEnabled[question.id]) {
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

    if (conditionType === "equals") {
      if (conditionQuestion && conditionQuestion.question_type === "checkbox") {
        const selectedOptions = conditionAnswer.split(",").map((s) => s.trim());
        return selectedOptions.includes(question.condition_value);
      }
      return conditionAnswer.trim() === question.condition_value.trim();
    }

    if (conditionType === "not_equals") {
      if (conditionQuestion && conditionQuestion.question_type === "checkbox") {
        const selectedOptions = conditionAnswer.split(",").map((s) => s.trim());
        return !selectedOptions.includes(question.condition_value);
      }
      return conditionAnswer.trim() !== question.condition_value.trim();
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
      alert(`Please answer the following required questions: ${missing.join(", ")}`);
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
      alert(`Please answer the following required questions: ${questionNumbers.join(", ")}`);
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
        answer_text: answers[q.id],
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
      } else {
        alert("Error submitting form: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      alert("Failed to connect to server: " + error.message);
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
      <div style={{ padding: "40px", textAlign: "center", fontWeight: "700" }}>
        Loading form...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "red" }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>Form not found</div>
    );
  }

  if (submitted) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h1 style={{ color: "#37da5d" }}>✓ Thank You!</h1>
        <p style={{ fontSize: "18px", marginTop: "20px" }}>
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
    ? Math.round(((currentStep) / steps.length) * 100)
    : 0;

  // ── renderQuestion ────────────────────────────────────────────────────────
  // Shared question rendering logic used by both continuous and stepper modes.
  // Takes a question and its visible index (number shown to the user).
  function renderQuestion(question, visibleIndex) {
    if (!isQuestionVisible(question)) return null;

    return (
      <div
        key={question.id}
        style={{
          marginBottom: "30px",
          padding: "20px",
          background: "#a2a2a237",
          borderRadius: "5px",
          border: "1px solid #ddd",
        }}
      >
        <label style={{ display: "block", marginBottom: "15px", textAlign: "left" }}>
          <strong style={{ fontSize: "16px" }}>
            {visibleIndex}. {question.question_text}
          </strong>
          {(question.is_required === 1 || question.is_required === "1" || question.is_required === true) && (
            <span style={{ color: "red", marginLeft: "5px" }}>*</span>
          )}
          {!(question.is_required === 1 || question.is_required === "1" || question.is_required === true) && (
            <span style={{ color: "#999", marginLeft: "5px", fontSize: "14px" }}>(optional)</span>
          )}
        </label>

        {question.question_type === "text" && (
          <input type="text" value={answers[question.id] || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            style={{ width: "100%", padding: "10px 12px", fontSize: "14px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box" }}
            placeholder="Your answer" />
        )}

        {question.question_type === "email" && (
          <input type="email" value={answers[question.id] || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            style={{ width: "100%", padding: "10px", fontSize: "14px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box" }}
            placeholder="Enter your email address" />
        )}

        {question.question_type === "number" && (
          <input type="number" value={answers[question.id] || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            min={question.number_min || undefined}
            max={question.number_max || undefined}
            step={question.number_step === "any" ? "any" : question.number_step || "1"}
            style={{ width: "100%", padding: "10px", fontSize: "14px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box" }}
            placeholder={question.number_min && question.number_max
              ? `Enter number (${question.number_min} - ${question.number_max})`
              : "Enter number"} />
        )}

        {question.question_type === "datetime" && (
          <>
            <label style={{ display: "inline-flex", gap: "10px", alignItems: "center", marginBottom: "10px", userSelect: "none" }}>
              <input type="checkbox" checked={!!dateRangeEnabled[question.id]}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDateRangeEnabled((prev) => ({ ...prev, [question.id]: checked }));
                  if (!checked) {
                    const { start } = parseDateRangeAnswer(answers[question.id] || "");
                    handleAnswerChange(question.id, (start || "").trim());
                  }
                }} />
              <span style={{ fontWeight: 600 }}>Range</span>
              <span style={{ color: "#666", fontSize: "13px" }}>(pick start and end)</span>
            </label>

            {!!dateRangeEnabled[question.id] ? (
              (() => {
                const inputType = question.datetime_type || "date";
                const { start, end } = parseDateRangeAnswer(answers[question.id] || "");
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "#555", marginBottom: "6px", textAlign: "left" }}>Start</div>
                      <input type={inputType} value={start}
                        onChange={(e) => handleAnswerChange(question.id, buildDateRangeAnswer(e.target.value, end))}
                        style={{ width: "100%", padding: "10px", fontSize: "14px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#555", marginBottom: "6px", textAlign: "left" }}>End</div>
                      <input type={inputType} value={end} min={start || undefined}
                        onChange={(e) => handleAnswerChange(question.id, buildDateRangeAnswer(start, e.target.value))}
                        style={{ width: "100%", padding: "10px", fontSize: "14px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box" }} />
                    </div>
                  </div>
                );
              })()
            ) : (
              <input type={question.datetime_type || "date"} value={answers[question.id] || ""}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                style={{ width: "100%", padding: "10px", fontSize: "14px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box" }} />
            )}
          </>
        )}

        {question.question_type === "checkbox" && (
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-evenly" }}>
            {question.options.map((option, optIndex) => (
              <div key={optIndex} style={{ marginBottom: "10px" }}>
                <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <input type="radio" name={`question_${question.id}`} value={option}
                    checked={answers[question.id] === option}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    style={{ marginRight: "10px" }} />
                  <span>{option}</span>
                </label>
              </div>
            ))}
          </div>
        )}

        {question.question_type === "multiple_choice" && (
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-evenly" }}>
            {question.options.map((option, optIndex) => (
              <div key={optIndex} style={{ marginBottom: "10px" }}>
                <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" value={option}
                    checked={(answers[question.id] || "").split(",").includes(option)}
                    onChange={(e) => {
                      const currentAnswers = answers[question.id] ? answers[question.id].split(",") : [];
                      const newAnswers = e.target.checked
                        ? [...currentAnswers, option]
                        : currentAnswers.filter((a) => a !== option);
                      handleAnswerChange(question.id, newAnswers.join(","));
                    }}
                    style={{ marginRight: "10px" }} />
                  <span>{option}</span>
                </label>
              </div>
            ))}
          </div>
        )}

        {question.question_type === "rating" && (
          <div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
              {question.options.map((option, optIndex) => (
                <label key={optIndex}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", padding: "12px 20px",
                    background: answers[question.id] === option ? "#007bff" : "#f0f0f0",
                    color: answers[question.id] === option ? "white" : "#333",
                    border: "2px solid",
                    borderColor: answers[question.id] === option ? "#007bff" : "#ddd",
                    borderRadius: "25px", fontWeight: "500",
                    transition: "all 0.2s", minWidth: "80px", textAlign: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (answers[question.id] !== option) {
                      e.currentTarget.style.background = "#e7f3ff";
                      e.currentTarget.style.borderColor = "#007bff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (answers[question.id] !== option) {
                      e.currentTarget.style.background = "#f0f0f0";
                      e.currentTarget.style.borderColor = "#ddd";
                    }
                  }}
                >
                  <input type="radio" name={`question_${question.id}`} value={option}
                    checked={answers[question.id] === option}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    style={{ display: "none" }} />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 16px", maxWidth: "900px", margin: "0 auto" }}>

      {/* ── Privacy Modal ── */}
      {showPrivacyModal && (
        <div style={{
          position: "fixed", top: 0, left: 0,
          width: "100%", height: "100%",
          background: "rgba(0, 0, 0, 0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "20px", boxSizing: "border-box",
        }}>
          <div style={{
            background: "#fff", borderRadius: "14px", padding: "36px 32px",
            maxWidth: "520px", width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "1.3em", color: "#1a1a2e" }}>
              🔒 Privacy Notice
            </h2>
            <p style={{ margin: "0 0 20px 0", fontSize: "0.85em", color: "#999" }}>
              Please read the following before submitting your response.
            </p>
            <div style={{
              background: "#f7f8fc", border: "1px solid #e0e4f0",
              borderRadius: "8px", padding: "16px 18px", marginBottom: "24px",
              fontSize: "0.92em", color: "#333", lineHeight: "1.7",
              maxHeight: "260px", overflowY: "auto",
            }}>
              <p style={{ margin: "0 0 12px 0", fontWeight: "600" }}>Data Privacy Notice</p>
              <p style={{ margin: "0 0 10px 0" }}>
                In compliance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> of the Philippines, we are committed to protecting and respecting your privacy.
              </p>
              <p style={{ margin: "0 0 10px 0" }}>
                <strong>What we collect:</strong> By completing and submitting this form, you consent to the collection of the personal information you provide. This may include, but is not limited to, your name, contact details, and any other information entered in this form.
              </p>
              <p style={{ margin: "0 0 10px 0" }}>
                <strong>How we use it:</strong> Your information will be used solely for the purpose for which this form was created. It may be shared with authorized third parties where necessary to fulfill that purpose, and will not be used for any other purpose without your consent.
              </p>
              <p style={{ margin: "0 0 10px 0" }}>
                <strong>How we store it:</strong> Your responses will be stored securely and accessed only by authorized personnel. We apply reasonable technical and organizational measures to protect your data against unauthorized access, loss, or misuse.
              </p>
              <p style={{ margin: "0 0 10px 0" }}>
                <strong>Your rights:</strong> Under the Data Privacy Act of 2012, you have the right to access, correct, and request the deletion of your personal data. To exercise these rights, please contact the administrator of this form.
              </p>
              <p style={{ margin: "0" }}>
                By clicking <strong>"Confirm & Submit"</strong>, you acknowledge that you have read and understood this notice and give your informed consent to the collection and processing of your personal information as described above.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "28px", cursor: "pointer" }}>
              <input type="checkbox" checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                style={{ width: "18px", height: "18px", marginTop: "2px", cursor: "pointer", accentColor: "#007bff", flexShrink: 0 }} />
              <span style={{ fontSize: "0.9em", color: "#333", lineHeight: "1.5" }}>
                I have read and understood the privacy notice above, and I give my consent to the collection and processing of my personal information.
              </span>
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowPrivacyModal(false)}
                style={{ flex: 1, padding: "12px", fontSize: "0.95em", background: "#f0f0f0", color: "#555", border: "1px solid #ddd", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>
                Cancel
              </button>
              <button onClick={handleConfirmSubmit} disabled={!privacyAccepted || submitting}
                style={{ flex: 1, padding: "12px", fontSize: "0.95em", background: privacyAccepted ? "#007bff" : "#cce0ff", color: "white", border: "none", borderRadius: "8px", cursor: privacyAccepted ? "pointer" : "not-allowed", fontWeight: "700", transition: "background 0.2s ease" }}>
                {submitting ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Form Header ── */}
      <div style={{ marginBottom: "32px", borderBottom: "3px solid #007bff", paddingBottom: "20px" }}>
        <h1 style={{ margin: "0 0 10px 0" }}>{form.title}</h1>
        {form.description && (
          <p style={{ color: "#333", fontSize: "16px", margin: "0" }}>{form.description}</p>
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
          <div style={{ marginBottom: "8px" }}>
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0",
              overflowX: "auto",
              paddingBottom: "4px",
            }}>
              {steps.map((step, idx) => {
                const isCompleted = idx < currentStep;
                const isCurrent = idx === currentStep;
                const isUpcoming = idx > currentStep;

                return (
                  <div key={idx} style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginTop: "3px",
                    flex: 1,
                    minWidth: "60px",
                    position: "relative",
                  }}>
                    {/* Connector line between steps */}
                    {idx < steps.length - 1 && (
                      <div style={{
                        position: "absolute",
                        top: "16px",
                        left: "50%",
                        width: "100%",
                        height: "2px",
                        background: isCompleted ? "#007bff" : "#dde1ec",
                        zIndex: 0,
                      }} />
                    )}

                    {/* Step circle */}
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      border: isCurrent ? "2px solid #007bff" : "2px solid transparent",
                      background: isCompleted
                        ? "#007bff"
                        : isCurrent
                        ? "#fff"
                        : "#dde1ec",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: isCompleted ? "#fff" : isCurrent ? "#007bff" : "#999",
                      zIndex: 1,
                      position: "relative",
                      flexShrink: 0,
                      boxShadow: isCurrent ? "0 0 0 3px rgba(0,123,255,0.15)" : "none",
                      transition: "all 0.3s ease",
                    }}>
                      {isCompleted ? "✓" : idx + 1}
                    </div>

                    {/* Step label */}
                    <span style={{
                      marginTop: "6px",
                      fontSize: "0.72em",
                      fontWeight: isCurrent ? "700" : "400",
                      color: isCompleted ? "#007bff" : isCurrent ? "#1a1a2e" : "#aaa",
                      textAlign: "center",
                      maxWidth: "80px",
                      lineHeight: "1.3",
                      wordBreak: "break-word",
                      transition: "all 0.3s ease",
                    }}>
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Progress Bar ──────────────────────────────────────────────── */}
          <div style={{
            height: "6px",
            background: "#e8ecf4",
            borderRadius: "3px",
            marginBottom: "6px",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${progressPercent}%`,
              background: "linear-gradient(90deg, #007bff, #4dabf7)",
              borderRadius: "3px",
              transition: "width 0.4s ease",
            }} />
          </div>

          {/* ── Step Counter ──────────────────────────────────────────────── */}
          <p style={{
            textAlign: "right",
            fontSize: "0.8em",
            color: "#888",
            margin: "0 0 28px 0",
          }}>
            Step {currentStep + 1} of {steps.length}
          </p>

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
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "24px",
            gap: "12px",
          }}>
            {/* Back button — hidden on the first step */}
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0}
              style={{
                padding: "12px 28px",
                fontSize: "15px",
                background: currentStep === 0 ? "#f0f0f0" : "rgba(255,255,255,0.25)",
                color: currentStep === 0 ? "#bbb" : "#333",
                border: "1px solid #ddd",
                borderRadius: "8px",
                cursor: currentStep === 0 ? "not-allowed" : "pointer",
                fontWeight: "600",
                backdropFilter: "blur(6px)",
                transition: "all 0.2s ease",
                visibility: currentStep === 0 ? "hidden" : "visible",
              }}
            >
              ← Back
            </button>

            {/* Next or Submit button */}
            {isLastStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: "12px 36px",
                  fontSize: "15px",
                  background: submitting ? "#6c757d" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontWeight: "700",
                  transition: "background 0.2s ease",
                }}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNext(steps)}
                style={{
                  padding: "12px 36px",
                  fontSize: "15px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "700",
                  transition: "background 0.2s ease",
                }}
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
        <form onSubmit={handleSubmit}>
          {(() => {
            let questionCounter = 0;

            return form.questions
              .filter((q) => isQuestionVisible(q))
              .map((question) => {

                if (question.question_type === "section") {
                  return (
                    <div
                      key={question.id}
                      style={{
                        marginBottom: "10px",
                        marginTop: "10px",
                        }}
                    >
                      <span style={{
                        display: "block", fontSize: "0.68em", fontWeight: "700",
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        color: "rgba(100, 140, 255, 0.9)", marginBottom: "6px",
                      }}>
                        
                      </span>
                      <h3 style={{ margin: "0", fontSize: "1.15em", fontWeight: "700", color: "#1a1a2e" }}>
                        {question.question_text}
                      </h3>
                      {question.description && (
                        <p style={{ margin: "6px 0 0 0", fontSize: "0.88em", color: "#555", lineHeight: "1.5" }}>
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

          <button type="submit" disabled={submitting}
            style={{
              padding: "15px 40px", fontSize: "16px",
              background: submitting ? "#6c757d" : "#007bff",
              color: "white", border: "none", borderRadius: "5px",
              cursor: submitting ? "not-allowed" : "pointer",
              minWidth: "35%", fontWeight: "bold",
            }}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
}

export default FormDisplay;