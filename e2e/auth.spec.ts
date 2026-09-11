import { expect, test } from '@playwright/test'

// Estes testes exigem um projeto Supabase real conectado (.env preenchido)
// com as migrations aplicadas — ver README "Testes E2E".

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`
}

test.describe('Autenticação', () => {
  test('cadastro cria a conta e loga automaticamente', async ({ page }) => {
    await page.goto('/cadastro')

    await page.getByLabel(/nome completo/i).fill('Cliente Teste E2E')
    await page.getByLabel(/^e-mail$/i).fill(uniqueEmail())
    await page.getByLabel(/^senha$/i).fill('SenhaForte123!')
    await page.getByLabel(/confirmar senha/i).fill('SenhaForte123!')

    await page.getByRole('button', { name: /cadastrar/i }).click()

    await expect(page).toHaveURL(/\/minha-conta/)
  })

  test('login com credenciais inválidas mostra erro', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/e-mail/i).fill('inexistente@example.com')
    await page.getByLabel(/senha/i).fill('senhaerrada123')
    await page.getByRole('button', { name: /entrar/i }).click()

    await expect(page.getByText(/inválid|incorret|erro/i)).toBeVisible({ timeout: 10_000 })
  })

  test('logout redireciona e limpa a sessão', async ({ page }) => {
    const email = uniqueEmail()
    await page.goto('/cadastro')
    await page.getByLabel(/nome completo/i).fill('Cliente Logout E2E')
    await page.getByLabel(/^e-mail$/i).fill(email)
    await page.getByLabel(/^senha$/i).fill('SenhaForte123!')
    await page.getByLabel(/confirmar senha/i).fill('SenhaForte123!')
    await page.getByRole('button', { name: /cadastrar/i }).click()
    await expect(page).toHaveURL(/\/minha-conta/)

    await page.getByRole('button', { name: /sair/i }).click()
    await expect(page).toHaveURL(/\/(login)?$/)

    await page.goto('/minha-conta')
    await expect(page).toHaveURL(/\/login/)
  })

  test('recuperação de senha mostra confirmação genérica', async ({ page }) => {
    await page.goto('/recuperar-senha')
    await page.getByLabel(/e-mail/i).fill('qualquer@example.com')
    await page.getByRole('button', { name: /enviar/i }).click()

    await expect(page.getByText(/e-mail/i)).toBeVisible()
  })
})
