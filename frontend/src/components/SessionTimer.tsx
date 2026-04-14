import { useEffect, useState } from 'react'

interface SessionTimerProps {
  remainingSeconds: number
  totalSeconds: number
}

export default function SessionTimer({ remainingSeconds, totalSeconds }: SessionTimerProps) {
  const [displaySeconds, setDisplaySeconds] = useState(remainingSeconds)

  useEffect(() => {
    setDisplaySeconds(remainingSeconds)
  }, [remainingSeconds])

  const progressPercentage = (displaySeconds / totalSeconds) * 100
  const circumference = 2 * Math.PI * 85
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference

  const minutes = Math.floor(displaySeconds / 60)
  const seconds = Math.floor(displaySeconds % 60)
  const isLowTime = displaySeconds < 300 // Less than 5 minutes

  return (
    <div className="timer-circular">
      <svg className="timer-svg" viewBox="0 0 200 200">
        <circle
          className="timer-circle-bg"
          cx="100"
          cy="100"
          r="85"
        />
        <circle
          className={`timer-circle-progress ${isLowTime ? 'timer-pulse' : ''}`}
          cx="100"
          cy="100"
          r="85"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset,
          }}
        />
      </svg>
      <div className="timer-text">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div className="timer-label">
        {isLowTime ? 'Meno di 5 minuti!' : 'Tempo rimasto'}
      </div>
    </div>
  )
}
