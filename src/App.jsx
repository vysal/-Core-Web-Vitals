import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './App.css'

const initialHabits = [
  { id: 1, name: 'Drink water', streak: 6, queued: false, accent: '#22c55e' },
  { id: 2, name: 'Stretch', streak: 3, queued: false, accent: '#f59e0b' },
  { id: 3, name: 'Read 10 minutes', streak: 8, queued: false, accent: '#8b5cf6' },
]

function UpdateToast({ needRefresh, offlineReady, updateServiceWorker }) {
  if (!needRefresh) {
    return offlineReady ? (
      <div className="offline-banner is-ready" role="status" aria-live="polite">
        App ready for offline use.
      </div>
    ) : null
  }

  return (
    <div className="update-toast" role="status" aria-live="polite">
      <span>New version available</span>
      <button type="button" onClick={() => updateServiceWorker(true)}>
        Refresh
      </button>
    </div>
  )
}

function App() {
  const [habits, setHabits] = useState(initialHabits)
  const [draft, setDraft] = useState('')
  const [queuedIds, setQueuedIds] = useState([])
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
  })

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!isOnline && queuedIds.length) {
      setHabits((current) =>
        current.map((habit) =>
          queuedIds.includes(habit.id)
            ? { ...habit, queued: true }
            : habit,
        ),
      )
    }

    if (isOnline && queuedIds.length) {
      const timeoutId = window.setTimeout(() => {
        setHabits((current) =>
          current.map((habit) =>
            queuedIds.includes(habit.id)
              ? { ...habit, queued: false }
              : habit,
          ),
        )
        setQueuedIds([])
      }, 900)

      return () => window.clearTimeout(timeoutId)
    }

    return undefined
  }, [isOnline, queuedIds])

  const handleSubmit = (event) => {
    event.preventDefault()
    const name = draft.trim()

    if (!name) {
      return
    }

    const nextHabit = {
      id: Date.now(),
      name,
      streak: 1,
      queued: !isOnline,
      accent: ['#22c55e', '#f43f5e', '#0ea5e9', '#a78bfa'][Math.floor(Math.random() * 4)],
    }

    setHabits((current) => [nextHabit, ...current])

    if (!isOnline) {
      setQueuedIds((current) => [...current, nextHabit.id])
    }

    setDraft('')
  }

  const handleShare = async () => {
    const payload = {
      title: 'Habit Pulse',
      text: 'I am building momentum with Habit Pulse.',
      url: window.location.href,
    }

    try {
      if (navigator.share) {
        await navigator.share(payload)
        return
      }

      await navigator.clipboard.writeText(`${payload.text} ${payload.url}`)
      window.alert('Share link copied to your clipboard.')
    } catch (error) {
      if (error && error.name !== 'AbortError') {
        const fallback = `${payload.text} ${payload.url}`
        if (navigator.clipboard) {
          navigator.clipboard.writeText(fallback)
        } else {
          window.prompt('Copy this link:', fallback)
        }
      }
    }
  }

  return (
    <div className="app-shell">
      {!isOnline && (
        <div className="offline-banner" role="status" aria-live="polite">
          You are offline. New habits are queued and will sync when your connection is back.
        </div>
      )}

      <UpdateToast
        needRefresh={needRefresh}
        offlineReady={offlineReady}
        updateServiceWorker={updateServiceWorker}
      />

      <header className="topbar">
        <div>
          <p className="eyebrow">Momentum</p>
          <h1>Habit Pulse</h1>
        </div>
        <button type="button" className="share-button" onClick={handleShare}>
          Share
        </button>
      </header>

      <main className="content">
        <section className="panel summary-panel" aria-label="Daily progress summary">
          <div>
            <p className="label">Today</p>
            <h2>3 active habits</h2>
          </div>
          <div className="streak-wrap">
            <strong>21</strong>
            <span>day streak</span>
          </div>
        </section>

        <section className="panel form-panel" aria-label="Add a habit">
          <form onSubmit={handleSubmit} className="habit-form">
            <label htmlFor="habit-name">Add a habit</label>
            <div className="field-row">
              <input
                id="habit-name"
                name="habit-name"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Track your next win"
                aria-label="Habit name"
              />
              <button type="submit" className="primary-button">
                Add
              </button>
            </div>
          </form>
        </section>

        <section className="habit-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" aria-label="Habit list">
          {habits.map((habit) => (
            <article key={habit.id} className="habit-card" style={{ '--card-accent': habit.accent }}>
              <div className="card-header">
                <span className="status-pill" aria-label={habit.queued ? 'Queued for sync' : 'Synced'}>
                  {habit.queued ? 'Queued' : 'Ready'}
                </span>
                <span className="streak-badge">{habit.streak}d</span>
              </div>
              <h3>{habit.name}</h3>
              <p>Keep the streak alive with one small win today.</p>
              <button type="button" className="mini-button">
                {habit.queued ? 'Syncing later' : 'Complete'}
              </button>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}

export default App
