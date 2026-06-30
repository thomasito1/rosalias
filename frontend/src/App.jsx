import { useState, useCallback, useEffect } from 'react'
import UploadZone from './components/UploadZone'
import Loader from './components/Loader'
import Results from './components/Results'
import './App.css'

const IS_PLAYGROUND = typeof window !== 'undefined' && window.location.protocol === 'file:'

const MOCK_RESULT = {
  extracted_claim: "Israel is an apartheid state that illegally occupies Palestinian land and should be sanctioned like South Africa.",
  verdict: "MISLEADING",
  snappy_response: "Let's unpack this word salad of historical revisionism.\n\n**Israel is not an apartheid state.** Apartheid was a legal system in South Africa that stripped people of citizenship based on race. Arab citizens of Israel make up 21% of the population, hold seats in the Knesset, serve as Supreme Court judges, and vote in every election. That's the *opposite* of apartheid.\n\n**On \"occupation\":** After Jordan illegally occupied the West Bank in 1948 (recognized by almost nobody), Israel captured it in a *defensive war* in 1967 after Egypt blockaded Israeli shipping — an act of war under international law. The legal status is genuinely disputed — not \"settled.\"\n\n**The South Africa comparison collapses immediately** when you notice Arab Israelis have more rights inside Israel than in any neighboring Arab country. Meanwhile Hamas — which the EU, US, and UK classify as a terrorist organization — governs Gaza and explicitly calls for Jewish genocide in its charter.\n\nFacts don't care about your narrative.",
  facts: [
    "Arab citizens hold 10 seats in Israel's 120-seat Knesset as of 2024 (Israel Democracy Institute)",
    "Israel's Supreme Court has included Arab judges — Justice Khaled Kabub became the first Arab Chief Justice candidate in 2023",
    "The 1967 war was triggered by Egypt's closure of the Straits of Tiran, which the US, UK, and Israel had declared an act of war in 1957",
    "Hamas's founding charter calls for the destruction of Israel and killing of Jews — it was updated in 2017 but the core goal remains",
    "South Africa's apartheid stripped Black citizens of citizenship entirely; Arab Israelis hold full citizenship and travel on Israeli passports",
  ],
  sources: [
    { title: "Israel Democracy Index 2023", url: "https://en.idi.org.il/", reliable: true, reliability_note: "Verified reliable (idi.org.il)", key_point: "Arab representation in Knesset documented" },
    { title: "ADL: Israel and Apartheid", url: "https://www.adl.org/resources/backgrounder/israel-apartheid", reliable: true, reliability_note: "Verified reliable (adl.org)", key_point: "Detailed legal comparison debunking apartheid claim" },
    { title: "US State Dept: 1967 War Background", url: "https://history.state.gov/historicaldocuments/frus1964-68v19", reliable: true, reliability_note: "Verified reliable (state.gov)", key_point: "Official US records on 1967 conflict triggers" },
    { title: "EU Council: Hamas Terrorist Designation", url: "https://www.consilium.europa.eu/en/policies/fight-against-terrorism/terrorist-list/", reliable: true, reliability_note: "Verified reliable (consilium.europa.eu)", key_point: "Hamas listed as terrorist organization since 2003" },
    { title: "Times of Israel: Arab Judges", url: "https://www.timesofisrael.com/", reliable: true, reliability_note: "Verified reliable (timesofisrael.com)", key_point: "History of Arab representation in Israeli judiciary" },
  ],
  closing_zinger: "If Israel is apartheid, it's the only apartheid state where the \"oppressed\" minority sits in parliament, practices law, and performs surgery on the majority.",
  all_sources_found: 5,
}

async function callAnalyze(imageData, imageType) {
  if (IS_PLAYGROUND) {
    await new Promise(r => setTimeout(r, 8000))
    return MOCK_RESULT
  }
  const res = await fetch('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_data: imageData, image_type: imageType }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Analysis failed')
  return data
}

export default function App() {
  const [image, setImage] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0)

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

    const stepTimings = [0, 2000, 4200, 6500]
    stepTimings.forEach((t, i) => setTimeout(() => setStep(i), t))

    try {
      const data = await callAnalyze(image.data, image.type)
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
        <span className="tagline">
          Screenshot → Instant debunk
          {IS_PLAYGROUND && <span className="playground-badge"> · DEMO</span>}
        </span>
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
                {IS_PLAYGROUND && image && (
                  <p className="hint">Demo mode — will show a sample fact-check result</p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
