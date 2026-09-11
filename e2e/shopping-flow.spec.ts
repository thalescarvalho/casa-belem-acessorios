import { expect, test } from '@playwright/test'

// Fluxo completo: produto -> carrinho -> checkout -> pedido criado.
// Depende do seed de demonstração (supabase/seed.sql) estar aplicado —
// usa o produto DEMO "demo-anel-solitario-dourado".

const DEMO_PRODUCT_SLUG = 'demo-anel-solitario-dourado'

test.describe('Fluxo de compra', () => {
  test('adicionar produto ao carrinho e ver no carrinho', async ({ page }) => {
    await page.goto(`/produto/${DEMO_PRODUCT_SLUG}`)
    await page.getByRole('button', { name: /adicionar ao carrinho/i }).click()

    await page.goto('/carrinho')
    await expect(page.getByText(/DEMO.*Anel Solit/i)).toBeVisible()
  })

  test('carrinho persiste após atualizar a página', async ({ page }) => {
    await page.goto(`/produto/${DEMO_PRODUCT_SLUG}`)
    await page.getByRole('button', { name: /adicionar ao carrinho/i }).click()

    await page.reload()
    await expect(page.locator('header').getByLabel(/carrinho/i)).toContainText('1')
  })

  test('cupom inválido mostra mensagem de erro no carrinho', async ({ page }) => {
    await page.goto(`/produto/${DEMO_PRODUCT_SLUG}`)
    await page.getByRole('button', { name: /adicionar ao carrinho/i }).click()
    await page.goto('/carrinho')

    await page.getByPlaceholder(/cupom/i).fill('CUPOMINEXISTENTE123')
    await page.getByRole('button', { name: /aplicar/i }).click()

    await expect(page.getByText(/inválido/i)).toBeVisible({ timeout: 10_000 })
  })

  test('checkout: identificação -> endereço -> entrega chegam até a etapa de pagamento', async ({
    page,
  }) => {
    await page.goto(`/produto/${DEMO_PRODUCT_SLUG}`)
    await page.getByRole('button', { name: /adicionar ao carrinho/i }).click()
    await page.goto('/checkout')

    await page.getByLabel(/nome completo/i).fill('Comprador E2E')
    await page.getByLabel(/^e-mail$/i).fill('comprador.e2e@example.com')
    await page.getByLabel(/telefone/i).fill('(91) 99999-0000')
    await page.getByLabel(/cpf/i).fill('123.456.789-09')
    await page.getByRole('button', { name: /continuar/i }).click()

    await page.getByLabel(/cep/i).fill('66000-000')
    await page.getByLabel(/destinatário/i).fill('Comprador E2E')
    await page.getByLabel(/^rua$/i).fill('Rua Exemplo')
    await page.getByLabel(/número/i).fill('123')
    await page.getByLabel(/bairro/i).fill('Centro')
    await page.getByLabel(/cidade/i).fill('Belém')
    await page.getByLabel(/estado/i).fill('PA')
    await page.getByRole('button', { name: /continuar/i }).click()

    const firstShippingOption = page
      .locator('button', { hasText: /retirada|entrega|envio|grátis/i })
      .first()
    await firstShippingOption.click()
    await page.getByRole('button', { name: /continuar/i }).click()

    await expect(
      page.getByText(/pagamento ainda não configurado/i).or(page.locator('text=/pix|cartão/i')),
    ).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Casos de borda do produto', () => {
  test('produto sem estoque mostra "Esgotado" e desabilita compra', async () => {
    // Requer um produto DEMO com estoque zerado e allow_backorder=false
    // cadastrado manualmente para este teste (não incluído no seed padrão,
    // que mantém 25 unidades para todos os produtos DEMO). Ajuste o slug
    // abaixo após criar esse produto de teste no seu ambiente.
    test.skip(
      true,
      'Requer produto de teste sem estoque configurado no ambiente — ver comentário acima.',
    )
  })
})
