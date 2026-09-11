// Sandbox por padrão — defina MELHORENVIO_SANDBOX=false nas secrets da
// function ao trocar para o token de produção do Melhor Envio.
export function getMelhorEnvioBaseUrl(): string {
  const sandbox = (Deno.env.get('MELHORENVIO_SANDBOX') ?? 'true').toLowerCase() !== 'false'
  return sandbox
    ? 'https://sandbox.melhorenvio.com.br'
    : 'https://www.melhorenvio.com.br'
}

export function getMelhorEnvioAccessToken(): string {
  const token = Deno.env.get('MELHORENVIO_ACCESS_TOKEN')
  if (!token) throw new Error('MELHORENVIO_ACCESS_TOKEN não configurado nas secrets da function.')
  return token
}

export interface MelhorEnvioProduct {
  id: string
  width: number
  height: number
  length: number
  weight: number
  insurance_value: number
  quantity: number
}

export interface MelhorEnvioQuoteOption {
  id: number
  name: string
  price: string
  delivery_time: number
  company: { name: string }
  error?: string
}

// Chama o cálculo de frete do Melhor Envio. Retorna uma opção por serviço de
// transportadora (PAC, SEDEX, etc.); opções com "error" preenchido (serviço
// indisponível pra essa rota/pacote) são descartadas pelo chamador.
export async function fetchMelhorEnvioQuote(params: {
  cepOrigem: string
  cepDestino: string
  products: MelhorEnvioProduct[]
}): Promise<MelhorEnvioQuoteOption[]> {
  const response = await fetch(`${getMelhorEnvioBaseUrl()}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getMelhorEnvioAccessToken()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Casa Belém Acessórios (contato via /admin/configuracoes)',
    },
    body: JSON.stringify({
      from: { postal_code: params.cepOrigem },
      to: { postal_code: params.cepDestino },
      products: params.products,
    }),
  })

  if (!response.ok) {
    throw new Error(`Falha ao consultar frete no Melhor Envio (${response.status}).`)
  }

  return (await response.json()) as MelhorEnvioQuoteOption[]
}
