import { useState, useEffect } from "react";
import { apiUrl } from "./apiBase";

function FormBuilder({ editFormId = null, onSaveComplete = null }) {
  // All state declarations
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [questions, setQuestions] = useState([]);

  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState("text");
  const [isNewQuestionRequired, setIsNewQuestionRequired] = useState(true);

  const [newOption, setNewOption] = useState("");
  const [tempOptions, setTempOptions] = useState([]);

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(1);

  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);

  const [hasCondition, setHasCondition] = useState(false);
  const [conditionQuestionId, setConditionQuestionId] = useState("");
  const [conditionValue, setConditionValue] = useState("");
  const [conditionType, setConditionType] = useState("equals");

  const [ratingScale, setRatingScale] = useState("numeric_5");
  const [customRatingOptions, setCustomRatingOptions] = useState([]);

  // Fetch categories when component loads
  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const response = await fetch(apiUrl("/get_categories.php"));
      const result = await response.json();

      if (result.success) {
        setCategories(result.categories);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }

  // Load form data if in edit mode
  useEffect(() => {
    if (editFormId) {
      loadFormForEditing(editFormId);
    }
  }, [editFormId]);

  async function loadFormForEditing(formId) {
    setLoadingForm(true);
    setIsEditMode(true);

    try {
      const response = await fetch(
        apiUrl(`/get_form_details.php?id=${formId}`),
      );
      const result = await response.json();

      if (result.success) {
        const form = result.form;

        // Set form details
        setFormTitle(form.title);
        setFormDescription(form.description || "");
        setSelectedCategoryId(parseInt(form.category_id));

        // Set questions
        setQuestions(
          form.questions.map((q) => ({
            id: "q_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
            text: q.question_text,
            type: q.question_type,
            options: q.options || [],
            rating_scale: q.rating_scale || null,
            is_required: q.is_required !== undefined ? q.is_required : 1,
            condition_question_id: q.condition_question_id || null,
            condition_type: q.condition_type || "equals",
            condition_value: q.condition_value || null,
          })),
        );
      } else {
        alert("Failed to load form: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      alert("Failed to load form: " + error.message);
    } finally {
      setLoadingForm(false);
    }
  }

  // Add a question
  function addQuestion() {
    if (newQuestionText.trim() === "") {
      alert("Please enter a question");
      return;
    }

    if (
      (newQuestionType === "multiple_choice" ||
        newQuestionType === "checkbox") &&
      tempOptions.length === 0
    ) {
      alert("Please add at least one option for this question type");
      return;
    }

    if (
      newQuestionType === "rating" &&
      ratingScale === "custom" &&
      customRatingOptions.length === 0
    ) {
      alert("Please add at least one rating option for custom scale");
      return;
    }

    // Determine options based on question type
    let questionOptions = [];
    if (newQuestionType === "rating") {
      questionOptions =
        ratingScale === "custom"
          ? customRatingOptions
          : getRatingScaleOptions(ratingScale);
    } else if (newQuestionType !== "text") {
      questionOptions = tempOptions;
    }

    const newQuestion = {
      id: "q_" + Date.now(),
      text: newQuestionText,
      type: newQuestionType,
      options: questionOptions,
      rating_scale: newQuestionType === "rating" ? ratingScale : null,
      is_required: isNewQuestionRequired ? 1 : 0,
      condition_question_id:
        hasCondition && conditionQuestionId ? conditionQuestionId : null,
      condition_type:
        hasCondition && conditionQuestionId ? conditionType : null,
      condition_value: hasCondition && conditionValue ? conditionValue : null,
    };

    setQuestions([...questions, newQuestion]);

    setNewQuestionText("");
    setNewQuestionType("text");
    setTempOptions([]);
    setIsNewQuestionRequired(true);
    setHasCondition(false);
    setConditionQuestionId("");
    setConditionValue("");
    setConditionType("equals");
    setRatingScale("numeric_5");
    setCustomRatingOptions([]);
  }

  function getRatingScaleOptions(scale) {
    const scales = {
      numeric_5: ["1", "2", "3", "4", "5"],
      numeric_10: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      agree_5: [
        "Strongly Disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly Agree",
      ],
      agree_3: ["Disagree", "Neutral", "Agree"],
      quality_5: ["Poor", "Fair", "Good", "Very Good", "Excellent"],
      quality_3: ["Bad", "Fair", "Good"],
      satisfaction_5: [
        "Very Dissatisfied",
        "Dissatisfied",
        "Neutral",
        "Satisfied",
        "Very Satisfied",
      ],
      satisfaction_3: ["Dissatisfied", "Neutral", "Satisfied"],
      frequency_5: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    };
    return scales[scale] || [];
  }

  // Add an option to the temporary options list
  function addOption() {
    if (newOption.trim() === "") {
      alert("Please enter an option");
      return;
    }

    setTempOptions([...tempOptions, newOption]);
    setNewOption("");
  }

  // Remove an option from temporary list
  function removeOption(index) {
    const updated = tempOptions.filter((_, i) => i !== index);
    setTempOptions(updated);
  }

  // Delete a question
  function deleteQuestion(questionId) {
    const updated = questions.filter((q) => q.id !== questionId);
    setQuestions(updated);
  }

  // Save form to database
  async function saveForm() {
    if (formTitle.trim() === "") {
      alert("Please enter a form title");
      return;
    }

    if (questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    const normalizedQuestions = questions.map((q, idx) => ({
      id: q.id ?? `q_${idx}`,
      question_text: q.text,
      question_type: q.type,
      position: idx,
      options: Array.isArray(q.options) ? q.options : [],
      is_required: q.is_required ?? 1,
      condition_question_id: q.condition_question_id ?? null,
      condition_type: q.condition_type ?? "equals",
      condition_value: q.condition_value ?? null,
    }));

    const formData = {
      title: formTitle,
      description: formDescription,
      category_id: selectedCategoryId,
      questions: normalizedQuestions,
    };

    // Add form_id if editing
    if (isEditMode && editFormId) {
      formData.form_id = editFormId;
    }

    try {
      // Use different endpoint based on mode
      const endpoint = isEditMode
        ? apiUrl("/update_form.php")
        : apiUrl("/save_form.php");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const raw = await response.text();
      let result;
      try {
        result = JSON.parse(raw);
      } catch {
        console.error("Non-JSON response from server:", raw);
        throw new Error(
          "Server returned non-JSON (likely a PHP error). Check console for raw response.",
        );
      }

      if (result.success) {
        alert(
          isEditMode
            ? "Form updated successfully!"
            : "Form saved successfully! Form ID: " + result.form_id,
        );

        // Clear form or call callback
        if (isEditMode && onSaveComplete) {
          onSaveComplete(); // Go back to list
        } else {
          // Clear the form after creating
          setFormTitle("");
          setFormDescription("");
          setQuestions([]);
        }
      } else {
        alert("Error saving form: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      alert("Failed to connect to server: " + error.message);
      console.error("Error:", error);
    }
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px" }}>
      {loadingForm && (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            background: "#f0f8ff",
            marginBottom: "20px",
            borderRadius: "5px",
          }}
        >
          Loading form data...
        </div>
      )}
      <h1>{isEditMode ? "Edit Form" : "Form Builder"}</h1>
      {isEditMode && (
        <p style={{ color: "#666", marginBottom: "20px" }}>
          You are editing an existing form. Changes will be save when you click
          "Save Form".
        </p>
      )}

      {/* Form Title Input */}
      <div style={{ marginBottom: "20px" }}>
        <label>
          <strong>Form Title:</strong>
          <br />
          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Enter form title"
            style={{ width: "100%", padding: "8px", fontSize: "16px" }}
          />
        </label>
      </div>

      {/* Form Description Input */}
      <div style={{ marginBottom: "20px" }}>
        <label>
          <strong>Form Description:</strong>
          <br />
          <textarea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Enter form description"
            style={{
              width: "100%",
              padding: "8px",
              height: "80px",
              fontSize: "16px",
            }}
          />
        </label>
      </div>

      {/* Category Selection */}
      <div style={{ marginBottom: "20px" }}>
        <label>
          <strong>Category:</strong>
          <br />
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(parseInt(e.target.value))}
            style={{ padding: "8px", fontSize: "16px", width: "200px" }}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <hr style={{ margin: "30px 0" }} />

      {/* Add Question Section */}
      <h2>Add Question</h2>

      <div style={{ marginBottom: "15px" }}>
        <label>
          <strong>Question Text:</strong>
          <br />
          <input
            type="text"
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            placeholder="Enter your question"
            style={{ width: "100%", padding: "8px", fontSize: "16px" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>
          <strong>Question Type:</strong>
          <br />
          <select
            value={newQuestionType}
            onChange={(e) => {
              setNewQuestionType(e.target.value);
              setTempOptions([]);
              if (e.target.value === "rating") {
                setRatingScale("numeric_5");
                setCustomRatingOptions([]);
              }
            }}
            style={{ padding: "8px", fontSize: "16px" }}
          >
            <option value="text">Text Input</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="checkbox">Checkbox</option>
            <option value="rating">Rating Scale</option>
          </select>
        </label>
      </div>

      {/* Required Toggle */}
      <div style={{ marginBottom: "15px" }}>
        <label
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={isNewQuestionRequired}
            onChange={(e) => setIsNewQuestionRequired(e.target.checked)}
            style={{
              marginRight: "8px",
              width: "18px",
              height: "18px",
              cursor: "pointer",
            }}
          />
          <strong>Required field</strong>
          <span style={{ marginLeft: "8px", color: "#666", fontSize: "14px" }}>
            (Users must answer this question)
          </span>
        </label>
      </div>

      {/* Conditional Logic */}
      <div
        style={{
          marginBottom: "15px",
          padding: "15px",
          background: "#fff3cd",
          border: "1px solid #ffc107",
          borderRadius: "5px",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#856404" }}>
          ⚡ Conditional Logic (Optional)
        </h4>

        <label
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={hasCondition}
            onChange={(e) => {
              setHasCondition(e.target.checked);
              if (!e.target.checked) {
                setConditionQuestionId("");
                setConditionValue("");
                setConditionType("equals");
              }
            }}
            style={{
              marginRight: "8px",
              width: "18px",
              height: "18px",
              cursor: "pointer",
            }}
          />
          <strong>Show this question only if...</strong>
        </label>

        {hasCondition && (
          <div style={{ marginLeft: "26px", marginTop: "15px" }}>
            {questions.length === 0 ? (
              <p style={{ color: "#856404", fontSize: "14px" }}>
                Add at least one question first to create conditions.
              </p>
            ) : (
              <>
                {/* Select Previous Question */}
                <div style={{ marginBottom: "10px" }}>
                  <label>
                    <strong>Previous question:</strong>
                    <br />
                    <select
                      value={conditionQuestionId}
                      onChange={(e) => {
                        setConditionQuestionId(e.target.value);
                        setConditionValue("");
                      }}
                      style={{
                        padding: "8px",
                        fontSize: "14px",
                        width: "100%",
                        maxWidth: "500px",
                      }}
                    >
                      <option value="">-- Select a question --</option>
                      {questions.map((q, idx) => (
                        <option key={q.id} value={q.id}>
                          Question {idx + 1}: {q.text} ({q.type})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {conditionQuestionId &&
                  (() => {
                    const selectedQ = questions.find(
                      (q) => q.id == conditionQuestionId,
                    );

                    if (!selectedQ) return null;

                    return (
                      <div>
                        {/* Condition Type Selector */}
                        <div style={{ marginBottom: "10px" }}>
                          <label>
                            <strong>Condition type:</strong>
                            <br />
                            <select
                              value={conditionType}
                              onChange={(e) => {
                                setConditionType(e.target.value);
                                setConditionValue("");
                              }}
                              style={{
                                padding: "8px",
                                fontSize: "14px",
                                width: "100%",
                                maxWidth: "500px",
                              }}
                            >
                              <option value="equals">Answer equals</option>
                              <option value="not_equals">
                                Answer does NOT equal
                              </option>
                              {(selectedQ.type === "checkbox" || selectedQ.type === "rating") && (
                                <option value="option_selected">
                                  Specific option is selected
                                </option>
                              )}
                              <option value="is_answered">
                                Question is answered (any value)
                              </option>
                            </select>
                          </label>
                        </div>

                        {/* Value Input - Only show if not "is_answered" */}
                        {conditionType !== "is_answered" && (
                          <div>
                            {/* For text questions */}
                            {selectedQ.type === "text" && (
                              <div>
                                <label>
                                  <strong>Value:</strong>
                                  <br />
                                  <input
                                    type="text"
                                    value={conditionValue}
                                    onChange={(e) =>
                                      setConditionValue(e.target.value)
                                    }
                                    placeholder="Enter expected answer"
                                    style={{
                                      padding: "8px",
                                      fontSize: "14px",
                                      width: "100%",
                                      maxWidth: "500px",
                                    }}
                                  />
                                </label>
                              </div>
                            )}

                            {/* For multiple choice and checkbox */}
                            {(selectedQ.type === "multiple_choice" ||
                              selectedQ.type === "checkbox" ||
                              selectedQ.type === "rating") && (
                              <div>
                                <label>
                                  <strong>
                                    {conditionType === "option_selected"
                                      ? "Option:"
                                      : "Value:"}
                                  </strong>
                                  <br />
                                  <select
                                    value={conditionValue}
                                    onChange={(e) =>
                                      setConditionValue(e.target.value)
                                    }
                                    style={{
                                      padding: "8px",
                                      fontSize: "14px",
                                      width: "100%",
                                      maxWidth: "500px",
                                    }}
                                  >
                                    <option value="">
                                      -- Select an option --
                                    </option>
                                    {selectedQ.options &&
                                    selectedQ.options.length > 0 ? (
                                      selectedQ.options.map((opt, idx) => (
                                        <option key={idx} value={opt}>
                                          {opt}
                                        </option>
                                      ))
                                    ) : (
                                      <option disabled>
                                        No options available
                                      </option>
                                    )}
                                  </select>
                                </label>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Explanation Text */}
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            marginTop: "10px",
                            background: "#fff",
                            padding: "8px",
                            borderRadius: "3px",
                          }}
                        >
                          {conditionType === "equals" &&
                            "This question will show when the answer exactly matches the value above."}
                          {conditionType === "not_equals" &&
                            "This question will show when the answer does NOT match the value above."}
                          {conditionType === "option_selected" &&
                            "This question will show when the specific checkbox option is checked."}
                          {conditionType === "is_answered" &&
                            "This question will show when the previous question has any answer (not empty)."}
                        </p>
                      </div>
                    );
                  })()}
              </>
            )}
          </div>
        )}

        {!hasCondition && (
          <p
            style={{ fontSize: "13px", color: "#856404", margin: "10px 0 0 0" }}
          >
            This question will always be visible to respondents.
          </p>
        )}
      </div>

      {/* Show options input only for multiple choice and checkbox */}
      {(newQuestionType === "multiple_choice" ||
        newQuestionType === "checkbox") && (
        <div
          style={{
            background: "#f0f0f028",
            padding: "15px",
            marginBottom: "15px",
            borderRadius: "5px",
          }}
        >
          <h3>Options</h3>

          <div style={{ marginBottom: "10px" }}>
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="Enter an option"
              style={{ padding: "8px", fontSize: "16px", width: "70%" }}
            />
            <button
              onClick={addOption}
              style={{ padding: "8px 15px", marginLeft: "10px" }}
            >
              Add Option
            </button>
          </div>

          {/* Display current options */}
          {tempOptions.length > 0 && (
            <div>
              <p>
                <strong>Current options:</strong>
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  maxWidth: "700px",
                  justifyContent: "center",
                }}
              >
                {tempOptions.map((option, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      minWidth: "150px",
                      maxWidth: "200px",
                      flex: "0 0 auto",
                    }}
                  >
                    <span
                      style={{
                        marginRight: "10px",
                        wordBreak: "break-word",
                        color: "#333",
                        fontWeight: "500",
                      }}
                    >
                      {option}
                    </span>
                    <button
                      onClick={() => removeOption(index)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        background: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show rating scale selector for rating type */}
      {newQuestionType === "rating" && (
        <div
          style={{
            background: "#e7f3ff9f",
            padding: "15px",
            marginBottom: "15px",
            borderRadius: "5px",
            border: "1px solid #007bff",
          }}
        >
          <h3 style={{ margin: "0 0 15px 0" }}>Rating Scale</h3>

          <div style={{ marginBottom: "15px" }}>
            <label>
              <strong>Select a scale:</strong>
              <br />
              <select
                value={ratingScale}
                onChange={(e) => {
                  setRatingScale(e.target.value);
                  if (e.target.value === "custom") {
                    setCustomRatingOptions([]);
                  }
                }}
                style={{
                  padding: "8px",
                  fontSize: "16px",
                  width: "100%",
                  maxWidth: "500px",
                }}
              >
                <optgroup label="Numeric Scales">
                  <option value="numeric_5">1 to 5 (5 points)</option>
                  <option value="numeric_10">1 to 10 (10 points)</option>
                </optgroup>
                <optgroup label="Agreement Scales">
                  <option value="agree_5">
                    Strongly Disagree → Strongly Agree (5 points)
                  </option>
                  <option value="agree_3">Disagree → Agree (3 points)</option>
                </optgroup>
                <optgroup label="Quality Scales">
                  <option value="quality_5">Poor → Excellent (5 points)</option>
                  <option value="quality_3">Bad → Good (3 points)</option>
                </optgroup>
                <optgroup label="Satisfaction Scales">
                  <option value="satisfaction_5">
                    Very Dissatisfied → Very Satisfied (5 points)
                  </option>
                  <option value="satisfaction_3">
                    Dissatisfied → Satisfied (3 points)
                  </option>
                </optgroup>
                <optgroup label="Frequency Scales">
                  <option value="frequency_5">Never → Always (5 points)</option>
                </optgroup>
                <option value="custom">Custom (define your own)</option>
              </select>
            </label>
          </div>

          {/* Preview of selected scale */}
          {ratingScale !== "custom" && (
            <div style={{ marginBottom: "10px" }}>
              <p
                style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#666" }}
              >
                <strong>Preview:</strong>
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {getRatingScaleOptions(ratingScale).map((opt, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "8px 16px",
                      background: "#fff",
                      border: "2px solid #007bff",
                      borderRadius: "20px",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom scale input */}
          {ratingScale === "custom" && (
            <div>
              <p
                style={{
                  fontSize: "14px",
                  color: "#666",
                  marginBottom: "10px",
                }}
              >
                Add your custom rating options in order from lowest to highest:
              </p>
              <div style={{ marginBottom: "10px" }}>
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Enter rating option (e.g., Poor, Fair, Good)"
                  style={{ padding: "8px", fontSize: "16px", width: "70%" }}
                />
                <button
                  onClick={() => {
                    if (newOption.trim() === "") {
                      alert("Please enter an option");
                      return;
                    }
                    setCustomRatingOptions([...customRatingOptions, newOption]);
                    setNewOption("");
                  }}
                  style={{ padding: "8px 15px", marginLeft: "10px" }}
                >
                  Add Option
                </button>
              </div>

              {customRatingOptions.length > 0 && (
                <div>
                  <p>
                    <strong>
                      Custom scale ({customRatingOptions.length} options):
                    </strong>
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginBottom: "10px",
                    }}
                  >
                    {customRatingOptions.map((option, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 12px",
                          background: "#fff",
                          border: "2px solid #007bff",
                          borderRadius: "20px",
                        }}
                      >
                        <span style={{ fontWeight: "500" }}>{option}</span>
                        <button
                          onClick={() => {
                            const updated = customRatingOptions.filter(
                              (_, i) => i !== index,
                            );
                            setCustomRatingOptions(updated);
                          }}
                          style={{
                            padding: "2px 8px",
                            fontSize: "12px",
                            background: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={addQuestion}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          background: "#007bff",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        Add Question to Form
      </button>

      <hr style={{ margin: "30px 0" }} />

      {/* Display Questions */}
      <h2>Form Preview ({questions.length} questions)</h2>

      {questions.length === 0 ? (
        <p style={{ color: "#666" }}>No questions yet. Add one above!</p>
      ) : (
        <div>
          {questions.map((question, questionIndex) => (
            <div
              key={question.id}
              style={{
                background: "#f9f9f9bc",
                padding: "15px",
                marginBottom: "15px",
                border: "1px solid #ddd",
                borderRadius: "5px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 10px 0" }}>
                    <strong>Question {questionIndex + 1}:</strong>{" "}
                    {question.text}
                  </p>
                  <p
                    style={{
                      margin: "0 0 10px 0",
                      fontSize: "14px",
                      color: "#666",
                    }}
                  >
                    Type: <em>{question.type}</em>
                    {question.type === "rating" && question.rating_scale && (
                      <span> ({question.rating_scale})</span>
                    )}
                  </p>
                  <p
                    style={{
                      margin: "0 0 10px 0",
                      fontSize: "14px",
                      color: question.is_required ? "#dc3545" : "#28a745",
                    }}
                  >
                    {question.is_required ? "★ Required" : "○ Optional"}
                  </p>
                  {question.condition_question_id && (
                    <p
                      style={{
                        margin: "0 0 10px 0",
                        fontSize: "14px",
                        color: "#856404",
                        background: "#fff3cd",
                        padding: "8px",
                        borderRadius: "3px",
                      }}
                    >
                      ⚡ Conditional: Shows only if Question{" "}
                      {questions.findIndex(
                        (q) => q.id == question.condition_question_id,
                      ) + 1}
                      {question.condition_type === "equals" &&
                        ` equals "${question.condition_value}"`}
                      {question.condition_type === "not_equals" &&
                        ` does NOT equal "${question.condition_value}"`}
                      {question.condition_type === "option_selected" &&
                        ` has option "${question.condition_value}" selected`}
                      {question.condition_type === "is_answered" &&
                        ` is answered`}
                    </p>
                  )}

                  {question.options.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>
                        <strong>Options: </strong>
                        {question.options.join(", ")}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => deleteQuestion(question.id)}
                  style={{
                    padding: "5px 10px",
                    background: "#dc3545",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "3px",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Form Button */}
      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          color: "#666",
          background: "#f0f8ff",
          border: "2px solid #007bff",
          borderRadius: "5px",
        }}
      >
        <h3>Ready to Save?</h3>
        <p>Your form has {questions.length} question(s)</p>
        <button
          onClick={saveForm}
          style={{
            padding: "12px 30px",
            fontSize: "18px",
            background: "#28a745",
            color: "white",
            border: "none",
            cursor: "pointer",
            borderRadius: "5px",
            fontWeight: "bold",
          }}
        >
          💾 {isEditMode ? "Update Form" : "Save Form to Database"}
        </button>
      </div>

      <hr style={{ margin: "30px 0" }} />

      {/* Show final form data structure */}
      <details>
        <summary
          style={{ cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}
        >
          View Form Data (for debugging)
        </summary>
        <pre
          style={{ background: "#f5f5f583", padding: "15px", overflow: "auto" }}
        >
          {JSON.stringify(
            {
              title: formTitle,
              description: formDescription,
              category_id: selectedCategoryId,
              questions: questions,
            },
            null,
            2,
          )}
        </pre>
      </details>
    </div>
  );
}

export default FormBuilder;
