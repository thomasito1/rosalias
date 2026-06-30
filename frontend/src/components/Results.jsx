import { useState } from 'react'
import styles from './Results.module.css'

const VERDICT_STYLE = {
  'FALSE':           { cls: styles.verdictFalse,    label: '❌ FALSE' },
  'TRUE':            { cls: styles.verdictTrue,     label: '✅ TRUE' },
  'MISLEADING':      { cls: styles.verdictMisl,     label: '⚠️ MISLEADING' },
  'MISSING CONTEXT': { cls: styles.verdictCtx,      label: '🔍 MISSING CONTEXT' },
}

function markdownToJsx(md) {
  if (!md) return null
  return md.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>
      }
      return part
    })
    return <p key={i} style={{ marginBottom: '8px' }}>{parts}</p>
  })
}

export default function Results({ result, onReset }) {
  const [copied, setCopied] = useState(false)

  const verdict = (result.verdict || 'UNKNOWN').toUpperCase()
  const vStyle = VERDICT_STYLE[verdict] || { cls: styles.verdictUnknown, label: verdict }

  const handleShare = async () => {
    const text = `VERDICT: ${result.verdict}\n\nCLAIM: ${result.extracted_claim}\n\n${result.snappy_response}\n\n⚡ ${result.closing_zinger}`
    if (navigator.share) {
      try { await navigator.share({ text, title: 'FactBlast' }) } catch {}
    } else {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopy = async () => {
    const text = `VERDICT: ${result.verdict}\n\nCLAIM: ${result.extracted_claim}\n\n${result.snappy_response}\n\n⚡ ${result.closing_zinger}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.results}>

      {/* Verdict */}
      <div className={`${styles.verdictBadge} ${vStyle.cls}`}>
        {vStyle.label}
      </div>

      {/* Claim */}
      <div className={styles.card}>
        <div className={styles.cardLabel}>Claim detected</div>
        <blockquote className={styles.claim}>{result.extracted_claim}</blockquote>
      </div>

      {/* Response */}
      <div className={styles.card}>
        <div className={styles.cardLabel}>FactBlast Response</div>
        <div className={styles.response}>{markdownToJsx(result.snappy_response)}</div>
      </div>

      {/* Facts */}
      {result.facts?.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardLabel}>Key Facts</div>
          <ol className={styles.factsList}>
            {result.facts.map((f, i) => (
              <li key={i} className={styles.factItem}>
                <span className={styles.factNum}>{i + 1}</span>
                <span>{f}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Sources */}
      {result.sources?.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardLabel}>
            Sources
            <span className={styles.sourceCount}>{result.sources.length} verified</span>
          </div>
          <div className={styles.sourcesList}>
            {result.sources.map((s, i) => (
              <div key={i} className={`${styles.source} ${s.reliable ? styles.sourceOk : styles.sourceBad}`}>
                <div className={styles.sourceTitle}>{s.title || s.url}</div>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className={styles.sourceUrl}>
                  {s.url}
                </a>
                {s.key_point && <div className={styles.sourcePoint}>{s.key_point}</div>}
                <span className={`${styles.chip} ${s.reliable ? styles.chipOk : styles.chipBad}`}>
                  {s.reliable ? '✓ Reliable' : '✗ Unreliable'}
                </span>
              </div>
            ))}
          </div>
          {!result.sources.length && (
            <p className={styles.noSources}>
              Add a BRAVE_API_KEY environment variable to enable live source search.
            </p>
          )}
        </div>
      )}

      {/* Zinger */}
      {result.closing_zinger && (
        <div className={styles.zinger}>
          ⚡ {result.closing_zinger}
        </div>
      )}

      {/* Action buttons */}
      <div className={styles.actions}>
        <button className={styles.btnShare} onClick={handleShare}>
          {copied ? '✓ Copied!' : (navigator.share ? '📤 Share' : '📋 Copy')}
        </button>
        <button className={styles.btnCopy} onClick={handleCopy}>
          {copied ? '✓' : '📋'}
        </button>
      </div>

      <button className={styles.btnReset} onClick={onReset}>
        ← Check Another
      </button>

    </div>
  )
}
