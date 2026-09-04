import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

export function getGreeting(hour: number): string {
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function HeroClock({ fixedDate }: { fixedDate?: Date }) {
  const [now, setNow] = useState(() => fixedDate ?? new Date())

  useEffect(() => {
    if (fixedDate) return
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [fixedDate])

  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const dateStr = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now)

  const greeting = getGreeting(now.getHours())

  return (
    <div className="flex flex-col items-center justify-center text-center select-none py-2 sm:py-4">
      <div className="font-heading text-5xl sm:text-7xl lg:text-8xl font-semibold tracking-tight text-foreground/90 tabular-nums">
        <span>{hours}</span>
        <span className="animate-pulse text-muted-foreground/60">:</span>
        <span>{minutes}</span>
        <span className="hidden sm:inline text-3xl sm:text-4xl text-muted-foreground/50 font-normal ml-2">
          :{seconds}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-sm sm:text-base font-medium text-muted-foreground">
        <span>{dateStr}</span>
        <span className="text-border">•</span>
        <span className="text-foreground/80 font-medium">{greeting}</span>
        <span className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground/80 ml-1">
          <Sparkles className="size-3 text-primary/70" />
          <span>静享专注时光</span>
        </span>
      </div>
    </div>
  )
}
