import { Link } from '@tanstack/react-router'
import { Compass } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

export function NotFoundPage() {
  return (
    <section className="px-5 py-10 sm:px-7">
      <Card>
        <Empty className="min-h-[60vh] border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Compass /></EmptyMedia>
            <EmptyTitle className="text-base">这个泊位不存在</EmptyTitle>
            <EmptyDescription>地址可能已经改变，可以回到首页继续整理浏览器。</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Link to="/" className={buttonVariants()}>返回首页</Link></EmptyContent>
        </Empty>
      </Card>
    </section>
  )
}
