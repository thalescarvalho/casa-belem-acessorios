-- =============================================================================
-- SEED DE DEMONSTRAÇÃO — Casa Belém Acessórios
--
-- Todo conteúdo abaixo é fictício e claramente marcado como "[DEMO]" nos
-- nomes/descrições. NÃO representa produtos, preços ou informações comerciais
-- reais da loja. Substitua pelo catálogo real antes de ir para produção
-- (rode `truncate table public.products, public.categories restart identity
-- cascade;` — cuidado, isso apaga tudo — e cadastre os produtos reais pelo
-- painel /admin ou por importação CSV).
--
-- Rode com: supabase db reset   (aplica migrations + este seed)
-- ou:       psql "$DATABASE_URL" -f supabase/seed.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- site_settings: valores de demonstração. Ajuste tudo isso em
-- /admin/configuracoes assim que tiver as informações reais da loja.
-- -----------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('site_name', '"Casa Belém Acessórios"'::jsonb),
  ('tagline', '"[DEMO] Elegância em cada detalhe"'::jsonb),
  ('logo_url', 'null'::jsonb),
  ('favicon_url', 'null'::jsonb),
  ('whatsapp_number', '""'::jsonb),
  ('instagram_url', '"https://www.instagram.com/casabelemacessorios/"'::jsonb),
  ('contact_email', '""'::jsonb),
  ('contact_address', '""'::jsonb),
  ('business_hours', '"[DEMO] Seg a Sex, 9h às 18h"'::jsonb),
  (
    'theme_colors',
    '{"primary": "32 52% 40%", "secondary": "30 22% 93%", "accent": "14 48% 44%"}'::jsonb
  ),
  (
    'benefits',
    '[
      {"icon": "shield-check", "title": "Compra segura", "description": "Seus dados protegidos do início ao fim"},
      {"icon": "credit-card", "title": "Pagamento facilitado", "description": "PIX ou cartão, com parcelamento"},
      {"icon": "truck", "title": "Entrega", "description": "Retirada ou envio para todo o Brasil"},
      {"icon": "headset", "title": "Atendimento", "description": "Fale conosco pelo WhatsApp"},
      {"icon": "refresh-ccw", "title": "Trocas", "description": "Política de trocas facilitada"}
    ]'::jsonb
  ),
  (
    'freight_rules',
    '{
      "pickup": {"enabled": true, "cost_cents": 0},
      "local_delivery": {"enabled": true, "cost_cents": 1500},
      "standard": {"enabled": true, "cost_cents": 2500, "free_above_cents": 30000},
      "free": {"enabled": false, "cost_cents": 0}
    }'::jsonb
  ),
  (
    'payment_methods',
    '{"pix": true, "credit_card": true, "max_installments": 3}'::jsonb
  ),
  (
    'policies',
    '{
      "returns": "[DEMO] Política de trocas e devoluções — defina o texto real em /admin/configuracoes.",
      "privacy": "[DEMO] Política de privacidade — defina o texto real em /admin/configuracoes.",
      "shipping": "[DEMO] Política de envio — defina o texto real em /admin/configuracoes."
    }'::jsonb
  ),
  (
    'social_links',
    '{"instagram": "https://www.instagram.com/casabelemacessorios/", "facebook": "", "tiktok": ""}'::jsonb
  )
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- categories [DEMO]
-- -----------------------------------------------------------------------------
insert into public.categories (id, name, slug, description, sort_order, active) values
  ('11111111-1111-1111-1111-111111111101', 'Anéis', 'aneis', '[DEMO] Categoria de demonstração.', 1, true),
  ('11111111-1111-1111-1111-111111111102', 'Brincos', 'brincos', '[DEMO] Categoria de demonstração.', 2, true),
  ('11111111-1111-1111-1111-111111111103', 'Colares', 'colares', '[DEMO] Categoria de demonstração.', 3, true),
  ('11111111-1111-1111-1111-111111111104', 'Pulseiras', 'pulseiras', '[DEMO] Categoria de demonstração.', 4, true),
  ('11111111-1111-1111-1111-111111111105', 'Conjuntos', 'conjuntos', '[DEMO] Categoria de demonstração.', 5, true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- products [DEMO] — preços fictícios em centavos
-- -----------------------------------------------------------------------------
insert into public.products (
  id, sku, name, slug, description, category_id, price_cents, sale_price_cents,
  status, is_featured, is_new, is_bestseller, tags
) values
  (
    '22222222-2222-2222-2222-222222222201', 'DEMO-ANEL-001', '[DEMO] Anel Solitário Dourado',
    'demo-anel-solitario-dourado', '[DEMO] Produto de demonstração — substitua pelo catálogo real.',
    '11111111-1111-1111-1111-111111111101', 8900, null, 'active', true, true, false, array['dourado', 'demo']
  ),
  (
    '22222222-2222-2222-2222-222222222202', 'DEMO-BRIN-001', '[DEMO] Brinco Argola Média',
    'demo-brinco-argola-media', '[DEMO] Produto de demonstração — substitua pelo catálogo real.',
    '11111111-1111-1111-1111-111111111102', 6900, 5900, 'active', true, false, true, array['prata', 'demo']
  ),
  (
    '22222222-2222-2222-2222-222222222203', 'DEMO-COLA-001', '[DEMO] Colar Ponto de Luz',
    'demo-colar-ponto-de-luz', '[DEMO] Produto de demonstração — substitua pelo catálogo real.',
    '11111111-1111-1111-1111-111111111103', 12900, null, 'active', false, true, false, array['dourado', 'demo']
  ),
  (
    '22222222-2222-2222-2222-222222222204', 'DEMO-PULS-001', '[DEMO] Pulseira Elos Finos',
    'demo-pulseira-elos-finos', '[DEMO] Produto de demonstração — substitua pelo catálogo real.',
    '11111111-1111-1111-1111-111111111104', 7900, 6500, 'active', true, false, true, array['prata', 'demo']
  ),
  (
    '22222222-2222-2222-2222-222222222205', 'DEMO-CONJ-001', '[DEMO] Conjunto Colar + Brinco Cerimônia',
    'demo-conjunto-colar-brinco-cerimonia', '[DEMO] Produto de demonstração — substitua pelo catálogo real.',
    '11111111-1111-1111-1111-111111111105', 18900, null, 'active', true, true, false, array['cerimonia', 'demo']
  ),
  (
    '22222222-2222-2222-2222-222222222206', 'DEMO-ANEL-002', '[DEMO] Anel Trio Zircônias',
    'demo-anel-trio-zirconias', '[DEMO] Produto de demonstração — substitua pelo catálogo real.',
    '11111111-1111-1111-1111-111111111101', 9900, 7900, 'active', false, false, true, array['zirconia', 'demo']
  )
on conflict (id) do nothing;

insert into public.product_images (product_id, url, alt, sort_order, is_primary) values
  ('22222222-2222-2222-2222-222222222201', 'https://placehold.co/800x800/e8d4b8/3a2a1a?text=DEMO', '[DEMO] Anel Solitário Dourado', 0, true),
  ('22222222-2222-2222-2222-222222222202', 'https://placehold.co/800x800/e8d4b8/3a2a1a?text=DEMO', '[DEMO] Brinco Argola Média', 0, true),
  ('22222222-2222-2222-2222-222222222203', 'https://placehold.co/800x800/e8d4b8/3a2a1a?text=DEMO', '[DEMO] Colar Ponto de Luz', 0, true),
  ('22222222-2222-2222-2222-222222222204', 'https://placehold.co/800x800/e8d4b8/3a2a1a?text=DEMO', '[DEMO] Pulseira Elos Finos', 0, true),
  ('22222222-2222-2222-2222-222222222205', 'https://placehold.co/800x800/e8d4b8/3a2a1a?text=DEMO', '[DEMO] Conjunto Cerimônia', 0, true),
  ('22222222-2222-2222-2222-222222222206', 'https://placehold.co/800x800/e8d4b8/3a2a1a?text=DEMO', '[DEMO] Anel Trio Zircônias', 0, true)
on conflict do nothing;

insert into public.inventory (product_id, variant_id, quantity)
select id, null, 25 from public.products where sku like 'DEMO-%'
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- banners [DEMO]
-- -----------------------------------------------------------------------------
insert into public.banners (title, subtitle, desktop_image_url, mobile_image_url, button_label, button_url, sort_order, active) values
  (
    '[DEMO] Nova Coleção', 'Substitua por uma imagem e texto reais em /admin/banners',
    'https://placehold.co/1600x600/2b1d10/e8d4b8?text=DEMO+BANNER+DESKTOP',
    'https://placehold.co/800x900/2b1d10/e8d4b8?text=DEMO+BANNER+MOBILE',
    'Ver produtos', '/produtos', 1, true
  )
on conflict do nothing;

-- =============================================================================
-- Promovendo o primeiro administrador
-- =============================================================================
-- 1. Cadastre-se normalmente pelo site (/cadastro) com o e-mail que será o
--    administrador principal.
-- 2. Rode o comando abaixo (psql / SQL editor do Supabase), substituindo o
--    e-mail:
--
--    insert into public.admin_users (user_id, role)
--    select id, 'admin' from public.profiles where email = 'seu-email@exemplo.com'
--    on conflict (user_id) do update set role = 'admin';
--
-- Nenhum admin é criado automaticamente por segurança — este passo é sempre
-- manual.
-- =============================================================================
