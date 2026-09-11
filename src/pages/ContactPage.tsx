import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Clock, Instagram, Mail, MapPin } from 'lucide-react'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { buildWhatsappUrl } from '@/utils/whatsapp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const contactSchema = z.object({
  name: z.string().min(2, 'Informe seu nome'),
  email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  message: z.string().min(5, 'Escreva uma mensagem'),
})

type ContactFormValues = z.infer<typeof contactSchema>

export function ContactPage() {
  const { settings } = useSiteSettings()
  const hasWhatsapp = settings.whatsapp_number.length > 0

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = (values: ContactFormValues) => {
    const message = [
      'Olá! Recebi este contato pelo site:',
      '',
      `Nome: ${values.name}`,
      `E-mail: ${values.email}`,
      `Mensagem: ${values.message}`,
    ].join('\n')
    window.open(
      buildWhatsappUrl(settings.whatsapp_number, message),
      '_blank',
      'noopener,noreferrer',
    )
    reset()
  }

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Contato</h1>
        <p className="mt-3 text-muted-foreground">
          Estamos à disposição para tirar dúvidas, ajudar na escolha de uma peça ou o que mais você
          precisar.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nossos canais</CardTitle>
            <CardDescription>Fale com a gente pelo canal que preferir</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.contact_email && (
              <div className="flex items-start gap-3 text-sm">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a href={`mailto:${settings.contact_email}`} className="hover:underline">
                  {settings.contact_email}
                </a>
              </div>
            )}
            {settings.contact_address && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{settings.contact_address}</span>
              </div>
            )}
            {settings.business_hours && (
              <div className="flex items-start gap-3 text-sm">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="whitespace-pre-line">{settings.business_hours}</span>
              </div>
            )}
            {settings.instagram_url && (
              <div className="flex items-start gap-3 text-sm">
                <Instagram className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Instagram
                </a>
              </div>
            )}
          </CardContent>
          {hasWhatsapp && (
            <CardFooter>
              <Button variant="whatsapp" className="w-full" asChild>
                <a
                  href={buildWhatsappUrl(
                    settings.whatsapp_number,
                    'Olá! Gostaria de falar com vocês.',
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Falar pelo WhatsApp
                </a>
              </Button>
            </CardFooter>
          )}
        </Card>

        {hasWhatsapp && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Envie uma mensagem</CardTitle>
              <CardDescription>
                Preencha o formulário e enviaremos sua mensagem pelo WhatsApp
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea id="message" rows={4} {...register('message')} />
                  {errors.message && (
                    <p className="text-sm text-destructive">{errors.message.message}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" variant="whatsapp" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar pelo WhatsApp'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}
