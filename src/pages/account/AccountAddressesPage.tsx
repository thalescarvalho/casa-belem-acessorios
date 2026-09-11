import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  createAddress,
  deleteAddress,
  fetchMyAddresses,
  setDefaultAddress,
  updateAddress,
  type Address,
} from '@/services/addresses'
import { fetchAddressByCep } from '@/services/cep'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AddressFormState {
  label: string
  recipient_name: string
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

const emptyForm: AddressFormState = {
  label: '',
  recipient_name: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
}

function formToState(address: Address): AddressFormState {
  return {
    label: address.label ?? '',
    recipient_name: address.recipient_name,
    cep: address.cep,
    street: address.street,
    number: address.number,
    complement: address.complement ?? '',
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
  }
}

export function AccountAddressesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const addressesQuery = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => fetchMyAddresses(user!.id),
    enabled: Boolean(user),
  })

  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingAddress, setEditingAddress] = React.useState<Address | null>(null)
  const [form, setForm] = React.useState<AddressFormState>(emptyForm)
  const [errors, setErrors] = React.useState<Partial<Record<keyof AddressFormState, string>>>({})
  const [isLookingUpCep, setIsLookingUpCep] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [deletingAddress, setDeletingAddress] = React.useState<Address | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [settingDefaultId, setSettingDefaultId] = React.useState<string | null>(null)

  function openNewForm() {
    setEditingAddress(null)
    setForm(emptyForm)
    setErrors({})
    setIsFormOpen(true)
  }

  function openEditForm(address: Address) {
    setEditingAddress(address)
    setForm(formToState(address))
    setErrors({})
    setIsFormOpen(true)
  }

  async function handleCepBlur() {
    const digits = form.cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setIsLookingUpCep(true)
    try {
      const address = await fetchAddressByCep(digits)
      if (!address) {
        toast.error('CEP não encontrado.')
        return
      }
      setForm((prev) => ({
        ...prev,
        street: address.street,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
      }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível buscar o CEP.')
    } finally {
      setIsLookingUpCep(false)
    }
  }

  function validate() {
    const next: Partial<Record<keyof AddressFormState, string>> = {}
    if (form.cep.replace(/\D/g, '').length !== 8) next.cep = 'CEP inválido.'
    if (!form.recipient_name.trim()) next.recipient_name = 'Informe o destinatário.'
    if (!form.street.trim()) next.street = 'Informe a rua.'
    if (!form.number.trim()) next.number = 'Informe o número.'
    if (!form.neighborhood.trim()) next.neighborhood = 'Informe o bairro.'
    if (!form.city.trim()) next.city = 'Informe a cidade.'
    if (!form.state.trim() || form.state.trim().length !== 2)
      next.state = 'Informe a UF (2 letras).'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !validate()) return
    setIsSaving(true)
    try {
      const input = {
        user_id: user.id,
        label: form.label.trim() || null,
        recipient_name: form.recipient_name.trim(),
        cep: form.cep.replace(/\D/g, ''),
        street: form.street.trim(),
        number: form.number.trim(),
        complement: form.complement.trim() || null,
        neighborhood: form.neighborhood.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
      }
      if (editingAddress) {
        await updateAddress(editingAddress.id, input)
        toast.success('Endereço atualizado com sucesso')
      } else {
        await createAddress(input)
        toast.success('Endereço adicionado com sucesso')
      }
      setIsFormOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['addresses', user.id] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o endereço.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!user || !deletingAddress) return
    setIsDeleting(true)
    try {
      await deleteAddress(deletingAddress.id)
      toast.success('Endereço removido')
      setDeletingAddress(null)
      await queryClient.invalidateQueries({ queryKey: ['addresses', user.id] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover o endereço.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleSetDefault(address: Address) {
    if (!user) return
    setSettingDefaultId(address.id)
    try {
      await setDefaultAddress(user.id, address.id)
      toast.success('Endereço padrão atualizado')
      await queryClient.invalidateQueries({ queryKey: ['addresses', user.id] })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Não foi possível definir o endereço padrão.',
      )
    } finally {
      setSettingDefaultId(null)
    }
  }

  const addresses = addressesQuery.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Endereços</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os endereços de entrega da sua conta
          </p>
        </div>
        <Button onClick={openNewForm}>
          <Plus />
          Adicionar endereço
        </Button>
      </div>

      {addressesQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!addressesQuery.isLoading && addresses.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Você ainda não cadastrou nenhum endereço.</p>
          <Button onClick={openNewForm}>
            <Plus />
            Adicionar endereço
          </Button>
        </div>
      )}

      {addresses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{address.label || address.recipient_name}</p>
                  <p className="text-sm text-muted-foreground">{address.recipient_name}</p>
                </div>
                {address.is_default && <Badge>Padrão</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {address.street}, {address.number}
                {address.complement ? ` - ${address.complement}` : ''}
                <br />
                {address.neighborhood} - {address.city}/{address.state}
                <br />
                CEP {address.cep}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => openEditForm(address)}>
                  <Pencil />
                  Editar
                </Button>
                {!address.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(address)}
                    disabled={settingDefaultId === address.id}
                  >
                    {settingDefaultId === address.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Star />
                    )}
                    Tornar padrão
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeletingAddress(address)}
                >
                  <Trash2 />
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Editar endereço' : 'Adicionar endereço'}</DialogTitle>
            <DialogDescription>Preencha os dados do endereço de entrega</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="address-label">Apelido (opcional)</Label>
              <Input
                id="address-label"
                placeholder="Casa, trabalho..."
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="address-cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="address-cep"
                    value={form.cep}
                    onChange={(e) => setForm((prev) => ({ ...prev, cep: e.target.value }))}
                    onBlur={handleCepBlur}
                  />
                  {isLookingUpCep && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
                {errors.cep && <p className="text-sm text-destructive">{errors.cep}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address-recipient">Destinatário</Label>
                <Input
                  id="address-recipient"
                  value={form.recipient_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, recipient_name: e.target.value }))}
                />
                {errors.recipient_name && (
                  <p className="text-sm text-destructive">{errors.recipient_name}</p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address-street">Rua</Label>
                <Input
                  id="address-street"
                  value={form.street}
                  onChange={(e) => setForm((prev) => ({ ...prev, street: e.target.value }))}
                />
                {errors.street && <p className="text-sm text-destructive">{errors.street}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address-number">Número</Label>
                <Input
                  id="address-number"
                  value={form.number}
                  onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))}
                />
                {errors.number && <p className="text-sm text-destructive">{errors.number}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address-complement">Complemento</Label>
                <Input
                  id="address-complement"
                  value={form.complement}
                  onChange={(e) => setForm((prev) => ({ ...prev, complement: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address-neighborhood">Bairro</Label>
                <Input
                  id="address-neighborhood"
                  value={form.neighborhood}
                  onChange={(e) => setForm((prev) => ({ ...prev, neighborhood: e.target.value }))}
                />
                {errors.neighborhood && (
                  <p className="text-sm text-destructive">{errors.neighborhood}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address-city">Cidade</Label>
                <Input
                  id="address-city"
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                />
                {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address-state">Estado (UF)</Label>
                <Input
                  id="address-state"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))
                  }
                />
                {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar endereço'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingAddress)}
        onOpenChange={(open) => !open && setDeletingAddress(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir endereço</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este endereço? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingAddress(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
