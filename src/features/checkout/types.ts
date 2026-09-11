export interface IdentificationData {
  name: string
  email: string
  cpf: string
  phone: string
}

export interface AddressData {
  recipient_name: string
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

export type ShippingMethod = 'pickup' | 'local_delivery' | 'standard' | 'free'

export const emptyAddress: AddressData = {
  recipient_name: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
}
