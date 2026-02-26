import { useState, useEffect } from "react";

function FormBuilder() {
  // All state declarations
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [questions, setQuestions] = useState([]);

  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState("text");

  const [newOption, setNewOption] = useState("");
  const [tempOptions, setTempOptions] = useState([]);

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(1);

  // Fetch categories when component loads
  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const response = await fetch(
        "http://localhost/form-builder-api/get_categories.php",
      );
      const result = await response.json();

      if (result.success) {
        setCategories(result.categories);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
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

    const newQuestion = {
      id: Date.now(),
      text: newQuestionText,
      type: newQuestionType,
      options: newQuestionType === "text" ? [] : tempOptions,
    };

    setQuestions([...questions, newQuestion]);

    setNewQuestionText("");
    setNewQuestionType("text");
    setTempOptions([]);
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

    const formData = {
      title: formTitle,
      description: formDescription,
      category_id: selectedCategoryId,
      questions: questions,
    };

    try {
      const response = await fetch(
        "http://localhost/form-builder-api/save_form.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        },
      );

      const result = await response.json();

      if (result.success) {
        alert("Form saved successfully! Form ID: " + result.form_id);

        setFormTitle("");
        setFormDescription("");
        setQuestions([]);
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
      <h1>Form Builder</h1>

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
            }}
            style={{ padding: "8px", fontSize: "16px" }}
          >
            <option value="text">Text Input</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="checkbox">Checkbox</option>
          </select>
        </label>
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
    <p><strong>Current options:</strong></p>
    <div style={{ 
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      maxWidth: '700px',
      justifyContent: 'center'
    }}>
      {tempOptions.map((option, index) => (
        <div 
          key={index} 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '8px 12px',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            minWidth: '150px',
            maxWidth: '200px',
            flex: '0 0 auto'
          }}
        >
          <span style={{ marginRight: '10px', wordBreak: 'break-word', color: '#333', fontWeight: '500' }}>
            {option}
          </span>
          <button
            onClick={() => removeOption(index)}
            style={{ 
              padding: '4px 10px', 
              fontSize: '12px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
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
                  </p>

                  {question.options.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>
                        <strong>Options: </strong>{question.options.join(", ")}
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
          💾 Save Form to Database
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
