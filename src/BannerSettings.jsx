import { useState, useRef, useEffect } from 'react'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { apiUrl } from './apiBase'

function BannerSettings({ showToast }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [cacheBust, setCacheBust] = useState(() => Date.now())
  const [currentExists, setCurrentExists] = useState(true)
  const fileInputRef = useRef(null)

  // Crop state
  const [showCropModal, setShowCropModal] = useState(false)
  const [rawObjectUrl, setRawObjectUrl] = useState(null)
  const [rawFile, setRawFile] = useState(null)
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState()
  const cropImgRef = useRef(null)

  // Revoke object URLs when they change or on unmount
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  useEffect(() => {
    return () => { if (rawObjectUrl) URL.revokeObjectURL(rawObjectUrl) }
  }, [rawObjectUrl])

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    if (f.type !== 'image/png') {
      showToast('Please select a PNG file.', 'warning')
      e.target.value = ''
      return
    }
    if (rawObjectUrl) URL.revokeObjectURL(rawObjectUrl)
    setRawFile(f)
    setRawObjectUrl(URL.createObjectURL(f))
    setCrop(undefined)
    setCompletedCrop(undefined)
    setShowCropModal(true)
  }

  function onImageLoad() {
    // Default to full image selected so the user can just shrink as needed
    setCrop({ unit: '%', x: 0, y: 0, width: 100, height: 100 })
  }

  async function getCroppedBlob() {
    const img = cropImgRef.current
    if (!img || !completedCrop || !completedCrop.width || !completedCrop.height) return null
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(completedCrop.width * scaleX)
    canvas.height = Math.round(completedCrop.height * scaleY)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0,
      canvas.width,
      canvas.height,
    )
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  }

  async function applyCrop() {
    const blob = await getCroppedBlob()
    if (!blob) { applyOriginalImage(); return }
    const croppedFile = new File([blob], rawFile.name, { type: 'image/png' })
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(croppedFile)
    setPreviewUrl(URL.createObjectURL(croppedFile))
    setShowCropModal(false)
  }

  function applyOriginalImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(rawFile)
    setPreviewUrl(URL.createObjectURL(rawFile))
    setShowCropModal(false)
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
        setRawFile(null)
        setRawObjectUrl(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
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

  async function handleRemove() {
    setRemoving(true)
    try {
      const response = await fetch(apiUrl('/remove_banner.php'), {
        method: 'POST',
        credentials: 'include',
      })
      const result = await response.json()
      if (result.success) {
        showToast('Banner removed.', 'success')
        setCurrentExists(false)
      } else {
        showToast(result.error || 'Remove failed.', 'error')
      }
    } catch (err) {
      showToast('Remove failed: ' + err.message, 'error')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="bs-shell">
      <h2 className="bs-heading">Banner Settings</h2>

      {/* ── Crop modal ──────────────────────────────────────────────────────── */}
      {showCropModal && rawObjectUrl && (
        <div className="bs-crop-overlay" onClick={applyOriginalImage}>
          <div className="bs-crop-modal" onClick={e => e.stopPropagation()}>
            <h3 className="bs-crop-title">Crop Banner</h3>
            <p className="bs-crop-hint">
              Drag the handles to trim negative space. Leave the full selection to use the whole image.
            </p>
            <div className="bs-crop-canvas">
              <ReactCrop
                crop={crop}
                onChange={(_, pct) => setCrop(pct)}
                onComplete={(px) => setCompletedCrop(px)}
              >
                <img
                  ref={cropImgRef}
                  src={rawObjectUrl}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  style={{ maxHeight: '60vh', maxWidth: '100%', display: 'block' }}
                />
              </ReactCrop>
            </div>
            <div className="bs-crop-actions">
              <button className="bs-upload-btn" onClick={applyCrop}>
                Apply Crop
              </button>
              <button className="bs-remove-btn" onClick={applyOriginalImage}>
                Use Original
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Current banner ───────────────────────────────────────────────────── */}
      <div className="bs-card">
        <h3 className="bs-card-title">Current Banner</h3>
        {currentExists ? (
          <>
            <img
              key={cacheBust}
              src={`${apiUrl('/uploads/banner.png')}?t=${cacheBust}`}
              alt="Current agency banner"
              className="bs-banner-preview"
              onError={() => setCurrentExists(false)}
            />
            <button
              onClick={handleRemove}
              disabled={removing}
              className={`bs-remove-btn${removing ? ' bs-remove-btn--disabled' : ''}`}
            >
              {removing ? 'Removing…' : 'Remove Banner'}
            </button>
          </>
        ) : (
          <p className="bs-empty">No banner uploaded yet.</p>
        )}
      </div>

      {/* ── Upload ───────────────────────────────────────────────────────────── */}
      <div className="bs-card">
        <h3 className="bs-card-title">Upload New Banner</h3>
        <p className="bs-hint">
          PNG only. The uploaded image will replace the current banner on all forms immediately.
        </p>

        {previewUrl && (
          <div className="bs-preview-wrap">
            <p className="bs-preview-label">Preview</p>
            <img src={previewUrl} alt="New banner preview" className="bs-banner-preview" />
            <button className="bs-recrop-btn" onClick={() => setShowCropModal(true)}>
              Re-crop
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
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
          {uploading ? 'Uploading…' : 'Upload Banner'}
        </button>
      </div>
    </div>
  )
}

export default BannerSettings
