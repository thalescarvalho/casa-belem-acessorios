import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrencyBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatInstallments(totalCents: number, maxInstallments = 3): string {
  if (totalCents <= 0 || maxInstallments <= 1) return formatCurrencyBRL(totalCents)
  const perInstallment = Math.ceil(totalCents / maxInstallments)
  return `${maxInstallments}x de ${formatCurrencyBRL(perInstallment)} sem juros`
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
