import * as React from 'react'
import { Route, Routes } from 'react-router-dom'
import { StorefrontLayout } from '@/layouts/StorefrontLayout'
import { paths } from '@/routes/paths'
import { PageLoader } from '@/components/common/PageLoader'

const HomePage = React.lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const CatalogPage = React.lazy(() =>
  import('@/pages/CatalogPage').then((m) => ({ default: m.CatalogPage })),
)
const ProductPage = React.lazy(() =>
  import('@/pages/ProductPage').then((m) => ({ default: m.ProductPage })),
)
const CartPage = React.lazy(() => import('@/pages/CartPage').then((m) => ({ default: m.CartPage })))
const CheckoutPage = React.lazy(() =>
  import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
)
const OrderConfirmationPage = React.lazy(() =>
  import('@/pages/OrderConfirmationPage').then((m) => ({ default: m.OrderConfirmationPage })),
)
const AboutPage = React.lazy(() =>
  import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })),
)
const ContactPage = React.lazy(() =>
  import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })),
)
const EventsPage = React.lazy(() =>
  import('@/pages/EventsPage').then((m) => ({ default: m.EventsPage })),
)
const PolicyPage = React.lazy(() =>
  import('@/pages/PolicyPage').then((m) => ({ default: m.PolicyPage })),
)
const NotFoundPage = React.lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)

const LoginPage = React.lazy(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const SignupPage = React.lazy(() =>
  import('@/pages/auth/SignupPage').then((m) => ({ default: m.SignupPage })),
)
const ForgotPasswordPage = React.lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
const ResetPasswordPage = React.lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)

const AccountLayout = React.lazy(() =>
  import('@/layouts/AccountLayout').then((m) => ({ default: m.AccountLayout })),
)
const AccountOverviewPage = React.lazy(() =>
  import('@/pages/account/AccountOverviewPage').then((m) => ({ default: m.AccountOverviewPage })),
)
const AccountAddressesPage = React.lazy(() =>
  import('@/pages/account/AccountAddressesPage').then((m) => ({ default: m.AccountAddressesPage })),
)
const AccountOrdersPage = React.lazy(() =>
  import('@/pages/account/AccountOrdersPage').then((m) => ({ default: m.AccountOrdersPage })),
)
const AccountOrderDetailPage = React.lazy(() =>
  import('@/pages/account/AccountOrderDetailPage').then((m) => ({
    default: m.AccountOrderDetailPage,
  })),
)
const AccountFavoritesPage = React.lazy(() =>
  import('@/pages/account/AccountFavoritesPage').then((m) => ({ default: m.AccountFavoritesPage })),
)
const AccountPasswordPage = React.lazy(() =>
  import('@/pages/account/AccountPasswordPage').then((m) => ({ default: m.AccountPasswordPage })),
)

const AdminLayout = React.lazy(() =>
  import('@/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)
const AdminDashboardPage = React.lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)
const AdminProductsPage = React.lazy(() =>
  import('@/pages/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage })),
)
const AdminProductFormPage = React.lazy(() =>
  import('@/pages/admin/AdminProductFormPage').then((m) => ({ default: m.AdminProductFormPage })),
)
const AdminCategoriesPage = React.lazy(() =>
  import('@/pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })),
)
const AdminOrdersPage = React.lazy(() =>
  import('@/pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })),
)
const AdminOrderDetailPage = React.lazy(() =>
  import('@/pages/admin/AdminOrderDetailPage').then((m) => ({ default: m.AdminOrderDetailPage })),
)
const AdminCouponsPage = React.lazy(() =>
  import('@/pages/admin/AdminCouponsPage').then((m) => ({ default: m.AdminCouponsPage })),
)
const AdminBannersPage = React.lazy(() =>
  import('@/pages/admin/AdminBannersPage').then((m) => ({ default: m.AdminBannersPage })),
)
const AdminSettingsPage = React.lazy(() =>
  import('@/pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })),
)
const AdminTeamPage = React.lazy(() =>
  import('@/pages/admin/AdminTeamPage').then((m) => ({ default: m.AdminTeamPage })),
)
const AdminEventsPage = React.lazy(() =>
  import('@/pages/admin/AdminEventsPage').then((m) => ({ default: m.AdminEventsPage })),
)

export default function App() {
  return (
    <React.Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<StorefrontLayout />}>
          <Route path={paths.home} element={<HomePage />} />
          <Route path={paths.products} element={<CatalogPage />} />
          <Route path="/produto/:slug" element={<ProductPage />} />
          <Route path={paths.cart} element={<CartPage />} />
          <Route path={paths.checkout} element={<CheckoutPage />} />
          <Route path="/checkout/confirmacao/:orderNumber" element={<OrderConfirmationPage />} />

          <Route path={paths.login} element={<LoginPage />} />
          <Route path={paths.signup} element={<SignupPage />} />
          <Route path={paths.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={paths.resetPassword} element={<ResetPasswordPage />} />

          <Route path={paths.about} element={<AboutPage />} />
          <Route path={paths.contact} element={<ContactPage />} />
          <Route path={paths.events} element={<EventsPage />} />
          <Route
            path={paths.returnsPolicy}
            element={<PolicyPage policyKey="returns" title="Trocas e devoluções" />}
          />
          <Route
            path={paths.privacyPolicy}
            element={<PolicyPage policyKey="privacy" title="Política de privacidade" />}
          />
          <Route
            path={paths.shippingPolicy}
            element={<PolicyPage policyKey="shipping" title="Política de envio" />}
          />

          <Route path={paths.account} element={<AccountLayout />}>
            <Route index element={<AccountOverviewPage />} />
            <Route path="enderecos" element={<AccountAddressesPage />} />
            <Route path="pedidos" element={<AccountOrdersPage />} />
            <Route path="pedidos/:orderNumber" element={<AccountOrderDetailPage />} />
            <Route path="favoritos" element={<AccountFavoritesPage />} />
            <Route path="senha" element={<AccountPasswordPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path={paths.admin} element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="produtos" element={<AdminProductsPage />} />
          <Route path="produtos/novo" element={<AdminProductFormPage />} />
          <Route path="produtos/:id" element={<AdminProductFormPage />} />
          <Route path="categorias" element={<AdminCategoriesPage />} />
          <Route path="pedidos" element={<AdminOrdersPage />} />
          <Route path="pedidos/:id" element={<AdminOrderDetailPage />} />
          <Route path="cupons" element={<AdminCouponsPage />} />
          <Route path="banners" element={<AdminBannersPage />} />
          <Route path="eventos" element={<AdminEventsPage />} />
          <Route path="configuracoes" element={<AdminSettingsPage />} />
          <Route path="equipe" element={<AdminTeamPage />} />
        </Route>
      </Routes>
    </React.Suspense>
  )
}
