import { useState, useEffect, useRef } from "react";
// ↑ We added `useRef` here. Before, only useState and useEffect were imported.
// useRef gives us a way to point at a specific real HTML element on the page.
// We need this so the QR library knows which <canvas> to draw on.

import { apiUrl } from "./apiBase";
import QRCode from "qrcode";
// ↑ This imports the qrcode library we installed with `npm install qrcode`.
// `QRCode` is the object the library gives us — it has methods like toCanvas().

function FormViewer({ formId, onBack }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── NEW STATE: controls whether the QR modal is visible ──────────────────
  // useState(false) means the modal starts closed.
  // When the user clicks "Show QR", we call setShowQrModal(true).
  // When they click Close, we call setShowQrModal(false).
  // React re-renders the component every time state changes, so the modal
  // appears and disappears automatically based on this single boolean.
  const [showQrModal, setShowQrModal] = useState(false);

  // ── NEW REF: points at the <canvas> element inside the modal ─────────────
  // useRef(null) starts with no reference (null = nothing yet).
  // Once React renders the <canvas ref={qrCanvasRef} /> below,
  // qrCanvasRef.current becomes the actual HTML canvas element.
  // We pass that to QRCode.toCanvas() to tell it where to draw.
  const qrCanvasRef = useRef(null);

  // ── EXISTING HELPER FUNCTIONS (unchanged) ────────────────────────────────

  function slugifyTitle(title) {
    if (!title) return "form";
    const slug = String(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "form";
  }

  function buildPublicUrl() {
    const rawCode = form?.form_code;
    const uniqueCode = rawCode
      ? rawCode.includes("-")
        ? rawCode.split("-").pop()
        : rawCode
      : null;
    const slug = form?.title ? slugifyTitle(form.title) : null;

    if (slug && uniqueCode) {
      return `${window.location.origin}/form/${slug}-${uniqueCode}`;
    }

    return `${window.location.origin}/form/${rawCode || formId}`;
  }

  async function copyPublicLink() {
    const publicUrl = buildPublicUrl();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
        alert("Link copied!\n\n" + publicUrl);
        return;
      }
      throw new Error("Clipboard API unavailable");
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = publicUrl;
        textarea.setAttribute("readonly", "");
        textarea.style.cssText = "position:fixed;top:0;left:0;opacity:0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        alert(
          ok
            ? "Link copied!\n\n" + publicUrl
            : "Copy failed. Copy manually:\n\n" + publicUrl,
        );
      } catch {
        alert("Copy failed. Copy manually:\n\n" + publicUrl);
      }
    }
  }

  // ── NEW FUNCTION: downloads the QR code as a PNG image ──────────────────
  // When the user clicks "Download QR", this function runs.
  // It reads the pixel data already drawn on the canvas and converts it
  // to a PNG file that the browser downloads automatically.
  //
  // How it works step by step:
  // 1. canvas.toDataURL("image/png") converts the canvas drawing into a
  //    base64-encoded string — essentially a text representation of the image.
  //    It looks like: "data:image/png;base64,iVBORw0KGgoAAAANS..."
  // 2. We create a temporary invisible <a> (link) element.
  // 3. We set its href to that base64 string and its download attribute to
  //    a filename. The download attribute tells the browser "when clicked,
  //    save this as a file instead of navigating to it."
  // 4. We programmatically click the link, then remove it.
  // The user never sees the link — it just triggers the file download.
  function handleDownloadQr() {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-${form?.title || "form"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ── NEW EFFECT: generates the QR code when the modal opens ───────────────
  // useEffect runs *after* React has rendered the component to the screen.
  // We need this timing because the <canvas> element only exists in the DOM
  // after React renders it — we can't draw on something that doesn't exist yet.
  //
  // The dependency array [showQrModal, form] at the end means:
  // "Run this effect whenever showQrModal or form changes."
  // So it runs when the modal opens (showQrModal goes from false to true)
  // and when the form data first loads.
  //
  // Inside the effect, we check:
  // 1. Is the modal actually open? (showQrModal === true)
  // 2. Does the canvas ref point at a real element? (qrCanvasRef.current)
  // 3. Do we have form data to build the URL from? (form)
  // Only if all three are true do we ask the library to draw.
  useEffect(() => {
    if (!showQrModal || !qrCanvasRef.current || !form) return;

    const publicUrl = buildPublicUrl();

    QRCode.toCanvas(qrCanvasRef.current, publicUrl, {
      width: 260,          // canvas size in pixels (the QR code fills this)
      margin: 2,           // quiet zone (white border) around the QR — measured in "modules" (the small squares)
      color: {
        dark: "#1a1a2e",   // the dark squares — we use the app's dark navy instead of pure black
        light: "#ffffff",  // the light squares — white
      },
      errorCorrectionLevel: "M",
      // ↑ QR codes have built-in redundancy so they still scan even if
      // part of the image is damaged or obscured. "M" = medium redundancy
      // (can recover if ~15% of the code is damaged). Options are L, M, Q, H.
      // Higher = more redundant but more visually complex (denser squares).
    });
  }, [showQrModal, form]);
  // ↑ This array is the "dependency list". React watches these values.
  // When any of them change, the effect re-runs.

  // ── EXISTING DATA FETCHING (unchanged) ──────────────────────────────────

  async function fetchFormDetails() {
    try {
      const response = await fetch(
        apiUrl(`/get_form_details.php?id=${formId}`),
      );
      const result = await response.json();
      if (result.success) {
        setForm(result.form);
      } else {
        setError(result.error || "Failed to load form");
      }
    } catch (err) {
      setError("Could not connect to server: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (formId) fetchFormDetails();
  }, [formId]);

  // ── Loading / error / empty guards (unchanged) ───────────────────────────

  if (loading) {
    return (
      <div className="fv-shell">
        <p className="fv-meta">Loading form...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fv-shell">
        <div className="fv-paper">
          <p style={{ color: "#c0392b" }}>{error}</p>
          <button className="glass-button" onClick={onBack}>
            ← Back to List
          </button>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="fv-shell">
        <p className="fv-meta">Form not found.</p>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="fv-shell">

      {/* ── QR Code Modal ─────────────────────────────────────────────────
          This only renders when showQrModal is true.
          The pattern `{showQrModal && <JSX />}` is React's way of saying
          "only put this in the DOM if the condition is true."
          When showQrModal becomes false, React removes this entire block
          from the page — not just hides it, actually removes it.
      ──────────────────────────────────────────────────────────────────── */}
      {showQrModal && (
        <div
          // This outer div is the dark overlay that covers the whole page.
          // position: fixed means it stays in place even when you scroll.
          // width/height 100% + top/left 0 makes it cover the entire screen.
          // The semi-transparent background dims the content behind it.
          // zIndex: 1000 puts it on top of everything else on the page.
          // display flex + alignItems/justifyContent center puts the
          // white card exactly in the middle of the screen.
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
            zIndex: 1000,
            padding: "20px",
            boxSizing: "border-box",
          }}
          // Clicking the dark overlay itself (not the white card) closes the modal.
          // This is a common UX pattern — clicking "outside" dismisses a popup.
          onClick={() => setShowQrModal(false)}
        >
          <div
            // The white card in the center.
            // onClick with e.stopPropagation() prevents the click from
            // "bubbling up" to the overlay div above.
            // Without this, clicking anywhere inside the card would also
            // trigger the overlay's onClick and close the modal immediately.
            // "Event bubbling" means a click travels up through parent elements
            // triggering their onClick handlers too — stopPropagation stops that.
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "36px 32px",
              maxWidth: "360px",
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {/* Modal title */}
            <h2 style={{
              margin: 0,
              fontSize: "1.2em",
              color: "#1a1a2e",
              fontWeight: 700,
              alignSelf: "flex-start",
            }}>
              QR Code
            </h2>

            {/* Form title as a subtitle so the admin knows which form this is for */}
            <p style={{
              margin: 0,
              fontSize: "0.85em",
              color: "#888",
              alignSelf: "flex-start",
              marginTop: "-10px",
            }}>
              {form.title}
            </p>

            {/* The canvas element where the QR library draws the code.
                ref={qrCanvasRef} is how we connect the ref to this element.
                After React renders this, qrCanvasRef.current === this canvas.
                The useEffect above then calls QRCode.toCanvas(qrCanvasRef.current, ...)
                which draws the QR code onto it.
                style={{ display: "block" }} prevents a small gap that appears
                below inline canvas elements due to how browsers handle
                inline elements (they sit on a text baseline, leaving space
                for descenders like 'g' and 'y'). Block removes that gap. */}
            <canvas
              ref={qrCanvasRef}
              style={{
                display: "block",
                borderRadius: "12px",
                border: "1px solid #e8ecf4",
              }}
            />

            {/* The URL the QR points to, shown as small text so the admin
                can verify it's correct before sharing */}
            <p style={{
              margin: 0,
              fontSize: "0.72em",
              color: "#aaa",
              wordBreak: "break-all",  // long URLs would overflow without this
              textAlign: "center",
              lineHeight: "1.5",
            }}>
              {buildPublicUrl()}
            </p>

            {/* Action buttons row */}
            <div style={{
              display: "flex",
              gap: "10px",
              width: "100%",
            }}>
              {/* Download button — calls our handleDownloadQr function */}
              <button
                onClick={handleDownloadQr}
                style={{
                  flex: 1,
                  padding: "11px",
                  fontSize: "0.9em",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                ⬇ Download
              </button>

              {/* Close button — sets showQrModal back to false,
                  which removes the modal from the DOM */}
              <button
                onClick={() => setShowQrModal(false)}
                style={{
                  flex: 1,
                  padding: "11px",
                  fontSize: "0.9em",
                  background: "#f0f0f0",
                  color: "#555",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Action bar (updated: Show QR button added) ────────────────────── */}
      <div className="fv-action-bar">
        <button
          className="glass-button"
          style={{ backgroundColor: "rgba(100,100,100,0.40)" }}
          onClick={onBack}
        >
          ← Back
        </button>
        <button
          className="glass-button"
          style={{ backgroundColor: "rgba(46,204,113,0.55)" }}
          onClick={() => {
            const publicUrl = buildPublicUrl();
            window.open(publicUrl, "_blank");
          }}
        >
          📝 Fill Out
        </button>
        <button
          className="glass-button"
          style={{ backgroundColor: "rgba(52,152,219,0.55)" }}
          onClick={copyPublicLink}
        >
          🔗 Copy Link
        </button>

        {/* ── NEW: Show QR button ───────────────────────────────────────────
            Clicking this sets showQrModal to true.
            React re-renders the component, and since showQrModal is now true,
            the {showQrModal && <modal JSX />} block above now renders.
            The useEffect watching showQrModal then fires and draws the QR code. */}
        <button
          className="glass-button"
          style={{ backgroundColor: "rgba(155,89,182,0.55)" }}
          onClick={() => setShowQrModal(true)}
        >
          ⬜ Show QR
        </button>
      </div>

      {/* ── fv-paper and all content below is completely unchanged ───────── */}
      <div className="fv-paper">
        <div className="fv-header">
          <div className="fv-title-row">
            <h1 className="fv-title">{form.title}</h1>
            {form.category_name && (
              <span
                className={`category-badge ${form.category_name.toLowerCase()}`}
              >
                {form.category_name}
              </span>
            )}
          </div>

          {form.description && (
            <p className="fv-description">{form.description}</p>
          )}

          <p className="fv-meta">
            Created: {new Date(form.created_at).toLocaleString()}
          </p>
        </div>

        <div className="fv-divider" />

        <div className="fv-questions-header">
          <h2 className="fv-section-title">Questions</h2>
          <span
            style={{ backgroundColor: "#ffffff" }}
            className="fv-question-count"
          >
            {form.question_count}
          </span>
        </div>

        {form.questions.length === 0 ? (
          <p className="fv-meta">No questions in this form yet.</p>
        ) : (
          <div className="fv-question-list">
            {(() => {
              let counter = 0;
              return form.questions.map((question) => {
                if (question.question_type === "section") {
                  return (
                    <div
                      key={question.id}
                      style={{ margin: "30px 0 0 0" }}
                    >
                      <h3
                        style={{
                          margin: "0 0 4px 0",
                          color: "#3a5fc8",
                          fontSize: "1.1em",
                          fontWeight: 700,
                        }}
                      >
                        {question.question_text}
                      </h3>
                      {question.description && (
                        <p style={{ margin: 0, color: "#777", fontSize: "0.85em" }}>
                          {question.description}
                        </p>
                      )}
                    </div>
                  );
                }

                counter++;
                return (
                  <div key={question.id} className="fv-question-card">
                    <div className="fv-question-top">
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          gap: "12px",
                          alignItems: "center",
                        }}
                      >
                        <span className="fv-question-number">Q{counter}</span>
                        <span className="fv-question-text">
                          {question.question_text}
                        </span>
                      </div>
                      <span className="fv-question-type">
                        Type: {question.question_type}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginBottom: "10px",
                      }}
                    >
                      {question.is_required === 1 && (
                        <span className="fv-badge fv-badge-required">
                          Required
                        </span>
                      )}

                      {question.condition_question_id !== null && (
                        <span className="fv-badge fv-badge-condition">
                          {(() => {
                            const referencedIndex = form.questions.findIndex(
                              (q) => q.id === question.condition_question_id,
                            );
                            const label =
                              referencedIndex !== -1
                                ? `Q${referencedIndex + 1}`
                                : "another question";
                            return `Shown when ${label} ${question.condition_type} "${question.condition_value}"`;
                          })()}
                        </span>
                      )}
                    </div>

                    {question.options && question.options.length > 0 && (
                      <div className="fv-options">
                        {question.options.map((option, optIndex) => (
                          <span key={optIndex} className="fv-option-pill">
                            {option}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

export default FormViewer;