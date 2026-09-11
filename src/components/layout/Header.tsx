import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Heart, Menu, Search, ShoppingBag, User } from 'lucide-react'
import { paths } from '@/routes/paths'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCartStore } from '@/features/cart/cartStore'
import { calcTotalQuantity } from '@/features/cart/cartMath'
import { useFavoritesStore } from '@/features/favorites/favoritesStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'Início', to: paths.home },
  { label: 'Produtos', to: paths.products },
  { label: 'Novidades', to: `${paths.products}?novidades=1` },
  { label: 'Mais vendidos', to: `${paths.products}?maisVendidos=1` },
  { label: 'Promoções', to: `${paths.products}?promocao=1` },
  { label: 'Eventos', to: paths.events },
  { label: 'Sobre', to: paths.about },
  { label: 'Contato', to: paths.contact },
]

function SearchForm({ onSubmitted, className }: { onSubmitted?: () => void; className?: string }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [value, setValue] = React.useState(params.get('q') ?? '')

  return (
    <form
      className={cn('flex w-full items-center gap-2', className)}
      onSubmit={(e) => {
        e.preventDefault()
        const q = value.trim()
        navigate(q ? `${paths.products}?q=${encodeURIComponent(q)}` : paths.products)
        onSubmitted?.()
      }}
    >
      <Input
        type="search"
        placeholder="Buscar produtos..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Buscar produtos"
      />
      <Button type="submit" size="icon" variant="secondary" aria-label="Buscar">
        <Search />
      </Button>
    </form>
  )
}

export function Header() {
  const { settings } = useSiteSettings()
  const { user } = useAuth()
  const cartItems = useCartStore((s) => s.items)
  const favoriteIds = useFavoritesStore((s) => s.productIds)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const cartCount = calcTotalQuantity(cartItems)

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="border-b bg-primary/5">
        <div className="container flex h-9 items-center justify-center text-xs text-muted-foreground">
          <span>{settings.tagline}</span>
        </div>
      </div>

      <div className="container flex h-16 items-center gap-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-[85vw] max-w-sm flex-col gap-6">
            <SheetHeader>
              <SheetTitle className="font-display text-xl">{settings.site_name}</SheetTitle>
            </SheetHeader>
            <SearchForm onSubmitted={() => setMobileOpen(false)} />
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <SheetClose asChild key={link.label}>
                  <Link
                    to={link.to}
                    className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-1 border-t pt-4">
              <SheetClose asChild>
                <Link
                  to={user ? paths.account : paths.login}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  {user ? 'Minha conta' : 'Entrar / Cadastrar'}
                </Link>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>

        <Link
          to={paths.home}
          className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight"
        >
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={settings.site_name} className="h-9 w-auto" />
          ) : (
            <span>{settings.site_name}</span>
          )}
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-1 justify-end md:flex">
          <SearchForm className="max-w-xs" />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button variant="ghost" size="icon" asChild aria-label="Minha conta">
            <Link to={user ? paths.account : paths.login}>
              <User />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="relative" aria-label="Favoritos">
            <Link to={paths.accountFavorites}>
              <Heart />
              {favoriteIds.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {favoriteIds.length}
                </span>
              )}
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="relative" aria-label="Carrinho">
            <Link to={paths.cart}>
              <ShoppingBag />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
