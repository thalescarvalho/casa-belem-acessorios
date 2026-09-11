import { useQuery } from '@tanstack/react-query'
import { fetchActiveBanners } from '@/services/banners'
import { fetchActiveCategories } from '@/services/categories'
import {
  fetchBestsellerProducts,
  fetchFeaturedProducts,
  fetchNewProducts,
  fetchPromoProducts,
} from '@/services/products'
import { HeroCarousel } from '@/components/home/HeroCarousel'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { ProductSection } from '@/components/home/ProductSection'
import { BenefitsSection } from '@/components/home/BenefitsSection'
import { InstagramSection } from '@/components/home/InstagramSection'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { paths } from '@/routes/paths'
import { Seo } from '@/components/common/Seo'

export function HomePage() {
  const { settings } = useSiteSettings()

  const banners = useQuery({ queryKey: ['banners', 'active'], queryFn: fetchActiveBanners })
  const categories = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: fetchActiveCategories,
  })
  const featured = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => fetchFeaturedProducts(),
  })
  const newest = useQuery({ queryKey: ['products', 'new'], queryFn: () => fetchNewProducts() })
  const bestsellers = useQuery({
    queryKey: ['products', 'bestsellers'],
    queryFn: () => fetchBestsellerProducts(),
  })
  const promo = useQuery({ queryKey: ['products', 'promo'], queryFn: () => fetchPromoProducts() })

  return (
    <div>
      <Seo
        title={settings.site_name}
        description={
          settings.tagline || `${settings.site_name} — acessórios com elegância e confiança.`
        }
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: settings.site_name,
          url: window.location.origin,
          ...(settings.instagram_url ? { sameAs: [settings.instagram_url] } : {}),
        }}
      />
      <HeroCarousel banners={banners.data ?? []} isLoading={banners.isLoading} />
      <CategoryGrid categories={categories.data ?? []} isLoading={categories.isLoading} />
      <ProductSection
        title="Destaques"
        products={featured.data ?? []}
        isLoading={featured.isLoading}
        viewAllHref={paths.products}
      />
      <ProductSection
        title="Novidades"
        products={newest.data ?? []}
        isLoading={newest.isLoading}
        viewAllHref={`${paths.products}?novidades=1`}
      />
      <ProductSection
        title="Mais vendidos"
        products={bestsellers.data ?? []}
        isLoading={bestsellers.isLoading}
        viewAllHref={`${paths.products}?maisVendidos=1`}
      />
      <ProductSection
        title="Promoções"
        products={promo.data ?? []}
        isLoading={promo.isLoading}
        viewAllHref={`${paths.products}?promocao=1`}
      />
      <BenefitsSection benefits={settings.benefits} />
      <InstagramSection />
    </div>
  )
}
