import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em]',
  {
    variants: {
      tone: {
        neutral: 'border-white/10 bg-white/6 text-slate-200/72',
        accent: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100',
        success: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
        warning: 'border-amber-300/30 bg-amber-300/12 text-amber-50',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
)

interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ tone, className }))} {...props} />
}
