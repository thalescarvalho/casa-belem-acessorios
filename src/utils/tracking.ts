// Gera uma URL de rastreio pública quando reconhecemos a transportadora.
// Se o admin já informou uma tracking_url manualmente, ela sempre tem
// prioridade sobre esta geração automática.
export function buildTrackingUrl(
  carrier: string | null,
  trackingCode: string | null,
): string | null {
  if (!trackingCode) return null
  const normalized = (carrier ?? '').trim().toLowerCase()

  if (normalized.includes('correios')) {
    return `https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(trackingCode)}`
  }
  if (normalized.includes('jadlog')) {
    return `https://www.jadlog.com.br/tracking/${encodeURIComponent(trackingCode)}`
  }
  if (normalized.includes('loggi')) {
    return `https://www.loggi.com/rastreador/${encodeURIComponent(trackingCode)}`
  }
  return null
}
