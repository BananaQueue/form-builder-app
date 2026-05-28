export default function ActionButtons({ onFillOut, onCopyLink, onShowQr, className = "" }) {
  return (
    <div className={`action-buttons ${className}`.trim()}>
      <button type="button" className="glass-button glass-button--fill" onClick={onFillOut}>
        📝 <span>Fill Out</span>
      </button>
      <button type="button" className="glass-button glass-button--share" onClick={onCopyLink}>
        🔗 <span>Copy Link</span>
      </button>
      <button type="button" className="glass-button glass-button--qr" onClick={onShowQr}>
        ⬜ <span>Show QR</span>
      </button>
    </div>
  );
}
