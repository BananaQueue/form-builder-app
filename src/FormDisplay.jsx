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

  async function fetchFormDetails() {
    try {
      // Use form code if available, otherwise use form ID (for backward compatibility)
      const url = formCode
        ? apiUrl(`/get_form_by_code.php?code=${formCode}`)
        : apiUrl(`/get_form_details.php?id=${formId}`);

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setForm(result.form);
        // Initialize answers object with empty values
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
    // No condition = always visible
    if (!question.condition_question_id) {
      return true;
    }

    const conditionType = question.condition_type || "equals";
    const conditionAnswer = answers[question.condition_question_id];

    // For "is_answered" - just check if there's any answer
    if (conditionType === "is_answered") {
      return conditionAnswer && conditionAnswer.trim() !== "";
    }

    // If condition question not answered yet, hide
    if (!conditionAnswer || conditionAnswer.trim() === "") {
      return false;
    }

    const conditionQuestion = form.questions.find(
      (q) => q.id === question.condition_question_id,
    );
    const selectedOptionsForParent =
      conditionQuestion &&
      (conditionQuestion.question_type === "checkbox" ||
        conditionQuestion.question_type === "multiple_choice")
        ? conditionAnswer
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    // For checkbox with "option_selected" condition
    if (
      conditionType === "option_selected" &&
      conditionQuestion &&
      conditionQuestion.question_type === "checkbox"
    ) {
      return selectedOptionsForParent.includes(question.condition_value);
    }

    // For multiple-choice membership checks
    if (
      conditionType === "contains" &&
      conditionQuestion &&
      conditionQuestion.question_type === "multiple_choice"
    ) {
      return selectedOptionsForParent.includes(question.condition_value);
    }

    if (
      conditionType === "not_contains" &&
      conditionQuestion &&
      conditionQuestion.question_type === "multiple_choice"
    ) {
      return !selectedOptionsForParent.includes(question.condition_value);
    }

    // For "equals" condition
    if (conditionType === "equals") {
      // For choice questions, treat equals as "selected answer includes value"
      if (
        conditionQuestion &&
        (conditionQuestion.question_type === "checkbox" ||
          conditionQuestion.question_type === "multiple_choice")
      ) {
        return selectedOptionsForParent.includes(question.condition_value);
      }
      // For scalar answers
      return conditionAnswer.trim() === question.condition_value.trim();
    }

    // For "not_equals" condition
    if (conditionType === "not_equals") {
      // For choice questions, treat not_equals as "selected answer excludes value"
      if (
        conditionQuestion &&
        (conditionQuestion.question_type === "checkbox" ||
          conditionQuestion.question_type === "multiple_choice")
      ) {
        return !selectedOptionsForParent.includes(question.condition_value);
      }
      // For scalar answers
      return conditionAnswer.trim() !== question.condition_value.trim();
    }

    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // Check only required questions
    const unansweredRequired = form.questions.filter((q) => {
      if (q.question_type === "section") return false;
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

    setSubmitting(true);

    // Prepare data for submission
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
        headers: {
          "Content-Type": "application/json",
        },
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
    // we intentionally don't include fetchFormDetails in deps
    // to avoid re-creating it on every render
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
      {/* Form Header */}
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

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {(() => {
          let questionCounter = 0;
          return form.questions
            .filter((q) => isQuestionVisible(q))
            .map((question) => {
              // Section block — render as a banner, no numbering
              if (question.question_type === "section") {
                return (
                  <div
                    key={question.id}
                    style={{
                      margin: "40px 0 10px 0",
                      borderBottom: "2px solid #007bff",
                      paddingBottom: "10px",
                    }}
                  >
                    <h2
                      style={{
                        margin: "0 0 4px 0",
                        color: "#007bff",
                        fontSize: "1.3em",
                      }}
                    >
                      {question.question_text}
                    </h2>
                    {question.description && (
                      <p
                        style={{ margin: 0, color: "#555", fontSize: "0.9em" }}
                      >
                        {question.description}
                      </p>
                    )}
                  </div>
                );
              }

              // Regular question — increment counter and render normally
              questionCounter++;
              const visibleIndex = questionCounter - 1;

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
                  {/* Question Text */}
                  <label
                    style={{
                      display: "block",
                      marginBottom: "15px",
                      textAlign: "left",
                    }}
                  >
                    <strong style={{ fontSize: "16px" }}>
                      {visibleIndex + 1}. {question.question_text}
                    </strong>
                    {(question.is_required === 1 ||
                      question.is_required === "1" ||
                      question.is_required === true) && (
                      <span style={{ color: "red", marginLeft: "5px" }}>*</span>
                    )}
                    {!(
                      question.is_required === 1 ||
                      question.is_required === "1" ||
                      question.is_required === true
                    ) && (
                      <span
                        style={{
                          color: "#999",
                          marginLeft: "5px",
                          fontSize: "14px",
                        }}
                      >
                        (optional)
                      </span>
                    )}
                  </label>

                  {/* Text Input */}
                  {question.question_type === "text" && (
                    <input
                      type="text"
                      value={answers[question.id] || ""}
                      onChange={(e) =>
                        handleAnswerChange(question.id, e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: "14px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        boxSizing: "border-box",
                      }}
                      placeholder="Your answer"
                    />
                  )}
                  {/* Email Input */}
                  {question.question_type === "email" && (
                    <input
                      type="email"
                      value={answers[question.id] || ""}
                      onChange={(e) =>
                        handleAnswerChange(question.id, e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        fontSize: "14px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                      }}
                      placeholder="Enter your email address"
                      required={question.is_required}
                    />
                  )}

                  {/* Number Input */}
                  {question.question_type === "number" && (
                    <input
                      type="number"
                      value={answers[question.id] || ""}
                      onChange={(e) =>
                        handleAnswerChange(question.id, e.target.value)
                      }
                      min={question.number_min || undefined}
                      max={question.number_max || undefined}
                      step={
                        question.number_step === "any"
                          ? "any"
                          : question.number_step || "1"
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        fontSize: "14px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        boxSizing: "border-box",
                      }}
                      placeholder={
                        question.number_min && question.number_max
                          ? `Enter number (${question.number_min} - ${question.number_max})`
                          : "Enter number"
                      }
                    />
                  )}

                  {/* Date/Time Input */}
                  {question.question_type === "datetime" && (
                    <>
                      <label
                        style={{
                          display: "inline-flex",
                          gap: "10px",
                          alignItems: "center",
                          marginBottom: "10px",
                          userSelect: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!dateRangeEnabled[question.id]}
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
                              handleAnswerChange(
                                question.id,
                                (start || "").trim(),
                              );
                            }
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>Range</span>
                        <span style={{ color: "#666", fontSize: "13px" }}>
                          (pick start and end)
                        </span>
                      </label>

                      {!!dateRangeEnabled[question.id] ? (
                        (() => {
                          const inputType = question.datetime_type || "date";
                          const { start, end } = parseDateRangeAnswer(
                            answers[question.id] || "",
                          );
                          return (
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "12px",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "#555",
                                    marginBottom: "6px",
                                    textAlign: "left",
                                  }}
                                >
                                  Start
                                </div>
                                <input
                                  type={inputType}
                                  value={start}
                                  onChange={(e) =>
                                    handleAnswerChange(
                                      question.id,
                                      buildDateRangeAnswer(e.target.value, end),
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "10px",
                                    fontSize: "14px",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px",
                                    boxSizing: "border-box",
                                  }}
                                />
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "#555",
                                    marginBottom: "6px",
                                    textAlign: "left",
                                  }}
                                >
                                  End
                                </div>
                                <input
                                  type={inputType}
                                  value={end}
                                  min={start || undefined}
                                  onChange={(e) =>
                                    handleAnswerChange(
                                      question.id,
                                      buildDateRangeAnswer(
                                        start,
                                        e.target.value,
                                      ),
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "10px",
                                    fontSize: "14px",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px",
                                    boxSizing: "border-box",
                                  }}
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
                          style={{
                            width: "100%",
                            padding: "10px",
                            fontSize: "14px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            boxSizing: "border-box",
                          }}
                        />
                      )}
                    </>
                  )}

                  {/* Checkbox (Radio) */}
                  {question.question_type === "checkbox" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-evenly",
                      }}
                    >
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} style={{ marginBottom: "10px" }}>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name={`question_${question.id}`}
                              value={option}
                              checked={answers[question.id] === option}
                              onChange={(e) =>
                                handleAnswerChange(question.id, e.target.value)
                              }
                              style={{ marginRight: "10px" }}
                            />
                            <span>{option}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Multiple Choice (checkbox) */}
                  {question.question_type === "multiple_choice" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-evenly",
                      }}
                    >
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} style={{ marginBottom: "10px" }}>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              cursor: "pointer",
                            }}
                          >
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
                                let newAnswers;
                                if (e.target.checked) {
                                  newAnswers = [...currentAnswers, option];
                                } else {
                                  newAnswers = currentAnswers.filter(
                                    (a) => a !== option,
                                  );
                                }
                                handleAnswerChange(
                                  question.id,
                                  newAnswers.join(","),
                                );
                              }}
                              style={{ marginRight: "10px" }}
                            />
                            <span>{option}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Rating Scale */}
                  {question.question_type === "rating" && (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                          justifyContent: "center",
                        }}
                      >
                        {question.options.map((option, optIndex) => (
                          <label
                            key={optIndex}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              padding: "12px 20px",
                              background:
                                answers[question.id] === option
                                  ? "#007bff"
                                  : "#f0f0f0",
                              color:
                                answers[question.id] === option
                                  ? "white"
                                  : "#333",
                              border: "2px solid",
                              borderColor:
                                answers[question.id] === option
                                  ? "#007bff"
                                  : "#ddd",
                              borderRadius: "25px",
                              fontWeight: "500",
                              transition: "all 0.2s",
                              minWidth: "80px",
                              textAlign: "center",
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
                    </div>
                  )}
                </div>
              );
            });
        })()}

        {/* Submit Button */}
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
