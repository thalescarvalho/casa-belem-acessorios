import * as React from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteSettings, type SiteBenefit } from '@/contexts/SiteSettingsContext'
import { updateSiteSettings } from '@/services/admin/adminSettings'
import { uploadImage } from '@/services/admin/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { paths } from '@/routes/paths'

function centsToReaisInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

function reaisToCents(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim()
  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

const BENEFIT_ICONS = ['shield-check', 'credit-card', 'truck', 'headset', 'refresh-ccw']

interface GeneralForm {
  site_name: string
  tagline: string
  logo_url: string
  favicon_url: string
}

interface ContactForm {
  whatsapp_number: string
  instagram_url: string
  contact_email: string
  contact_address: string
  business_hours: string
}

interface AppearanceForm {
  primary: string
  secondary: string
  accent: string
}

interface FreightMethodForm {
  enabled: boolean
  costInput: string
  freeAboveInput: string
}

interface FreightForm {
  pickup: FreightMethodForm
  local_delivery: FreightMethodForm
  standard: FreightMethodForm
  free: FreightMethodForm
}

interface PaymentsForm {
  pix: boolean
  credit_card: boolean
  max_installments: string
}

interface PoliciesForm {
  returns: string
  privacy: string
  shipping: string
}

interface SocialForm {
  instagram: string
  facebook: string
  tiktok: string
}

export function AdminSettingsPage() {
  const { isAdmin } = useAuth()
  const { settings, loading, refresh } = useSiteSettings()
  const [initialized, setInitialized] = React.useState(false)

  const [general, setGeneral] = React.useState<GeneralForm>({
    site_name: '',
    tagline: '',
    logo_url: '',
    favicon_url: '',
  })
  const [contact, setContact] = React.useState<ContactForm>({
    whatsapp_number: '',
    instagram_url: '',
    contact_email: '',
    contact_address: '',
    business_hours: '',
  })
  const [appearance, setAppearance] = React.useState<AppearanceForm>({
    primary: '',
    secondary: '',
    accent: '',
  })
  const [benefits, setBenefits] = React.useState<SiteBenefit[]>([])
  const [freight, setFreight] = React.useState<FreightForm>({
    pickup: { enabled: true, costInput: '0,00', freeAboveInput: '' },
    local_delivery: { enabled: true, costInput: '0,00', freeAboveInput: '' },
    standard: { enabled: true, costInput: '0,00', freeAboveInput: '' },
    free: { enabled: false, costInput: '0,00', freeAboveInput: '' },
  })
  const [payments, setPayments] = React.useState<PaymentsForm>({
    pix: true,
    credit_card: true,
    max_installments: '3',
  })
  const [policies, setPolicies] = React.useState<PoliciesForm>({
    returns: '',
    privacy: '',
    shipping: '',
  })
  const [social, setSocial] = React.useState<SocialForm>({
    instagram: '',
    facebook: '',
    tiktok: '',
  })

  const [uploadingLogo, setUploadingLogo] = React.useState(false)
  const [uploadingFavicon, setUploadingFavicon] = React.useState(false)
  const logoInputRef = React.useRef<HTMLInputElement>(null)
  const faviconInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (loading || initialized) return
    setGeneral({
      site_name: settings.site_name,
      tagline: settings.tagline,
      logo_url: settings.logo_url ?? '',
      favicon_url: settings.favicon_url ?? '',
    })
    setContact({
      whatsapp_number: settings.whatsapp_number,
      instagram_url: settings.instagram_url,
      contact_email: settings.contact_email,
      contact_address: settings.contact_address,
      business_hours: settings.business_hours,
    })
    setAppearance({ ...settings.theme_colors })
    setBenefits(settings.benefits)
    setFreight({
      pickup: {
        enabled: settings.freight_rules.pickup.enabled,
        costInput: centsToReaisInput(settings.freight_rules.pickup.cost_cents),
        freeAboveInput: '',
      },
      local_delivery: {
        enabled: settings.freight_rules.local_delivery.enabled,
        costInput: centsToReaisInput(settings.freight_rules.local_delivery.cost_cents),
        freeAboveInput: '',
      },
      standard: {
        enabled: settings.freight_rules.standard.enabled,
        costInput: centsToReaisInput(settings.freight_rules.standard.cost_cents),
        freeAboveInput:
          settings.freight_rules.standard.free_above_cents != null
            ? centsToReaisInput(settings.freight_rules.standard.free_above_cents)
            : '',
      },
      free: {
        enabled: settings.freight_rules.free.enabled,
        costInput: centsToReaisInput(settings.freight_rules.free.cost_cents),
        freeAboveInput: '',
      },
    })
    setPayments({
      pix: settings.payment_methods.pix,
      credit_card: settings.payment_methods.credit_card,
      max_installments: String(settings.payment_methods.max_installments),
    })
    setPolicies({ ...settings.policies })
    setSocial({ ...settings.social_links })
    setInitialized(true)
  }, [loading, initialized, settings])

  async function handleSave(payload: Partial<typeof settings>) {
    await updateSiteSettings(payload)
    await refresh()
  }

  const generalMutation = useMutation({
    mutationFn: () =>
      handleSave({
        site_name: general.site_name.trim(),
        tagline: general.tagline.trim(),
        logo_url: general.logo_url.trim() || null,
        favicon_url: general.favicon_url.trim() || null,
      }),
    onSuccess: () => toast.success('Configurações gerais salvas.'),
    onError: (error: Error) => toast.error(error.message || 'Erro ao salvar.'),
  })

  const contactMutation = useMutation({
    mutationFn: () => handleSave({ ...contact }),
    onSuccess: () => toast.success('Informações de contato salvas.'),
    onError: (error: Error) => toast.error(error.message || 'Erro ao salvar.'),
  })

  const appearanceMutation = useMutation({
    mutationFn: () => handleSave({ theme_colors: { ...appearance } }),
    onSuccess: () => toast.success('Cores salvas.'),
    onError: (error: Error) => toast.error(error.message || 'Erro ao salvar.'),
  })

  const benefitsMutation = useMutation({
    mutationFn: () => handleSave({ benefits }),
    onSuccess: () => toast.success('Benefícios salvos.'),
    onError: (error: Error) => toast.error(error.message || 'Erro ao salvar.'),
  })

  const freightMutation = useMutation({
    mutationFn: () =>
      handleSave({
        freight_rules: {
          pickup: {
            enabled: freight.pickup.enabled,
            cost_cents: reaisToCents(freight.pickup.costInput),
          },
          local_delivery: {
            enabled: freight.local_delivery.enabled,
            cost_cents: reaisToCents(freight.local_delivery.costInput),
          },
          standard: {
            enabled: freight.standard.enabled,
            cost_cents: reaisToCents(freight.standard.costInput),
            free_above_cents: freight.standard.freeAboveInput.trim()
              ? reaisToCents(freight.standard.freeAboveInput)
              : undefined,
          },
          free: { enabled: freight.free.enabled, cost_cents: reaisToCents(freight.free.costInput) },
        },
      }),
    onSuccess: () => toast.success('Regras de frete salvas.'),
    onError: (error: Error) => toast.error(error.message || 'Erro ao salvar.'),
  })

  const paymentsMutation = useMutation({
    mutationFn: () =>
      handleSave({
        payment_methods: {
          pix: payments.pix,
          credit_card: payments.credit_card,
          max_installments: Number(payments.max_installments) || 1,
        },
      }),
    onSuccess: () => toast.success('Formas de pagamento salvas.'),
    onError: (error: Error) => toast.error(error.message || 'Erro ao salvar.'),
  })

  const policiesMutation = useMutation({
    mutationFn: () => handleSave({ policies: { ...policies } }),
    onSuccess: () => toast.success('Políticas salvas.'),
    onError: (error: Error) => toast.error(error.message || 'Erro ao salvar.'),
  })

  const socialMutation = useMutation({
    mutationFn: () => handleSave({ social_links: { ...social } }),
    onSuccess: () => toast.success('Redes sociais salvas.'),
    onError: (error: Error) => toast.error(error.message || 'Erro ao salvar.'),
  })

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true)
    try {
      const url = await uploadImage('site-assets', file)
      setGeneral((g) => ({ ...g, logo_url: url }))
      toast.success('Logo enviada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleFaviconUpload(file: File) {
    setUploadingFavicon(true)
    try {
      const url = await uploadImage('site-assets', file)
      setGeneral((g) => ({ ...g, favicon_url: url }))
      toast.success('Favicon enviado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar favicon.')
    } finally {
      setUploadingFavicon(false)
    }
  }

  function addBenefit() {
    setBenefits((b) => [...b, { icon: BENEFIT_ICONS[0], title: '', description: '' }])
  }

  function updateBenefit(index: number, patch: Partial<SiteBenefit>) {
    setBenefits((b) => b.map((benefit, i) => (i === index ? { ...benefit, ...patch } : benefit)))
  }

  function removeBenefit(index: number) {
    setBenefits((b) => b.filter((_, i) => i !== index))
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Apenas administradores podem editar as configurações do site.
        </p>
        <Link to={paths.admin} className="text-sm text-primary underline">
          Voltar para o painel
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Ajuste as informações públicas exibidas na loja.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="contact">Contato</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="benefits">Benefícios</TabsTrigger>
          <TabsTrigger value="freight">Frete</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="policies">Políticas</TabsTrigger>
          <TabsTrigger value="social">Redes sociais</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Geral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Nome do site</Label>
                  <Input
                    value={general.site_name}
                    onChange={(e) => setGeneral((g) => ({ ...g, site_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Slogan</Label>
                  <Input
                    value={general.tagline}
                    onChange={(e) => setGeneral((g) => ({ ...g, tagline: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Logo</Label>
                  <div className="flex items-center gap-3">
                    {general.logo_url && (
                      <img
                        src={general.logo_url}
                        alt=""
                        className="h-10 w-10 rounded object-contain"
                      />
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleLogoUpload(file)
                        if (logoInputRef.current) logoInputRef.current.value = ''
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingLogo ? 'Enviando...' : 'Enviar logo'}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Favicon</Label>
                  <div className="flex items-center gap-3">
                    {general.favicon_url && (
                      <img
                        src={general.favicon_url}
                        alt=""
                        className="h-10 w-10 rounded object-contain"
                      />
                    )}
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFaviconUpload(file)
                        if (faviconInputRef.current) faviconInputRef.current.value = ''
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingFavicon}
                      onClick={() => faviconInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingFavicon ? 'Enviando...' : 'Enviar favicon'}
                    </Button>
                  </div>
                </div>
              </div>
              <Button disabled={generalMutation.isPending} onClick={() => generalMutation.mutate()}>
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>WhatsApp</Label>
                  <Input
                    value={contact.whatsapp_number}
                    onChange={(e) => setContact((c) => ({ ...c, whatsapp_number: e.target.value }))}
                    placeholder="5511999999999"
                  />
                </div>
                <div>
                  <Label>Instagram (URL)</Label>
                  <Input
                    value={contact.instagram_url}
                    onChange={(e) => setContact((c) => ({ ...c, instagram_url: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>E-mail de contato</Label>
                  <Input
                    type="email"
                    value={contact.contact_email}
                    onChange={(e) => setContact((c) => ({ ...c, contact_email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Horário de atendimento</Label>
                  <Input
                    value={contact.business_hours}
                    onChange={(e) => setContact((c) => ({ ...c, business_hours: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Endereço</Label>
                <Textarea
                  rows={2}
                  value={contact.contact_address}
                  onChange={(e) => setContact((c) => ({ ...c, contact_address: e.target.value }))}
                />
              </div>
              <Button disabled={contactMutation.isPending} onClick={() => contactMutation.mutate()}>
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <p className="text-sm text-muted-foreground">Cores em formato HSL, ex: 32 52% 40%</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Cor primária</Label>
                  <Input
                    value={appearance.primary}
                    onChange={(e) => setAppearance((a) => ({ ...a, primary: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Cor secundária</Label>
                  <Input
                    value={appearance.secondary}
                    onChange={(e) => setAppearance((a) => ({ ...a, secondary: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Cor de destaque</Label>
                  <Input
                    value={appearance.accent}
                    onChange={(e) => setAppearance((a) => ({ ...a, accent: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                disabled={appearanceMutation.isPending}
                onClick={() => appearanceMutation.mutate()}
              >
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benefits">
          <Card>
            <CardHeader>
              <CardTitle>Benefícios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-md border p-3 sm:grid-cols-[160px_1fr_1fr_auto]"
                >
                  <div>
                    <Label>Ícone</Label>
                    <Select
                      value={benefit.icon}
                      onValueChange={(value) => updateBenefit(index, { icon: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BENEFIT_ICONS.map((icon) => (
                          <SelectItem key={icon} value={icon}>
                            {icon}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={benefit.title}
                      onChange={(e) => updateBenefit(index, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input
                      value={benefit.description}
                      onChange={(e) => updateBenefit(index, { description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBenefit(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addBenefit}>
                <Plus className="h-4 w-4" />
                Adicionar benefício
              </Button>
              <div>
                <Button
                  disabled={benefitsMutation.isPending}
                  onClick={() => benefitsMutation.mutate()}
                >
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="freight">
          <Card>
            <CardHeader>
              <CardTitle>Frete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {(
                [
                  ['pickup', 'Retirada na loja'],
                  ['local_delivery', 'Entrega local'],
                  ['standard', 'Entrega padrão'],
                  ['free', 'Frete grátis'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{label}</p>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={freight[key].enabled}
                        onCheckedChange={(checked) =>
                          setFreight((f) => ({ ...f, [key]: { ...f[key], enabled: checked } }))
                        }
                      />
                      <Label>Ativo</Label>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Custo (R$)</Label>
                      <Input
                        value={freight[key].costInput}
                        onChange={(e) =>
                          setFreight((f) => ({
                            ...f,
                            [key]: { ...f[key], costInput: e.target.value },
                          }))
                        }
                      />
                    </div>
                    {key === 'standard' && (
                      <div>
                        <Label>Grátis acima de (R$)</Label>
                        <Input
                          value={freight.standard.freeAboveInput}
                          onChange={(e) =>
                            setFreight((f) => ({
                              ...f,
                              standard: { ...f.standard, freeAboveInput: e.target.value },
                            }))
                          }
                          placeholder="Deixe em branco para desativar"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <Button disabled={freightMutation.isPending} onClick={() => freightMutation.mutate()}>
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={payments.pix}
                  onCheckedChange={(checked) => setPayments((p) => ({ ...p, pix: checked }))}
                />
                <Label>PIX habilitado</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={payments.credit_card}
                  onCheckedChange={(checked) =>
                    setPayments((p) => ({ ...p, credit_card: checked }))
                  }
                />
                <Label>Cartão de crédito habilitado</Label>
              </div>
              <div className="max-w-xs">
                <Label>Máximo de parcelas</Label>
                <Input
                  type="number"
                  min={1}
                  value={payments.max_installments}
                  onChange={(e) => setPayments((p) => ({ ...p, max_installments: e.target.value }))}
                />
              </div>
              <Button
                disabled={paymentsMutation.isPending}
                onClick={() => paymentsMutation.mutate()}
              >
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle>Políticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Trocas e devoluções</Label>
                <Textarea
                  rows={5}
                  value={policies.returns}
                  onChange={(e) => setPolicies((p) => ({ ...p, returns: e.target.value }))}
                />
              </div>
              <div>
                <Label>Privacidade</Label>
                <Textarea
                  rows={5}
                  value={policies.privacy}
                  onChange={(e) => setPolicies((p) => ({ ...p, privacy: e.target.value }))}
                />
              </div>
              <div>
                <Label>Envio</Label>
                <Textarea
                  rows={5}
                  value={policies.shipping}
                  onChange={(e) => setPolicies((p) => ({ ...p, shipping: e.target.value }))}
                />
              </div>
              <Button
                disabled={policiesMutation.isPending}
                onClick={() => policiesMutation.mutate()}
              >
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>Redes sociais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Instagram</Label>
                  <Input
                    value={social.instagram}
                    onChange={(e) => setSocial((s) => ({ ...s, instagram: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Facebook</Label>
                  <Input
                    value={social.facebook}
                    onChange={(e) => setSocial((s) => ({ ...s, facebook: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>TikTok</Label>
                  <Input
                    value={social.tiktok}
                    onChange={(e) => setSocial((s) => ({ ...s, tiktok: e.target.value }))}
                  />
                </div>
              </div>
              <Button disabled={socialMutation.isPending} onClick={() => socialMutation.mutate()}>
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
