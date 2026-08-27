export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          after_data: Json | null;
          before_data: Json | null;
          correlation_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          ip_address: unknown;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          correlation_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          ip_address?: unknown;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          correlation_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          ip_address?: unknown;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      charges: {
        Row: {
          amount: number;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          charge_date: string;
          client_id: string;
          client_service_id: string | null;
          concept: string;
          created_at: string;
          created_by: string;
          currency_code: string;
          due_date: string | null;
          id: string;
          notes: string | null;
          reference: string | null;
          status: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          amount: number;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          charge_date?: string;
          client_id: string;
          client_service_id?: string | null;
          concept: string;
          created_at?: string;
          created_by: string;
          currency_code?: string;
          due_date?: string | null;
          id?: string;
          notes?: string | null;
          reference?: string | null;
          status?: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          amount?: number;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          charge_date?: string;
          client_id?: string;
          client_service_id?: string | null;
          concept?: string;
          created_at?: string;
          created_by?: string;
          currency_code?: string;
          due_date?: string | null;
          id?: string;
          notes?: string | null;
          reference?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "charges_cancelled_by_fkey";
            columns: ["cancelled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "charges_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_account_summary";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "charges_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "charges_client_service_id_fkey";
            columns: ["client_service_id"];
            isOneToOne: false;
            referencedRelation: "client_services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "charges_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "charges_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      client_notes: {
        Row: {
          client_id: string;
          created_at: string;
          created_by: string;
          id: string;
          note: string;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          created_by: string;
          id?: string;
          note: string;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          note?: string;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_account_summary";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "client_notes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_notes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      client_services: {
        Row: {
          agreed_price: number | null;
          billing_mode: string | null;
          client_id: string;
          created_at: string;
          created_by: string;
          currency_code: string;
          custom_description: string | null;
          end_date: string | null;
          id: string;
          service_id: string;
          start_date: string;
          status: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          agreed_price?: number | null;
          billing_mode?: string | null;
          client_id: string;
          created_at?: string;
          created_by: string;
          currency_code?: string;
          custom_description?: string | null;
          end_date?: string | null;
          id?: string;
          service_id: string;
          start_date: string;
          status?: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          agreed_price?: number | null;
          billing_mode?: string | null;
          client_id?: string;
          created_at?: string;
          created_by?: string;
          currency_code?: string;
          custom_description?: string | null;
          end_date?: string | null;
          id?: string;
          service_id?: string;
          start_date?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_services_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_account_summary";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "client_services_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_services_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "service_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_services_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          address: string | null;
          city: string | null;
          client_code: string;
          client_type: string;
          country: string | null;
          created_at: string;
          created_by: string;
          email: string | null;
          full_name: string;
          id: string;
          notes_summary: string | null;
          phone: string | null;
          registered_on: string;
          source_lead_id: string | null;
          status: string;
          updated_at: string;
          updated_by: string;
          whatsapp: string | null;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          client_code?: string;
          client_type: string;
          country?: string | null;
          created_at?: string;
          created_by: string;
          email?: string | null;
          full_name: string;
          id?: string;
          notes_summary?: string | null;
          phone?: string | null;
          registered_on?: string;
          source_lead_id?: string | null;
          status?: string;
          updated_at?: string;
          updated_by: string;
          whatsapp?: string | null;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          client_code?: string;
          client_type?: string;
          country?: string | null;
          created_at?: string;
          created_by?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          notes_summary?: string | null;
          phone?: string | null;
          registered_on?: string;
          source_lead_id?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      idempotency_keys: {
        Row: {
          actor_id: string;
          created_at: string;
          expires_at: string | null;
          key: string;
          operation: string;
          request_hash: string;
          result_entity_id: string | null;
          status: string;
        };
        Insert: {
          actor_id: string;
          created_at?: string;
          expires_at?: string | null;
          key: string;
          operation: string;
          request_hash: string;
          result_entity_id?: string | null;
          status?: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          expires_at?: string | null;
          key?: string;
          operation?: string;
          request_hash?: string;
          result_entity_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_allocations: {
        Row: {
          amount: number;
          charge_id: string;
          created_at: string;
          created_by: string;
          id: string;
          payment_id: string;
          reversal_reason: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
        };
        Insert: {
          amount: number;
          charge_id: string;
          created_at?: string;
          created_by: string;
          id?: string;
          payment_id: string;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
        };
        Update: {
          amount?: number;
          charge_id?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          payment_id?: string;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payment_allocations_charge_id_fkey";
            columns: ["charge_id"];
            isOneToOne: false;
            referencedRelation: "charge_balances";
            referencedColumns: ["charge_id"];
          },
          {
            foreignKeyName: "payment_allocations_charge_id_fkey";
            columns: ["charge_id"];
            isOneToOne: false;
            referencedRelation: "charges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_allocations_charge_id_fkey";
            columns: ["charge_id"];
            isOneToOne: false;
            referencedRelation: "open_charge_details";
            referencedColumns: ["charge_id"];
          },
          {
            foreignKeyName: "payment_allocations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payment_available_balances";
            referencedColumns: ["payment_id"];
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_allocations_reversed_by_fkey";
            columns: ["reversed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_methods: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          bank_name: string | null;
          client_id: string;
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
          created_by: string;
          currency_code: string;
          id: string;
          idempotency_key: string;
          notes: string | null;
          payment_date: string;
          payment_method_id: string;
          reference_number: string | null;
          status: string;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
        };
        Insert: {
          amount: number;
          bank_name?: string | null;
          client_id: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          created_by: string;
          currency_code?: string;
          id?: string;
          idempotency_key: string;
          notes?: string | null;
          payment_date?: string;
          payment_method_id: string;
          reference_number?: string | null;
          status?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Update: {
          amount?: number;
          bank_name?: string | null;
          client_id?: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          created_by?: string;
          currency_code?: string;
          id?: string;
          idempotency_key?: string;
          notes?: string | null;
          payment_date?: string;
          payment_method_id?: string;
          reference_number?: string | null;
          status?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_account_summary";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "payments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_confirmed_by_fkey";
            columns: ["confirmed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_payment_method_id_fkey";
            columns: ["payment_method_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_voided_by_fkey";
            columns: ["voided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          created_by: string | null;
          full_name: string | null;
          id: string;
          last_login_at: string | null;
          role_id: string;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          full_name?: string | null;
          id: string;
          last_login_at?: string | null;
          role_id: string;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          full_name?: string | null;
          id?: string;
          last_login_at?: string | null;
          role_id?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_invitations: {
        Row: {
          accepted_at: string | null;
          attempt_count: number;
          created_at: string;
          dispatch_status: string;
          email: string;
          expires_at: string | null;
          full_name: string;
          id: string;
          invited_at: string | null;
          invited_by: string;
          last_error_code: string | null;
          provider_message_id: string | null;
          role_id: string;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          attempt_count?: number;
          created_at?: string;
          dispatch_status?: string;
          email: string;
          expires_at?: string | null;
          full_name: string;
          id?: string;
          invited_at?: string | null;
          invited_by: string;
          last_error_code?: string | null;
          provider_message_id?: string | null;
          role_id: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          attempt_count?: number;
          created_at?: string;
          dispatch_status?: string;
          email?: string;
          expires_at?: string | null;
          full_name?: string;
          id?: string;
          invited_at?: string | null;
          invited_by?: string;
          last_error_code?: string | null;
          provider_message_id?: string | null;
          role_id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_invitations_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      public_request_notification_deliveries: {
        Row: {
          attempt_count: number;
          channel: string;
          correlation_id: string | null;
          created_at: string;
          error_code: string | null;
          id: string;
          last_attempt_at: string | null;
          provider: string;
          provider_message_id: string | null;
          recipient_key: string;
          recipient_user_id: string | null;
          request_id: string;
          sent_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          channel: string;
          correlation_id?: string | null;
          created_at?: string;
          error_code?: string | null;
          id?: string;
          last_attempt_at?: string | null;
          provider: string;
          provider_message_id?: string | null;
          recipient_key: string;
          recipient_user_id?: string | null;
          request_id: string;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          channel?: string;
          correlation_id?: string | null;
          created_at?: string;
          error_code?: string | null;
          id?: string;
          last_attempt_at?: string | null;
          provider?: string;
          provider_message_id?: string | null;
          recipient_key?: string;
          recipient_user_id?: string | null;
          request_id?: string;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "public_request_notification_deliveries_recipient_user_id_fkey";
            columns: ["recipient_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_request_notification_deliveries_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "public_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      public_requests: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          idempotency_key: string;
          message: string;
          name: string;
          phone: string | null;
          priority: string;
          service: string;
          source: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          idempotency_key: string;
          message: string;
          name: string;
          phone?: string | null;
          priority?: string;
          service: string;
          source?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          idempotency_key?: string;
          message?: string;
          name?: string;
          phone?: string | null;
          priority?: string;
          service?: string;
          source?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_limit_buckets: {
        Row: {
          expires_at: string;
          request_count: number;
          scope: string;
          subject_hash: string;
          window_started_at: string;
        };
        Insert: {
          expires_at: string;
          request_count: number;
          scope: string;
          subject_hash: string;
          window_started_at: string;
        };
        Update: {
          expires_at?: string;
          request_count?: number;
          scope?: string;
          subject_hash?: string;
          window_started_at?: string;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          created_at: string;
          id: string;
          issued_at: string;
          payment_id: string;
          receipt_number: string;
          snapshot: Json;
          status: string;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          issued_at?: string;
          payment_id: string;
          receipt_number: string;
          snapshot: Json;
          status?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          issued_at?: string;
          payment_id?: string;
          receipt_number?: string;
          snapshot?: Json;
          status?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "receipts_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: true;
            referencedRelation: "payment_available_balances";
            referencedColumns: ["payment_id"];
          },
          {
            foreignKeyName: "receipts_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: true;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receipts_voided_by_fkey";
            columns: ["voided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          created_at: string;
          permission_id: string;
          role_id: string;
        };
        Insert: {
          created_at?: string;
          permission_id: string;
          role_id: string;
        };
        Update: {
          created_at?: string;
          permission_id?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_catalog: {
        Row: {
          category_id: string;
          created_at: string;
          created_by: string | null;
          currency_code: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          standard_price: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          standard_price?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          standard_price?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "service_catalog_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_catalog_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_catalog_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      service_categories: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_push_tokens: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          last_used_at: string | null;
          token: string;
          token_fingerprint: string;
          updated_at: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          last_used_at?: string | null;
          token: string;
          token_fingerprint: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          last_used_at?: string | null;
          token?: string;
          token_fingerprint?: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_reminder_deliveries: {
        Row: {
          attempt: number;
          channel: string;
          created_at: string;
          error_code: string | null;
          id: string;
          provider: string;
          provider_message_id: string | null;
          reminder_id: string;
          sent_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          attempt?: number;
          channel: string;
          created_at?: string;
          error_code?: string | null;
          id?: string;
          provider: string;
          provider_message_id?: string | null;
          reminder_id: string;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          attempt?: number;
          channel?: string;
          created_at?: string;
          error_code?: string | null;
          id?: string;
          provider?: string;
          provider_message_id?: string | null;
          reminder_id?: string;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_reminder_deliveries_reminder_id_fkey";
            columns: ["reminder_id"];
            isOneToOne: false;
            referencedRelation: "task_reminders";
            referencedColumns: ["id"];
          },
        ];
      };
      task_reminders: {
        Row: {
          attempt_count: number;
          channel_email: boolean;
          channel_push: boolean;
          correlation_id: string | null;
          created_at: string;
          id: string;
          last_attempt_at: string | null;
          relative_minutes: number | null;
          remind_at: string;
          sent_at: string | null;
          status: string;
          task_id: string;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          channel_email?: boolean;
          channel_push?: boolean;
          correlation_id?: string | null;
          created_at?: string;
          id?: string;
          last_attempt_at?: string | null;
          relative_minutes?: number | null;
          remind_at: string;
          sent_at?: string | null;
          status?: string;
          task_id: string;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          channel_email?: boolean;
          channel_push?: boolean;
          correlation_id?: string | null;
          created_at?: string;
          id?: string;
          last_attempt_at?: string | null;
          relative_minutes?: number | null;
          remind_at?: string;
          sent_at?: string | null;
          status?: string;
          task_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_reminders_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          assigned_to: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          client_id: string | null;
          client_service_id: string | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          due_at: string;
          id: string;
          migration_metadata: Json | null;
          priority: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          client_id?: string | null;
          client_service_id?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          due_at: string;
          id?: string;
          migration_metadata?: Json | null;
          priority?: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          client_id?: string | null;
          client_service_id?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          due_at?: string;
          id?: string;
          migration_metadata?: Json | null;
          priority?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_cancelled_by_fkey";
            columns: ["cancelled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_account_summary";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "tasks_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_client_service_id_fkey";
            columns: ["client_service_id"];
            isOneToOne: false;
            referencedRelation: "client_services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      charge_balances: {
        Row: {
          allocated_amount: number | null;
          charge_date: string | null;
          charge_id: string | null;
          client_id: string | null;
          client_service_id: string | null;
          concept: string | null;
          currency_code: string | null;
          derived_status: string | null;
          due_date: string | null;
          original_amount: number | null;
          remaining_amount: number | null;
          stored_status: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "charges_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_account_summary";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "charges_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "charges_client_service_id_fkey";
            columns: ["client_service_id"];
            isOneToOne: false;
            referencedRelation: "client_services";
            referencedColumns: ["id"];
          },
        ];
      };
      client_account_summary: {
        Row: {
          client_code: string | null;
          client_id: string | null;
          client_name: string | null;
          currency_code: string | null;
          is_delinquent: boolean | null;
          last_charge_date: string | null;
          last_payment_date: string | null;
          not_due_balance: number | null;
          oldest_open_due_date: string | null;
          open_charges_count: number | null;
          outstanding_balance: number | null;
          overdue_balance: number | null;
          overdue_charges_count: number | null;
          total_applied: number | null;
          total_charged: number | null;
          unapplied_credit: number | null;
        };
        Relationships: [];
      };
      client_aging_summary: {
        Row: {
          balance_1_30: number | null;
          balance_31_60: number | null;
          balance_61_90: number | null;
          balance_90_plus: number | null;
          client_code: string | null;
          client_id: string | null;
          client_name: string | null;
          currency_code: string | null;
          current_balance: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "charges_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_account_summary";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "charges_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      client_financial_activity: {
        Row: {
          applied_amount: number | null;
          client_id: string | null;
          credit: number | null;
          currency_code: string | null;
          debit: number | null;
          description: string | null;
          event_date: string | null;
          event_key: string | null;
          movement_type: string | null;
          occurred_at: string | null;
          receipt_id: string | null;
          reference: string | null;
          running_balance: number | null;
          source_id: string | null;
          unapplied_amount: number | null;
        };
        Relationships: [];
      };
      open_charge_details: {
        Row: {
          aging_bucket: string | null;
          applied_amount: number | null;
          charge_date: string | null;
          charge_id: string | null;
          client_code: string | null;
          client_id: string | null;
          client_name: string | null;
          concept: string | null;
          currency_code: string | null;
          days_overdue: number | null;
          derived_status: string | null;
          due_date: string | null;
          original_amount: number | null;
          remaining_amount: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "charges_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_account_summary";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "charges_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_available_balances: {
        Row: {
          allocated_amount: number | null;
          available_amount: number | null;
          client_id: string | null;
          currency_code: string | null;
          original_amount: number | null;
          payment_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_account_summary";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "payments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      attach_user_invitation: {
        Args: { target_invitation_id: string; target_user_id: string };
        Returns: undefined;
      };
      bootstrap_initial_owner: {
        Args: { target_user_id: string };
        Returns: undefined;
      };
      can_access_report: {
        Args: { needs_export?: boolean; report_kind: string };
        Returns: boolean;
      };
      cancel_charge: {
        Args: { reason: string; target_charge_id: string };
        Returns: string;
      };
      claim_due_task_reminders: {
        Args: { batch_size: number; operation_correlation_id: string };
        Returns: {
          assigned_to: string;
          due_at: string;
          email_delivery_id: string;
          priority: string;
          push_delivery_id: string;
          push_tokens: string[];
          recipient_email: string;
          reminder_id: string;
          task_id: string;
          title: string;
        }[];
      };
      claim_user_invitation: {
        Args: {
          invite_actor: string;
          invite_email: string;
          invite_full_name: string;
          invite_role_id: string;
        };
        Returns: {
          invitation_attempt: number;
          invitation_id: string;
        }[];
      };
      complete_user_invitation: { Args: never; Returns: undefined };
      claim_public_request_notifications: {
        Args: { operation_correlation_id: string; target_request_id: string };
        Returns: {
          channel: string;
          delivery_id: string;
          recipient: string;
          recipient_user_id: string;
          token_fingerprint: string;
        }[];
      };
      confirm_payment: {
        Args: {
          allocations_payload: Json;
          operation_key: string;
          target_payment_id: string;
        };
        Returns: {
          allocated_amount: number;
          confirmed_at: string;
          payment_id: string;
          receipt_id: string;
          receipt_number: string;
          unapplied_amount: number;
        }[];
      };
      consume_rate_limit: {
        Args: {
          bucket_scope: string;
          bucket_subject_hash: string;
          max_requests: number;
          window_seconds: number;
        };
        Returns: {
          allowed: boolean;
          remaining: number;
          retry_after_seconds: number;
        }[];
      };
      create_public_request: {
        Args: {
          operation_correlation_id: string;
          request_email: string;
          request_idempotency_key: string;
          request_message: string;
          request_name: string;
          request_phone: string;
          request_priority: string;
          request_service: string;
          request_user_agent?: string;
        };
        Returns: {
          accepted_at: string;
          accepted_email: string;
          accepted_name: string;
          accepted_phone: string;
          accepted_service: string;
          request_id: string;
          was_created: boolean;
        }[];
      };
      create_task: {
        Args: {
          reminder_specs?: Json;
          task_assigned_to: string;
          task_client_id: string;
          task_client_service_id: string;
          task_description: string;
          task_due_at: string;
          task_priority: string;
          task_title: string;
        };
        Returns: string;
      };
      find_client_duplicates: {
        Args: {
          email_candidate?: string;
          excluded_client_id?: string;
          phone_candidate?: string;
          whatsapp_candidate?: string;
        };
        Returns: {
          client_code: string;
          full_name: string;
          id: string;
        }[];
      };
      generate_client_code: { Args: never; Returns: string };
      generate_receipt_number: { Args: never; Returns: string };
      get_bank_report_data: {
        Args: {
          client_filter?: string;
          currency_filter?: string;
          date_from?: string;
          date_to?: string;
          export_request?: boolean;
          method_filter?: string;
          page_number?: number;
          page_size?: number;
          search_query?: string;
          sort_by?: string;
          sort_direction?: string;
          status_filter?: string;
        };
        Returns: Json;
      };
      get_client_activity: {
        Args: { result_limit?: number; target_client_id: string };
        Returns: {
          action: string;
          actor_name: string;
          created_at: string;
          id: string;
        }[];
      };
      get_client_notes: {
        Args: { result_limit?: number; target_client_id: string };
        Returns: {
          author_name: string;
          created_at: string;
          id: string;
          note: string;
          updated_at: string;
        }[];
      };
      get_client_statement: {
        Args: {
          currency_filter: string;
          from_date: string;
          target_client_id: string;
          to_date: string;
        };
        Returns: Json;
      };
      get_dashboard_summary: {
        Args: { currency_filter: string; from_date: string; to_date: string };
        Returns: Json;
      };
      get_my_principal: {
        Args: never;
        Returns: {
          full_name: string;
          permission_codes: string[];
          role_code: string;
          role_name: string;
          status: string;
          user_id: string;
        }[];
      };
      get_my_user_invitation: {
        Args: never;
        Returns: {
          full_name: string;
          invitation_email: string;
          invitation_status: string;
          role_code: string;
          role_name: string;
        }[];
      };
      get_payment_activity: {
        Args: { result_limit?: number; target_payment_id: string };
        Returns: {
          action: string;
          actor_name: string;
          created_at: string;
          id: string;
        }[];
      };
      get_report_data: {
        Args: {
          aging_filter?: string;
          category_filter?: string;
          client_filter?: string;
          currency_filter?: string;
          date_from?: string;
          date_to?: string;
          export_request?: boolean;
          method_filter?: string;
          page_number?: number;
          page_size?: number;
          report_kind: string;
          search_query?: string;
          service_filter?: string;
          sort_by?: string;
          sort_direction?: string;
          status_filter?: string;
        };
        Returns: Json;
      };
      get_task_assignees: {
        Args: never;
        Returns: {
          full_name: string;
          id: string;
          role_name: string;
        }[];
      };
      get_task_detail: {
        Args: { target_task_id: string };
        Returns: {
          assigned_name: string;
          assigned_to: string;
          cancelled_at: string;
          client_id: string;
          client_name: string;
          client_service_id: string;
          completed_at: string;
          created_at: string;
          created_by: string;
          description: string;
          due_at: string;
          id: string;
          priority: string;
          service_name: string;
          status: string;
          title: string;
          updated_at: string;
        }[];
      };
      has_permission: { Args: { permission_code: string }; Returns: boolean };
      record_auth_event: {
        Args: {
          event_action: string;
          event_correlation_id?: string;
          event_ip_address?: unknown;
          event_user_agent?: string;
        };
        Returns: undefined;
      };
      record_client_statement_generated: {
        Args: {
          currency_filter: string;
          from_date: string;
          operation_correlation_id: string;
          target_client_id: string;
          to_date: string;
        };
        Returns: string;
      };
      record_public_request_dispatch_failure: {
        Args: {
          failure_code: string;
          operation_correlation_id: string;
          target_request_id: string;
        };
        Returns: undefined;
      };
      record_public_request_notification: {
        Args: {
          delivery_status: string;
          failure_code?: string;
          message_id?: string;
          target_delivery_id: string;
        };
        Returns: undefined;
      };
      record_user_invitation_delivery: {
        Args: {
          delivery_status: string;
          failure_code?: string;
          message_id?: string;
          target_invitation_id: string;
        };
        Returns: undefined;
      };
      record_report_exported: {
        Args: {
          export_format: string;
          exported_row_count: number;
          normalized_filters: Json;
          operation_correlation_id: string;
          report_kind: string;
        };
        Returns: string;
      };
      record_task_delivery: {
        Args: {
          delivery_status: string;
          failure_code?: string;
          message_id?: string;
          target_delivery_id: string;
        };
        Returns: undefined;
      };
      register_task_push_token: {
        Args: { agent?: string; token_hash: string; token_value: string };
        Returns: string;
      };
      search_charges: {
        Args: {
          client_filter?: string;
          currency_filter?: string;
          date_from?: string;
          date_to?: string;
          due_before?: string;
          page_number?: number;
          page_size?: number;
          search_query?: string;
          status_filter?: string;
        };
        Returns: {
          allocated_amount: number;
          charge_date: string;
          client_code: string;
          client_id: string;
          client_name: string;
          concept: string;
          currency_code: string;
          due_date: string;
          id: string;
          original_amount: number;
          remaining_amount: number;
          service_name: string;
          status: string;
          total_count: number;
        }[];
      };
      search_client_accounts: {
        Args: {
          balance_filter?: string;
          currency_filter?: string;
          page_number?: number;
          page_size?: number;
          search_query?: string;
          sort_by?: string;
          sort_direction?: string;
        };
        Returns: {
          client_code: string;
          client_id: string;
          client_name: string;
          currency_code: string;
          is_delinquent: boolean;
          not_due_balance: number;
          oldest_due_date: string;
          open_charges_count: number;
          outstanding_balance: number;
          overdue_balance: number;
          overdue_charges_count: number;
          total_applied: number;
          total_charged: number;
          total_count: number;
          unapplied_credit: number;
        }[];
      };
      search_clients: {
        Args: {
          page_number?: number;
          page_size?: number;
          search_query?: string;
          sort_by?: string;
          sort_direction?: string;
          status_filter?: string;
        };
        Returns: {
          active_services_count: number;
          client_code: string;
          client_type: string;
          email: string;
          full_name: string;
          id: string;
          phone: string;
          registered_on: string;
          status: string;
          total_count: number;
          whatsapp: string;
        }[];
      };
      search_payments: {
        Args: {
          client_filter?: string;
          date_from?: string;
          date_to?: string;
          method_filter?: string;
          page_number?: number;
          page_size?: number;
          search_query?: string;
          status_filter?: string;
        };
        Returns: {
          allocated_amount: number;
          amount: number;
          client_code: string;
          client_id: string;
          client_name: string;
          created_by_name: string;
          currency_code: string;
          id: string;
          method_name: string;
          payment_date: string;
          receipt_id: string;
          receipt_number: string;
          status: string;
          total_count: number;
          unapplied_amount: number;
        }[];
      };
      search_tasks: {
        Args: {
          client_filter?: string;
          page_number?: number;
          page_size?: number;
          scope_filter?: string;
          search_query?: string;
          status_filter?: string;
        };
        Returns: {
          assigned_name: string;
          assigned_to: string;
          client_id: string;
          client_name: string;
          created_by: string;
          description: string;
          due_at: string;
          id: string;
          is_overdue: boolean;
          priority: string;
          reminder_count: number;
          status: string;
          title: string;
          total_count: number;
        }[];
      };
      set_task_status: {
        Args: { new_status: string; target_task_id: string };
        Returns: undefined;
      };
      sync_charge_status: {
        Args: { target_charge_id: string };
        Returns: string;
      };
      task_is_visible: {
        Args: { task_row: Database["public"]["Tables"]["tasks"]["Row"] };
        Returns: boolean;
      };
      task_reminder_still_dispatchable: {
        Args: { target_reminder_id: string };
        Returns: boolean;
      };
      update_task: {
        Args: {
          target_task_id: string;
          task_assigned_to: string;
          task_client_id: string;
          task_client_service_id: string;
          task_description: string;
          task_due_at: string;
          task_priority: string;
          task_title: string;
        };
        Returns: undefined;
      };
      void_payment: {
        Args: { reason: string; target_payment_id: string };
        Returns: {
          payment_id: string;
          receipt_id: string;
          voided_at: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
