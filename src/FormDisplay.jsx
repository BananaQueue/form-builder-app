import { useState, useEffect } from "react";
import { apiUrl } from "./apiBase";

function FormDisplay({ formCode, formId }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const DATE_RANGE_SEPARATOR = " to ";
  const [dateRangeEnabled, setDateRangeEnabled] = useState({});


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
    setAnswers({
      ...answers,
      [questionId]: value,
    });
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
    if (!question.condition_question_id) {
      return true;
    }

    const conditionType = question.condition_type || "equals";
    const conditionAnswer = answers[question.condition_question_id];

    if (conditionType === "is_answered") {
      return conditionAnswer && conditionAnswer.trim() !== "";
    }

    if (!conditionAnswer || conditionAnswer.trim() === "") {
      return false;
    }

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


  async function handleSubmit(e) {
    e.preventDefault();

  // Validate required questions first
    const unansweredRequired = form.questions.filter((q) => {
      const isRequired =
        q.is_required === 1 || q.is_required === "1" || q.is_required === true;
      const isVisible = isQuestionVisible(q);
      const isAnswered = isAnsweredForQuestion(q, answers[q.id]);
      return isRequired && isVisible && !isAnswered;
    });
 
    if (unansweredRequired.length > 0) {
      const questionNumbers = unansweredRequired.map(
        (q) => form.questions.findIndex((fq) => fq.id === q.id) + 1,
      );
      alert(
        `Please answer the following required questions: ${questionNumbers.join(", ")}`,
      );
      return;
    }
 

    if (form.privacy_notice == 1) {
      setPrivacyAccepted(false);
      setShowPrivacyModal(true);
      return;
    }
 
    // No privacy notice — submit straight away
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
 
  return (
    <div style={{ padding: "32px 16px", maxWidth: "900px", margin: "0 auto" }}>
 
      {/* ── Privacy Modal ── */}
      {showPrivacyModal && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0,
            width: "100%", height: "100%",
            background: "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "36px 32px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <h2 style={{ margin: "0 0 8px 0", fontSize: "1.3em", color: "#1a1a2e" }}>
              🔒 Privacy Notice
            </h2>
            <p style={{ margin: "0 0 20px 0", fontSize: "0.85em", color: "#999" }}>
              Please read the following before submitting your response.
            </p>
 
            {/* Privacy statement — hardcoded, DPA-compliant, Philippines */}
            <div
              style={{
                background: "#f7f8fc",
                border: "1px solid #e0e4f0",
                borderRadius: "8px",
                padding: "16px 18px",
                marginBottom: "24px",
                fontSize: "0.92em",
                color: "#333",
                lineHeight: "1.7",
                maxHeight: "260px",
                overflowY: "auto",
              }}
            >
              <p style={{ margin: "0 0 12px 0", fontWeight: "600" }}>
                Data Privacy Notice
              </p>
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
 
            {/* Checkbox */}
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                marginBottom: "28px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                style={{
                  width: "18px", height: "18px",
                  marginTop: "2px", cursor: "pointer",
                  accentColor: "#007bff", flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "0.9em", color: "#333", lineHeight: "1.5" }}>
                I have read and understood the privacy notice above, and I give my consent to the collection and processing of my personal information.
              </span>
            </label>
 
            {/* Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowPrivacyModal(false)}
                style={{
                  flex: 1, padding: "12px", fontSize: "0.95em",
                  background: "#f0f0f0", color: "#555",
                  border: "1px solid #ddd", borderRadius: "8px",
                  cursor: "pointer", fontWeight: "600",
                }}
              >
                Cancel
              </button>
 
              <button
                onClick={handleConfirmSubmit}
                disabled={!privacyAccepted || submitting}
                style={{
                  flex: 1, padding: "12px", fontSize: "0.95em",
                  background: privacyAccepted ? "#007bff" : "#cce0ff",
                  color: "white", border: "none", borderRadius: "8px",
                  cursor: privacyAccepted ? "pointer" : "not-allowed",
                  fontWeight: "700",
                  transition: "background 0.2s ease",
                }}
              >
                {submitting ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Form Header ── */}
      <div
        style={{
          marginBottom: "40px",
          borderBottom: "3px solid #007bff",
          paddingBottom: "20px",
        }}
      >
        <h1 style={{ margin: "0 0 10px 0" }}>{form.title}</h1>
        {form.description && (
          <p style={{ color: "#333", fontSize: "16px", margin: "0" }}>
            {form.description}
          </p>
        )}
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit}>
        {(() => {
          // We need a counter that only increments for real questions,
          // not section blocks. Sections are visual dividers — they don't
          // get a number, they don't get an input, they aren't validated.
          let questionCounter = 0;
 
          return form.questions
            .filter((q) => isQuestionVisible(q))
            .map((question) => {
 
              // ── Section block ─────────────────────────────────────────
              // Render a glassmorphism divider instead of a question card.
              // No input, no number, no required marker.
              if (question.question_type === "section") {
                return (
                  <div
                    key={question.id}
                    style={{
                      marginBottom: "10px",
                      marginTop: "10px",
                      padding: "18px 24px",
                    }}
                  >
                    {/* SECTION label — small all-caps tag above the title */}
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.68em",
                        fontWeight: "700",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "rgba(100, 140, 255)",
                        marginBottom: "6px",
                      }}
                    >
                      
                    </span>
 
                    {/* Section title */}
                    <h3
                      style={{
                        margin: "0",
                        fontSize: "1.15em",
                        fontWeight: "700",
                        color: "#1a1a2e",
                      }}
                    >
                      {question.question_text}
                    </h3>
 
                    {/* Optional description below the title */}
                    {question.description && (
                      <p
                        style={{
                          margin: "6px 0 0 0",
                          fontSize: "0.88em",
                          color: "#555",
                          lineHeight: "1.5",
                        }}
                      >
                        {question.description}
                      </p>
                    )}
                  </div>
                );
              }
 
              // ── Regular question ──────────────────────────────────────
              // Only real questions get a number
              questionCounter++;
              const visibleIndex = questionCounter;
 
              return (
            <div
              key={question.id}
              style={{
                marginBottom: "30px", padding: "20px",
                background: "#a2a2a237", borderRadius: "5px",
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
                  style={{ width: "100%", padding: "10px", fontSize: "14px", border: "1px solid #ccc", borderRadius: "4px" }}
                  placeholder="Enter your email address" required={question.is_required} />
              )}
 
              {question.question_type === "number" && (
                <input type="number" value={answers[question.id] || ""}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  min={question.number_min || undefined} max={question.number_max || undefined}
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
            });
        })()}

        {/* Submit Button — unchanged in appearance.
            The privacy modal intercepts the submit event when needed,
            so this button behaves exactly as before from the user's view. */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "15px 40px",
            fontSize: "16px",
            background: submitting ? "#6c757d" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: submitting ? "not-allowed" : "pointer",
            minWidth: "35%",
            fontWeight: "bold",
          }}
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}

export default FormDisplay;