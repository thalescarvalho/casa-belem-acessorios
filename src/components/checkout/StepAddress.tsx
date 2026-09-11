import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { fetchAddressByCep } from '@/services/cep'
import { fetchMyAddresses } from '@/services/addresses'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import type { AddressData } from '@/features/checkout/types'

interface StepAddressProps {
  value: AddressData
  onChange: (value: AddressData) => void
  onNext: () => void
  onBack: () => void
}

export function StepAddress({ value, onChange, onNext, onBack }: StepAddressProps) {
  const { user } = useAuth()
  const [errors, setErrors] = React.useState<Partial<Record<keyof AddressData, string>>>({})
  const [isLookingUpCep, setIsLookingUpCep] = React.useState(false)
  const [selectedSavedId, setSelectedSavedId] = React.useState<string | null>(null)

  const savedAddresses = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => fetchMyAddresses(user!.id),
    enabled: Boolean(user),
  })

  async function handleCepBlur() {
    const digits = value.cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setIsLookingUpCep(true)
    try {
      const address = await fetchAddressByCep(digits)
      if (!address) {
        toast.error('CEP não encontrado.')
        return
      }
      onChange({
        ...value,
        street: address.street,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível buscar o CEP.')
    } finally {
      setIsLookingUpCep(false)
    }
  }

  function validate() {
    const next: Partial<Record<keyof AddressData, string>> = {}
    if (value.cep.replace(/\D/g, '').length !== 8) next.cep = 'CEP inválido.'
    if (!value.recipient_name.trim()) next.recipient_name = 'Informe o destinatário.'
    if (!value.street.trim()) next.street = 'Informe a rua.'
    if (!value.number.trim()) next.number = 'Informe o número.'
    if (!value.neighborhood.trim()) next.neighborhood = 'Informe o bairro.'
    if (!value.city.trim()) next.city = 'Informe a cidade.'
    if (!value.state.trim()) next.state = 'Informe o estado.'
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
      {user && savedAddresses.data && savedAddresses.data.length > 0 && (
        <div className="space-y-2">
          <Label>Endereços salvos</Label>
          <div className="flex flex-wrap gap-2">
            {savedAddresses.data.map((addr) => (
              <button
                key={addr.id}
                type="button"
                onClick={() => {
                  setSelectedSavedId(addr.id)
                  onChange({
                    recipient_name: addr.recipient_name,
                    cep: addr.cep,
                    street: addr.street,
                    number: addr.number,
                    complement: addr.complement ?? '',
                    neighborhood: addr.neighborhood,
                    city: addr.city,
                    state: addr.state,
                  })
                }}
                className={cn(
                  'rounded-md border px-3 py-2 text-left text-sm',
                  selectedSavedId === addr.id
                    ? 'border-primary bg-primary/10'
                    : 'hover:border-primary',
                )}
              >
                {addr.street}, {addr.number} — {addr.city}/{addr.state}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setSelectedSavedId(null)
                onChange({
                  recipient_name: '',
                  cep: '',
                  street: '',
                  number: '',
                  complement: '',
                  neighborhood: '',
                  city: '',
                  state: '',
                })
              }}
              className={cn(
                'rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-primary',
              )}
            >
              + Novo endereço
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="checkout-cep">CEP</Label>
          <div className="relative">
            <Input
              id="checkout-cep"
              value={value.cep}
              onChange={(e) => onChange({ ...value, cep: e.target.value })}
              onBlur={handleCepBlur}
            />
            {isLookingUpCep && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {errors.cep && <p className="text-sm text-destructive">{errors.cep}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="checkout-recipient">Destinatário</Label>
          <Input
            id="checkout-recipient"
            value={value.recipient_name}
            onChange={(e) => onChange({ ...value, recipient_name: e.target.value })}
          />
          {errors.recipient_name && (
            <p className="text-sm text-destructive">{errors.recipient_name}</p>
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="checkout-street">Rua</Label>
          <Input
            id="checkout-street"
            value={value.street}
            onChange={(e) => onChange({ ...value, street: e.target.value })}
          />
          {errors.street && <p className="text-sm text-destructive">{errors.street}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="checkout-number">Número</Label>
          <Input
            id="checkout-number"
            value={value.number}
            onChange={(e) => onChange({ ...value, number: e.target.value })}
          />
          {errors.number && <p className="text-sm text-destructive">{errors.number}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="checkout-complement">Complemento</Label>
          <Input
            id="checkout-complement"
            value={value.complement}
            onChange={(e) => onChange({ ...value, complement: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="checkout-neighborhood">Bairro</Label>
          <Input
            id="checkout-neighborhood"
            value={value.neighborhood}
            onChange={(e) => onChange({ ...value, neighborhood: e.target.value })}
          />
          {errors.neighborhood && <p className="text-sm text-destructive">{errors.neighborhood}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="checkout-city">Cidade</Label>
          <Input
            id="checkout-city"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
          />
          {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="checkout-state">Estado (UF)</Label>
          <Input
            id="checkout-state"
            maxLength={2}
            value={value.state}
            onChange={(e) => onChange({ ...value, state: e.target.value.toUpperCase() })}
          />
          {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button type="submit">Continuar</Button>
      </div>
    </form>
  )
}
