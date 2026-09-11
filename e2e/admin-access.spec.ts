import { expect, test } from '@playwright/test'

test.describe('Controle de acesso administrativo', () => {
  test('visitante não autenticado é redirecionado ao login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })

  test('cliente comum autenticado vê mensagem de acesso restrito', async ({ page }) => {
    const email = `e2e-customer-${Date.now()}@example.com`
    await page.goto('/cadastro')
    await page.getByLabel(/nome completo/i).fill('Cliente Sem Acesso Admin')
    await page.getByLabel(/^e-mail$/i).fill(email)
    await page.getByLabel(/^senha$/i).fill('SenhaForte123!')
    await page.getByLabel(/confirmar senha/i).fill('SenhaForte123!')
    await page.getByRole('button', { name: /cadastrar/i }).click()
    await expect(page).toHaveURL(/\/minha-conta/)

    await page.goto('/admin')
    await expect(page.getByText(/acesso restrito/i)).toBeVisible()
  })
})
