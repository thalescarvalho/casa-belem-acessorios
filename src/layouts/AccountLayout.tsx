import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { User, MapPin, Package, Heart, Lock, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { paths } from '@/routes/paths'
import { PageLoader } from '@/components/common/PageLoader'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const navItems = [
  { to: paths.account, label: 'Meus dados', icon: User, end: true },
  { to: paths.accountAddresses, label: 'Endereços', icon: MapPin, end: false },
  { to: paths.accountOrders, label: 'Meus pedidos', icon: Package, end: false },
  { to: paths.accountFavorites, label: 'Favoritos', icon: Heart, end: false },
  { to: paths.accountPassword, label: 'Alterar senha', icon: Lock, end: false },
]

export function AccountLayout() {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()

  if (loading) return <PageLoader />

  if (!user) return <Navigate to={paths.login} replace />

  async function handleLogout() {
    await signOut()
    navigate(paths.home)
  }

  return (
    <div className="container py-8">
      <h1 className="mb-6 font-display text-2xl font-semibold sm:text-3xl">Minha conta</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-muted px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </nav>

          <nav className="hidden lg:flex lg:flex-col lg:gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            <Separator className="my-2" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </nav>
        </aside>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
