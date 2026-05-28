export default function ActionButtons({ onFillOut, onCopyLink, onShowQr, className = "" }) {
  return (
    <div className={`action-buttons ${className}`.trim()}>
      <button
        type="button"
        className="glass-button glass-button--fill"
        onClick={onFillOut}
        aria-label="Fill out form"
      >
        📝 <span>Fill Out</span>
      </button>
      <button
        type="button"
        className="glass-button glass-button--share"
        onClick={onCopyLink}
        aria-label="Copy form link"
      >
        🔗 <span>Copy Link</span>
      </button>
      <button
        type="button"
        className="glass-button glass-button--qr"
        onClick={onShowQr}
        aria-label="Show QR code"
      >
        ⬜ <span>Show QR</span>
      </button>
    </div>
  );
}
