import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiUrl } from "./apiBase";
import { isOrderValidForConditions } from "./questionOrder";

function SortableQuestionRow({ question, questionIndex, questions, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "fb-preview-card" + (isDragging ? " fb-preview-card--dragging" : "")
      }
    >
      <button
        type="button"
        className="fb-drag-handle"
        aria-label="Drag to reorder question"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className="fb-preview-body">
        <span className="fb-preview-question">
          Q{questionIndex + 1}. {question.text}
        </span>
        <span className="fb-preview-meta">
          Type: {question.type}
          {question.type === "rating" &&
            question.rating_scale &&
            ` · ${question.rating_scale}`}
          {" · "}
          {question.is_required ? "★ Required" : "○ Optional"}
        </span>
        {question.type === "number" && (
          <span>
            {question.number_min && ` (min: ${question.number_min})`}
            {question.number_max && ` (max: ${question.number_max})`}
            {question.number_step &&
              question.number_step !== "any" &&
              ` step: ${question.number_step}`}
          </span>
        )}
        {question.type === "datetime" && question.datetime_type && (
          <span> ({question.datetime_type})</span>
        )}
        {question.options.length > 0 && (
          <span className="fb-preview-meta">
            Options: {question.options.join(", ")}
          </span>
        )}
        {question.condition_question_id && (
          <span className="fb-preview-condition">
            ⚡ Shows only if Q
            {questions.findIndex(
              (q) => q.id == question.condition_question_id,
            ) + 1}
            {question.condition_type === "equals" &&
              ` equals "${question.condition_value}"`}
            {question.condition_type === "not_equals" &&
              ` does NOT equal "${question.condition_value}"`}
            {question.condition_type === "option_selected" &&
              ` has "${question.condition_value}" selected`}
            {question.condition_type === "is_answered" && ` is answered`}
          </span>
        )}
      </div>
      <button
        className="card-btn card-btn-delete"
        style={{
          whiteSpace: "nowrap",
          padding: "6px 14px",
          fontSize: "0.85em",
        }}
        type="button"
        onClick={() => onDelete(question.id)}
      >
        Delete
      </button>
    </div>
  );
}

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

  const [numberMin, setNumberMin] = useState("");
  const [numberMax, setNumberMax] = useState("");
  const [numberStep, setNumberStep] = useState("1");
  const [dateTimeType, setDateTimeType] = useState("date");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleQuestionsDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id == over.id) return;
    const oldIndex = questions.findIndex((q) => q.id == active.id);
    const newIndex = questions.findIndex((q) => q.id == over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(questions, oldIndex, newIndex);
    if (!isOrderValidForConditions(reordered)) {
      alert(
        "That order isn't allowed: a conditional question must stay below the question it depends on.",
      );
      return;
    }
    setQuestions(reordered);
  }

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
            id: q.id,
            text: q.question_text,
            type: q.question_type,
            options: q.options || [],
            rating_scale: q.rating_scale || null,
            number_min: q.number_min || null,
            number_max: q.number_max || null,
            number_step: q.number_step || "1",
            datetime_type: q.datetime_type || "date",
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
    } else if (
      newQuestionType !== "text" &&
      newQuestionType !== "number" &&
      newQuestionType !== "datetime"
    ) {
      questionOptions = tempOptions;
    }

    const newQuestion = {
      id: "q_" + Date.now(),
      text: newQuestionText,
      type: newQuestionType,
      options: questionOptions,
      rating_scale: newQuestionType === "rating" ? ratingScale : null,
      number_min:
        newQuestionType === "number" && numberMin
          ? parseFloat(numberMin)
          : null,
      number_max:
        newQuestionType === "number" && numberMax
          ? parseFloat(numberMax)
          : null,
      number_step: newQuestionType === "number" ? numberStep : null,
      datetime_type: newQuestionType === "datetime" ? dateTimeType : null,
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
    setNumberMin("");
    setNumberMax("");
    setNumberStep("1");
    setDateTimeType("date");
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

  /** Use the parent row's exact `id` so PHP's client-id map always resolves after reorder/DnD. */
  function canonicalConditionParentId(q) {
    const raw = q.condition_question_id;
    if (raw == null || raw === "") return null;
    const parent = questions.find((p) => p.id == raw);
    return parent ? parent.id : raw;
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
      text: q.text,
      type: q.type,
      rating_scale: q.rating_scale ?? null,
      position: idx,
      options: Array.isArray(q.options) ? q.options : [],
      is_required: q.is_required ?? 1,
      number_min: q.number_min ?? null,
      number_max: q.number_max ?? null,
      number_step: q.number_step ?? null,
      datetime_type: q.datetime_type ?? null,
      condition_question_id: canonicalConditionParentId(q),
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
    <div className="fb-shell">
      {/* Loading overlay for edit mode */}
      {loadingForm && (
        <div
          className="fb-paper"
          style={{ textAlign: "center", color: "#aaa" }}
        >
          Loading form data...
        </div>
      )}

      {/* Page heading */}
      <h1 className="fb-page-title">
        {isEditMode ? "Edit Form" : "Form Builder"}
      </h1>
      {isEditMode && (
        <p className="fb-page-subtitle">
          Editing an existing form. Changes save when you click Update Form.
        </p>
      )}

      {/* ── Zone 1: Form details ── */}
      <div className="fb-paper">
        <p className="fb-section-title">Form Details</p>

        <div className="fb-field">
          <label className="fb-label">Form Title</label>
          <input
            className="fb-input"
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Enter form title"
          />
        </div>

        <div className="fb-field">
          <label className="fb-label">Description</label>
          <textarea
            className="fb-textarea"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Enter form description"
          />
        </div>

        <div className="fb-field">
          <label className="fb-label">Category</label>
          <select
            className="fb-select"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(parseInt(e.target.value))}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Zone 2: Add question ── */}
      <div className="fb-paper">
        <p className="fb-section-title">Add Question</p>

        <div className="fb-field">
          <label className="fb-label">Question Text</label>
          <input
            className="fb-input"
            type="text"
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            placeholder="Enter your question"
          />
        </div>

        <div className="fb-field">
          <label className="fb-label">Question Type</label>
          <select
            className="fb-select"
            value={newQuestionType}
            onChange={(e) => {
              setNewQuestionType(e.target.value);
              setTempOptions([]);
              if (e.target.value === "rating") {
                setRatingScale("numeric_5");
                setCustomRatingOptions([]);
              }
              if (e.target.value === "number") {
                setNumberMin("");
                setNumberMax("");
                setNumberStep("1");
              }
              if (e.target.value === "datetime") {
                setDateTimeType("date");
              }
            }}
            style={{ padding: "8px", fontSize: "16px" }}
          >
            <option value="text">Text Input</option>
            <option value="email">Email Address</option>
            <option value="number">Number</option>
            <option value="datetime">Date/Time</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="checkbox">Checkbox</option>
            <option value="rating">Rating Scale</option>
          </select>
        </div>

        {/* Required toggle */}
        <label className="fb-toggle-row">
          <input
            type="checkbox"
            checked={isNewQuestionRequired}
            onChange={(e) => setIsNewQuestionRequired(e.target.checked)}
          />
          <span className="fb-toggle-label">Required field</span>
          <span className="fb-toggle-hint">
            Users must answer this question
          </span>
        </label>

        {/* Conditional logic */}
        <div className="fb-condition-panel">
          <p className="fb-condition-title">⚡ Conditional Logic — Optional</p>

          <label
            className="fb-toggle-row"
            style={{
              marginBottom: 0,
              background: "transparent",
              border: "none",
              padding: "0",
            }}
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
            />
            <span className="fb-toggle-label">
              Show this question only if...
            </span>
          </label>

          {!hasCondition && (
            <p className="fb-condition-hint">
              This question will always be visible to respondents.
            </p>
          )}

          {hasCondition && (
            <div
              style={{
                marginTop: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {questions.length === 0 ? (
                <p className="fb-condition-hint">
                  Add at least one question first to create conditions.
                </p>
              ) : (
                <>
                  <div className="fb-field" style={{ marginBottom: 0 }}>
                    <label className="fb-label">Previous question</label>
                    <select
                      className="fb-select"
                      value={conditionQuestionId}
                      onChange={(e) => {
                        setConditionQuestionId(e.target.value);
                        setConditionValue("");
                      }}
                    >
                      <option value="">-- Select a question --</option>
                      {questions.map((q, idx) => (
                        <option key={q.id} value={q.id}>
                          Q{idx + 1}: {q.text} ({q.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {conditionQuestionId &&
                    (() => {
                      const selectedQ = questions.find(
                        (q) => q.id == conditionQuestionId,
                      );
                      if (!selectedQ) return null;
                      return (
                        <>
                          <div className="fb-field" style={{ marginBottom: 0 }}>
                            <label className="fb-label">Condition type</label>
                            <select
                              className="fb-select"
                              value={conditionType}
                              onChange={(e) => {
                                setConditionType(e.target.value);
                                setConditionValue("");
                              }}
                            >
                              <option value="equals">Answer equals</option>
                              <option value="not_equals">
                                Answer does NOT equal
                              </option>
                              {(selectedQ.type === "checkbox" ||
                                selectedQ.type === "rating") && (
                                <option value="option_selected">
                                  Specific option is selected
                                </option>
                              )}
                              <option value="is_answered">
                                Question is answered (any value)
                              </option>
                            </select>
                          </div>

                          {conditionType !== "is_answered" && (
                            <div
                              className="fb-field"
                              style={{ marginBottom: 0 }}
                            >
                              <label className="fb-label">
                                {conditionType === "option_selected"
                                  ? "Option"
                                  : "Value"}
                              </label>
                              {selectedQ.type === "text" ? (
                                <input
                                  className="fb-input"
                                  type="text"
                                  value={conditionValue}
                                  onChange={(e) =>
                                    setConditionValue(e.target.value)
                                  }
                                  placeholder="Enter expected answer"
                                />
                              ) : (
                                <select
                                  className="fb-select"
                                  value={conditionValue}
                                  onChange={(e) =>
                                    setConditionValue(e.target.value)
                                  }
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
                              )}

                              {/* For email questions */}
                              {selectedQ.type === "email" && (
                                <div>
                                  <label>
                                    <strong>Value:</strong>
                                    <br />
                                    <input
                                      type="email"
                                      value={conditionValue}
                                      onChange={(e) =>
                                        setConditionValue(e.target.value)
                                      }
                                      placeholder="Enter expected email address"
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
                              {/* For number questions */}
                              {selectedQ.type === "number" && (
                                <div>
                                  <label>
                                    <strong>Value:</strong>
                                    <br />
                                    <input
                                      type="number"
                                      value={conditionValue}
                                      onChange={(e) =>
                                        setConditionValue(e.target.value)
                                      }
                                      placeholder="Enter expected number"
                                      min={selectedQ.number_min || undefined}
                                      max={selectedQ.number_max || undefined}
                                      step={
                                        selectedQ.number_step === "any"
                                          ? "any"
                                          : selectedQ.number_step || "1"
                                      }
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

                              {/* For datetime questions */}
                              {selectedQ.type === "datetime" && (
                                <div>
                                  <label>
                                    <strong>Value:</strong>
                                    <br />
                                    <input
                                      type={selectedQ.datetime_type || "date"}
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
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          )}

                          <p
                            className="fb-condition-hint"
                            style={{ margin: 0 }}
                          >
                            {conditionType === "equals" &&
                              "Shows when answer exactly matches the value above."}
                            {conditionType === "not_equals" &&
                              "Shows when answer does NOT match the value above."}
                            {conditionType === "option_selected" &&
                              "Shows when the specific checkbox option is checked."}
                            {conditionType === "is_answered" &&
                              "Shows when the previous question has any answer."}
                          </p>
                        </>
                      );
                    })()}
                </>
              )}
            </div>
          )}
        </div>

        {/* Options panel — multiple choice / checkbox */}
        {(newQuestionType === "multiple_choice" ||
          newQuestionType === "checkbox") && (
          <div className="fb-options-panel">
            <p className="fb-options-title">Options</p>
            <div className="fb-add-option-row">
              <input
                className="fb-input"
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="Enter an option"
              />
              <button
                className="fb-btn-add"
                style={{ width: "auto", padding: "10px 18px" }}
                onClick={addOption}
              >
                Add
              </button>
            </div>
            {tempOptions.length > 0 && (
              <div className="fb-option-pills">
                {tempOptions.map((option, index) => (
                  <div key={index} className="fb-option-pill">
                    <span>{option}</span>
                    <button
                      className="fb-option-pill-remove"
                      onClick={() => removeOption(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rating scale panel */}
        {newQuestionType === "rating" && (
          <div className="fb-options-panel">
            <p className="fb-options-title">Rating Scale</p>

            <div className="fb-field">
              <label className="fb-label">Select a scale</label>
              <select
                className="fb-select"
                value={ratingScale}
                onChange={(e) => {
                  setRatingScale(e.target.value);
                  if (e.target.value === "custom") setCustomRatingOptions([]);
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
            </div>

            {ratingScale !== "custom" && (
              <>
                <p className="fb-label" style={{ marginBottom: "8px" }}>
                  Preview
                </p>
                <div className="fb-option-pills">
                  {getRatingScaleOptions(ratingScale).map((opt, idx) => (
                    <div key={idx} className="fb-option-pill">
                      {opt}
                    </div>
                  ))}
                </div>
              </>
            )}

            {ratingScale === "custom" && (
              <>
                <p
                  className="fb-condition-hint"
                  style={{ marginBottom: "10px", color: "#3a5fc8" }}
                >
                  Add rating options in order from lowest to highest.
                </p>
                <div className="fb-add-option-row">
                  <input
                    className="fb-input"
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="e.g. Poor, Fair, Good"
                  />
                  <button
                    className="fb-btn-add"
                    style={{ width: "auto", padding: "10px 18px" }}
                    onClick={() => {
                      if (newOption.trim() === "") {
                        alert("Please enter an option");
                        return;
                      }
                      setCustomRatingOptions([
                        ...customRatingOptions,
                        newOption,
                      ]);
                      setNewOption("");
                    }}
                  >
                    Add
                  </button>
                </div>
                {customRatingOptions.length > 0 && (
                  <div className="fb-option-pills">
                    {customRatingOptions.map((option, index) => (
                      <div key={index} className="fb-option-pill">
                        <span>{option}</span>
                        <button
                          className="fb-option-pill-remove"
                          onClick={() =>
                            setCustomRatingOptions(
                              customRatingOptions.filter((_, i) => i !== index),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Number Configuration */}
        {newQuestionType === "number" && (
          <div
            style={{
              background: "#f0f9ff",
              padding: "15px",
              marginBottom: "15px",
              borderRadius: "5px",
              border: "1px solid #3b82f6",
            }}
          >
            <h3 style={{ margin: "0 0 15px 0" }}>Number Configuration</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "15px",
              }}
            >
              <div>
                <label>
                  <strong>Minimum Value (optional):</strong>
                  <br />
                  <input
                    type="number"
                    value={numberMin}
                    onChange={(e) => setNumberMin(e.target.value)}
                    placeholder="No minimum"
                    style={{ padding: "8px", fontSize: "14px", width: "100%" }}
                  />
                </label>
              </div>

              <div>
                <label>
                  <strong>Maximum Value (optional):</strong>
                  <br />
                  <input
                    type="number"
                    value={numberMax}
                    onChange={(e) => setNumberMax(e.target.value)}
                    placeholder="No maximum"
                    style={{ padding: "8px", fontSize: "14px", width: "100%" }}
                  />
                </label>
              </div>

              <div>
                <label>
                  <strong>Step:</strong>
                  <br />
                  <select
                    value={numberStep}
                    onChange={(e) => setNumberStep(e.target.value)}
                    style={{ padding: "8px", fontSize: "14px", width: "100%" }}
                  >
                    <option value="1">Integers only (1, 2, 3...)</option>
                    <option value="0.1">Decimals (0.1)</option>
                    <option value="0.01">Decimals (0.01)</option>
                    <option value="any">Any number</option>
                  </select>
                </label>
              </div>
            </div>

            <div
              style={{
                marginTop: "10px",
                padding: "10px",
                background: "#fff",
                borderRadius: "4px",
              }}
            >
              <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
                <strong>Preview:</strong> Number input
                {numberMin && ` (min: ${numberMin})`}
                {numberMax && ` (max: ${numberMax})`}
                {numberStep !== "any" && ` with step of ${numberStep}`}
              </p>
            </div>
          </div>
        )}

        {/* Date/Time Configuration */}
        {newQuestionType === "datetime" && (
          <div
            style={{
              background: "#fef3c7",
              padding: "15px",
              marginBottom: "15px",
              borderRadius: "5px",
              border: "1px solid #f59e0b",
            }}
          >
            <h3 style={{ margin: "0 0 15px 0" }}>Date/Time Type</h3>

            <div>
              <label>
                <strong>Select input type:</strong>
                <br />
                <select
                  value={dateTimeType}
                  onChange={(e) => setDateTimeType(e.target.value)}
                  style={{
                    padding: "8px",
                    fontSize: "14px",
                    width: "100%",
                    maxWidth: "400px",
                  }}
                >
                  <option value="date">Date only (MM/DD/YYYY)</option>
                  <option value="time">Time only (HH:MM)</option>
                  <option value="datetime-local">Date and Time</option>
                  <option value="month">Month and Year (MM/YYYY)</option>
                  <option value="week">Week (Week 1-52)</option>
                </select>
              </label>
            </div>

            <div
              style={{
                marginTop: "10px",
                padding: "10px",
                background: "#fff",
                borderRadius: "4px",
              }}
            >
              <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
                <strong>Preview:</strong>{" "}
                {dateTimeType === "date" && "Date picker (e.g., 03/25/2026)"}
                {dateTimeType === "time" && "Time picker (e.g., 14:30)"}
                {dateTimeType === "datetime-local" &&
                  "Date and time picker (e.g., 03/25/2026 14:30)"}
                {dateTimeType === "month" && "Month picker (e.g., March 2026)"}
                {dateTimeType === "week" && "Week picker (e.g., Week 12, 2026)"}
              </p>
            </div>
          </div>
        )}

        <button className="fb-btn-add" onClick={addQuestion}>
          + Add Question to Form
        </button>
      </div>

      {/* ── Zone 3: Preview ── */}
      <div className="fb-paper">
        <p className="fb-section-title">
          Form Preview — {questions.length} question
          {questions.length !== 1 ? "s" : ""}
        </p>
        {questions.length > 0 && (
          <p
            className="fb-reorder-hint"
            style={{
              color: "#888",
              fontSize: "0.85em",
              marginTop: "-6px",
              marginBottom: "14px",
            }}
          >
            Use the ⋮⋮ handle to drag questions into order. Conditional
            questions must stay below the one they depend on.
          </p>
        )}

        {questions.length === 0 ? (
          <p style={{ color: "#ccc", fontSize: "0.9em" }}>
            No questions yet. Add one above.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleQuestionsDragEnd}
          >
            <SortableContext
              items={questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              {questions.map((question, questionIndex) => (
                <SortableQuestionRow
                  key={question.id}
                  question={question}
                  questionIndex={questionIndex}
                  questions={questions}
                  onDelete={deleteQuestion}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* ── Zone 4: Save ── */}
      <div className="fb-save-panel">
        <p className="fb-save-title">Ready to Save?</p>
        <p className="fb-save-count">
          Your form has {questions.length} question
          {questions.length !== 1 ? "s" : ""}
        </p>
        <button className="fb-btn-save" onClick={saveForm}>
          💾 {isEditMode ? "Update Form" : "Save Form to Database"}
        </button>
      </div>

      {/* ── Debug panel ── */}
      <details className="fb-debug">
        <summary> View Form Data (debugging)</summary>
        <pre>
          {JSON.stringify(
            {
              title: formTitle,
              description: formDescription,
              category_id: selectedCategoryId,
              questions,
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
