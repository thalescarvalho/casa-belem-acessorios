import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import type { IdentificationData } from '@/features/checkout/types'

interface StepIdentificationProps {
  value: IdentificationData
  onChange: (value: IdentificationData) => void
  onNext: () => void
}

export function StepIdentification({ value, onChange, onNext }: StepIdentificationProps) {
  const { user, profile } = useAuth()
  const [errors, setErrors] = React.useState<Partial<Record<keyof IdentificationData, string>>>({})

  function validate() {
    const next: Partial<Record<keyof IdentificationData, string>> = {}
    if (!value.name.trim()) next.name = 'Informe seu nome completo.'
    if (!/^\S+@\S+\.\S+$/.test(value.email)) next.email = 'E-mail inválido.'
    if (value.cpf.replace(/\D/g, '').length !== 11) next.cpf = 'CPF inválido.'
    if (value.phone.replace(/\D/g, '').length < 10) next.phone = 'Telefone inválido.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (validate()) onNext()
      }}
    >
      {user && (
        <p className="rounded-md bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
          Comprando como{' '}
          <span className="font-medium text-foreground">{profile?.email ?? user.email}</span>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="checkout-name">Nome completo</Label>
          <Input
            id="checkout-name"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="checkout-email">E-mail</Label>
          <Input
            id="checkout-email"
            type="email"
            value={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="checkout-phone">Telefone / WhatsApp</Label>
          <Input
            id="checkout-phone"
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
          />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="checkout-cpf">CPF</Label>
          <Input
            id="checkout-cpf"
            value={value.cpf}
            onChange={(e) => onChange({ ...value, cpf: e.target.value })}
          />
          {errors.cpf && <p className="text-sm text-destructive">{errors.cpf}</p>}
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full sm:w-auto">
        Continuar
      </Button>
    </form>
  )
}
