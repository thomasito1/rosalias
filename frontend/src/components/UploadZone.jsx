import { useRef, useState } from 'react'
import styles from './UploadZone.module.css'

export default function UploadZone({ image, onFile, onClear }) {
  const fileRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file?.type.startsWith('image/')) onFile(file)
  }

  return (
    <div
      className={`${styles.zone} ${dragging ? styles.dragging : ''} ${image ? styles.hasImage : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !image && fileRef.current?.click()}
    >
      {image ? (
        <>
          <img src={image.url} className={styles.preview} alt="Screenshot" />
          <button className={styles.clearBtn} onClick={(e) => { e.stopPropagation(); onClear() }}>
            ✕
          </button>
        </>
      ) : (
        <div className={styles.placeholder}>
          <div className={styles.iconRow}>
            <button
              className={styles.iconBtn}
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
            >
              📂
              <span>Photos</span>
            </button>
            <div className={styles.divider} />
            <button
              className={styles.iconBtn}
              onClick={(e) => {
                e.stopPropagation()
                const cam = document.createElement('input')
                cam.type = 'file'
                cam.accept = 'image/*'
                cam.capture = 'environment'
                cam.onchange = (ev) => onFile(ev.target.files?.[0])
                cam.click()
              }}
            >
              📷
              <span>Camera</span>
            </button>
          </div>
          <p className={styles.orText}>or paste · drag & drop</p>
          <p className={styles.sub}>Screenshot of any post, comment, or tweet</p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  )
}
