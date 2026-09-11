// Gera public/sitemap.xml e public/robots.txt a partir dos produtos e
// categorias ativos no Supabase. Requer um projeto Supabase real conectado.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SITE_URL=https://seu-dominio.com \
//     node scripts/generate-sitemap.mjs
//
// Recomendado rodar antes de cada deploy de produção (ex.: passo de CI) para
// manter o sitemap atualizado com o catálogo real.

import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SITE_URL = (process.env.SITE_URL ?? 'http://localhost:5173').replace(/\/$/, '')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios. Exemplo:\n' +
      '  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx SITE_URL=https://casabelem.com.br node scripts/generate-sitemap.mjs',
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const STATIC_ROUTES = [
  '/',
  '/produtos',
  '/sobre',
  '/contato',
  '/politica-de-trocas',
  '/politica-de-privacidade',
  '/politica-de-envio',
]

function urlEntry(loc, lastmod, changefreq, priority) {
  return `  <url>\n    <loc>${loc}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
}

async function main() {
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('status', 'active')
  if (productsError) throw productsError

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .eq('active', true)
  if (categoriesError) throw categoriesError

  const entries = [
    ...STATIC_ROUTES.map((route) =>
      urlEntry(`${SITE_URL}${route}`, null, 'weekly', route === '/' ? '1.0' : '0.6'),
    ),
    ...(categories ?? []).map((c) =>
      urlEntry(`${SITE_URL}/produtos?categoria=${c.slug}`, c.updated_at, 'weekly', '0.7'),
    ),
    ...(products ?? []).map((p) =>
      urlEntry(`${SITE_URL}/produto/${p.slug}`, p.updated_at, 'weekly', '0.8'),
    ),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`

  writeFileSync(new URL('../public/sitemap.xml', import.meta.url), xml)

  const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /minha-conta\nDisallow: /checkout\nDisallow: /carrinho\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  writeFileSync(new URL('../public/robots.txt', import.meta.url), robots)

  console.log(`sitemap.xml gerado com ${entries.length} URLs. robots.txt atualizado.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
