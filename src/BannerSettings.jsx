import { useState } from 'react'
import { apiUrl } from './apiBase'

function BannerSettings({ showToast }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [cacheBust, setCacheBust] = useState(() => Date.now())
  const [currentExists, setCurrentExists] = useState(true)

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    if (f.type !== 'image/png') {
      showToast('Please select a PNG file.', 'warning')
      e.target.value = ''
      return
    }
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  async function handleUpload() {
    if (!file) {
      showToast('Please select a PNG file first.', 'warning')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('banner', file)
      const response = await fetch(apiUrl('/upload_banner.php'), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const result = await response.json()
      if (result.success) {
        showToast('Banner uploaded successfully.', 'success')
        setFile(null)
        setPreviewUrl(null)
        setCurrentExists(true)
        setCacheBust(Date.now())
      } else {
        showToast(result.error || 'Upload failed.', 'error')
      }
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bs-shell">
      <h2 className="bs-heading">Banner Settings</h2>

      {/* Current banner */}
      <div className="bs-card">
        <h3 className="bs-card-title">Current Banner</h3>
        {currentExists ? (
          <img
            key={cacheBust}
            src={`${apiUrl('/uploads/banner.png')}?t=${cacheBust}`}
            alt="Current agency banner"
            className="bs-banner-preview"
            onError={() => setCurrentExists(false)}
          />
        ) : (
          <p className="bs-empty">No banner uploaded yet.</p>
        )}
      </div>

      {/* Upload */}
      <div className="bs-card">
        <h3 className="bs-card-title">Upload New Banner</h3>
        <p className="bs-hint">PNG only. The uploaded image will replace the current banner on all forms immediately.</p>

        {previewUrl && (
          <div className="bs-preview-wrap">
            <p className="bs-preview-label">Preview</p>
            <img src={previewUrl} alt="New banner preview" className="bs-banner-preview" />
          </div>
        )}

        <input
          type="file"
          accept=".png,image/png"
          onChange={handleFileChange}
          className="bs-file-input"
        />

        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className={`bs-upload-btn${uploading || !file ? ' bs-upload-btn--disabled' : ''}`}
        >
          {uploading ? 'Uploading...' : 'Upload Banner'}
        </button>
      </div>
    </div>
  )
}

export default BannerSettings
