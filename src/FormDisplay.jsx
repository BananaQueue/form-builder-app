import { useState, useEffect } from "react";
import { apiUrl } from "./apiBase";

function FormDisplay({ formId }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function fetchFormDetails() {
    try {
      const response = await fetch(
        apiUrl(`/get_form_details.php?id=${formId}`),
      );
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

    // For checkbox with "option_selected" condition
    if (
      conditionType === "option_selected" &&
      conditionQuestion &&
      conditionQuestion.question_type === "checkbox"
    ) {
      const selectedOptions = conditionAnswer.split(",").map((s) => s.trim());
      return selectedOptions.includes(question.condition_value);
    }

    // For "equals" condition
    if (conditionType === "equals") {
      // For checkboxes (when not using option_selected)
      if (conditionQuestion && conditionQuestion.question_type === "checkbox") {
        const selectedOptions = conditionAnswer.split(",").map((s) => s.trim());
        return selectedOptions.includes(question.condition_value);
      }
      // For text and multiple choice
      return conditionAnswer.trim() === question.condition_value.trim();
    }

    // For "not_equals" condition
    if (conditionType === "not_equals") {
      // For checkboxes
      if (conditionQuestion && conditionQuestion.question_type === "checkbox") {
        const selectedOptions = conditionAnswer.split(",").map((s) => s.trim());
        return !selectedOptions.includes(question.condition_value);
      }
      // For text and multiple choice
      return conditionAnswer.trim() !== question.condition_value.trim();
    }

    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // Check only required questions
    const unansweredRequired = form.questions.filter((q) => {
      const isRequired =
        q.is_required === 1 || q.is_required === "1" || q.is_required === true;
      const isVisible = isQuestionVisible(q);
      const isAnswered = answers[q.id] && answers[q.id].trim() !== "";
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
      form_id: formId,
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
  }, [formId]);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
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
        <h1 style={{ color: "#28a745" }}>✓ Thank You!</h1>
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
        {form.questions
          .filter((q) => isQuestionVisible(q))
          .map((question, visibleIndex) => (
            <div
              key={question.id}
              style={{
                marginBottom: "30px",
                padding: "20px",
                background: "#f9f9f99b",
                borderRadius: "5px",
                border: "1px solid #ddd",
              }}
            >
              {/* Question Text */}
              <label style={{ display: "block", marginBottom: "15px" }}>
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

              {/* Checkbox (Radio) */}
              {question.question_type === "checkbox" && (
                <div>
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
                <div>
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
                            answers[question.id] === option ? "white" : "#333",
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
          ))}

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
            width: "100%",
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
