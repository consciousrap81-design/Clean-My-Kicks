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
      booking_requests: {
        Row: {
          accepted_quote_id: string | null
          admin_notes: string | null
          converted_job_id: string | null
          created_at: string
          customer_name: string
          drop_off_method: string | null
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          photos: string[]
          public_token: string
          quoted_price: number
          service_requested: string | null
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
          id?: string
          notes?: string | null
          phone?: string | null
          photos?: string[]
          public_token?: string
          quoted_price?: number
          service_requested?: string | null
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
          id?: string
          notes?: string | null
          phone?: string | null
          photos?: string[]
          public_token?: string
          quoted_price?: number
          service_requested?: string | null
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
      shop_orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string
          customer_name: string | null
          id: string
          paid_at: string | null
          product_id: string | null
          product_snapshot: Json
          shipped_at: string | null
          shipping_address: Json | null
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
          id?: string
          paid_at?: string | null
          product_id?: string | null
          product_snapshot: Json
          shipped_at?: string | null
          shipping_address?: Json | null
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
          id?: string
          paid_at?: string | null
          product_id?: string | null
          product_snapshot?: Json
          shipped_at?: string | null
          shipping_address?: Json | null
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
    },
  },
} as const
