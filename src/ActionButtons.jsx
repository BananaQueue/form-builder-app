export default function ActionButtons({
  onFillOut,
  onCopyLink,
  onShowQr,
  onDuplicate,
  duplicateDisabled = false,
  className = "",
}) {
  return (
    <div className={`action-buttons ${className}`.trim()}>
      <button
        type="button"
        className="glass-button glass-button--fill"
        onClick={onFillOut}
        aria-label="Fill out form"
      >
        <span className="action-button-icon" aria-hidden="true">&#128221;</span>
        <span className="action-button-label">Fill Out</span>
      </button>
      <button
        type="button"
        className="glass-button glass-button--share"
        onClick={onCopyLink}
        aria-label="Copy form link"
      >
        <span className="action-button-icon" aria-hidden="true">&#128279;</span>
        <span className="action-button-label">Copy Link</span>
      </button>
      <button
        type="button"
        className="glass-button glass-button--qr"
        onClick={onShowQr}
        aria-label="Show QR code"
      >
        <span className="action-button-icon" aria-hidden="true">&#9635;</span>
        <span className="action-button-label">Show QR</span>
      </button>
      <button
        type="button"
        className="glass-button glass-button--duplicate"
        onClick={onDuplicate}
        disabled={duplicateDisabled}
        aria-label="Duplicate form"
      >
        <span className="action-button-icon" aria-hidden="true">&#10697;</span>
        <span className="action-button-label">
          {duplicateDisabled ? "Duplicating..." : "Duplicate"}
        </span>
      </button>
    </div>
  );
}
