import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "./apiBase";
import QRCode from "qrcode";
import ActionButtons from "./ActionButtons";
import { useIsMobile } from "./useIsMobile";

function FormViewer({ formId, showToast, actionsRef, onActionBarOverlapChange, actionsInNavbar, isSuperAdmin = false }) {
  const [form, setForm]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const qrCanvasRef               = useRef(null);
  const actionBarRef              = useRef(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // ── URL helpers (unchanged) ────────────────────────────────────────────────

  function slugifyTitle(title) {
    if (!title) return "form";
    const slug = String(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "form";
  }

  function buildPublicUrl() {
    const rawCode    = form?.form_code;
    const uniqueCode = rawCode
      ? rawCode.includes("-") ? rawCode.split("-").pop() : rawCode
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
        showToast("Link copied to clipboard!", "success");
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
        if (ok) { showToast("Link copied to clipboard!", "success"); }
        else    { showToast("Copy failed. Please copy manually: " + publicUrl, "warning"); }
      } catch {
        showToast("Copy failed. Please copy manually: " + publicUrl, "warning");
      }
    }
  }

  // ── QR download (unchanged) ────────────────────────────────────────────────

  function handleDownloadQr() {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link    = document.createElement("a");
    link.href     = dataUrl;
    link.download = `qr-${form?.title || "form"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ── QR canvas drawing (unchanged) ─────────────────────────────────────────

  useEffect(() => {
    if (!showQrModal || !qrCanvasRef.current || !form) return;
    const publicUrl = buildPublicUrl();
    QRCode.toCanvas(qrCanvasRef.current, publicUrl, {
      width: 260,
      margin: 2,
      color: {
        dark:  "#0f0e17",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  }, [showQrModal, form]);

  // ── Data fetching (unchanged) ──────────────────────────────────────────────

  async function fetchFormDetails() {
    try {
      const response = await fetch(apiUrl(`/get_form_details.php?id=${formId}${isSuperAdmin ? '&admin_override=1' : ''}`), { credentials: 'include' });
      const result   = await response.json();
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

  useEffect(() => {
    if (!form || !actionsRef) return;
    actionsRef.current = {
      fillOut:  () => window.open(buildPublicUrl(), '_blank'),
      copyLink: copyPublicLink,
      showQr:   () => setShowQrModal(true),
    };
    return () => { if (actionsRef) actionsRef.current = null; };
  }, [form]);

  useEffect(() => {
    if (!actionBarRef.current || !onActionBarOverlapChange) return;

    // On small/mobile viewports we do not migrate actions into the nav.
    if (isMobile) {
      onActionBarOverlapChange(false);
      return;
    }

    const nav = document.querySelector('.glass-nav');
    if (!nav) return;

    let observer = null;

    const observerOptions = () => ({
      root: null,
      rootMargin: `-${nav.getBoundingClientRect().height}px 0px 0px 0px`,
      threshold: [0],
    });

    function observeActionBar() {
      if (observer) observer.disconnect();
      observer = new IntersectionObserver(([entry]) => {
        onActionBarOverlapChange(!entry.isIntersecting);
      }, observerOptions());
      observer.observe(actionBarRef.current);
    }

    observeActionBar();
    window.addEventListener('resize', observeActionBar);

    return () => {
      window.removeEventListener('resize', observeActionBar);
      if (observer) observer.disconnect();
    };
  }, [form, onActionBarOverlapChange]);

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fv-shell">
        <p className="fv-meta">Loading form…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fv-shell">
        <div className="fv-paper">
          <p className="fv-error-text">{error}</p>
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

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="fv-shell">

      {/* ══════════════════════════════════════════════════════════════════════
          QR CODE MODAL
          ══════════════════════════════════════════════════════════════════════

          The modal only mounts when showQrModal is true.
          When it unmounts (showQrModal becomes false), React discards its DOM,
          so the canvas is cleared. Next time it opens, the useEffect runs
          fresh and draws a new QR code.

          Structure:
            .qr-overlay   — dark backdrop (clicking it closes the modal)
            .qr-modal     — white card (stopPropagation prevents overlay close)
              .qr-title
              .qr-subtitle
              canvas        — the actual QR code
              .qr-url       — the URL shown below the QR code
              .qr-actions   — Download + Close buttons
      ════════════════════════════════════════════════════════════════════════ */}
      {showQrModal && (
        <div
          className="qr-overlay"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="qr-modal"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="qr-modal__header">
              <h2 className="qr-modal__title">QR Code</h2>
              <p className="qr-modal__subtitle">{form.title}</p>
            </div>

            {/* Canvas — the QR library draws here via useEffect */}
            <canvas
              ref={qrCanvasRef}
              className="qr-modal__canvas"
            />

            {/* The URL the QR points to */}
            <p className="qr-modal__url">
              {buildPublicUrl()}
            </p>

            {/* Action buttons */}
            <div className="qr-modal__actions">
              <button
                className="qr-modal__btn qr-modal__btn--download"
                onClick={handleDownloadQr}
              >
                ⬇ Download
              </button>
              <button
                className="qr-modal__btn qr-modal__btn--close"
                onClick={() => setShowQrModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={actionBarRef} className="fv-action-bar">
        {!actionsInNavbar && (
          <>
            {isSuperAdmin && (
              <button className="glass-button glass-button--back" onClick={() => navigate(-1)}>
                ← Back
              </button>
            )}
            <ActionButtons
              onFillOut={() => window.open(buildPublicUrl(), "_blank")}
              onCopyLink={copyPublicLink}
              onShowQr={() => setShowQrModal(true)}
            />
          </>
        )}
      </div>

      <div className="fv-paper">

        {/* Form header */}
        <div className="fv-header">
          <div className="fv-title-row">
            <h1 className="fv-title">{form.title}</h1>
            {form.category_name && (
              <span className={`category-badge ${form.category_name.toLowerCase()}`}>
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

        <hr className="fv-divider" />

        {/* Questions section header */}
        <div className="fv-questions-header">
          <h2 className="fv-section-title">Questions</h2>
          <span className="fv-question-count">{form.question_count}</span>
        </div>

        {/* Questions list */}
        {form.questions.length === 0 ? (
          <p className="fv-meta">No questions in this form yet.</p>
        ) : (
          <div className="fv-question-list">
            {(() => {
              // We use a counter variable to number only real questions,
              // skipping section blocks (they don't get a Q number).
              let counter = 0;

              return form.questions.map((question) => {

                // ── Section block ──────────────────────────────────────────
                if (question.question_type === "section") {
                  return (
                    <div key={question.id} className="fv-section-block">
                      <span className="fv-section-block__label">
                        Section
                      </span>
                      <span className="fv-section-block__title">
                        {question.question_text}
                      </span>
                      {question.description && (
                        <span className="fv-section-block__desc">
                          {question.description}
                        </span>
                      )}
                    </div>
                  );
                }

                // ── Regular question card ──────────────────────────────────
                counter++;
                return (
                  <div key={question.id} className="fv-question-card">

                    {/* Question number + text */}
                    <div className="fv-question-top">
                      <span className="fv-question-number">Q{counter}</span>
                      <span className="fv-question-text">
                        {question.question_text}
                      </span>
                    </div>

                    {/* Type label */}
                    <div className="fv-question-type">
                      {question.question_type}
                    </div>

                    {/* Badges: Required + Condition */}
                    <div className="fv-badge-row">
                      {question.is_required === 1 && (
                        <span className="fv-badge fv-badge-required">
                          Required
                        </span>
                      )}

                      {question.condition_question_id !== null && (
                        <span className="fv-badge fv-badge-condition">
                          {(() => {
                            const referencedIndex = form.questions.findIndex(
                              (q) => q.id === question.condition_question_id
                            );

                            let label;
                            if (referencedIndex === -1) {
                              label = "another question";
                            } else {
                              const visibleNumber = form.questions
                                .slice(0, referencedIndex + 1)
                                .filter((q) => q.question_type !== "section")
                                .length;
                              label = `Q${visibleNumber}`;
                            }

                            return `Shown when ${label} ${question.condition_type} "${question.condition_value}"`;
                          })()}
                        </span>
                      )}
                    </div>

                    {/* Options pills */}
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