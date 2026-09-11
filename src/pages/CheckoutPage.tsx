import * as React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCartStore } from '@/features/cart/cartStore'
import { calcSubtotalCents, calcTotalCents } from '@/features/cart/cartMath'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { createOrder } from '@/services/orders'
import type { ShippingQuote } from '@/services/shipping'
import type { CreatePaymentResult } from '@/services/payments'
import { CheckoutStepper } from '@/components/checkout/CheckoutStepper'
import { StepIdentification } from '@/components/checkout/StepIdentification'
import { StepAddress } from '@/components/checkout/StepAddress'
import { StepShipping } from '@/components/checkout/StepShipping'
import { StepPayment } from '@/components/checkout/StepPayment'
import { CheckoutSummary } from '@/components/checkout/CheckoutSummary'
import { calcShippingCostPreview } from '@/features/checkout/shipping'
import {
  emptyAddress,
  type AddressData,
  type IdentificationData,
  type ShippingMethod,
} from '@/features/checkout/types'
import { paths } from '@/routes/paths'

export function CheckoutPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { settings } = useSiteSettings()
  const items = useCartStore((s) => s.items)
  const coupon = useCartStore((s) => s.coupon)
  const clearCart = useCartStore((s) => s.clear)

  const [step, setStep] = React.useState(1)
  const [identification, setIdentification] = React.useState<IdentificationData>({
    name: '',
    email: '',
    cpf: '',
    phone: '',
  })
  const [address, setAddress] = React.useState<AddressData>(emptyAddress)
  const [shippingMethod, setShippingMethod] = React.useState<ShippingMethod | null>(null)
  const [shippingQuote, setShippingQuote] = React.useState<ShippingQuote | null>(null)
  const [order, setOrder] = React.useState<{
    id: string
    number: string
    totalCents: number
  } | null>(null)
  const [isCreatingOrder, setIsCreatingOrder] = React.useState(false)

  React.useEffect(() => {
    if (profile) {
      setIdentification((prev) => ({
        name: prev.name || profile.full_name || '',
        email: prev.email || profile.email || '',
        cpf: prev.cpf || profile.cpf || '',
        phone: prev.phone || profile.phone || '',
      }))
    }
  }, [profile])

  React.useEffect(() => {
    setShippingQuote(null)
  }, [address.cep])

  if (items.length === 0 && !order) {
    return <Navigate to={paths.cart} replace />
  }

  const subtotalCents = calcSubtotalCents(items)
  // coupon.discountCents já vem calculado com autoridade pelo backend
  // (RPC validate_coupon); o pedido final sempre revalida no servidor
  // (public.create_order), então aqui é só uma prévia limitada ao subtotal.
  const discountCents = coupon ? Math.min(coupon.discountCents, subtotalCents) : 0
  const shippingCents = shippingMethod
    ? coupon?.freeShipping
      ? 0
      : shippingQuote
        ? shippingQuote.cost_cents
        : calcShippingCostPreview(settings.freight_rules[shippingMethod], subtotalCents)
    : null
  const totalCents =
    order?.totalCents ??
    calcTotalCents({ subtotalCents, discountCents, shippingCents: shippingCents ?? 0 })

  async function handleConfirmShipping() {
    if (!shippingMethod) return
    setIsCreatingOrder(true)
    try {
      const result = await createOrder({
        items: items.map((i) => ({
          product_id: i.productId,
          variant_id: i.variantId,
          quantity: i.quantity,
        })),
        shippingAddress: address,
        shippingMethod,
        shippingQuoteId: shippingQuote?.id ?? null,
        couponCode: coupon?.code ?? null,
        guestName: identification.name,
        guestEmail: identification.email,
        guestCpf: identification.cpf,
        guestPhone: identification.phone,
      })
      setOrder({ id: result.order_id, number: result.order_number, totalCents: result.total_cents })
      setStep(4)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar o pedido.')
    } finally {
      setIsCreatingOrder(false)
    }
  }

  function handlePaymentResult(result: CreatePaymentResult) {
    if (!order) return
    if (result.status === 'rejected') {
      toast.error('Pagamento recusado. Tente novamente com outro método ou cartão.')
      return
    }
    clearCart()
    navigate(`/checkout/confirmacao/${order.number}`, {
      state: { orderNumber: order.number, totalCents: order.totalCents, payment: result },
    })
  }

  return (
    <div className="container py-8">
      <h1 className="mb-2 font-display text-3xl font-semibold">Finalizar compra</h1>
      <CheckoutStepper current={step} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border p-6">
          {step === 1 && (
            <StepIdentification
              value={identification}
              onChange={setIdentification}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepAddress
              value={address}
              onChange={setAddress}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepShipping
              value={shippingMethod}
              onChange={setShippingMethod}
              subtotalCents={subtotalCents}
              cepDestino={address.cep}
              items={items.map((i) => ({ product_id: i.productId, quantity: i.quantity }))}
              quote={shippingQuote}
              onQuoteChange={setShippingQuote}
              onNext={handleConfirmShipping}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && order && (
            <StepPayment
              orderId={order.id}
              amountCents={order.totalCents}
              payerEmail={identification.email || user?.email || ''}
              onResult={handlePaymentResult}
              onBack={() => setStep(3)}
            />
          )}
          {isCreatingOrder && (
            <p className="mt-4 text-sm text-muted-foreground">Criando pedido...</p>
          )}
        </div>

        <CheckoutSummary
          items={items}
          subtotalCents={subtotalCents}
          discountCents={discountCents}
          shippingCents={shippingCents}
          totalCents={totalCents}
        />
      </div>
    </div>
  )
}
