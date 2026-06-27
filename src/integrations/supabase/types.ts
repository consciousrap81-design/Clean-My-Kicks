export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_reminders: {
        Row: {
          body: string | null
          created_at: string
          dismissed: boolean
          due_at: string
          id: string
          key: string
          repeat_days: number | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dismissed?: boolean
          due_at: string
          id?: string
          key: string
          repeat_days?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dismissed?: boolean
          due_at?: string
          id?: string
          key?: string
          repeat_days?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_audit_log: {
        Row: {
          actor: string | null
          approved: boolean
          created_at: string
          id: string
          input: Json | null
          output: Json | null
          tool: string
        }
        Insert: {
          actor?: string | null
          approved?: boolean
          created_at?: string
          id?: string
          input?: Json | null
          output?: Json | null
          tool: string
        }
        Update: {
          actor?: string | null
          approved?: boolean
          created_at?: string
          id?: string
          input?: Json | null
          output?: Json | null
          tool?: string
        }
        Relationships: []
      }
      ai_change_history: {
        Row: {
          actor: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          kind: string
          record_id: string | null
          suggestion_id: string | null
          table_name: string | null
          undone: boolean
          undone_at: string | null
        }
        Insert: {
          actor?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          kind: string
          record_id?: string | null
          suggestion_id?: string | null
          table_name?: string | null
          undone?: boolean
          undone_at?: string | null
        }
        Update: {
          actor?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          kind?: string
          record_id?: string | null
          suggestion_id?: string | null
          table_name?: string | null
          undone?: boolean
          undone_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_change_history_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          resolved_at: string | null
          status: string
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          resolved_at?: string | null
          status?: string
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          resolved_at?: string | null
          status?: string
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      ai_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          accepted_quote_id: string | null
          admin_notes: string | null
          converted_job_id: string | null
          created_at: string
          customer_name: string
          drop_off_method: string | null
          email: string | null
          fulfillment_method: string
          id: string
          notes: string | null
          phone: string | null
          photos: string[]
          public_token: string
          quoted_price: number
          service_requested: string | null
          ship_from_address: Json | null
          shipping_quote_cents: number | null
          shoe_brand: string | null
          shoe_model: string | null
          shoe_size: string | null
          source: string
          status: Database["public"]["Enums"]["request_status"]
          submitted_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_quote_id?: string | null
          admin_notes?: string | null
          converted_job_id?: string | null
          created_at?: string
          customer_name: string
          drop_off_method?: string | null
          email?: string | null
          fulfillment_method?: string
          id?: string
          notes?: string | null
          phone?: string | null
          photos?: string[]
          public_token?: string
          quoted_price?: number
          service_requested?: string | null
          ship_from_address?: Json | null
          shipping_quote_cents?: number | null
          shoe_brand?: string | null
          shoe_model?: string | null
          shoe_size?: string | null
          source?: string
          status?: Database["public"]["Enums"]["request_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_quote_id?: string | null
          admin_notes?: string | null
          converted_job_id?: string | null
          created_at?: string
          customer_name?: string
          drop_off_method?: string | null
          email?: string | null
          fulfillment_method?: string
          id?: string
          notes?: string | null
          phone?: string | null
          photos?: string[]
          public_token?: string
          quoted_price?: number
          service_requested?: string | null
          ship_from_address?: Json | null
          shipping_quote_cents?: number | null
          shoe_brand?: string | null
          shoe_model?: string | null
          shoe_size?: string | null
          source?: string
          status?: Database["public"]["Enums"]["request_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_accepted_quote_id_fkey"
            columns: ["accepted_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_converted_job_id_fkey"
            columns: ["converted_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          lead_source_id: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          lead_source_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          lead_source_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      job_photos: {
        Row: {
          customer_visible: boolean
          id: string
          job_id: string
          kind: string
          uploaded_at: string
          url: string
        }
        Insert: {
          customer_visible?: boolean
          id?: string
          job_id: string
          kind: string
          uploaded_at?: string
          url: string
        }
        Update: {
          customer_visible?: boolean
          id?: string
          job_id?: string
          kind?: string
          uploaded_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_updates: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          customer_visible: boolean
          id: string
          job_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          customer_visible?: boolean
          id?: string
          job_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          customer_visible?: boolean
          id?: string
          job_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_updates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          admin_notes: string | null
          completion_date: string | null
          condition_notes: string | null
          created_at: string
          customer_id: string
          due_date: string | null
          id: string
          intake_date: string | null
          lead_source_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          quoted_price: number
          service_id: string | null
          shoe_brand: string | null
          shoe_model: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          completion_date?: string | null
          condition_notes?: string | null
          created_at?: string
          customer_id: string
          due_date?: string | null
          id?: string
          intake_date?: string | null
          lead_source_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          quoted_price?: number
          service_id?: string | null
          shoe_brand?: string | null
          shoe_model?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          completion_date?: string | null
          condition_notes?: string | null
          created_at?: string
          customer_id?: string
          due_date?: string | null
          id?: string
          intake_date?: string | null
          lead_source_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          quoted_price?: number
          service_id?: string | null
          shoe_brand?: string | null
          shoe_model?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_id: string | null
          id: string
          job_id: string | null
          kind: Database["public"]["Enums"]["payment_kind"]
          method: string | null
          notes: string | null
          paid_at: string
          quote_id: string | null
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          job_id?: string | null
          kind?: Database["public"]["Enums"]["payment_kind"]
          method?: string | null
          notes?: string | null
          paid_at?: string
          quote_id?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          job_id?: string | null
          kind?: Database["public"]["Enums"]["payment_kind"]
          method?: string | null
          notes?: string | null
          paid_at?: string
          quote_id?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          addons: Json
          allow_deposit: boolean
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customer_response: string | null
          deposit_amount: number | null
          expires_at: string | null
          first_viewed_at: string | null
          id: string
          last_viewed_at: string | null
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          photos: string[]
          public_token: string
          quote_amount: number
          request_id: string | null
          responded_at: string | null
          sent_at: string | null
          service_recommended: string | null
          shoe_brand: string | null
          shoe_model: string | null
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
          user_id: string | null
          view_count: number
        }
        Insert: {
          addons?: Json
          allow_deposit?: boolean
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_response?: string | null
          deposit_amount?: number | null
          expires_at?: string | null
          first_viewed_at?: string | null
          id?: string
          last_viewed_at?: string | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          photos?: string[]
          public_token?: string
          quote_amount?: number
          request_id?: string | null
          responded_at?: string | null
          sent_at?: string | null
          service_recommended?: string | null
          shoe_brand?: string | null
          shoe_model?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          user_id?: string | null
          view_count?: number
        }
        Update: {
          addons?: Json
          allow_deposit?: boolean
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_response?: string | null
          deposit_amount?: number | null
          expires_at?: string | null
          first_viewed_at?: string | null
          id?: string
          last_viewed_at?: string | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          photos?: string[]
          public_token?: string
          quote_amount?: number
          request_id?: string | null
          responded_at?: string | null
          sent_at?: string | null
          service_recommended?: string | null
          shoe_brand?: string | null
          shoe_model?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          user_id?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          base_price: number
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          base_price?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      shipment_events: {
        Row: {
          created_at: string
          id: string
          location: string | null
          occurred_at: string
          raw: Json
          shipment_id: string
          status: string | null
          status_detail: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          occurred_at?: string
          raw: Json
          shipment_id: string
          status?: string | null
          status_detail?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          occurred_at?: string
          raw?: Json
          shipment_id?: string
          status?: string | null
          status_detail?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string
          direction: string
          eta: string | null
          id: string
          label_url: string | null
          last_event_at: string | null
          notifications_enabled: boolean
          rate_cents: number | null
          request_id: string
          service: string | null
          shippo_transaction_id: string | null
          status: string
          tracking_number: string | null
          tracking_status_detail: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          direction: string
          eta?: string | null
          id?: string
          label_url?: string | null
          last_event_at?: string | null
          notifications_enabled?: boolean
          rate_cents?: number | null
          request_id: string
          service?: string | null
          shippo_transaction_id?: string | null
          status?: string
          tracking_number?: string | null
          tracking_status_detail?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          direction?: string
          eta?: string | null
          id?: string
          label_url?: string | null
          last_event_at?: string | null
          notifications_enabled?: boolean
          rate_cents?: number | null
          request_id?: string
          service?: string | null
          shippo_transaction_id?: string | null
          status?: string
          tracking_number?: string | null
          tracking_status_detail?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_abandoned_carts: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          first_email_message_id: string | null
          first_email_sent_at: string | null
          id: string
          last_recovery_session_id: string | null
          product_id: string
          recovered_at: string | null
          recovery_token: string
          reserved_session_id: string | null
          second_email_message_id: string | null
          second_email_sent_at: string | null
          status: string
          stripe_session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          first_email_message_id?: string | null
          first_email_sent_at?: string | null
          id?: string
          last_recovery_session_id?: string | null
          product_id: string
          recovered_at?: string | null
          recovery_token?: string
          reserved_session_id?: string | null
          second_email_message_id?: string | null
          second_email_sent_at?: string | null
          status?: string
          stripe_session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          first_email_message_id?: string | null
          first_email_sent_at?: string | null
          id?: string
          last_recovery_session_id?: string | null
          product_id?: string
          recovered_at?: string | null
          recovery_token?: string
          reserved_session_id?: string | null
          second_email_message_id?: string | null
          second_email_sent_at?: string | null
          status?: string
          stripe_session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_abandoned_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_accessories: {
        Row: {
          active: boolean
          base_price_cents: number
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price_cents: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price_cents?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      shop_accessory_photos: {
        Row: {
          accessory_id: string
          created_at: string
          id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          accessory_id: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          accessory_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_accessory_photos_accessory_id_fkey"
            columns: ["accessory_id"]
            isOneToOne: false
            referencedRelation: "shop_accessories"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_accessory_variants: {
        Row: {
          accessory_id: string
          active: boolean
          created_at: string
          id: string
          name: string
          price_cents_override: number | null
          sku: string | null
          sort_order: number
          stock_qty: number
          updated_at: string
        }
        Insert: {
          accessory_id: string
          active?: boolean
          created_at?: string
          id?: string
          name: string
          price_cents_override?: number | null
          sku?: string | null
          sort_order?: number
          stock_qty?: number
          updated_at?: string
        }
        Update: {
          accessory_id?: string
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          price_cents_override?: number | null
          sku?: string | null
          sort_order?: number
          stock_qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_accessory_variants_accessory_id_fkey"
            columns: ["accessory_id"]
            isOneToOne: false
            referencedRelation: "shop_accessories"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_cart_items: {
        Row: {
          accessory_variant_id: string | null
          cart_id: string
          created_at: string
          id: string
          item_type: string
          qty: number
          reserved_until: string | null
          sneaker_product_id: string | null
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          accessory_variant_id?: string | null
          cart_id: string
          created_at?: string
          id?: string
          item_type: string
          qty?: number
          reserved_until?: string | null
          sneaker_product_id?: string | null
          unit_price_cents: number
          updated_at?: string
        }
        Update: {
          accessory_variant_id?: string | null
          cart_id?: string
          created_at?: string
          id?: string
          item_type?: string
          qty?: number
          reserved_until?: string | null
          sneaker_product_id?: string | null
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_cart_items_accessory_variant_id_fkey"
            columns: ["accessory_variant_id"]
            isOneToOne: false
            referencedRelation: "shop_accessory_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "shop_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_cart_items_sneaker_product_id_fkey"
            columns: ["sneaker_product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_carts: {
        Row: {
          applied_promo_code: string | null
          created_at: string
          id: string
          session_token: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          applied_promo_code?: string | null
          created_at?: string
          id?: string
          session_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          applied_promo_code?: string | null
          created_at?: string
          id?: string
          session_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      shop_order_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          message: string | null
          metadata: Json
          order_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json
          order_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string
          customer_name: string | null
          discount_cents: number
          id: string
          paid_at: string | null
          product_id: string | null
          product_snapshot: Json
          promo_code: string | null
          review_request_sent_at: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_method: string | null
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          tracking_carrier: string | null
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email: string
          customer_name?: string | null
          discount_cents?: number
          id?: string
          paid_at?: string | null
          product_id?: string | null
          product_snapshot: Json
          promo_code?: string | null
          review_request_sent_at?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_method?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          tracking_carrier?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string | null
          discount_cents?: number
          id?: string
          paid_at?: string | null
          product_id?: string | null
          product_snapshot?: Json
          promo_code?: string | null
          review_request_sent_at?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_method?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          tracking_carrier?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_photos: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_photos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_views: {
        Row: {
          created_at: string
          id: string
          product_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          brand: string | null
          condition: string | null
          created_at: string
          description: string | null
          id: string
          model: string | null
          name: string
          price: number
          reserved_session_id: string | null
          reserved_until: string | null
          size: string | null
          sold_at: string | null
          sold_order_id: string | null
          status: string
          updated_at: string
          view_count: number
        }
        Insert: {
          brand?: string | null
          condition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          model?: string | null
          name: string
          price: number
          reserved_session_id?: string | null
          reserved_until?: string | null
          size?: string | null
          sold_at?: string | null
          sold_order_id?: string | null
          status?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          brand?: string | null
          condition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          model?: string | null
          name?: string
          price?: number
          reserved_session_id?: string | null
          reserved_until?: string | null
          size?: string | null
          sold_at?: string | null
          sold_order_id?: string | null
          status?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      shop_promo_codes: {
        Row: {
          active: boolean
          amount: number
          applies_to: string
          code: string
          created_at: string
          discount_type: string
          expires_at: string | null
          id: string
          max_redemptions: number | null
          min_subtotal_cents: number
          redemption_count: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          applies_to?: string
          code: string
          created_at?: string
          discount_type: string
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          min_subtotal_cents?: number
          redemption_count?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          applies_to?: string
          code?: string
          created_at?: string
          discount_type?: string
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          min_subtotal_cents?: number
          redemption_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      shop_promo_redemptions: {
        Row: {
          cart_id: string | null
          id: string
          order_id: string | null
          promo_id: string
          redeemed_at: string
        }
        Insert: {
          cart_id?: string | null
          id?: string
          order_id?: string | null
          promo_id: string
          redeemed_at?: string
        }
        Update: {
          cart_id?: string | null
          id?: string
          order_id?: string | null
          promo_id?: string
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_promo_redemptions_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "shop_promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_reviews: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string
          created_at: string
          id: string
          order_id: string | null
          photo_path: string | null
          product_id: string
          rating: number
          rejection_reason: string | null
          reviewer_name: string | null
          status: Database["public"]["Enums"]["shop_review_status"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body: string
          created_at?: string
          id?: string
          order_id?: string | null
          photo_path?: string | null
          product_id: string
          rating: number
          rejection_reason?: string | null
          reviewer_name?: string | null
          status?: Database["public"]["Enums"]["shop_review_status"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          created_at?: string
          id?: string
          order_id?: string | null
          photo_path?: string | null
          product_id?: string
          rating?: number
          rejection_reason?: string | null
          reviewer_name?: string | null
          status?: Database["public"]["Enums"]["shop_review_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_customer_user: {
        Args: { _email: string; _user_id: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "customer"
      job_status:
        | "new_request"
        | "awaiting_shoes"
        | "received"
        | "in_progress"
        | "ready_for_payment"
        | "completed"
        | "shipped"
        | "picked_up"
        | "cancelled"
      payment_kind: "deposit" | "full" | "balance" | "manual"
      payment_status: "unpaid" | "partial" | "paid" | "refunded"
      quote_status:
        | "draft"
        | "sent"
        | "viewed"
        | "accepted"
        | "declined"
        | "expired"
      request_status: "pending" | "approved" | "declined" | "awaiting_photos"
      shop_review_status: "pending" | "approved" | "rejected" | "hidden"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "customer"],
      job_status: [
        "new_request",
        "awaiting_shoes",
        "received",
        "in_progress",
        "ready_for_payment",
        "completed",
        "shipped",
        "picked_up",
        "cancelled",
      ],
      payment_kind: ["deposit", "full", "balance", "manual"],
      payment_status: ["unpaid", "partial", "paid", "refunded"],
      quote_status: [
        "draft",
        "sent",
        "viewed",
        "accepted",
        "declined",
        "expired",
      ],
      request_status: ["pending", "approved", "declined", "awaiting_photos"],
      shop_review_status: ["pending", "approved", "rejected", "hidden"],
    },
  },
} as const
