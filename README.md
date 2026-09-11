# Casa Belém Acessórios — E-commerce

E-commerce completo (frontend + backend + banco + pagamentos) para a Casa Belém Acessórios.

Instagram de referência: https://www.instagram.com/casabelemacessorios/

> A identidade visual, textos institucionais, produtos e demais informações comerciais deste
> repositório são **provisórios/demonstrativos** (marcados como `[DEMO]`) até serem substituídos
> pelos dados reais da loja via `/admin/configuracoes` e pelo cadastro real de produtos.

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + componentes estilo shadcn/ui (Radix UI)
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Pagamentos**: Mercado Pago (PIX + cartão, via Payment Brick) — arquitetura com adapter para
  trocar de gateway no futuro sem reescrever o checkout
- **Qualidade**: ESLint + Prettier, Vitest (testes unitários), Playwright (testes E2E)

## 1. Pré-requisitos

- Node.js 20+ e npm
- Uma conta gratuita em [supabase.com](https://supabase.com) (crie um projeto)
- Uma conta [Mercado Pago Developers](https://www.mercadopago.com.br/developers) (para as
  credenciais de teste/sandbox e, depois, de produção)
- Opcional: [Supabase CLI](https://supabase.com/docs/guides/cli) + Docker, para rodar o Supabase
  localmente

## 2. Instalação

```bash
npm install
cp .env.example .env
```

Preencha o `.env` com a URL e a `anon key` do seu projeto Supabase (Project Settings → API) e,
quando for configurar pagamento, a public key do Mercado Pago. Veja os comentários em
`.env.example` para a lista completa de variáveis — inclusive as que vão como **secrets do
Supabase** (nunca no `.env` do frontend).

## 3. Banco de dados (Supabase)

Todas as tabelas, políticas de RLS, funções e buckets de Storage estão versionados como migrations
SQL em `supabase/migrations/`. Nada foi criado manualmente pelo painel — isso torna o schema
reproduzível e auditável.

### 3.1. Aplicar as migrations

**Opção A — Supabase CLI (recomendado):**

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

**Opção B — SQL Editor do painel Supabase:** copie e execute o conteúdo de cada arquivo em
`supabase/migrations/`, em ordem (o nome do arquivo já é a ordem cronológica).

### 3.2. Seed de demonstração (opcional)

```bash
supabase db reset   # aplica migrations + supabase/seed.sql (ambiente local)
# ou, contra o projeto remoto:
psql "$DATABASE_URL" -f supabase/seed.sql
```

O seed cria categorias, produtos, banner e configurações **claramente marcados como `[DEMO]`** —
substitua pelo catálogo real antes de divulgar o site. Veja o cabeçalho de `supabase/seed.sql`
para o comando de `truncate` e instruções de importação.

### 3.3. Criar o primeiro administrador

Nenhum admin é criado automaticamente (segurança). Depois de se cadastrar normalmente pelo site:

```sql
insert into public.admin_users (user_id, role)
select id, 'admin' from public.profiles where email = 'seu-email@exemplo.com'
on conflict (user_id) do update set role = 'admin';
```

### 3.4. Gerar os tipos TypeScript a partir do schema real

```bash
npm run supabase:types
```

Isso sobrescreve `src/types/database.types.ts` (hoje escrito à mão, espelhando exatamente as
migrations) com os tipos gerados a partir do banco real — rode sempre que o schema mudar.

## 4. Storage

As migrations já criam os buckets `product-images`, `category-images`, `banner-images` e
`site-assets` (públicos para leitura, escrita restrita a admin/operador via RLS de
`storage.objects`). Nenhuma configuração manual adicional é necessária.

## 5. Pagamentos (Mercado Pago)

O checkout usa o **Payment Brick** do Mercado Pago (`@mercadopago/sdk-react`), que renderiza PIX e
cartão (com parcelamento) em um único componente e tokeniza os dados do cartão no navegador — o
número do cartão nunca passa pelo nosso backend.

1. Crie uma aplicação em https://www.mercadopago.com.br/developers/panel
2. Copie as credenciais de **teste** (Public Key `TEST-...` e Access Token `TEST-...`)
3. Frontend (`.env`): `VITE_MERCADOPAGO_PUBLIC_KEY=TEST-...`
4. Backend (secrets das Edge Functions, **nunca** no `.env` do frontend):

   ```bash
   supabase secrets set MERCADOPAGO_ACCESS_TOKEN=TEST-...
   supabase secrets set MERCADOPAGO_WEBHOOK_SECRET=...   # Mercado Pago → Notificações → Assinatura secreta
   ```

   `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` **não precisam** ser configuradas manualmente — o
   Supabase já injeta essas duas automaticamente em toda Edge Function do projeto.

5. Deploy das functions:

   ```bash
   supabase functions deploy create-payment
   supabase functions deploy mercadopago-webhook
   ```

6. No painel do Mercado Pago, configure a URL de notificação (webhook) para:
   `https://SEU-PROJETO.supabase.co/functions/v1/mercadopago-webhook`

**Nunca misture credenciais de teste (`TEST-...`) com produção (`APP_USR-...`)** — troque as três
(public key do frontend, access token e, se usar, o par de produção) juntas ao promover para
produção, nunca uma de cada vez.

O valor cobrado é **sempre** lido do pedido já criado no banco (`orders.total_cents`), nunca do
que o frontend envia — ver `supabase/functions/create-payment/index.ts`. O webhook
(`mercadopago-webhook`) sempre busca o pagamento de novo na API do Mercado Pago antes de atualizar
o pedido — nunca confia no corpo da notificação recebida, e valida a assinatura (`x-signature`)
antes de processar qualquer coisa.

## 6. Frete real (Melhor Envio)

O método de entrega "Envio padrão" cota o frete de verdade (PAC, SEDEX, etc.) via
[Melhor Envio](https://melhorenvio.com.br), usando o peso/dimensões cadastrados em cada produto
(`/admin/produtos`) — nunca um valor vindo do frontend. Sem essa integração configurada, esse
método volta automaticamente a usar o valor fixo definido em `/admin/configuracoes → Frete`.

1. Crie uma conta em https://sandbox.melhorenvio.com.br (teste) e depois em
   https://melhorenvio.com.br (produção) e gere um token de acesso (Gerenciar Tokens de acesso)
2. Backend (secrets das Edge Functions):

   ```bash
   supabase secrets set MELHORENVIO_ACCESS_TOKEN=...
   supabase secrets set MELHORENVIO_SANDBOX=true   # "false" ao trocar para o token de produção
   ```

3. Deploy da function:

   ```bash
   supabase functions deploy calculate-shipping-quote
   ```

4. Em `/admin/configuracoes → Frete`, preencha o **CEP de origem** (de onde os pacotes saem)
5. Cadastre peso e dimensões reais em cada produto (`/admin/produtos`) — sem isso, a cotação usa um
   fallback de embalagem pequena (300g, 16x11x2cm) que não reflete o peso real do item

## 7. Rastreamento de entrega e notificações ao cliente

Três canais, independentes entre si:

- **No site**: ao marcar um pedido como enviado em `/admin/pedidos/:id`, o admin/operador
  preenche transportadora + código de rastreio. O cliente vê isso em
  `/minha-conta/pedidos/:numero`, com link direto de rastreio quando a transportadora é
  reconhecida (Correios, Jadlog, Loggi — ver `src/utils/tracking.ts`).
- **WhatsApp**: no mesmo painel do pedido, um botão "Notificar cliente por WhatsApp" monta a
  mensagem (status + rastreio) e abre o WhatsApp Web/app já preenchido. Manual, sob demanda.
- **E-mail automático**: um gatilho no banco (`public.notify_order_email`, ver migration
  `20260101001500_order_email_trigger.sql`) chama a Edge Function `send-order-email` sempre que um
  pedido é criado ou muda de status. Para ativar:

  1. Crie uma conta grátis em [resend.com](https://resend.com) e gere uma API key
  2. `supabase secrets set RESEND_API_KEY=re_...`
  3. Opcional — sem isso, os e-mails saem de `onboarding@resend.dev`:
     ```bash
     supabase secrets set RESEND_FROM_EMAIL="Casa Belém Acessórios <pedidos@seudominio.com.br>"
     ```
     (exige verificar o domínio em Resend → Domains)
  4. `supabase functions deploy send-order-email`

  Sem a `RESEND_API_KEY` configurada, a function apenas ignora a chamada (não gera erro nem
  bloqueia a criação/atualização do pedido).

## 8. Desenvolvimento

```bash
npm run dev
```

## 9. Qualidade

```bash
npm run lint         # ESLint
npm run format       # Prettier (escreve)
npm run typecheck    # tsc --noEmit
npm run test         # Vitest (unitários)
npm run test:e2e     # Playwright (E2E — precisa do dev server + Supabase configurado, sobe sozinho via webServer)
npm run build         # build de produção
```

Os testes E2E (`e2e/*.spec.ts`) exigem um projeto Supabase real, conectado e com
`supabase/seed.sql` aplicado (usam o produto `demo-anel-solitario-dourado`). Sem isso, eles falham
na etapa de cadastro/produto — não é um bug do teste, é a dependência de ambiente documentada no
topo de cada arquivo.

## 10. Deploy

1. Configure as variáveis de ambiente de produção no seu provedor (Vercel/Netlify/Cloudflare
   Pages/etc.), usando as chaves de **produção** do Supabase e do Mercado Pago
   (`VITE_APP_ENV=production`)
2. `npm run build` gera `dist/`
3. Gere o sitemap com o catálogo real antes do deploy:

   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SITE_URL=https://seu-dominio.com.br \
     npm run generate:sitemap
   ```

4. Configure o SPA fallback (todas as rotas devem servir `index.html`) no seu provedor de deploy —
   é uma aplicação client-side (React Router).

## 11. Limitações conhecidas / próximos passos

- **SEO em crawlers que não executam JS**: as tags Open Graph/meta são escritas via JavaScript no
  cliente (`src/components/common/Seo.tsx`). O Googlebot renderiza JS e indexa normalmente, mas
  crawlers de preview de link que não executam JS (alguns bots de WhatsApp/Facebook/Twitter) podem
  não ver essas tags em tempo real. Para isso, uma futura migração para SSR/pré-renderização
  (ex.: Next.js, ou um serviço de prerender) resolveria definitivamente — fora do escopo desta
  primeira versão.
- **Importação de produtos via CSV**: a arquitetura está pronta para receber uma tela de
  importação (campos: SKU, nome, categoria, descrição, preço, preço promocional, estoque, peso,
  marca, tags — mesmos campos do formulário de produto em `/admin/produtos`), mas a tela de upload
  de CSV em si ainda não foi construída; por ora, o cadastro é feito produto a produto no painel.
- **Avaliações**: ficam pendentes de aprovação por padrão (moderação manual no admin) antes de
  aparecerem na página do produto.

## 12. Estrutura do projeto

```
src/
├── components/       # UI compartilhada (ui/ = primitives estilo shadcn, layout/, product/, home/, catalog/, checkout/, common/)
├── pages/             # Componentes de rota (públicas, /minha-conta/*, /admin/*)
├── layouts/           # StorefrontLayout, AccountLayout, AdminLayout
├── hooks/, contexts/  # AuthContext, SiteSettingsContext
├── services/          # Acesso a dados (Supabase) por domínio; services/admin/ para telas admin
├── features/          # Lógica de negócio isolada e testável (cart/, checkout/, favorites/)
├── lib/               # Cliente Supabase, query client, utils
└── types/              # Tipos do banco (database.types.ts) e de domínio

supabase/
├── migrations/         # Schema completo + RLS (versionado, aplicado via CLI)
├── functions/           # Edge Functions (create-payment, mercadopago-webhook,
│                        #   calculate-shipping-quote, send-order-email)
├── seed.sql              # Dados de demonstração
└── config.toml

e2e/                    # Testes Playwright
scripts/                # generate-sitemap.mjs
```

## 13. Segurança

- RLS habilitado em **todas** as tabelas, sem políticas "allow all" — ver comentários em cada
  migration para o racional de cada policy.
- Nenhum valor de preço, desconto, frete ou aprovação de pagamento é confiado a partir do
  frontend: tudo é recalculado/validado no banco (`public.create_order`,
  `public.validate_coupon`, `public.calculate_shipping`) ou nas Edge Functions. O frete real via
  transportadora segue o mesmo princípio: a Edge Function `calculate-shipping-quote` sempre lê
  peso/dimensões do produto no banco (nunca do payload) e grava a cotação em
  `public.shipping_quotes`, que `public.create_order` valida (existe, não expirou, é para o CEP do
  pedido) antes de usar como `shipping_cents` — a tabela não tem nenhuma policy de select/insert
  para anon/authenticated.
- `service_role key` e credenciais do Mercado Pago e do Melhor Envio existem apenas como secrets
  de Edge Functions, nunca no bundle do frontend.
