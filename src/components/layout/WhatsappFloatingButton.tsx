import { MessageCircle } from 'lucide-react'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { buildWhatsappUrl } from '@/utils/whatsapp'

export function WhatsappFloatingButton() {
  const { settings } = useSiteSettings()

  if (!settings.whatsapp_number) return null

  const url = buildWhatsappUrl(
    settings.whatsapp_number,
    `Olá! Vim pelo site da ${settings.site_name}.`,
  )

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
    >
      <MessageCircle className="h-7 w-7" fill="currentColor" />
    </a>
  )
}
