import * as React from 'react'
import { supabase } from '@/lib/supabase'

export interface FreightRule {
  enabled: boolean
  cost_cents: number
  free_above_cents?: number
}

export interface SiteBenefit {
  icon: string
  title: string
  description: string
}

export interface SiteSettings {
  site_name: string
  tagline: string
  logo_url: string | null
  favicon_url: string | null
  whatsapp_number: string
  instagram_url: string
  contact_email: string
  contact_address: string
  business_hours: string
  theme_colors: { primary: string; secondary: string; accent: string }
  benefits: SiteBenefit[]
  freight_rules: {
    pickup: FreightRule
    local_delivery: FreightRule
    standard: FreightRule
    free: FreightRule
  }
  // CEP de onde os pacotes saem — usado pela Edge Function
  // calculate-shipping-quote para cotar o frete real (Melhor Envio) do
  // método "standard". Sem isso configurado, a cotação real fica indisponível
  // e o checkout usa o valor fixo de freight_rules.standard.cost_cents.
  shipping_origin: { cep: string }
  payment_methods: { pix: boolean; credit_card: boolean; max_installments: number }
  policies: { returns: string; privacy: string; shipping: string }
  social_links: { instagram: string; facebook: string; tiktok: string }
}

// Usado apenas enquanto os dados de public.site_settings ainda não chegaram,
// ou como rede de segurança se alguma chave estiver ausente no banco.
// Nenhum valor comercial (telefone, endereço, preços) real é assumido aqui.
export const defaultSiteSettings: SiteSettings = {
  site_name: 'Casa Belém Acessórios',
  tagline: 'Elegância em cada detalhe',
  logo_url: null,
  favicon_url: null,
  whatsapp_number: '',
  instagram_url: 'https://www.instagram.com/casabelemacessorios/',
  contact_email: '',
  contact_address: '',
  business_hours: '',
  theme_colors: { primary: '32 52% 40%', secondary: '30 22% 93%', accent: '14 48% 44%' },
  benefits: [],
  freight_rules: {
    pickup: { enabled: true, cost_cents: 0 },
    local_delivery: { enabled: true, cost_cents: 1500 },
    standard: { enabled: true, cost_cents: 2500, free_above_cents: 30000 },
    free: { enabled: false, cost_cents: 0 },
  },
  shipping_origin: { cep: '' },
  payment_methods: { pix: true, credit_card: true, max_installments: 3 },
  policies: { returns: '', privacy: '', shipping: '' },
  social_links: { instagram: '', facebook: '', tiktok: '' },
}

interface SiteSettingsContextValue {
  settings: SiteSettings
  loading: boolean
  refresh: () => Promise<void>
}

const SiteSettingsContext = React.createContext<SiteSettingsContextValue | undefined>(undefined)

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<SiteSettings>(defaultSiteSettings)
  const [loading, setLoading] = React.useState(true)

  const fetchSettings = React.useCallback(async () => {
    const { data, error } = await supabase.from('site_settings').select('key, value')
    if (error) {
      console.error('Falha ao carregar site_settings:', error.message)
      return
    }
    if (!data || data.length === 0) return

    setSettings((prev) => {
      const next = { ...prev }
      for (const row of data) {
        if (row.key in next) {
          ;(next as Record<string, unknown>)[row.key] = row.value
        }
      }
      return next
    })
  }, [])

  React.useEffect(() => {
    fetchSettings().finally(() => setLoading(false))
  }, [fetchSettings])

  React.useEffect(() => {
    document.documentElement.style.setProperty('--primary', settings.theme_colors.primary)
    document.documentElement.style.setProperty('--secondary', settings.theme_colors.secondary)
    document.documentElement.style.setProperty('--accent', settings.theme_colors.accent)
    document.documentElement.style.setProperty('--ring', settings.theme_colors.primary)
  }, [settings.theme_colors])

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refresh: fetchSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  const ctx = React.useContext(SiteSettingsContext)
  if (!ctx) throw new Error('useSiteSettings deve ser usado dentro de <SiteSettingsProvider>')
  return ctx
}
