-- =============================================================================
-- Supabase Storage: buckets para imagens de produtos, categorias e banners.
-- Leitura pública (necessária para exibir as imagens no site), escrita
-- restrita a admin/operador.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('category-images', 'category-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('banner-images', 'banner-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('site-assets', 'site-assets', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon'])
on conflict (id) do nothing;

create policy "storage_public_read_product_images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "storage_public_read_category_images"
  on storage.objects for select
  using (bucket_id = 'category-images');

create policy "storage_public_read_banner_images"
  on storage.objects for select
  using (bucket_id = 'banner-images');

create policy "storage_public_read_site_assets"
  on storage.objects for select
  using (bucket_id = 'site-assets');

create policy "storage_staff_write_product_images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin_or_operator());

create policy "storage_staff_update_product_images"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin_or_operator())
  with check (bucket_id = 'product-images' and public.is_admin_or_operator());

create policy "storage_staff_delete_product_images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin_or_operator());

create policy "storage_staff_write_category_images"
  on storage.objects for insert
  with check (bucket_id = 'category-images' and public.is_admin_or_operator());

create policy "storage_staff_update_category_images"
  on storage.objects for update
  using (bucket_id = 'category-images' and public.is_admin_or_operator())
  with check (bucket_id = 'category-images' and public.is_admin_or_operator());

create policy "storage_staff_delete_category_images"
  on storage.objects for delete
  using (bucket_id = 'category-images' and public.is_admin_or_operator());

create policy "storage_admin_write_banner_images"
  on storage.objects for insert
  with check (bucket_id = 'banner-images' and public.is_admin());

create policy "storage_admin_update_banner_images"
  on storage.objects for update
  using (bucket_id = 'banner-images' and public.is_admin())
  with check (bucket_id = 'banner-images' and public.is_admin());

create policy "storage_admin_delete_banner_images"
  on storage.objects for delete
  using (bucket_id = 'banner-images' and public.is_admin());

create policy "storage_admin_write_site_assets"
  on storage.objects for insert
  with check (bucket_id = 'site-assets' and public.is_admin());

create policy "storage_admin_update_site_assets"
  on storage.objects for update
  using (bucket_id = 'site-assets' and public.is_admin())
  with check (bucket_id = 'site-assets' and public.is_admin());

create policy "storage_admin_delete_site_assets"
  on storage.objects for delete
  using (bucket_id = 'site-assets' and public.is_admin());
