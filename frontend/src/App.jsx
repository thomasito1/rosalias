import { useState, useCallback, useEffect } from 'react'
import UploadZone from './components/UploadZone'
import Loader from './components/Loader'
import Results from './components/Results'
import './App.css'

export default function App() {
  const [image, setImage] = useState(null)   // { data: base64, type: string, url: objectURL }
  const [phase, setPhase] = useState('idle') // idle | loading | done | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0)

  // Global paste handler
  useEffect(() => {
    const onPaste = (e) => {
      if (phase === 'loading') return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          handleFile(item.getAsFile())
          break
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [phase])

  const handleFile = useCallback((file) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const b64 = e.target.result.split(',')[1]
      setImage({ data: b64, type: file.type || 'image/png', url })
      setPhase('idle')
      setResult(null)
      setError('')
    }
    reader.readAsDataURL(file)
  }, [])

  const clear = useCallback(() => {
    if (image?.url) URL.revokeObjectURL(image.url)
    setImage(null)
    setPhase('idle')
    setResult(null)
    setError('')
    setStep(0)
  }, [image])

  const analyze = useCallback(async () => {
    if (!image) return
    setPhase('loading')
    setStep(0)
    setError('')
    setResult(null)

    // Animate step indicator
    const stepTimings = [0, 2000, 4200, 6500]
    stepTimings.forEach((t, i) => setTimeout(() => setStep(i), t))

    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: image.data, image_type: image.type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Analysis failed')
      setResult(data)
      setPhase('done')
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setPhase('error')
    }
  }, [image])

  return (
    <div className="app">
      <header className="header">
        <span className="logo">⚡ FactBlast</span>
        <span className="tagline">Screenshot → Instant debunk</span>
      </header>

      <main className="main">
        {phase === 'done' && result ? (
          <Results result={result} onReset={clear} />
        ) : (
          <>
            <UploadZone image={image} onFile={handleFile} onClear={clear} />

            {phase === 'error' && (
              <div className="error-banner">⚠ {error}</div>
            )}

            {phase === 'loading' ? (
              <Loader step={step} />
            ) : (
              <div className="cta-bar">
                <button
                  className="btn-analyze"
                  disabled={!image}
                  onClick={analyze}
                >
                  {image ? '🔍 Fact-Check This' : 'Add a screenshot first'}
                </button>
                {!image && (
                  <p className="hint">Paste with Ctrl+V · tap to pick from photos · drag & drop</p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
