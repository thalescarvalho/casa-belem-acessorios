import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Ticket,
  Image as ImageIcon,
  Settings,
  Users,
  ExternalLink,
  CalendarDays,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { paths } from '@/routes/paths'
import { cn } from '@/lib/utils'
import { PageLoader } from '@/components/common/PageLoader'

const NAV_ITEMS = [
  { label: 'Dashboard', to: paths.admin, icon: LayoutDashboard, exact: true },
  { label: 'Produtos', to: paths.adminProducts, icon: Package },
  { label: 'Categorias', to: paths.adminCategories, icon: FolderTree },
  { label: 'Pedidos', to: paths.adminOrders, icon: ShoppingCart },
  { label: 'Cupons', to: paths.adminCoupons, icon: Ticket, adminOnly: true },
  { label: 'Banners', to: paths.adminBanners, icon: ImageIcon, adminOnly: true },
  { label: 'Eventos', to: paths.adminEvents, icon: CalendarDays, adminOnly: true },
  { label: 'Configurações', to: paths.adminSettings, icon: Settings, adminOnly: true },
  { label: 'Equipe', to: paths.adminTeam, icon: Users, adminOnly: true },
]

export function AdminLayout() {
  const { user, loading, isAdmin, isOperatorOrAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!user) {
    return (
      <Navigate to={`${paths.login}?redirect=${encodeURIComponent(location.pathname)}`} replace />
    )
  }

  if (!isOperatorOrAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-2xl font-semibold">Acesso restrito</h1>
        <p className="text-muted-foreground">
          Sua conta não tem permissão para acessar a área administrativa.
        </p>
        <Link to={paths.home} className="text-primary underline">
          Voltar para a loja
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r bg-secondary/30 lg:block">
        <div className="p-5">
          <Link to={paths.admin} className="font-display text-xl font-semibold">
            Painel Admin
          </Link>
        </div>
        <nav className="space-y-1 px-3">
          {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to)
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/80 hover:bg-accent',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-6 border-t px-3 pt-4">
          <Link
            to={paths.home}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" />
            Ver loja
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden bg-background p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
