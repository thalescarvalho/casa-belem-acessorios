import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = ['Identificação', 'Endereço', 'Entrega', 'Pagamento']

export function CheckoutStepper({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center justify-between gap-2">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1
        const isDone = stepNumber < current
        const isActive = stepNumber === current
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium',
                isDone && 'border-primary bg-primary text-primary-foreground',
                isActive && 'border-primary text-primary',
                !isDone && !isActive && 'border-muted-foreground/30 text-muted-foreground',
              )}
            >
              {isDone ? <Check className="h-4 w-4" /> : stepNumber}
            </div>
            <span
              className={cn(
                'hidden text-sm sm:inline',
                isActive ? 'font-medium' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
            {stepNumber < STEPS.length && (
              <div className={cn('h-px flex-1', isDone ? 'bg-primary' : 'bg-border')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
