import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useIsMobile } from "./useIsMobile";

// ─────────────────────────────────────────────────────────────────────────────
// SortableQuestionRow
// ─────────────────────────────────────────────────────────────────────────────
// Renders one question card in the Form Preview list.
//
// BUTTON STYLE SWITCHING — how it works:
//   We call useIsMobile() inside this component. That hook returns true when
//   the viewport is narrower than 768px (the same breakpoint used everywhere
//   else in the app). Based on that boolean we render two completely different
//   sets of buttons:
//
//   Desktop (isMobile = false) → Option D: soft-filled small buttons.
//     Each button has a lightly tinted background (blue for edit, red for
//     delete) that is always visible, with an icon + text label.
//     The tint uses CSS custom properties (var(--fb-edit-bg) etc.) defined
//     in index.css so colours are easy to tweak in one place.
//
//   Mobile (isMobile = true) → Option A: icon-only ghost buttons.
//     Square 30×30 buttons with just an icon, no label. A thin border makes
//     them discoverable; the border + background flash blue/red on hover.
//     No text label means they never crowd a narrow screen.
//
// Why is useIsMobile() safe to call inside a non-root component?
//   React's rules say hooks must be called at the top level of a React
//   function — meaning not inside loops, conditions, or nested functions.
//   SortableQuestionRow IS a React function component (it takes props and
//   returns JSX), so calling useIsMobile() at the top of its body is
//   perfectly valid. React tracks which hooks belong to which component
//   automatically.
// ─────────────────────────────────────────────────────────────────────────────
function SortableQuestionRow({
  question,
  questionIndex,
  questions,
  onDelete,
  onEdit,
}) {
  const isMobile = useIsMobile();

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

  // ── Shared button JSX ──────────────────────────────────────────────────────
  // We build the action buttons once here and reuse them in both the section
  // and regular card returns below. This avoids duplicating the if/else logic
  // twice in two different return blocks.
  //
  // The ternary `isMobile ? <A> : <D>` is how React expresses "if/else"
  // inside JSX. You can't write a plain if statement inside JSX markup, but
  // you CAN write a JavaScript expression — and a ternary is an expression.
  const actionButtons = isMobile ? (
    // ── Option A: icon-only ghost buttons (mobile) ─────────────────────────
    // A <div> with display:flex lines the two buttons up side by side.
    // gap:6px puts a small space between them without adding margin to each.
    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
      <button
        type="button"
        className="fb-action-ghost fb-action-ghost--edit"
        aria-label="Edit question"
        title="Edit"
        onClick={() => onEdit(question)}
      >
        {/* Pencil icon from the Tabler icon font already loaded in the app */}
        ✏️
      </button>
      <button
        type="button"
        className="fb-action-ghost fb-action-ghost--delete"
        aria-label="Delete question"
        title="Delete"
        onClick={() => onDelete(question.id)}
      >
        🗑️
      </button>
    </div>
  ) : (
    // ── Option D: soft-filled small buttons (desktop) ──────────────────────
    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
      <button
        type="button"
        className="fb-action-soft fb-action-soft--edit"
        onClick={() => onEdit(question)}
      >
        ✏️ Edit
      </button>
      <button
        type="button"
        className="fb-action-soft fb-action-soft--delete"
        onClick={() => onDelete(question.id)}
      >
        🗑️ Delete
      </button>
    </div>
  );

  // ── Section block card ─────────────────────────────────────────────────────
  if (question.type === "section") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={
          "fb-section-card" + (isDragging ? " fb-preview-card--dragging" : "")
        }
      >
        <button
          type="button"
          className="fb-drag-handle"
          aria-label="Drag to reorder section"
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <div className="fb-preview-body">
          <span className="fb-section-card-label">SECTION</span>
          <span className="fb-section-card-title">{question.text}</span>
          {question.description && (
            <span className="fb-preview-meta">{question.description}</span>
          )}
        </div>

        {/* Render whichever button set matches the screen size */}
        {actionButtons}
      </div>
    );
  }

  // ── Regular question card ──────────────────────────────────────────────────
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
            {/* {question.number_step &&
              question.number_step !== "any" &&
              ` step: ${question.number_step}`} */}
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
            {question.condition_type === "contains" &&
              ` includes "${question.condition_value}" among selected`}
            {question.condition_type === "not_contains" &&
              ` does NOT include "${question.condition_value}" among selected`}
            {question.condition_type === "is_answered" && ` is answered`}
          </span>
        )}
      </div>

      {/* Render whichever button set matches the screen size */}
      {actionButtons}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EditQuestionModal
// ─────────────────────────────────────────────────────────────────────────────
// This is a BRAND NEW component that only exists in this file.
//
// Why a separate component instead of inlining the JSX in FormBuilder?
// Because the modal has its own internal state (the draft values while the
// user is editing). Keeping that state here means FormBuilder stays clean.
// When the user clicks Save, we call onSave(updatedQuestion) to hand the
// finished object back up. When they click Cancel, we call onClose().
//
// Props:
//   question  — the question object being edited (read-only — we copy it)
//   questions — the full list (needed to build the "condition depends on" dropdown)
//   onSave    — called with the updated question object
//   onClose   — called when the modal should be dismissed
// ─────────────────────────────────────────────────────────────────────────────

function getAllowedConditionTypes(questionType) {
  const baseTypes = ["equals", "not_equals", "is_answered"];
  if (questionType === "multiple_choice") {
    return [...baseTypes, "contains", "not_contains"];
  }
  return baseTypes;
}

function getRatingScaleOptions(scale) {
  const scales = {
    numeric_5: ["1", "2", "3", "4", "5"],
    numeric_10: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    agree_5: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    agree_3: ["Disagree", "Neutral", "Agree"],
    quality_5: ["Poor", "Fair", "Good", "Very Good", "Excellent"],
    quality_3: ["Bad", "Fair", "Good"],
    satisfaction_5: ["Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"],
    satisfaction_3: ["Dissatisfied", "Neutral", "Satisfied"],
    frequency_5: ["Never", "Rarely", "Sometimes", "Often", "Always"],
  };
  return scales[scale] || [];
}

function EditQuestionModal({ question, questions, onSave, onClose }) {
  // ── Local draft state ──────────────────────────────────────────────────────
  // Each piece of the question gets its own state variable.
  // We initialise them from the `question` prop when the modal first opens.
  // "Initialise from props" is safe here because the modal is mounted fresh
  // every time it opens (the parent uses `{editingQuestion && <Modal />}`),
  // so useState runs with the right starting values each time.

  const [text, setText] = useState(question.text);
  const [type, setType] = useState(question.type);
  const [isRequired, setIsRequired] = useState(
    question.is_required === 1 || question.is_required === true,
  );

  // Options (for checkbox / multiple_choice / custom rating)
  const [options, setOptions] = useState([...(question.options || [])]);
  const [newOption, setNewOption] = useState("");

  // Rating-specific
  const [ratingScale, setRatingScale] = useState(
    question.rating_scale || "numeric_5",
  );
  const [customRatingOptions, setCustomRatingOptions] = useState(
    // If the stored rating_scale is "custom", the options ARE the custom list.
    // Otherwise the options come from a preset and we start custom as empty.
    question.rating_scale === "custom" ? [...(question.options || [])] : [],
  );

  // Number-specific
  const [numberMin, setNumberMin] = useState(question.number_min ?? "");
  const [numberMax, setNumberMax] = useState(question.number_max ?? "");
  // const [numberStep, setNumberStep] = useState(question.number_step || "1");

  // Datetime-specific
  const [dateTimeType, setDateTimeType] = useState(
    question.datetime_type || "date",
  );

  // Section-specific (sections only have text + description)
  const [description, setDescription] = useState(question.description || "");

  // Conditional logic
  const [hasCondition, setHasCondition] = useState(
    !!question.condition_question_id,
  );
  const [conditionQuestionId, setConditionQuestionId] = useState(
    question.condition_question_id ?? "",
  );
  const [conditionType, setConditionType] = useState(
    question.condition_type || "equals",
  );
  const [conditionValue, setConditionValue] = useState(
    question.condition_value ?? "",
  );

  // ── handleSave ─────────────────────────────────────────────────────────────
  // Assembles the updated question object from all the local state variables,
  // then hands it back to FormBuilder via the onSave callback.
  // FormBuilder will find the question by ID and replace it in its array.
  function handleSave() {
    if (text.trim() === "") {
      alert("Question text cannot be empty.");
      return;
    }

    // Determine the final options array based on question type
    let finalOptions = [];
    if (type === "rating") {
      finalOptions =
        ratingScale === "custom"
          ? customRatingOptions
          : getRatingScaleOptions(ratingScale);
    } else if (type === "multiple_choice" || type === "checkbox") {
      finalOptions = options;
    }

    const parsedMin = numberMin !== "" ? parseFloat(numberMin) : null;

    const parsedMax = numberMax !== "" ? parseFloat(numberMax) : null;

    if (parsedMin !== null && parsedMax !== null && parsedMin > parsedMax) {
      alert("Minimum value cannot be greater than maximum value.");
      return;
    }

    // Build the updated question object.
    // We spread the original `question` first so we keep any fields we didn't
    // touch (like `id`, which must stay the same so FormBuilder can find it).
    const updated = {
      ...question,
      text: text.trim(),
      type,
      description:
        type === "section" ? description : (question.description ?? null),
      options: finalOptions,
      rating_scale: type === "rating" ? ratingScale : null,
      number_min:
        type === "number" && numberMin !== "" ? parseFloat(numberMin) : null,
      number_max:
        type === "number" && numberMax !== "" ? parseFloat(numberMax) : null,
      // number_step: type === "number" ? numberStep : null,
      datetime_type: type === "datetime" ? dateTimeType : null,
      is_required: isRequired ? 1 : 0,
      condition_question_id:
        hasCondition && conditionQuestionId ? conditionQuestionId : null,
      condition_type:
        hasCondition && conditionQuestionId ? conditionType : "equals",
      condition_value:
        hasCondition && conditionQuestionId ? conditionValue : null,
    };

    onSave(updated);
  }

  // ── Closing on overlay click ───────────────────────────────────────────────
  // If the user clicks the dark background OUTSIDE the white card, close.
  // We do this by putting an onClick on the outer overlay div, then using
  // e.stopPropagation() on the inner card so clicks there don't bubble up.
  // You already saw this pattern in FormViewer's QR code modal.

  // ── Section-only render ────────────────────────────────────────────────────
  // Sections are simpler — they only need text + description fields.
  const isSection = question.type === "section";

  return (
    // ── Dark overlay ──────────────────────────────────────────────────────────
    // position:fixed makes it cover the whole viewport regardless of scroll.
    // zIndex:2000 puts it above everything else (toasts are at 9000 but we
    // don't need to worry about that here).
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "20px",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      {/* ── White modal card ────────────────────────────────────────────────── */}
      {/* stopPropagation prevents a click inside the card from closing it */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "18px",
          padding: "32px 28px",
          width: "100%",
          maxWidth: "620px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{ borderBottom: "2px solid #eef3ff", paddingBottom: "14px" }}
        >
          <h2 style={{ margin: 0, fontSize: "1.25em", color: "#1a1a2e" }}>
            {isSection ? "✏️ Edit Section" : "✏️ Edit Question"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.82em", color: "#aaa" }}>
            Make your changes below and click Save when done.
          </p>
        </div>

        {/* ── Question / Section text ── */}
        <div className="fb-field" style={{ marginBottom: 0 }}>
          <label className="fb-label">
            {isSection ? "Section Title" : "Question Text"}
          </label>
          <input
            className="fb-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              isSection ? "e.g. Employment Details" : "Enter your question"
            }
          />
        </div>

        {/* ── Section description (only shown for section blocks) ── */}
        {isSection && (
          <div className="fb-field" style={{ marginBottom: 0 }}>
            <label className="fb-label">Description (optional)</label>
            <textarea
              className="fb-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional subtitle or instruction for this section"
            />
          </div>
        )}

        {/* ── Everything below only applies to real questions, not sections ── */}
        {!isSection && (
          <>
            {/* ── Question type ── */}
            {/* 
              IMPORTANT NOTE ON CHANGING QUESTION TYPE:
              Changing the type mid-edit is allowed and works fine for most changes
              (e.g. text → email). However if you go from a type that HAS options
              (checkbox) to one that doesn't (text), we intentionally keep the
              options in state so you don't lose them if you switch back.
              They simply won't be included in the saved object for non-option types.
            */}
            <div className="fb-field" style={{ marginBottom: 0 }}>
              <label className="fb-label">Question Type</label>
              <select
                className="fb-select"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  // Reset rating scale when switching to rating so defaults are clean
                  if (e.target.value === "rating" && ratingScale === "") {
                    setRatingScale("numeric_5");
                  }
                }}
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

            {/* ── Required toggle ── */}
            <label className="fb-toggle-row" style={{ marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
              />
              <span className="fb-toggle-label">Required field</span>
              <span className="fb-toggle-hint">
                Users must answer this question
              </span>
            </label>

            {/* ── Options editor (checkbox / multiple_choice) ── */}
            {(type === "multiple_choice" || type === "checkbox") && (
              <div className="fb-options-panel">
                <p className="fb-options-title">Options</p>

                {/* Existing options — each shows a remove button */}
                {options.length > 0 && (
                  <div
                    className="fb-option-pills"
                    style={{ marginBottom: "12px" }}
                  >
                    {options.map((opt, idx) => (
                      <div key={idx} className="fb-option-pill">
                        <span>{opt}</span>
                        <button
                          className="fb-option-pill-remove"
                          type="button"
                          onClick={() =>
                            setOptions(options.filter((_, i) => i !== idx))
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add a new option */}
                <div className="fb-add-option-row">
                  <input
                    className="fb-input"
                    type="text"
                    value={newOption}
                    placeholder="New option text"
                    onChange={(e) => setNewOption(e.target.value)}
                    // Allow pressing Enter to add an option quickly
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newOption.trim()) {
                          setOptions([...options, newOption.trim()]);
                          setNewOption("");
                        }
                      }
                    }}
                  />
                  <button
                    className="fb-btn-add"
                    type="button"
                    style={{ width: "auto", padding: "10px 18px" }}
                    onClick={() => {
                      if (newOption.trim()) {
                        setOptions([...options, newOption.trim()]);
                        setNewOption("");
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* ── Rating scale editor ── */}
            {type === "rating" && (
              <div className="fb-options-panel">
                <p className="fb-options-title">Rating Scale</p>

                <div className="fb-field">
                  <label className="fb-label">Select a scale</label>
                  <select
                    className="fb-select"
                    value={ratingScale}
                    onChange={(e) => {
                      setRatingScale(e.target.value);
                      if (e.target.value === "custom")
                        setCustomRatingOptions([]);
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
                      <option value="agree_3">
                        Disagree → Agree (3 points)
                      </option>
                    </optgroup>
                    <optgroup label="Quality Scales">
                      <option value="quality_5">
                        Poor → Excellent (5 points)
                      </option>
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
                      <option value="frequency_5">
                        Never → Always (5 points)
                      </option>
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

                    {customRatingOptions.length > 0 && (
                      <div
                        className="fb-option-pills"
                        style={{ marginBottom: "10px" }}
                      >
                        {customRatingOptions.map((opt, idx) => (
                          <div key={idx} className="fb-option-pill">
                            <span>{opt}</span>
                            <button
                              className="fb-option-pill-remove"
                              type="button"
                              onClick={() =>
                                setCustomRatingOptions(
                                  customRatingOptions.filter(
                                    (_, i) => i !== idx,
                                  ),
                                )
                              }
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="fb-add-option-row">
                      <input
                        className="fb-input"
                        type="text"
                        value={newOption}
                        placeholder="e.g. Poor, Fair, Good"
                        onChange={(e) => setNewOption(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (newOption.trim()) {
                              setCustomRatingOptions([
                                ...customRatingOptions,
                                newOption.trim(),
                              ]);
                              setNewOption("");
                            }
                          }
                        }}
                      />
                      <button
                        className="fb-btn-add"
                        type="button"
                        style={{ width: "auto", padding: "10px 18px" }}
                        onClick={() => {
                          if (newOption.trim()) {
                            setCustomRatingOptions([
                              ...customRatingOptions,
                              newOption.trim(),
                            ]);
                            setNewOption("");
                          }
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Number configuration ── */}
            {type === "number" && (
              <div
                style={{
                  background: "#f0f9ff",
                  padding: "15px",
                  borderRadius: "8px",
                  border: "1px solid #3b82f6",
                }}
              >
                <p className="fb-options-title" style={{ color: "#1d4ed8" }}>
                  Number Configuration
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div className="fb-field" style={{ marginBottom: 0 }}>
                    <label className="fb-label">Min (optional)</label>
                    <input
                      className="fb-input"
                      type="number"
                      value={numberMin}
                      onChange={(e) => setNumberMin(e.target.value)}
                      placeholder="No minimum"
                    />
                  </div>
                  <div className="fb-field" style={{ marginBottom: 0 }}>
                    <label className="fb-label">Max (optional)</label>
                    <input
                      className="fb-input"
                      type="number"
                      value={numberMax}
                      onChange={(e) => setNumberMax(e.target.value)}
                      placeholder="No maximum"
                    />
                  </div>
                  {/* <div className="fb-field" style={{ marginBottom: 0 }}>
                    <label className="fb-label">Step</label>
                    <select
                      className="fb-select"
                      value={numberStep}
                      onChange={(e) => setNumberStep(e.target.value)}
                    >
                      <option value="1">Whole Number</option>
                      <option value="any">Decimal</option>
                    </select>
                  </div> */}
                </div>
              </div>
            )}

            {/* ── Date/Time configuration ── */}
            {type === "datetime" && (
              <div
                style={{
                  background: "#fffbeb",
                  padding: "15px",
                  borderRadius: "8px",
                  border: "1px solid #f59e0b",
                }}
              >
                <p className="fb-options-title" style={{ color: "#92400e" }}>
                  Date/Time Type
                </p>
                <div className="fb-field" style={{ marginBottom: 0 }}>
                  <label className="fb-label">Input type</label>
                  <select
                    className="fb-select"
                    value={dateTimeType}
                    onChange={(e) => setDateTimeType(e.target.value)}
                  >
                    <option value="date">Date only (MM/DD/YYYY)</option>
                    <option value="time">Time only (HH:MM)</option>
                    <option value="datetime-local">Date and Time</option>
                    {/* <option value="month">Month and Year</option>
                    <option value="week">Week (Week 1-52)</option> */}
                  </select>
                </div>
              </div>
            )}

            {/* ── Conditional logic ── */}
            {/*
              The condition dropdown only lists OTHER questions that appear
              BEFORE this question in the array (you can't condition on a
              question that comes after). We exclude sections and the question
              itself from the list.
            */}
            <div className="fb-condition-panel">
              <p className="fb-condition-title">
                ⚡ Conditional Logic — Optional
              </p>

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
                  {/* Filter out sections and this question itself from the dropdown */}
                  {questions.filter(
                    (q) => q.type !== "section" && q.id !== question.id,
                  ).length === 0 ? (
                    <p className="fb-condition-hint">
                      No other questions available to condition on.
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
                            setConditionType("equals");
                            setConditionValue("");
                          }}
                        >
                          <option value="">-- Select a question --</option>
                          {(() => {
                            let counter = 0;
                            return questions
                              .filter(
                                (q) =>
                                  q.type !== "section" && q.id !== question.id,
                              )
                              .map((q) => {
                                counter++;
                                return (
                                  <option key={q.id} value={q.id}>
                                    Q{counter}: {q.text} ({q.type})
                                  </option>
                                );
                              });
                          })()}
                        </select>
                      </div>

                      {conditionQuestionId &&
                        (() => {
                          const selectedQ = questions.find(
                            (q) => q.id == conditionQuestionId,
                          );
                          if (!selectedQ) return null;

                          const allowedConditionTypes =
                            getAllowedConditionTypes(selectedQ.type);
                          const effectiveConditionType =
                            allowedConditionTypes.includes(conditionType)
                              ? conditionType
                              : "equals";

                          return (
                            <>
                              <div
                                className="fb-field"
                                style={{ marginBottom: 0 }}
                              >
                                <label className="fb-label">
                                  Condition type
                                </label>
                                <select
                                  className="fb-select"
                                  value={effectiveConditionType}
                                  onChange={(e) => {
                                    setConditionType(e.target.value);
                                    setConditionValue("");
                                  }}
                                >
                                  <option value="equals">Answer equals</option>
                                  <option value="not_equals">
                                    Answer does NOT equal
                                  </option>
                                  {selectedQ.type === "multiple_choice" && (
                                    <>
                                      <option value="contains">
                                        Selected answers contain
                                      </option>
                                      <option value="not_contains">
                                        Selected answers do NOT contain
                                      </option>
                                    </>
                                  )}
                                  <option value="is_answered">
                                    Question is answered (any value)
                                  </option>
                                </select>
                              </div>

                              {effectiveConditionType !== "is_answered" && (
                                <div
                                  className="fb-field"
                                  style={{ marginBottom: 0 }}
                                >
                                  <label className="fb-label">
                                    {effectiveConditionType === "contains" ||
                                    effectiveConditionType === "not_contains"
                                      ? "Option"
                                      : "Value"}
                                  </label>
                                  {selectedQ.type === "text" ||
                                  selectedQ.type === "email" ? (
                                    <input
                                      className="fb-input"
                                      type="text"
                                      value={conditionValue}
                                      onChange={(e) =>
                                        setConditionValue(e.target.value)
                                      }
                                      placeholder="Enter expected answer"
                                    />
                                  ) : selectedQ.type === "number" ? (
                                    <input
                                      className="fb-input"
                                      type="number"
                                      value={conditionValue}
                                      onChange={(e) =>
                                        setConditionValue(e.target.value)
                                      }
                                      placeholder="Enter expected number"
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
                                </div>
                              )}
                            </>
                          );
                        })()}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Action buttons ── */}
        <div style={{ display: "flex", gap: "12px", paddingTop: "4px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              fontSize: "0.95em",
              background: "#f0f0f0",
              color: "#555",
              border: "1px solid #ddd",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              flex: 1,
              padding: "12px",
              fontSize: "0.95em",
              background: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FormBuilder — main component
// ─────────────────────────────────────────────────────────────────────────────
// The only changes to FormBuilder itself are:
//   1. A new `editingQuestion` state variable (null = modal closed)
//   2. An `openEditModal` function that sets editingQuestion
//   3. A `saveEdit` function that updates the question in the array
//   4. Rendering <EditQuestionModal> when editingQuestion is not null
//   5. Passing `onEdit={openEditModal}` to each <SortableQuestionRow>
// Everything else is IDENTICAL to before.
// ─────────────────────────────────────────────────────────────────────────────
function FormBuilder({ editFormId = null, onSaveComplete = null, showToast, isSuperAdmin = false }) {
  const navigate = useNavigate();
  // ── All the original state variables (unchanged) ─────────────────────────
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
  // const [numberStep, setNumberStep] = useState("1");
  const [dateTimeType, setDateTimeType] = useState("date");

  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");

  const [stepMode, setStepMode] = useState(false);

  // ── NEW: which question is currently being edited (null = modal closed) ──
  // When this is null, the modal doesn't render at all.
  // When the user clicks "Edit" on a question card, we set this to that
  // question object, which causes the modal to appear with that question's data.
  const [editingQuestion, setEditingQuestion] = useState(null);

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
      showToast(
        "That order isn't allowed: a conditional question must stay below the question it depends on.",
        "error",
      );
      return;
    }
    setQuestions(reordered);
  }

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
        apiUrl(`/get_form_details.php?id=${formId}${isSuperAdmin ? '&admin_override=1' : ''}`),
      );
      const result = await response.json();

      if (result.success) {
        const form = result.form;
        setFormTitle(form.title);
        setFormDescription(form.description || "");
        setSelectedCategoryId(parseInt(form.category_id));
        setStepMode(form.step_mode == 1);

        setQuestions(
          form.questions.map((q) => ({
            id: q.id,
            text: q.question_text,
            type: q.question_type,
            options: q.options || [],
            rating_scale: q.rating_scale || null,
            number_min: q.number_min || null,
            number_max: q.number_max || null,
            // number_step: q.number_step || "1",
            datetime_type: q.datetime_type || "date",
            is_required: q.is_required !== undefined ? q.is_required : 1,
            condition_question_id: q.condition_question_id || null,
            condition_type: q.condition_type || "equals",
            condition_value: q.condition_value || null,
            description: q.description || null,
          })),
        );
      } else {
        showToast(
          "Failed to load form: " + (result.error || "Unknown error"),
          "error",
        );
      }
    } catch (error) {
      showToast("Failed to load form: " + error.message, "error");
    } finally {
      setLoadingForm(false);
    }
  }

  // ── NEW: openEditModal ─────────────────────────────────────────────────────
  // Called when the user clicks the "Edit" button on any question card.
  // We store the question in `editingQuestion` state. React then re-renders,
  // sees that editingQuestion is not null, and renders the modal.
  function openEditModal(question) {
    setEditingQuestion(question);
  }

  // ── NEW: saveEdit ──────────────────────────────────────────────────────────
  // Called by EditQuestionModal when the user clicks "Save Changes".
  // `updatedQuestion` is the fully assembled question object from the modal.
  //
  // We use .map() to walk through the questions array.
  // For every question whose id matches, we return the updated version.
  // For every other question, we return it unchanged.
  // This creates a BRAND NEW array (React requires immutable state updates),
  // which triggers a re-render showing the changes.
  function saveEdit(updatedQuestion) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q)),
    );
    setEditingQuestion(null); // close the modal
    showToast("Question updated.", "success");
  }

  function addQuestion() {
    if (newQuestionText.trim() === "") {
      showToast("Please enter a question.", "warning");
      return;
    }

    if (
      (newQuestionType === "multiple_choice" ||
        newQuestionType === "checkbox") &&
      tempOptions.length === 0
    ) {
      showToast(
        "Please add at least one option for this question type.",
        "warning",
      );
      return;
    }

    if (
      newQuestionType === "rating" &&
      ratingScale === "custom" &&
      customRatingOptions.length === 0
    ) {
      showToast(
        "Please add at least one rating option for custom scale.",
        "warning",
      );
      return;
    }

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

    const parsedMin = numberMin !== "" ? parseFloat(numberMin) : null;

    const parsedMax = numberMax !== "" ? parseFloat(numberMax) : null;

    if (parsedMin !== null && parsedMax !== null && parsedMin > parsedMax) {
      showToast(
        "Minimum value cannot be greater than maximum value.",
        "warning",
      );
      return;
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
      // number_step: newQuestionType === "number" ? numberStep : null,
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
    setDateTimeType("date");
    showToast("Question added.", "success");
  }

  function addSection() {
    if (newSectionTitle.trim() === "") {
      showToast("Please enter a section title.", "warning");
      return;
    }

    const newSection = {
      id: "s_" + Date.now(),
      type: "section",
      text: newSectionTitle,
      description: newSectionDescription.trim(),
      options: [],
      is_required: 0,
      condition_question_id: null,
      condition_type: null,
      condition_value: null,
      rating_scale: null,
      number_min: null,
      number_max: null,
      // number_step: null,
      datetime_type: null,
    };

    setQuestions([...questions, newSection]);
    setNewSectionTitle("");
    setNewSectionDescription("");
    showToast("Section added.", "success");
  }

  function addOption() {
    if (newOption.trim() === "") {
      showToast("Please enter an option.", "warning");
      return;
    }
    setTempOptions([...tempOptions, newOption]);
    setNewOption("");
  }

  function removeOption(index) {
    const updated = tempOptions.filter((_, i) => i !== index);
    setTempOptions(updated);
  }

  function deleteQuestion(questionId) {
    const target = questions.find((q) => q.id === questionId);
    const updated = questions.filter((q) => q.id !== questionId);
    setQuestions(updated);
    showToast(
      target?.type === "section" ? "Section deleted." : "Question deleted.",
      "warning",
    );
  }

  function canonicalConditionParentId(q) {
    const raw = q.condition_question_id;
    if (raw == null || raw === "") return null;
    const parent = questions.find((p) => p.id == raw);
    return parent ? parent.id : raw;
  }

  async function saveForm() {
    if (formTitle.trim() === "") {
      showToast("Please enter a form title.", "warning");
      return;
    }

    if (questions.length === 0) {
      showToast("Please add at least one question.", "warning");
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
      // number_step: q.number_step ?? null,
      datetime_type: q.datetime_type ?? null,
      description: q.description ?? null,
      condition_question_id: canonicalConditionParentId(q),
      condition_type: q.condition_type ?? "equals",
      condition_value: q.condition_value ?? null,
    }));

    const formData = {
      title: formTitle,
      description: formDescription,
      privacy_notice: 1,
      step_mode: stepMode ? 1 : 0,
      category_id: selectedCategoryId,
      questions: normalizedQuestions,
    };

    if (isEditMode && editFormId) {
      formData.form_id = editFormId;
    }

    // Allow backend Super Admin bypass when applicable
    if (isSuperAdmin) {
      formData.admin_override = 1;
    }

    try {
      const endpoint = isEditMode
        ? apiUrl("/update_form.php")
        : apiUrl("/save_form.php");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const raw = await response.text();
      let result;
      try {
        result = JSON.parse(raw);
      } catch {
        console.error("Non-JSON response from server:", raw);
        throw new Error(
          "Server returned non-JSON. Check console for raw response.",
        );
      }

      if (result.success) {
        showToast(
          isEditMode
            ? "Form updated successfully!"
            : "Form saved successfully! Form ID: " + result.form_id,
          "success",
        );

        if (isEditMode && onSaveComplete) {
          onSaveComplete();
        } else {
          navigate("/");
        }
      } else {
        showToast(
          "Error saving form: " + (result.error || "Unknown error"),
          "error",
        );
      }
    } catch (error) {
      showToast("Failed to connect to server: " + error.message, "error");
      console.error("Error:", error);
    }
  }

  const hasSections = questions.some((q) => q.type === "section");

  return (
    <div className="fb-shell">
      {/* Loading overlay */}
      {loadingForm && (
        <div
          className="fb-paper"
          style={{ textAlign: "center", color: "#aaa" }}
        >
          Loading form data...
        </div>
      )}

      {/* ── NEW: Edit question modal ─────────────────────────────────────────
        The pattern `{editingQuestion && <Component />}` is called
        "conditional rendering". When editingQuestion is null (falsy),
        React renders nothing. When it becomes an object (truthy), React
        mounts EditQuestionModal fresh — which means useState in that
        component initialises from the new question's data every time.
        When the modal closes (editingQuestion becomes null again),
        React UNMOUNTS it entirely, discarding all its state.
        This is exactly the right behaviour: next time you open a different
        question for editing, you get a clean slate pre-filled with that
        question's data, not leftover values from the previous edit.
      ──────────────────────────────────────────────────────────────────── */}
      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          questions={questions}
          onSave={saveEdit}
          onClose={() => setEditingQuestion(null)}
        />
      )}

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
          <label className="fb-label">Privacy Notice</label>
          <div
            style={{
              marginTop: "12px",
              background: "#f7f8fc",
              border: "1px solid #e0e4f0",
              borderRadius: "8px",
              padding: "14px 16px",
            }}
          >
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: "0.75em",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#a0b4f0",
              }}
            >
              🔒 Required on all forms — what respondents will see
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "0.82em",
                color: "#555",
                lineHeight: "1.6",
              }}
            >
              By submitting this form, you consent to the collection and
              processing of your personal information in accordance with the
              Data Privacy Act of 2012 (Republic Act No. 10173) of the
              Philippines...
            </p>
            <p
              style={{ margin: "8px 0 0 0", fontSize: "0.78em", color: "#aaa" }}
            >
              Full statement shown to respondents in the popup.
            </p>
          </div>
        </div>

        <div className="fb-field" >
          <label className="fb-label">Step Mode</label>
          <label className="fb-toggle-row">
            <input
              type="checkbox"
              checked={stepMode}
              onChange={(e) => setStepMode(e.target.checked)}
            />
            <span className="fb-toggle-label">Enable multi-step form</span>
            <span className="fb-toggle-hint">
              Section blocks become step boundaries
            </span>
          </label>

          {stepMode && (
            <div
              style={{
                marginTop: "12px",
                borderRadius: "8px",
                padding: "14px 16px",
                background: hasSections ? "#f0f9ff" : "#fffbf0",
                border: hasSections ? "1px solid #a0b4f0" : "1px solid #f0d080",
              }}
            >
              {!hasSections ? (
                <>
                  <p
                    style={{
                      margin: "0 0 6px 0",
                      fontSize: "0.78em",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#a07800",
                    }}
                  >
                    ⚠️ No section blocks yet
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.82em",
                      color: "#7a5800",
                      lineHeight: "1.5",
                    }}
                  >
                    Step mode is on but your form has no section blocks. Add
                    section blocks below to define where each step begins.
                  </p>
                </>
              ) : (
                <>
                  <p
                    style={{
                      margin: "0 0 6px 0",
                      fontSize: "0.78em",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#3a5fc8",
                    }}
                  >
                    🪜 Step mode active
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.82em",
                      color: "#333",
                      lineHeight: "1.5",
                    }}
                  >
                    This form will have{" "}
                    <strong>
                      {(() => {
                        const firstSectionIdx = questions.findIndex(
                          (q) => q.type === "section",
                        );
                        const questionsBeforeFirst = questions
                          .slice(0, firstSectionIdx)
                          .filter((q) => q.type !== "section").length;
                        const sectionCount = questions.filter(
                          (q) => q.type === "section",
                        ).length;
                        return (
                          sectionCount + (questionsBeforeFirst > 0 ? 1 : 0)
                        );
                      })()}{" "}
                      steps
                    </strong>
                    . Each section block marks the start of a new step.
                  </p>
                </>
              )}
            </div>
          )}
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

      {/* ── Zone 2A: Add section block ── */}
      <div className="fb-paper">
        <p className="fb-section-title">Add Section</p>
        <p
          style={{
            fontSize: "0.85em",
            color: "#888",
            marginTop: "-12px",
            marginBottom: "18px",
          }}
        >
          Section blocks act as visual dividers between groups of questions.
          They collect no answer.
          {stepMode && (
            <strong style={{ color: "#3a5fc8" }}>
              {" "}
              In step mode, each section block marks the start of a new step.
            </strong>
          )}
        </p>

        <div className="fb-field">
          <label className="fb-label">Section Title</label>
          <input
            className="fb-input"
            type="text"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="e.g. Employment Details"
          />
        </div>

        <div className="fb-field">
          <label className="fb-label">Description (optional)</label>
          <textarea
            className="fb-textarea"
            value={newSectionDescription}
            onChange={(e) => setNewSectionDescription(e.target.value)}
            placeholder="Optional subtitle or instruction for this section"
          />
        </div>

        <button className="fb-btn-section" onClick={addSection}>
          + Add Section Block
        </button>
      </div>

      {/* ── Zone 2B: Add question ── */}
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
                        setConditionType("equals");
                        setConditionValue("");
                      }}
                    >
                      <option value="">-- Select a question --</option>
                      {(() => {
                        let counter = 0;
                        return questions
                          .filter((q) => q.type !== "section")
                          .map((q) => {
                            counter++;
                            return (
                              <option key={q.id} value={q.id}>
                                Q{counter}: {q.text} ({q.type})
                              </option>
                            );
                          });
                      })()}
                    </select>
                  </div>

                  {conditionQuestionId &&
                    (() => {
                      const selectedQ = questions.find(
                        (q) => q.id == conditionQuestionId,
                      );
                      if (!selectedQ) return null;
                      const allowedConditionTypes = getAllowedConditionTypes(
                        selectedQ.type,
                      );
                      const effectiveConditionType =
                        allowedConditionTypes.includes(conditionType)
                          ? conditionType
                          : "equals";
                      return (
                        <>
                          <div className="fb-field" style={{ marginBottom: 0 }}>
                            <label className="fb-label">Condition type</label>
                            <select
                              className="fb-select"
                              value={effectiveConditionType}
                              onChange={(e) => {
                                setConditionType(e.target.value);
                                setConditionValue("");
                              }}
                            >
                              <option value="equals">Answer equals</option>
                              <option value="not_equals">
                                Answer does NOT equal
                              </option>
                              {selectedQ.type === "multiple_choice" && (
                                <>
                                  <option value="contains">
                                    Selected answers contain
                                  </option>
                                  <option value="not_contains">
                                    Selected answers do NOT contain
                                  </option>
                                </>
                              )}
                              <option value="is_answered">
                                Question is answered (any value)
                              </option>
                            </select>
                          </div>

                          {effectiveConditionType !== "is_answered" && (
                            <div
                              className="fb-field"
                              style={{ marginBottom: 0 }}
                            >
                              <label className="fb-label">
                                {effectiveConditionType === "contains" ||
                                effectiveConditionType === "not_contains"
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
                            </div>
                          )}

                          <p
                            className="fb-condition-hint"
                            style={{ margin: 0 }}
                          >
                            {effectiveConditionType === "equals" &&
                              "Shows when answer exactly matches the value above."}
                            {effectiveConditionType === "not_equals" &&
                              "Shows when answer does NOT match the value above."}
                            {effectiveConditionType === "contains" &&
                              "Shows when the selected answers include the option above."}
                            {effectiveConditionType === "not_contains" &&
                              "Shows when the selected answers do not include the option above."}
                            {effectiveConditionType === "is_answered" &&
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
                        showToast("Please enter an option.", "warning");
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
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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
                    style={{ padding: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }}
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
                    style={{ padding: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }}
                  />
                </label>
              </div>
              {/* <div>
                <label>
                  <strong>Step:</strong>
                  <br />
                  <select
                    value={numberStep}
                    onChange={(e) => setNumberStep(e.target.value)}
                    style={{ padding: "8px", fontSize: "14px", width: "100%" }}
                  >
                    <option value="1">Whole Number</option>
                    <option value="any">Decimal</option>
                  </select>
                </label>
              </div> */}
            </div>
          </div>
        )}

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
                  {/* <option value="month">Month and Year (MM/YYYY)</option>
                  <option value="week">Week (Week 1-52)</option> */}
                </select>
              </label>
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
            Use the ⋮⋮ handle to drag questions into order. Click{" "}
            <strong>Edit</strong> on any question to change its details.
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
              {(() => {
                let questionCounter = 0;
                return questions.map((question) => {
                  if (question.type !== "section") questionCounter++;
                  return (
                    <SortableQuestionRow
                      key={question.id}
                      question={question}
                      questionIndex={
                        question.type === "section" ? -1 : questionCounter - 1
                      }
                      questions={questions}
                      onDelete={deleteQuestion}
                      onEdit={
                        openEditModal
                      } /* ← NEW: wire up the edit handler */
                    />
                  );
                });
              })()}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* ── Zone 4: Save ── */}
      <div className="fb-save-panel">
        <p className="fb-save-title">Ready to Save?</p>
        <p className="fb-save-count">
          Your form has {questions.filter((q) => q.type !== "section").length}{" "}
          question
          {questions.filter((q) => q.type !== "section").length !== 1
            ? "s"
            : ""}
          {stepMode &&
            hasSections &&
            ` across ${(() => {
              const firstSectionIdx = questions.findIndex(
                (q) => q.type === "section",
              );
              const before = questions
                .slice(0, firstSectionIdx)
                .filter((q) => q.type !== "section").length;
              const sections = questions.filter(
                (q) => q.type === "section",
              ).length;
              return sections + (before > 0 ? 1 : 0);
            })()} steps`}
        </p>
        <button className="fb-btn-save" onClick={saveForm}>
          💾 {isEditMode ? "Update Form" : "Save Form to Database"}
        </button>
      </div>
    </div>
  );
}

export default FormBuilder;
