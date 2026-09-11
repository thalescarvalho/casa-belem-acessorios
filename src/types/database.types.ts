// Tipos do banco de dados — espelham supabase/migrations/*.sql.
//
// Este arquivo é escrito à mão porque o projeto ainda não está conectado a
// uma instância Supabase real. Assim que o projeto estiver linkado, gere os
// tipos definitivos a partir do schema real com:
//
//   npm run supabase:types
//   (equivalente a: supabase gen types typescript --local > src/types/database.types.ts)
//
// e revise o diff — o formato abaixo já segue a convenção gerada pela CLI,
// incluindo o campo "Relationships" (obrigatório pelo @supabase/postgrest-js
// para resolver joins tipados via `select("*, other_table(...)")" — sem ele,
// o client volta a inferir `never` para os resultados das queries).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type NoRelationships = []

// Relacionamentos realmente usados em `.select('*, tabela(...)')` no código
// (ver `src/services/*.ts`) — precisam espelhar o nome da FK que o Postgres
// gera por padrão (`<tabela>_<coluna>_fkey`, dado que nenhuma migration usa
// `constraint` nomeado explicitamente).
//
// IMPORTANTE: o relacionamento é declarado do lado da tabela que POSSUI a
// coluna de FK (o lado "filho"), nunca do lado "pai". Ex.: product_images
// possui product_id -> products.id, então o relacionamento vive em
// ProductImagesRelationships, não em ProductsRelationships — é assim que o
// select-query-parser do postgrest-js decide se um embed resolve para um
// objeto único (consultando o lado filho, embutindo o pai) ou um array
// (consultando o lado pai, embutindo os filhos).
type ProductsRelationships = [
  {
    foreignKeyName: 'products_category_id_fkey'
    columns: ['category_id']
    isOneToOne: false
    referencedRelation: 'categories'
    referencedColumns: ['id']
  },
]

type ProductImagesRelationships = [
  {
    foreignKeyName: 'product_images_product_id_fkey'
    columns: ['product_id']
    isOneToOne: false
    referencedRelation: 'products'
    referencedColumns: ['id']
  },
]

type ProductVariantsRelationships = [
  {
    foreignKeyName: 'product_variants_product_id_fkey'
    columns: ['product_id']
    isOneToOne: false
    referencedRelation: 'products'
    referencedColumns: ['id']
  },
]

type InventoryRelationships = [
  {
    foreignKeyName: 'inventory_product_id_fkey'
    columns: ['product_id']
    isOneToOne: false
    referencedRelation: 'products'
    referencedColumns: ['id']
  },
  {
    foreignKeyName: 'inventory_variant_id_fkey'
    columns: ['variant_id']
    isOneToOne: false
    referencedRelation: 'product_variants'
    referencedColumns: ['id']
  },
]

type AdminUsersRelationships = [
  {
    foreignKeyName: 'admin_users_user_id_fkey'
    columns: ['user_id']
    isOneToOne: true
    referencedRelation: 'profiles'
    referencedColumns: ['id']
  },
]

type ReviewsRelationships = [
  {
    foreignKeyName: 'reviews_user_id_fkey'
    columns: ['user_id']
    isOneToOne: false
    referencedRelation: 'profiles'
    referencedColumns: ['id']
  },
]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          cpf: string | null
          phone: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
        Relationships: NoRelationships
      }
      admin_users: {
        Row: {
          user_id: string
          role: 'admin' | 'operator'
          created_at: string
          created_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['admin_users']['Row']> & {
          user_id: string
          role: 'admin' | 'operator'
        }
        Update: Partial<Database['public']['Tables']['admin_users']['Row']>
        Relationships: AdminUsersRelationships
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          image_url: string | null
          sort_order: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['categories']['Row']> & {
          name: string
          slug: string
        }
        Update: Partial<Database['public']['Tables']['categories']['Row']>
        Relationships: NoRelationships
      }
      products: {
        Row: {
          id: string
          sku: string
          internal_code: string | null
          name: string
          slug: string
          description: string | null
          category_id: string | null
          price_cents: number
          sale_price_cents: number | null
          weight_grams: number | null
          length_cm: number | null
          width_cm: number | null
          height_cm: number | null
          tags: string[]
          status: 'draft' | 'active' | 'archived'
          is_featured: boolean
          is_new: boolean
          is_bestseller: boolean
          allow_backorder: boolean
          min_stock_alert: number
          meta_title: string | null
          meta_description: string | null
          sales_count: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['products']['Row']> & {
          sku: string
          name: string
          slug: string
          price_cents: number
        }
        Update: Partial<Database['public']['Tables']['products']['Row']>
        Relationships: ProductsRelationships
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          url: string
          alt: string | null
          sort_order: number
          is_primary: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['product_images']['Row']> & {
          product_id: string
          url: string
        }
        Update: Partial<Database['public']['Tables']['product_images']['Row']>
        Relationships: ProductImagesRelationships
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          name: string
          sku: string | null
          price_delta_cents: number
          attributes: Record<string, string>
          active: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['product_variants']['Row']> & {
          product_id: string
          name: string
        }
        Update: Partial<Database['public']['Tables']['product_variants']['Row']>
        Relationships: ProductVariantsRelationships
      }
      inventory: {
        Row: {
          id: string
          product_id: string
          variant_id: string | null
          quantity: number
          reserved_quantity: number
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['inventory']['Row']> & { product_id: string }
        Update: Partial<Database['public']['Tables']['inventory']['Row']>
        Relationships: InventoryRelationships
      }
      inventory_movements: {
        Row: {
          id: string
          inventory_id: string
          type: 'in' | 'out' | 'adjustment' | 'sale' | 'cancellation' | 'reservation' | 'release'
          quantity_delta: number
          reason: string | null
          order_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['inventory_movements']['Row']> & {
          inventory_id: string
          type: Database['public']['Tables']['inventory_movements']['Row']['type']
          quantity_delta: number
        }
        Update: Partial<Database['public']['Tables']['inventory_movements']['Row']>
        Relationships: NoRelationships
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          label: string | null
          recipient_name: string
          cep: string
          street: string
          number: string
          complement: string | null
          neighborhood: string
          city: string
          state: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['addresses']['Row']> & {
          user_id: string
          recipient_name: string
          cep: string
          street: string
          number: string
          neighborhood: string
          city: string
          state: string
        }
        Update: Partial<Database['public']['Tables']['addresses']['Row']>
        Relationships: NoRelationships
      }
      carts: {
        Row: {
          id: string
          user_id: string
          coupon_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['carts']['Row']> & { user_id: string }
        Update: Partial<Database['public']['Tables']['carts']['Row']>
        Relationships: NoRelationships
      }
      cart_items: {
        Row: {
          id: string
          cart_id: string
          product_id: string
          variant_id: string | null
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['cart_items']['Row']> & {
          cart_id: string
          product_id: string
          quantity: number
        }
        Update: Partial<Database['public']['Tables']['cart_items']['Row']>
        Relationships: NoRelationships
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string | null
          guest_name: string | null
          guest_email: string | null
          guest_cpf: string | null
          guest_phone: string | null
          status:
            | 'awaiting_payment'
            | 'payment_approved'
            | 'preparing'
            | 'shipped'
            | 'delivered'
            | 'cancelled'
            | 'refunded'
          subtotal_cents: number
          discount_cents: number
          shipping_cents: number
          total_cents: number
          coupon_id: string | null
          shipping_address: Json
          shipping_method: 'pickup' | 'local_delivery' | 'standard' | 'free'
          notes: string | null
          tracking_code: string | null
          carrier: string | null
          tracking_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['orders']['Row']>
        Update: Partial<Database['public']['Tables']['orders']['Row']>
        Relationships: NoRelationships
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          variant_id: string | null
          product_name: string
          sku: string
          quantity: number
          unit_price_cents: number
          total_cents: number
        }
        Insert: Partial<Database['public']['Tables']['order_items']['Row']> & {
          order_id: string
          product_name: string
          sku: string
          quantity: number
          unit_price_cents: number
          total_cents: number
        }
        Update: Partial<Database['public']['Tables']['order_items']['Row']>
        Relationships: NoRelationships
      }
      order_status_history: {
        Row: {
          id: string
          order_id: string
          status: string
          note: string | null
          changed_by: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['order_status_history']['Row']> & {
          order_id: string
          status: string
        }
        Update: Partial<Database['public']['Tables']['order_status_history']['Row']>
        Relationships: NoRelationships
      }
      payments: {
        Row: {
          id: string
          order_id: string
          provider: string
          provider_payment_id: string | null
          method: 'pix' | 'credit_card'
          status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded'
          amount_cents: number
          installments: number
          qr_code: string | null
          qr_code_base64: string | null
          ticket_url: string | null
          raw_payload: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['payments']['Row']> & {
          order_id: string
          method: 'pix' | 'credit_card'
          amount_cents: number
        }
        Update: Partial<Database['public']['Tables']['payments']['Row']>
        Relationships: NoRelationships
      }
      coupons: {
        Row: {
          id: string
          code: string
          type: 'percentage' | 'fixed' | 'free_shipping'
          value: number
          starts_at: string | null
          expires_at: string | null
          min_order_cents: number
          usage_limit: number | null
          usage_limit_per_customer: number
          applicable_category_ids: string[]
          applicable_product_ids: string[]
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['coupons']['Row']> & {
          code: string
          type: 'percentage' | 'fixed' | 'free_shipping'
        }
        Update: Partial<Database['public']['Tables']['coupons']['Row']>
        Relationships: NoRelationships
      }
      coupon_usages: {
        Row: {
          id: string
          coupon_id: string
          order_id: string
          user_id: string | null
          used_at: string
        }
        Insert: Partial<Database['public']['Tables']['coupon_usages']['Row']> & {
          coupon_id: string
          order_id: string
        }
        Update: Partial<Database['public']['Tables']['coupon_usages']['Row']>
        Relationships: NoRelationships
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          product_id: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['favorites']['Row']> & {
          user_id: string
          product_id: string
        }
        Update: Partial<Database['public']['Tables']['favorites']['Row']>
        Relationships: NoRelationships
      }
      reviews: {
        Row: {
          id: string
          product_id: string
          user_id: string
          rating: number
          title: string | null
          comment: string | null
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['reviews']['Row']> & {
          product_id: string
          user_id: string
          rating: number
        }
        Update: Partial<Database['public']['Tables']['reviews']['Row']>
        Relationships: ReviewsRelationships
      }
      banners: {
        Row: {
          id: string
          title: string | null
          subtitle: string | null
          desktop_image_url: string
          mobile_image_url: string | null
          button_label: string | null
          button_url: string | null
          sort_order: number
          active: boolean
          starts_at: string | null
          ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['banners']['Row']> & {
          desktop_image_url: string
        }
        Update: Partial<Database['public']['Tables']['banners']['Row']>
        Relationships: NoRelationships
      }
      site_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['site_settings']['Row']> & {
          key: string
          value: Json
        }
        Update: Partial<Database['public']['Tables']['site_settings']['Row']>
        Relationships: NoRelationships
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          before: Json | null
          after: Json | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['audit_logs']['Row']> & {
          action: string
          entity_type: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Row']>
        Relationships: NoRelationships
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          banner_url: string | null
          images: string[]
          event_date: string
          end_date: string | null
          event_time: string | null
          publish_at: string | null
          location: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['events']['Row']> & {
          title: string
          event_date: string
          location: string
        }
        Update: Partial<Database['public']['Tables']['events']['Row']>
        Relationships: NoRelationships
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      is_admin_or_operator: { Args: Record<string, never>; Returns: boolean }
      current_admin_role: { Args: Record<string, never>; Returns: string | null }
      calculate_shipping: {
        Args: { p_method: string; p_subtotal_cents: number }
        Returns: number
      }
      validate_coupon: {
        Args: { p_code: string; p_items: Json; p_user_id?: string | null }
        Returns: {
          valid: boolean
          message: string
          coupon_id: string | null
          discount_cents: number
          free_shipping: boolean
        }
      }
      create_order: {
        Args: {
          p_items: Json
          p_shipping_address: Json
          p_shipping_method: string
          p_coupon_code?: string | null
          p_guest_name?: string | null
          p_guest_email?: string | null
          p_guest_cpf?: string | null
          p_guest_phone?: string | null
          p_notes?: string | null
        }
        Returns: { order_id: string; order_number: string; total_cents: number }[]
      }
      cancel_order: {
        Args: { p_order_id: string; p_reason?: string | null }
        Returns: void
      }
    }
    Enums: Record<string, never>
  }
}
