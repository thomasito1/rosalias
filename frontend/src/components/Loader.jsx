import styles from './Loader.module.css'

const STEPS = [
  { icon: '👁', text: 'Reading the screenshot…' },
  { icon: '🔎', text: 'Searching reliable sources…' },
  { icon: '⚖️', text: 'Verifying credibility…' },
  { icon: '💥', text: 'Crafting the perfect debunk…' },
]

export default function Loader({ step }) {
  return (
    <div className={styles.loader}>
      <div className={styles.spinner} />
      <div className={styles.steps}>
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`${styles.step} ${i === step ? styles.active : ''} ${i < step ? styles.done : ''}`}
          >
            <span className={styles.stepIcon}>{i < step ? '✓' : s.icon}</span>
            <span>{s.text}</span>
          </div>
        ))}
      </div>
      <p className={styles.note}>Checking 4–5 sources. Usually takes 10–20 seconds.</p>
    </div>
  )
}
