import { Globe2 } from 'lucide-react'
import { useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { faviconUrlForPage } from '@/lib/chrome'

export function SiteIcon({ title, url, src, fallback }: {
  title: string
  url: string
  src?: string
  fallback?: string
}) {
  const [failed, setFailed] = useState(false)
  const image = src || faviconUrlForPage(url)
  const letters = fallback || title.trim().slice(0, 2).toUpperCase()

  return (
    <Avatar size="sm" className="rounded-md">
      {image && !failed ? <AvatarImage src={image} alt="" onError={() => setFailed(true)} className="rounded-md" /> : null}
      <AvatarFallback className="rounded-md text-[0.65rem] font-semibold">{letters || <Globe2 className="size-3" />}</AvatarFallback>
    </Avatar>
  )
}
