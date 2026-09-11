import * as React from 'react'

interface SeoProps {
  title: string
  description?: string
  image?: string
  type?: 'website' | 'product' | 'article'
  noindex?: boolean
  jsonLd?: Record<string, unknown>
}

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

const JSON_LD_ID = 'seo-jsonld'

// SEO client-side (SPA): funciona bem para Googlebot (renderiza JS), mas
// crawlers de preview de link que NÃO executam JS (WhatsApp, Facebook,
// Twitter) podem não ver estas tags em tempo real — para isso, uma solução
// de SSR/pré-renderização seria necessária no futuro (ver README).
export function Seo({ title, description, image, type = 'website', noindex, jsonLd }: SeoProps) {
  React.useEffect(() => {
    const fullTitle = `${title} | Casa Belém Acessórios`
    document.title = fullTitle

    if (description) {
      setMetaTag('name', 'description', description)
      setMetaTag('property', 'og:description', description)
    }
    setMetaTag('property', 'og:title', fullTitle)
    setMetaTag('property', 'og:type', type)
    setMetaTag('property', 'og:url', window.location.href)
    if (image) setMetaTag('property', 'og:image', image)
    setMetaTag('name', 'twitter:card', image ? 'summary_large_image' : 'summary')

    setMetaTag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    setCanonical(window.location.origin + window.location.pathname)

    let script = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script')
        script.id = JSON_LD_ID
        script.type = 'application/ld+json'
        document.head.appendChild(script)
      }
      script.textContent = JSON.stringify(jsonLd)
    } else if (script) {
      script.remove()
    }

    return () => {
      document.getElementById(JSON_LD_ID)?.remove()
    }
  }, [title, description, image, type, noindex, jsonLd])

  return null
}
