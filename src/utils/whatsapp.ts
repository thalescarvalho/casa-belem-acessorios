import { formatCurrencyBRL } from '@/lib/utils'

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function buildWhatsappUrl(phoneNumber: string, message: string): string {
  const digits = onlyDigits(phoneNumber)
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export interface WhatsappProductInfo {
  name: string
  quantity: number
  unitPriceCents: number
  url: string
  variantLabel?: string | null
}

export function buildProductWhatsappMessage(product: WhatsappProductInfo): string {
  const lines = [
    'Olá! Tenho interesse neste produto:',
    '',
    `*${product.name}*${product.variantLabel ? ` (${product.variantLabel})` : ''}`,
    `Quantidade: ${product.quantity}`,
    `Valor unitário: ${formatCurrencyBRL(product.unitPriceCents)}`,
    `Link: ${product.url}`,
  ]
  return lines.join('\n')
}

export interface WhatsappCartItem {
  name: string
  quantity: number
  unitPriceCents: number
  variantLabel?: string | null
}

export function buildCartWhatsappMessage(items: WhatsappCartItem[], totalCents: number): string {
  const lines = ['Olá! Gostaria de finalizar esta compra:', '']
  for (const item of items) {
    lines.push(
      `• ${item.quantity}x ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ''} — ${formatCurrencyBRL(
        item.unitPriceCents * item.quantity,
      )}`,
    )
  }
  lines.push('', `*Total: ${formatCurrencyBRL(totalCents)}*`)
  return lines.join('\n')
}
