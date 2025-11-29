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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  audit: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          field_name: string | null
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
          record_id: string
          table_name: string
          timestamp: string | null
          user_email: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          record_id: string
          table_name: string
          timestamp?: string | null
          user_email: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          record_id?: string
          table_name?: string
          timestamp?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      admin_actions: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_user_id: string | null
          timestamp: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string | null
          timestamp?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      found_bike_reports: {
        Row: {
          bike_color: string | null
          bike_id: string | null
          bike_make: string | null
          bike_model: string | null
          created_at: string | null
          finder_email: string | null
          finder_name: string | null
          finder_phone: string | null
          found_date: string
          found_location: string
          found_notes: string | null
          id: string
          is_leaving_bike_there: boolean | null
          latitude: number | null
          longitude: number | null
          photo_base64: string | null
          police_contacted: boolean | null
          serial_number: string
          updated_at: string | null
        }
        Insert: {
          bike_color?: string | null
          bike_id?: string | null
          bike_make?: string | null
          bike_model?: string | null
          created_at?: string | null
          finder_email?: string | null
          finder_name?: string | null
          finder_phone?: string | null
          found_date: string
          found_location: string
          found_notes?: string | null
          id?: string
          is_leaving_bike_there?: boolean | null
          latitude?: number | null
          longitude?: number | null
          photo_base64?: string | null
          police_contacted?: boolean | null
          serial_number: string
          updated_at?: string | null
        }
        Update: {
          bike_color?: string | null
          bike_id?: string | null
          bike_make?: string | null
          bike_model?: string | null
          created_at?: string | null
          finder_email?: string | null
          finder_name?: string | null
          finder_phone?: string | null
          found_date?: string
          found_location?: string
          found_notes?: string | null
          id?: string
          is_leaving_bike_there?: boolean | null
          latitude?: number | null
          longitude?: number | null
          photo_base64?: string | null
          police_contacted?: boolean | null
          serial_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recovery_logs: {
        Row: {
          bike_id: string | null
          created_at: string | null
          id: string
          recovered_at: string | null
          recovery_date: string
          recovery_location: string | null
          recovery_notes: string | null
          user_id: string | null
        }
        Insert: {
          bike_id?: string | null
          created_at?: string | null
          id?: string
          recovered_at?: string | null
          recovery_date: string
          recovery_location?: string | null
          recovery_notes?: string | null
          user_id?: string | null
        }
        Update: {
          bike_id?: string | null
          created_at?: string | null
          id?: string
          recovered_at?: string | null
          recovery_date?: string
          recovery_location?: string | null
          recovery_notes?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  auth: {
    Tables: {
      audit_log_entries: {
        Row: {
          created_at: string | null
          id: string
          instance_id: string | null
          ip_address: string
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          id: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Relationships: []
      }
      flow_state: {
        Row: {
          auth_code: string
          auth_code_issued_at: string | null
          authentication_method: string
          code_challenge: string
          code_challenge_method: Database["auth"]["Enums"]["code_challenge_method"]
          created_at: string | null
          id: string
          provider_access_token: string | null
          provider_refresh_token: string | null
          provider_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auth_code: string
          auth_code_issued_at?: string | null
          authentication_method: string
          code_challenge: string
          code_challenge_method: Database["auth"]["Enums"]["code_challenge_method"]
          created_at?: string | null
          id: string
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auth_code?: string
          auth_code_issued_at?: string | null
          authentication_method?: string
          code_challenge?: string
          code_challenge_method?: Database["auth"]["Enums"]["code_challenge_method"]
          created_at?: string | null
          id?: string
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      identities: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          identity_data: Json
          last_sign_in_at: string | null
          provider: string
          provider_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data: Json
          last_sign_in_at?: string | null
          provider: string
          provider_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data?: Json
          last_sign_in_at?: string | null
          provider?: string
          provider_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      instances: {
        Row: {
          created_at: string | null
          id: string
          raw_base_config: string | null
          updated_at: string | null
          uuid: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Relationships: []
      }
      mfa_amr_claims: {
        Row: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Update: {
          authentication_method?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_amr_claims_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_challenges: {
        Row: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code: string | null
          verified_at: string | null
          web_authn_session_data: Json | null
        }
        Insert: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Update: {
          created_at?: string
          factor_id?: string
          id?: string
          ip_address?: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_challenges_auth_factor_id_fkey"
            columns: ["factor_id"]
            isOneToOne: false
            referencedRelation: "mfa_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_factors: {
        Row: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name: string | null
          id: string
          last_challenged_at: string | null
          last_webauthn_challenge_data: Json | null
          phone: string | null
          secret: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid: string | null
          web_authn_credential: Json | null
        }
        Insert: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id: string
          last_challenged_at?: string | null
          last_webauthn_challenge_data?: Json | null
          phone?: string | null
          secret?: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Update: {
          created_at?: string
          factor_type?: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id?: string
          last_challenged_at?: string | null
          last_webauthn_challenge_data?: Json | null
          phone?: string | null
          secret?: string | null
          status?: Database["auth"]["Enums"]["factor_status"]
          updated_at?: string
          user_id?: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_factors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_authorizations: {
        Row: {
          approved_at: string | null
          authorization_code: string | null
          authorization_id: string
          client_id: string
          code_challenge: string | null
          code_challenge_method:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at: string
          expires_at: string
          id: string
          nonce: string | null
          redirect_uri: string
          resource: string | null
          response_type: Database["auth"]["Enums"]["oauth_response_type"]
          scope: string
          state: string | null
          status: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          authorization_code?: string | null
          authorization_id: string
          client_id: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string
          expires_at?: string
          id: string
          nonce?: string | null
          redirect_uri: string
          resource?: string | null
          response_type?: Database["auth"]["Enums"]["oauth_response_type"]
          scope: string
          state?: string | null
          status?: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          authorization_code?: string | null
          authorization_id?: string
          client_id?: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string
          expires_at?: string
          id?: string
          nonce?: string | null
          redirect_uri?: string
          resource?: string | null
          response_type?: Database["auth"]["Enums"]["oauth_response_type"]
          scope?: string
          state?: string | null
          status?: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_authorizations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_authorizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_clients: {
        Row: {
          client_name: string | null
          client_secret_hash: string | null
          client_type: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri: string | null
          created_at: string
          deleted_at: string | null
          grant_types: string
          id: string
          logo_uri: string | null
          redirect_uris: string
          registration_type: Database["auth"]["Enums"]["oauth_registration_type"]
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          client_secret_hash?: string | null
          client_type?: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri?: string | null
          created_at?: string
          deleted_at?: string | null
          grant_types: string
          id: string
          logo_uri?: string | null
          redirect_uris: string
          registration_type: Database["auth"]["Enums"]["oauth_registration_type"]
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          client_secret_hash?: string | null
          client_type?: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri?: string | null
          created_at?: string
          deleted_at?: string | null
          grant_types?: string
          id?: string
          logo_uri?: string | null
          redirect_uris?: string
          registration_type?: Database["auth"]["Enums"]["oauth_registration_type"]
          updated_at?: string
        }
        Relationships: []
      }
      oauth_consents: {
        Row: {
          client_id: string
          granted_at: string
          id: string
          revoked_at: string | null
          scopes: string
          user_id: string
        }
        Insert: {
          client_id: string
          granted_at?: string
          id: string
          revoked_at?: string | null
          scopes: string
          user_id: string
        }
        Update: {
          client_id?: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
          scopes?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      one_time_tokens: {
        Row: {
          created_at: string
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relates_to?: string
          token_hash?: string
          token_type?: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_time_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          created_at: string | null
          id: number
          instance_id: string | null
          parent: string | null
          revoked: boolean | null
          session_id: string | null
          token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_providers: {
        Row: {
          attribute_mapping: Json | null
          created_at: string | null
          entity_id: string
          id: string
          metadata_url: string | null
          metadata_xml: string
          name_id_format: string | null
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id: string
          id: string
          metadata_url?: string | null
          metadata_xml: string
          name_id_format?: string | null
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id?: string
          id?: string
          metadata_url?: string | null
          metadata_xml?: string
          name_id_format?: string | null
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_providers_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_relay_states: {
        Row: {
          created_at: string | null
          flow_state_id: string | null
          for_email: string | null
          id: string
          redirect_to: string | null
          request_id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id: string
          redirect_to?: string | null
          request_id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id?: string
          redirect_to?: string | null
          request_id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_relay_states_flow_state_id_fkey"
            columns: ["flow_state_id"]
            isOneToOne: false
            referencedRelation: "flow_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saml_relay_states_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          version: string
        }
        Insert: {
          version: string
        }
        Update: {
          version?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          aal: Database["auth"]["Enums"]["aal_level"] | null
          created_at: string | null
          factor_id: string | null
          id: string
          ip: unknown
          not_after: string | null
          oauth_client_id: string | null
          refresh_token_counter: number | null
          refresh_token_hmac_key: string | null
          refreshed_at: string | null
          scopes: string | null
          tag: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id: string
          ip?: unknown
          not_after?: string | null
          oauth_client_id?: string | null
          refresh_token_counter?: number | null
          refresh_token_hmac_key?: string | null
          refreshed_at?: string | null
          scopes?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id?: string
          ip?: unknown
          not_after?: string | null
          oauth_client_id?: string | null
          refresh_token_counter?: number | null
          refresh_token_hmac_key?: string | null
          refreshed_at?: string | null
          scopes?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_oauth_client_id_fkey"
            columns: ["oauth_client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_domains_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_providers: {
        Row: {
          created_at: string | null
          disabled: boolean | null
          id: string
          resource_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disabled?: boolean | null
          id: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disabled?: boolean | null
          id?: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          aud: string | null
          banned_until: string | null
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          email_change: string | null
          email_change_confirm_status: number | null
          email_change_sent_at: string | null
          email_change_token_current: string | null
          email_change_token_new: string | null
          email_confirmed_at: string | null
          encrypted_password: string | null
          id: string
          instance_id: string | null
          invited_at: string | null
          is_anonymous: boolean
          is_sso_user: boolean
          is_super_admin: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          phone_change: string | null
          phone_change_sent_at: string | null
          phone_change_token: string | null
          phone_confirmed_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          reauthentication_sent_at: string | null
          reauthentication_token: string | null
          recovery_sent_at: string | null
          recovery_token: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id?: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      email: { Args: never; Returns: string }
      jwt: { Args: never; Returns: Json }
      role: { Args: never; Returns: string }
      uid: { Args: never; Returns: string }
    }
    Enums: {
      aal_level: "aal1" | "aal2" | "aal3"
      code_challenge_method: "s256" | "plain"
      factor_status: "unverified" | "verified"
      factor_type: "totp" | "webauthn" | "phone"
      oauth_authorization_status: "pending" | "approved" | "denied" | "expired"
      oauth_client_type: "public" | "confidential"
      oauth_registration_type: "dynamic" | "manual"
      oauth_response_type: "code"
      one_time_token_type:
        | "confirmation_token"
        | "reauthentication_token"
        | "recovery_token"
        | "email_change_token_new"
        | "email_change_token_current"
        | "phone_change_token"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  case_mgmt: {
    Tables: {
      case_management: {
        Row: {
          id: number
          person_id: number
          case_manager_name: string
          case_manager_contact: string | null
          agency: string | null
          case_number: string | null
          start_date: string | null
          end_date: string | null
          status: string | null
          case_type: string | null
          priority: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: number
          person_id: number
          case_manager_name: string
          case_manager_contact?: string | null
          agency?: string | null
          case_number?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string | null
          case_type?: string | null
          priority?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: number
          person_id?: number
          case_manager_name?: string
          case_manager_contact?: string | null
          agency?: string | null
          case_number?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string | null
          case_type?: string | null
          priority?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_management_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          }
        ]
      }
      calls_for_service: {
        Row: {
          anonymous_reporter: boolean | null
          anonymous_reporter_details: string | null
          attachments_count: number | null
          call_taker_id: string | null
          call_taker_notes: string | null
          converted_incident_id: number | null
          created_at: string | null
          created_by: string | null
          dedupe_key: string | null
          duplicate_of_report_id: number | null
          escalated_at: string | null
          escalated_by: string | null
          escalated_to_incident_id: number | null
          id: number
          initial_report_narrative: string
          location_confidence: string | null
          location_text: string | null
          notify_channel:
            | Database["core"]["Enums"]["notify_channel_enum"]
            | null
          notify_opt_in: boolean | null
          notify_target: string | null
          origin: Database["core"]["Enums"]["cfs_origin_enum"] | null
          priority_hint:
            | Database["core"]["Enums"]["incident_priority_enum"]
            | null
          public_tracking_id: string | null
          received_at: string | null
          referring_agency_name: string | null
          referring_organization_id: number | null
          related_report_ids: number[] | null
          report_method: string
          report_number: string
          report_priority_assessment: string
          report_received_at: string
          report_source_details: Json | null
          report_status: string | null
          reported_coordinates: string | null
          reported_location: string | null
          reporter_address: string | null
          reporter_email: string | null
          reporter_name: string | null
          reporter_phone: string | null
          reporter_relationship: string | null
          reporting_organization_id: number | null
          reporting_person_id: number | null
          risk_score: number | null
          source: Database["core"]["Enums"]["cfs_source_enum"] | null
          status: Database["core"]["Enums"]["cfs_status_enum"] | null
          triaged_by: string | null
          type_hint: Database["core"]["Enums"]["incident_type_enum"] | null
          updated_at: string | null
          updated_by: string | null
          urgency_indicators: Json | null
          verification_method: string | null
          verification_notes: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          anonymous_reporter?: boolean | null
          anonymous_reporter_details?: string | null
          attachments_count?: number | null
          call_taker_id?: string | null
          call_taker_notes?: string | null
          converted_incident_id?: number | null
          created_at?: string | null
          created_by?: string | null
          dedupe_key?: string | null
          duplicate_of_report_id?: number | null
          escalated_at?: string | null
          escalated_by?: string | null
          escalated_to_incident_id?: number | null
          id?: number
          initial_report_narrative: string
          location_confidence?: string | null
          location_text?: string | null
          notify_channel?:
            | Database["core"]["Enums"]["notify_channel_enum"]
            | null
          notify_opt_in?: boolean | null
          notify_target?: string | null
          origin?: Database["core"]["Enums"]["cfs_origin_enum"] | null
          priority_hint?:
            | Database["core"]["Enums"]["incident_priority_enum"]
            | null
          public_tracking_id?: string | null
          received_at?: string | null
          referring_agency_name?: string | null
          referring_organization_id?: number | null
          related_report_ids?: number[] | null
          report_method: string
          report_number?: string
          report_priority_assessment?: string
          report_received_at?: string
          report_source_details?: Json | null
          report_status?: string | null
          reported_coordinates?: string | null
          reported_location?: string | null
          reporter_address?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          reporter_relationship?: string | null
          reporting_organization_id?: number | null
          reporting_person_id?: number | null
          risk_score?: number | null
          source?: Database["core"]["Enums"]["cfs_source_enum"] | null
          status?: Database["core"]["Enums"]["cfs_status_enum"] | null
          triaged_by?: string | null
          type_hint?: Database["core"]["Enums"]["incident_type_enum"] | null
          updated_at?: string | null
          updated_by?: string | null
          urgency_indicators?: Json | null
          verification_method?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          anonymous_reporter?: boolean | null
          anonymous_reporter_details?: string | null
          attachments_count?: number | null
          call_taker_id?: string | null
          call_taker_notes?: string | null
          converted_incident_id?: number | null
          created_at?: string | null
          created_by?: string | null
          dedupe_key?: string | null
          duplicate_of_report_id?: number | null
          escalated_at?: string | null
          escalated_by?: string | null
          escalated_to_incident_id?: number | null
          id?: number
          initial_report_narrative?: string
          location_confidence?: string | null
          location_text?: string | null
          notify_channel?:
            | Database["core"]["Enums"]["notify_channel_enum"]
            | null
          notify_opt_in?: boolean | null
          notify_target?: string | null
          origin?: Database["core"]["Enums"]["cfs_origin_enum"] | null
          priority_hint?:
            | Database["core"]["Enums"]["incident_priority_enum"]
            | null
          public_tracking_id?: string | null
          received_at?: string | null
          referring_agency_name?: string | null
          referring_organization_id?: number | null
          related_report_ids?: number[] | null
          report_method?: string
          report_number?: string
          report_priority_assessment?: string
          report_received_at?: string
          report_source_details?: Json | null
          report_status?: string | null
          reported_coordinates?: string | null
          reported_location?: string | null
          reporter_address?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          reporter_relationship?: string | null
          reporting_organization_id?: number | null
          reporting_person_id?: number | null
          risk_score?: number | null
          source?: Database["core"]["Enums"]["cfs_source_enum"] | null
          status?: Database["core"]["Enums"]["cfs_status_enum"] | null
          triaged_by?: string | null
          type_hint?: Database["core"]["Enums"]["incident_type_enum"] | null
          updated_at?: string | null
          updated_by?: string | null
          urgency_indicators?: Json | null
          verification_method?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_for_service_converted_incident_id_fkey"
            columns: ["converted_incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_escalated_incident"
            columns: ["escalated_to_incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_duplicate_of_report_id_fkey"
            columns: ["duplicate_of_report_id"]
            isOneToOne: false
            referencedRelation: "calls_for_service"
            referencedColumns: ["id"]
          },
        ]
      }
      cfs_timeline: {
        Row: {
          created_at: string | null
          created_by: string | null
          duration_seconds: number | null
          id: number
          incident_id: number | null
          incident_report_id: number
          performed_by: string | null
          phase: string
          phase_completed_at: string | null
          phase_data: Json | null
          phase_notes: string | null
          phase_started_at: string
          phase_status: string | null
          sla_met: boolean | null
          sla_target_seconds: number | null
          sub_phase: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          duration_seconds?: number | null
          id?: number
          incident_id?: number | null
          incident_report_id: number
          performed_by?: string | null
          phase: string
          phase_completed_at?: string | null
          phase_data?: Json | null
          phase_notes?: string | null
          phase_started_at?: string
          phase_status?: string | null
          sla_met?: boolean | null
          sla_target_seconds?: number | null
          sub_phase?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          duration_seconds?: number | null
          id?: number
          incident_id?: number | null
          incident_report_id?: number
          performed_by?: string | null
          phase?: string
          phase_completed_at?: string | null
          phase_data?: Json | null
          phase_notes?: string | null
          phase_started_at?: string
          phase_status?: string | null
          sla_met?: boolean | null
          sla_target_seconds?: number | null
          sub_phase?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_timeline_incident"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_report_timeline_incident_report_id_fkey"
            columns: ["incident_report_id"]
            isOneToOne: false
            referencedRelation: "calls_for_service"
            referencedColumns: ["id"]
          },
        ]
      }
      client_intakes: {
        Row: {
          consent_confirmed: boolean
          created_at: string
          ethnicity: Database["core"]["Enums"]["ethnicity_enum"][]
          general_notes: string | null
          health_concerns: Database["core"]["Enums"]["health_concern_enum"][]
          housing_status:
            | Database["core"]["Enums"]["housing_status_enum"]
            | null
          id: number
          immediate_needs:
            | Database["core"]["Enums"]["assessment_urgency"]
            | null
          intake_date: string
          intake_worker: string | null
          person_id: number
          place_of_origin:
            | Database["core"]["Enums"]["place_of_origin_enum"]
            | null
          privacy_acknowledged: boolean
          risk_factors: Database["core"]["Enums"]["risk_factor_enum"][]
          risk_level: Database["core"]["Enums"]["risk_level_enum"] | null
          situation_notes: string | null
        }
        Insert: {
          consent_confirmed: boolean
          created_at?: string
          ethnicity?: Database["core"]["Enums"]["ethnicity_enum"][]
          general_notes?: string | null
          health_concerns?: Database["core"]["Enums"]["health_concern_enum"][]
          housing_status?:
            | Database["core"]["Enums"]["housing_status_enum"]
            | null
          id?: number
          immediate_needs?:
            | Database["core"]["Enums"]["assessment_urgency"]
            | null
          intake_date?: string
          intake_worker?: string | null
          person_id: number
          place_of_origin?:
            | Database["core"]["Enums"]["place_of_origin_enum"]
            | null
          privacy_acknowledged: boolean
          risk_factors?: Database["core"]["Enums"]["risk_factor_enum"][]
          risk_level?: Database["core"]["Enums"]["risk_level_enum"] | null
          situation_notes?: string | null
        }
        Update: {
          consent_confirmed?: boolean
          created_at?: string
          ethnicity?: Database["core"]["Enums"]["ethnicity_enum"][]
          general_notes?: string | null
          health_concerns?: Database["core"]["Enums"]["health_concern_enum"][]
          housing_status?:
            | Database["core"]["Enums"]["housing_status_enum"]
            | null
          id?: number
          immediate_needs?:
            | Database["core"]["Enums"]["assessment_urgency"]
            | null
          intake_date?: string
          intake_worker?: string | null
          person_id?: number
          place_of_origin?:
            | Database["core"]["Enums"]["place_of_origin_enum"]
            | null
          privacy_acknowledged?: boolean
          risk_factors?: Database["core"]["Enums"]["risk_factor_enum"][]
          risk_level?: Database["core"]["Enums"]["risk_level_enum"] | null
          situation_notes?: string | null
        }
        Relationships: []
      }
      incident_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: number
          incident_id: number
          link_type: string | null
          linked_record_id: number
          linked_record_type: string
          notes: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          incident_id: number
          link_type?: string | null
          linked_record_id: number
          linked_record_type: string
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          incident_id?: number
          link_type?: string | null
          linked_record_id?: number
          linked_record_type?: string
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_links_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_people: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: number
          incident_id: number
          involvement_type: string
          is_unknown_party: boolean
          notes: string | null
          party_role: Database["core"]["Enums"]["party_role_enum"] | null
          person_id: number | null
          unknown_party_description: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          incident_id: number
          involvement_type: string
          is_unknown_party?: boolean
          notes?: string | null
          party_role?: Database["core"]["Enums"]["party_role_enum"] | null
          person_id?: number | null
          unknown_party_description?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          incident_id?: number
          involvement_type?: string
          is_unknown_party?: boolean
          notes?: string | null
          party_role?: Database["core"]["Enums"]["party_role_enum"] | null
          person_id?: number | null
          unknown_party_description?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_people_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_person_medical: {
        Row: {
          consciousness_level: string | null
          created_at: string | null
          created_by: string | null
          first_aid_details: string | null
          first_aid_other: string | null
          first_aid_provided: boolean | null
          first_aid_type: string[] | null
          follow_up_notes: string | null
          follow_up_required: boolean | null
          hospital_destination: string | null
          hospital_transport_offered: boolean | null
          id: number
          incident_person_id: number
          injury_severity: string | null
          medical_assessment_notes: string | null
          medical_issue_description: string | null
          medical_issue_other: string | null
          medical_issue_type: string | null
          medical_referral_details: string | null
          medical_referral_made: boolean | null
          required_medical_attention: boolean
          transport_decline_reason: string | null
          transport_declined: boolean | null
          transport_notes: string | null
          transported_by: string | null
          updated_at: string | null
          updated_by: string | null
          vital_signs_notes: string | null
        }
        Insert: {
          consciousness_level?: string | null
          created_at?: string | null
          created_by?: string | null
          first_aid_details?: string | null
          first_aid_other?: string | null
          first_aid_provided?: boolean | null
          first_aid_type?: string[] | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          hospital_destination?: string | null
          hospital_transport_offered?: boolean | null
          id?: number
          incident_person_id: number
          injury_severity?: string | null
          medical_assessment_notes?: string | null
          medical_issue_description?: string | null
          medical_issue_other?: string | null
          medical_issue_type?: string | null
          medical_referral_details?: string | null
          medical_referral_made?: boolean | null
          required_medical_attention?: boolean
          transport_decline_reason?: string | null
          transport_declined?: boolean | null
          transport_notes?: string | null
          transported_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vital_signs_notes?: string | null
        }
        Update: {
          consciousness_level?: string | null
          created_at?: string | null
          created_by?: string | null
          first_aid_details?: string | null
          first_aid_other?: string | null
          first_aid_provided?: boolean | null
          first_aid_type?: string[] | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          hospital_destination?: string | null
          hospital_transport_offered?: boolean | null
          id?: number
          incident_person_id?: number
          injury_severity?: string | null
          medical_assessment_notes?: string | null
          medical_issue_description?: string | null
          medical_issue_other?: string | null
          medical_issue_type?: string | null
          medical_referral_details?: string | null
          medical_referral_made?: boolean | null
          required_medical_attention?: boolean
          transport_decline_reason?: string | null
          transport_declined?: boolean | null
          transport_notes?: string | null
          transported_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vital_signs_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_person_medical_incident_person_id_fkey"
            columns: ["incident_person_id"]
            isOneToOne: false
            referencedRelation: "incident_people"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          actions_taken: string | null
          address_id: number | null
          address_search: string | null
          agency_coordination_notes: string | null
          agency_response_notes: string | null
          ambulance_unit_number: string | null
          assigned_ranger: string | null
          bylaw_enforcement_action: string | null
          bylaw_file_number: string | null
          bylaw_notes: string | null
          bylaw_notified: boolean | null
          bylaw_officers_attending: string | null
          bylaw_personnel_names: string | null
          bylaw_response_time: string | null
          city: string | null
          community_impact_notes: string | null
          coordinates: string | null
          country: string | null
          created_at: string
          created_by: string | null
          description: string | null
          dispatch_at: string | null
          dispatch_notes: string | null
          dispatch_priority:
            | Database["core"]["Enums"]["dispatch_priority_enum"]
            | null
          disposition_type: string | null
          draft_created_at: string | null
          ems_personnel_names: string | null
          ems_response_time: string | null
          environmental_factors:
            | Database["core"]["Enums"]["environmental_factors_enum"][]
            | null
          fire_department_called: boolean | null
          fire_personnel: string | null
          fire_unit_number: string | null
          first_unit_arrived_at: string | null
          first_unit_assigned_at: string | null
          follow_up_date: string | null
          follow_up_notes: string | null
          follow_up_required: boolean | null
          hospital_destination: string | null
          hospital_transport_offered: boolean | null
          id: number
          incident_cleared_at: string | null
          incident_commander: string | null
          incident_complexity:
            | Database["core"]["Enums"]["incident_complexity_enum"]
            | null
          incident_date: string | null
          incident_number: string | null
          incident_people: Json | null
          incident_report_id: number | null
          incident_time: string | null
          incident_type: Database["core"]["Enums"]["incident_type_enum"] | null
          initial_observations: string | null
          is_draft: boolean | null
          latitude: number | null
          location: string
          location_notes: string | null
          log_entries: Json | null
          longitude: number | null
          media_attention: boolean | null
          medical_assessment_notes: string | null
          mental_health_component: boolean | null
          multi_agency_response: boolean | null
          officers_attending: string | null
          outcome: string | null
          paramedics_called: boolean | null
          people_involved: string | null
          police_file_number: string | null
          police_notified: boolean | null
          postal_code: string | null
          priority: Database["core"]["Enums"]["incident_priority_enum"] | null
          priority_reason: string | null
          property_brand: string | null
          property_condition: string | null
          property_description: string | null
          property_involved: boolean | null
          property_model: string | null
          property_recovered: boolean | null
          property_serial: string | null
          property_type: string | null
          property_value: string | null
          province: string | null
          public_safety_impact:
            | Database["core"]["Enums"]["public_safety_impact_enum"]
            | null
          recommendations: string | null
          recovery_method: string | null
          referrals_made: string[] | null
          related_medical_episode_id: string | null
          reported_by: string | null
          reporter_id: string | null
          resource_allocation_notes: string | null
          resources_distributed: string[] | null
          response_time_minutes: number | null
          safety_concerns: string | null
          scene_conditions: string | null
          scene_safety: string | null
          services_notes: string | null
          services_offered: string[] | null
          services_provided: string[] | null
          status: Database["core"]["Enums"]["incident_status_enum"] | null
          status_history: Json | null
          street_address: string | null
          substance_indicators:
            | Database["core"]["Enums"]["substance_indicators_enum"][]
            | null
          tags: string[] | null
          total_incident_time_minutes: number | null
          transport_decline_reason: string | null
          transport_declined: boolean | null
          updated_at: string | null
          updated_by: string | null
          weather_conditions: string | null
        }
        Insert: {
          actions_taken?: string | null
          address_id?: number | null
          address_search?: string | null
          agency_coordination_notes?: string | null
          agency_response_notes?: string | null
          ambulance_unit_number?: string | null
          assigned_ranger?: string | null
          bylaw_enforcement_action?: string | null
          bylaw_file_number?: string | null
          bylaw_notes?: string | null
          bylaw_notified?: boolean | null
          bylaw_officers_attending?: string | null
          bylaw_personnel_names?: string | null
          bylaw_response_time?: string | null
          city?: string | null
          community_impact_notes?: string | null
          coordinates?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dispatch_at?: string | null
          dispatch_notes?: string | null
          dispatch_priority?:
            | Database["core"]["Enums"]["dispatch_priority_enum"]
            | null
          disposition_type?: string | null
          draft_created_at?: string | null
          ems_personnel_names?: string | null
          ems_response_time?: string | null
          environmental_factors?:
            | Database["core"]["Enums"]["environmental_factors_enum"][]
            | null
          fire_department_called?: boolean | null
          fire_personnel?: string | null
          fire_unit_number?: string | null
          first_unit_arrived_at?: string | null
          first_unit_assigned_at?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          hospital_destination?: string | null
          hospital_transport_offered?: boolean | null
          id?: number
          incident_cleared_at?: string | null
          incident_commander?: string | null
          incident_complexity?:
            | Database["core"]["Enums"]["incident_complexity_enum"]
            | null
          incident_date?: string | null
          incident_number?: string | null
          incident_people?: Json | null
          incident_report_id?: number | null
          incident_time?: string | null
          incident_type?: Database["core"]["Enums"]["incident_type_enum"] | null
          initial_observations?: string | null
          is_draft?: boolean | null
          latitude?: number | null
          location: string
          location_notes?: string | null
          log_entries?: Json | null
          longitude?: number | null
          media_attention?: boolean | null
          medical_assessment_notes?: string | null
          mental_health_component?: boolean | null
          multi_agency_response?: boolean | null
          officers_attending?: string | null
          outcome?: string | null
          paramedics_called?: boolean | null
          people_involved?: string | null
          police_file_number?: string | null
          police_notified?: boolean | null
          postal_code?: string | null
          priority?: Database["core"]["Enums"]["incident_priority_enum"] | null
          priority_reason?: string | null
          property_brand?: string | null
          property_condition?: string | null
          property_description?: string | null
          property_involved?: boolean | null
          property_model?: string | null
          property_recovered?: boolean | null
          property_serial?: string | null
          property_type?: string | null
          property_value?: string | null
          province?: string | null
          public_safety_impact?:
            | Database["core"]["Enums"]["public_safety_impact_enum"]
            | null
          recommendations?: string | null
          recovery_method?: string | null
          referrals_made?: string[] | null
          related_medical_episode_id?: string | null
          reported_by?: string | null
          reporter_id?: string | null
          resource_allocation_notes?: string | null
          resources_distributed?: string[] | null
          response_time_minutes?: number | null
          safety_concerns?: string | null
          scene_conditions?: string | null
          scene_safety?: string | null
          services_notes?: string | null
          services_offered?: string[] | null
          services_provided?: string[] | null
          status?: Database["core"]["Enums"]["incident_status_enum"] | null
          status_history?: Json | null
          street_address?: string | null
          substance_indicators?:
            | Database["core"]["Enums"]["substance_indicators_enum"][]
            | null
          tags?: string[] | null
          total_incident_time_minutes?: number | null
          transport_decline_reason?: string | null
          transport_declined?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          weather_conditions?: string | null
        }
        Update: {
          actions_taken?: string | null
          address_id?: number | null
          address_search?: string | null
          agency_coordination_notes?: string | null
          agency_response_notes?: string | null
          ambulance_unit_number?: string | null
          assigned_ranger?: string | null
          bylaw_enforcement_action?: string | null
          bylaw_file_number?: string | null
          bylaw_notes?: string | null
          bylaw_notified?: boolean | null
          bylaw_officers_attending?: string | null
          bylaw_personnel_names?: string | null
          bylaw_response_time?: string | null
          city?: string | null
          community_impact_notes?: string | null
          coordinates?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dispatch_at?: string | null
          dispatch_notes?: string | null
          dispatch_priority?:
            | Database["core"]["Enums"]["dispatch_priority_enum"]
            | null
          disposition_type?: string | null
          draft_created_at?: string | null
          ems_personnel_names?: string | null
          ems_response_time?: string | null
          environmental_factors?:
            | Database["core"]["Enums"]["environmental_factors_enum"][]
            | null
          fire_department_called?: boolean | null
          fire_personnel?: string | null
          fire_unit_number?: string | null
          first_unit_arrived_at?: string | null
          first_unit_assigned_at?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          hospital_destination?: string | null
          hospital_transport_offered?: boolean | null
          id?: number
          incident_cleared_at?: string | null
          incident_commander?: string | null
          incident_complexity?:
            | Database["core"]["Enums"]["incident_complexity_enum"]
            | null
          incident_date?: string | null
          incident_number?: string | null
          incident_people?: Json | null
          incident_report_id?: number | null
          incident_time?: string | null
          incident_type?: Database["core"]["Enums"]["incident_type_enum"] | null
          initial_observations?: string | null
          is_draft?: boolean | null
          latitude?: number | null
          location?: string
          location_notes?: string | null
          log_entries?: Json | null
          longitude?: number | null
          media_attention?: boolean | null
          medical_assessment_notes?: string | null
          mental_health_component?: boolean | null
          multi_agency_response?: boolean | null
          officers_attending?: string | null
          outcome?: string | null
          paramedics_called?: boolean | null
          people_involved?: string | null
          police_file_number?: string | null
          police_notified?: boolean | null
          postal_code?: string | null
          priority?: Database["core"]["Enums"]["incident_priority_enum"] | null
          priority_reason?: string | null
          property_brand?: string | null
          property_condition?: string | null
          property_description?: string | null
          property_involved?: boolean | null
          property_model?: string | null
          property_recovered?: boolean | null
          property_serial?: string | null
          property_type?: string | null
          property_value?: string | null
          province?: string | null
          public_safety_impact?:
            | Database["core"]["Enums"]["public_safety_impact_enum"]
            | null
          recommendations?: string | null
          recovery_method?: string | null
          referrals_made?: string[] | null
          related_medical_episode_id?: string | null
          reported_by?: string | null
          reporter_id?: string | null
          resource_allocation_notes?: string | null
          resources_distributed?: string[] | null
          response_time_minutes?: number | null
          safety_concerns?: string | null
          scene_conditions?: string | null
          scene_safety?: string | null
          services_notes?: string | null
          services_offered?: string[] | null
          services_provided?: string[] | null
          status?: Database["core"]["Enums"]["incident_status_enum"] | null
          status_history?: Json | null
          street_address?: string | null
          substance_indicators?:
            | Database["core"]["Enums"]["substance_indicators_enum"][]
            | null
          tags?: string[] | null
          total_incident_time_minutes?: number | null
          transport_decline_reason?: string | null
          transport_declined?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_incident_report_id_fkey"
            columns: ["incident_report_id"]
            isOneToOne: false
            referencedRelation: "calls_for_service"
            referencedColumns: ["id"]
          },
        ]
      }
      property_actions: {
        Row: {
          action_description: string
          action_type: string
          created_at: string | null
          created_by: string | null
          id: number
          new_status: string | null
          notes: string | null
          old_status: string | null
          performed_at: string | null
          performed_by: string
          property_id: number
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          action_description: string
          action_type: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_at?: string | null
          performed_by: string
          property_id: number
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          action_description?: string
          action_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_at?: string | null
          performed_by?: string
          property_id?: number
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_actions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_records"
            referencedColumns: ["id"]
          },
        ]
      }
      property_records: {
        Row: {
          bike_id: string | null
          brand: string | null
          category: string | null
          color: string | null
          condition: string | null
          created_at: string | null
          created_by: string
          description: string
          disposition_date: string | null
          disposition_notes: string | null
          disposition_type: string | null
          estimated_value: number | null
          found_by: string
          found_coordinates: string | null
          found_date: string
          found_location: string
          found_time: string
          handed_to_police_date: string | null
          id: number
          incident_id: number | null
          investigation_notes: string | null
          model: string | null
          owner_address: string | null
          owner_contact: string | null
          owner_name: string | null
          photos: Json | null
          police_file_number: string | null
          police_officer: string | null
          property_number: string
          property_type: string
          recovery_method: string | null
          return_accepted_by: string | null
          return_business_address: string | null
          return_business_name: string | null
          return_contact_person: string | null
          return_individual_id_number: string | null
          return_individual_id_type: string | null
          return_location: string | null
          return_method: string | null
          return_notes: string | null
          return_photos: Json | null
          return_receipt_number: string | null
          return_recipient_email: string | null
          return_recipient_name: string | null
          return_recipient_phone: string | null
          return_relationship: string | null
          return_type: string | null
          return_verification_method: string | null
          returned_date: string | null
          returned_time: string | null
          returned_to: string | null
          serial_number: string | null
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bike_id?: string | null
          brand?: string | null
          category?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string | null
          created_by: string
          description: string
          disposition_date?: string | null
          disposition_notes?: string | null
          disposition_type?: string | null
          estimated_value?: number | null
          found_by: string
          found_coordinates?: string | null
          found_date: string
          found_location: string
          found_time: string
          handed_to_police_date?: string | null
          id?: number
          incident_id?: number | null
          investigation_notes?: string | null
          model?: string | null
          owner_address?: string | null
          owner_contact?: string | null
          owner_name?: string | null
          photos?: Json | null
          police_file_number?: string | null
          police_officer?: string | null
          property_number: string
          property_type: string
          recovery_method?: string | null
          return_accepted_by?: string | null
          return_business_address?: string | null
          return_business_name?: string | null
          return_contact_person?: string | null
          return_individual_id_number?: string | null
          return_individual_id_type?: string | null
          return_location?: string | null
          return_method?: string | null
          return_notes?: string | null
          return_photos?: Json | null
          return_receipt_number?: string | null
          return_recipient_email?: string | null
          return_recipient_name?: string | null
          return_recipient_phone?: string | null
          return_relationship?: string | null
          return_type?: string | null
          return_verification_method?: string | null
          returned_date?: string | null
          returned_time?: string | null
          returned_to?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bike_id?: string | null
          brand?: string | null
          category?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string | null
          created_by?: string
          description?: string
          disposition_date?: string | null
          disposition_notes?: string | null
          disposition_type?: string | null
          estimated_value?: number | null
          found_by?: string
          found_coordinates?: string | null
          found_date?: string
          found_location?: string
          found_time?: string
          handed_to_police_date?: string | null
          id?: number
          incident_id?: number | null
          investigation_notes?: string | null
          model?: string | null
          owner_address?: string | null
          owner_contact?: string | null
          owner_name?: string | null
          photos?: Json | null
          police_file_number?: string | null
          police_officer?: string | null
          property_number?: string
          property_type?: string
          recovery_method?: string | null
          return_accepted_by?: string | null
          return_business_address?: string | null
          return_business_name?: string | null
          return_contact_person?: string | null
          return_individual_id_number?: string | null
          return_individual_id_type?: string | null
          return_location?: string | null
          return_method?: string | null
          return_notes?: string | null
          return_photos?: Json | null
          return_receipt_number?: string | null
          return_recipient_email?: string | null
          return_recipient_name?: string | null
          return_recipient_phone?: string | null
          return_relationship?: string | null
          return_type?: string | null
          return_verification_method?: string | null
          returned_date?: string | null
          returned_time?: string | null
          returned_to?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_records_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  core: {
    Tables: {
      address_activities: {
        Row: {
          action_taken: string | null
          activity_date: string
          activity_time: string | null
          activity_type: string
          address_id: number
          attachments: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          findings: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          location_notes: string | null
          priority: string | null
          related_hazmat_episode_id: string | null
          related_property_record_id: number | null
          staff_member: string
          tags: string[] | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action_taken?: string | null
          activity_date: string
          activity_time?: string | null
          activity_type: string
          address_id: number
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          findings?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          location_notes?: string | null
          priority?: string | null
          related_hazmat_episode_id?: string | null
          related_property_record_id?: number | null
          staff_member: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action_taken?: string | null
          activity_date?: string
          activity_time?: string | null
          activity_type?: string
          address_id?: number
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          findings?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          location_notes?: string | null
          priority?: string | null
          related_hazmat_episode_id?: string | null
          related_property_record_id?: number | null
          staff_member?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "address_activities_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          address_type: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          id: number
          informal_description: string | null
          is_active: boolean | null
          landmark_reference: string | null
          latitude: number | null
          location_type: string | null
          longitude: number | null
          notes: string | null
          postal_code: string | null
          province: string | null
          street_address: string
          unit_number: string | null
          updated_at: string | null
          updated_by: string | null
          usage_count: number | null
        }
        Insert: {
          address_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: number
          informal_description?: string | null
          is_active?: boolean | null
          landmark_reference?: string | null
          latitude?: number | null
          location_type?: string | null
          longitude?: number | null
          notes?: string | null
          postal_code?: string | null
          province?: string | null
          street_address: string
          unit_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
          usage_count?: number | null
        }
        Update: {
          address_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: number
          informal_description?: string | null
          is_active?: boolean | null
          landmark_reference?: string | null
          latitude?: number | null
          location_type?: string | null
          longitude?: number | null
          notes?: string | null
          postal_code?: string | null
          province?: string | null
          street_address?: string
          unit_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      ai_cache_logs: {
        Row: {
          cache_key: string | null
          cache_table: string
          created_at: string
          data_size_bytes: number | null
          id: string
          operation_type: string
          person_id: number | null
          request_context: Json | null
          requesting_module: string | null
          response_time_ms: number | null
        }
        Insert: {
          cache_key?: string | null
          cache_table: string
          created_at?: string
          data_size_bytes?: number | null
          id?: string
          operation_type: string
          person_id?: number | null
          request_context?: Json | null
          requesting_module?: string | null
          response_time_ms?: number | null
        }
        Update: {
          cache_key?: string | null
          cache_table?: string
          created_at?: string
          data_size_bytes?: number | null
          id?: string
          operation_type?: string
          person_id?: number | null
          request_context?: Json | null
          requesting_module?: string | null
          response_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_cache_logs_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_person_insights: {
        Row: {
          analysis_version: string | null
          behavioral_patterns: Json
          confidence_score: number | null
          created_at: string
          created_by: string | null
          data_sources: Json
          engagement_analysis: Json
          expires_at: string
          id: string
          intervention_recommendations: Json
          is_stale: boolean | null
          outcome_predictions: Json
          person_id: number
          processing_time_ms: number | null
          refresh_count: number | null
          risk_assessment: Json
          token_usage: number | null
          updated_at: string
        }
        Insert: {
          analysis_version?: string | null
          behavioral_patterns?: Json
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          data_sources?: Json
          engagement_analysis?: Json
          expires_at?: string
          id?: string
          intervention_recommendations?: Json
          is_stale?: boolean | null
          outcome_predictions?: Json
          person_id: number
          processing_time_ms?: number | null
          refresh_count?: number | null
          risk_assessment?: Json
          token_usage?: number | null
          updated_at?: string
        }
        Update: {
          analysis_version?: string | null
          behavioral_patterns?: Json
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          data_sources?: Json
          engagement_analysis?: Json
          expires_at?: string
          id?: string
          intervention_recommendations?: Json
          is_stale?: boolean | null
          outcome_predictions?: Json
          person_id?: number
          processing_time_ms?: number | null
          refresh_count?: number | null
          risk_assessment?: Json
          token_usage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_person_insights_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendations: {
        Row: {
          confidence_score: number | null
          contextual_data: Json
          created_at: string
          description: string
          expected_outcomes: Json
          expires_at: string
          historical_effectiveness: number | null
          id: string
          implemented_at: string | null
          implemented_by: string | null
          is_active: boolean | null
          outcome_notes: string | null
          person_id: number
          priority: string
          rationale: string | null
          recommendation_type: string
          resource_requirements: Json
          status: string | null
          suggested_actions: Json
          timeline_days: number | null
          title: string
          triggering_factors: Json
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          contextual_data?: Json
          created_at?: string
          description: string
          expected_outcomes?: Json
          expires_at?: string
          historical_effectiveness?: number | null
          id?: string
          implemented_at?: string | null
          implemented_by?: string | null
          is_active?: boolean | null
          outcome_notes?: string | null
          person_id: number
          priority: string
          rationale?: string | null
          recommendation_type: string
          resource_requirements?: Json
          status?: string | null
          suggested_actions?: Json
          timeline_days?: number | null
          title: string
          triggering_factors?: Json
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          contextual_data?: Json
          created_at?: string
          description?: string
          expected_outcomes?: Json
          expires_at?: string
          historical_effectiveness?: number | null
          id?: string
          implemented_at?: string | null
          implemented_by?: string | null
          is_active?: boolean | null
          outcome_notes?: string | null
          person_id?: number
          priority?: string
          rationale?: string | null
          recommendation_type?: string
          resource_requirements?: Json
          status?: string | null
          suggested_actions?: Json
          timeline_days?: number | null
          title?: string
          triggering_factors?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_risk_assessments: {
        Row: {
          assessment_date: string
          assessment_method: string | null
          confidence_score: number | null
          created_at: string
          crisis_predictors: Json
          expires_at: string
          health_risk_score: number | null
          housing_risk_score: number | null
          id: string
          is_validated: boolean | null
          justice_risk_score: number | null
          mental_health_risk_score: number | null
          monitoring_frequency: string | null
          overall_risk_score: number
          person_id: number
          protective_factors: Json
          recommended_interventions: Json
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_factors: Json
          risk_level: string
          risk_trajectory: Json
          social_risk_score: number | null
          substance_use_risk_score: number | null
          updated_at: string
          volatility_indicators: Json
        }
        Insert: {
          assessment_date?: string
          assessment_method?: string | null
          confidence_score?: number | null
          created_at?: string
          crisis_predictors?: Json
          expires_at?: string
          health_risk_score?: number | null
          housing_risk_score?: number | null
          id?: string
          is_validated?: boolean | null
          justice_risk_score?: number | null
          mental_health_risk_score?: number | null
          monitoring_frequency?: string | null
          overall_risk_score: number
          person_id: number
          protective_factors?: Json
          recommended_interventions?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_factors?: Json
          risk_level: string
          risk_trajectory?: Json
          social_risk_score?: number | null
          substance_use_risk_score?: number | null
          updated_at?: string
          volatility_indicators?: Json
        }
        Update: {
          assessment_date?: string
          assessment_method?: string | null
          confidence_score?: number | null
          created_at?: string
          crisis_predictors?: Json
          expires_at?: string
          health_risk_score?: number | null
          housing_risk_score?: number | null
          id?: string
          is_validated?: boolean | null
          justice_risk_score?: number | null
          mental_health_risk_score?: number | null
          monitoring_frequency?: string | null
          overall_risk_score?: number
          person_id?: number
          protective_factors?: Json
          recommended_interventions?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_factors?: Json
          risk_level?: string
          risk_trajectory?: Json
          social_risk_score?: number | null
          substance_use_risk_score?: number | null
          updated_at?: string
          volatility_indicators?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_risk_assessments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      arrest_history: {
        Row: {
          arrest_date: string
          arrest_time: string | null
          arresting_agency: string | null
          bail_amount: number | null
          booking_number: string | null
          case_number: string | null
          charges: string
          created_at: string | null
          created_by: string | null
          disposition: string | null
          id: number
          location: string | null
          notes: string | null
          person_id: number
          release_date: string | null
          release_type: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          arrest_date: string
          arrest_time?: string | null
          arresting_agency?: string | null
          bail_amount?: number | null
          booking_number?: string | null
          case_number?: string | null
          charges: string
          created_at?: string | null
          created_by?: string | null
          disposition?: string | null
          id?: number
          location?: string | null
          notes?: string | null
          person_id: number
          release_date?: string | null
          release_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          arrest_date?: string
          arrest_time?: string | null
          arresting_agency?: string | null
          bail_amount?: number | null
          booking_number?: string | null
          case_number?: string | null
          charges?: string
          created_at?: string | null
          created_by?: string | null
          disposition?: string | null
          id?: number
          location?: string | null
          notes?: string | null
          person_id?: number
          release_date?: string | null
          release_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arrest_history_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          assessment_type: string
          created_at: string
          created_by: string | null
          id: number
          person_id: number | null
          question_id: string | null
          question_text: string | null
          response_type: string | null
          response_value: string | null
          session_date: string | null
          step_id: string
          updated_at: string
          updated_by: string | null
          wizard_session_id: string | null
        }
        Insert: {
          assessment_type: string
          created_at?: string
          created_by?: string | null
          id?: number
          person_id?: number | null
          question_id?: string | null
          question_text?: string | null
          response_type?: string | null
          response_value?: string | null
          session_date?: string | null
          step_id: string
          updated_at?: string
          updated_by?: string | null
          wizard_session_id?: string | null
        }
        Update: {
          assessment_type?: string
          created_at?: string
          created_by?: string | null
          id?: number
          person_id?: number | null
          question_id?: string | null
          question_text?: string | null
          response_type?: string | null
          response_value?: string | null
          session_date?: string | null
          step_id?: string
          updated_at?: string
          updated_by?: string | null
          wizard_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_wizard_session_id_fkey"
            columns: ["wizard_session_id"]
            isOneToOne: false
            referencedRelation: "wizard_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_import_snapshots: {
        Row: {
          admin_user_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: number
          is_rolled_back: boolean | null
          operation_type: string
          record_count: number
          results: Json | null
          rollback_admin_id: string | null
          rollback_date: string | null
          snapshot_metadata: Json | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          admin_user_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_rolled_back?: boolean | null
          operation_type: string
          record_count: number
          results?: Json | null
          rollback_admin_id?: string | null
          rollback_date?: string | null
          snapshot_metadata?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          admin_user_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_rolled_back?: boolean | null
          operation_type?: string
          record_count?: number
          results?: Json | null
          rollback_admin_id?: string | null
          rollback_date?: string | null
          snapshot_metadata?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      batch_rollback_details: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: number
          operation: string
          original_data: Json | null
          record_id: number
          snapshot_id: number | null
          table_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          operation: string
          original_data?: Json | null
          record_id: number
          snapshot_id?: number | null
          table_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          operation?: string
          original_data?: Json | null
          record_id?: number
          snapshot_id?: number | null
          table_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_rollback_details_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "batch_import_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      bike_activities: {
        Row: {
          activity_date: string
          activity_time: string | null
          activity_type: string
          attachments: Json | null
          bike_id: string
          citation_number: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          location: string | null
          officer_badge: string | null
          outcome: string | null
          priority: string | null
          staff_member: string
          tags: string[] | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activity_date: string
          activity_time?: string | null
          activity_type: string
          attachments?: Json | null
          bike_id: string
          citation_number?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          location?: string | null
          officer_badge?: string | null
          outcome?: string | null
          priority?: string | null
          staff_member: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activity_date?: string
          activity_time?: string | null
          activity_type?: string
          attachments?: Json | null
          bike_id?: string
          citation_number?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          location?: string | null
          officer_badge?: string | null
          outcome?: string | null
          priority?: string | null
          staff_member?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bike_activities_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
        ]
      }
      bikes: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          id: string
          is_stolen: boolean
          make: string
          model: string
          owner_email: string
          owner_name: string
          photo_base64: string | null
          registered_at: string
          reported_stolen_at: string | null
          serial_number: string
          suspect_details: string | null
          theft_date: string | null
          theft_location: string | null
          theft_notes: string | null
          theft_time: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
          value: number | null
        }
        Insert: {
          color: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_stolen?: boolean
          make: string
          model: string
          owner_email: string
          owner_name: string
          photo_base64?: string | null
          registered_at?: string
          reported_stolen_at?: string | null
          serial_number: string
          suspect_details?: string | null
          theft_date?: string | null
          theft_location?: string | null
          theft_notes?: string | null
          theft_time?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          value?: number | null
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_stolen?: boolean
          make?: string
          model?: string
          owner_email?: string
          owner_name?: string
          photo_base64?: string | null
          registered_at?: string
          reported_stolen_at?: string | null
          serial_number?: string
          suspect_details?: string | null
          theft_date?: string | null
          theft_location?: string | null
          theft_notes?: string | null
          theft_time?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          value?: number | null
        }
        Relationships: []
      }
      case_management: {
        Row: {
          agency: string | null
          case_manager_contact: string | null
          case_manager_name: string
          case_number: string | null
          case_type: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: number
          notes: string | null
          person_id: number
          priority: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          agency?: string | null
          case_manager_contact?: string | null
          case_manager_name: string
          case_number?: string | null
          case_type?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: number
          notes?: string | null
          person_id: number
          priority?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          agency?: string | null
          case_manager_contact?: string | null
          case_manager_name?: string
          case_number?: string | null
          case_type?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: number
          notes?: string | null
          person_id?: number
          priority?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_management_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      disabilities: {
        Row: {
          accommodation_needs: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          diagnosed_date: string | null
          disability_type: string
          healthcare_provider: string | null
          id: number
          notes: string | null
          person_id: number
          severity: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          accommodation_needs?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          diagnosed_date?: string | null
          disability_type: string
          healthcare_provider?: string | null
          id?: number
          notes?: string | null
          person_id: number
          severity?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          accommodation_needs?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          diagnosed_date?: string | null
          disability_type?: string
          healthcare_provider?: string | null
          id?: number
          notes?: string | null
          person_id?: number
          severity?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disabilities_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      encampment_visits: {
        Row: {
          accessibility_issues: string | null
          created_at: string | null
          created_by: string | null
          encampment_id: string
          enforcement_action: string | null
          estimated_population: number | null
          follow_up_notes: string | null
          follow_up_required: boolean | null
          fuel_sources: Json | null
          id: string
          immediate_needs: Json | null
          overall_condition: string | null
          population_notes: string | null
          safety_level: string | null
          services_provided: Json | null
          shelter_types: Json | null
          structure_count: number | null
          tent_count: number | null
          updated_at: string | null
          updated_by: string | null
          vehicle_count: number | null
          violations_observed: Json | null
          visit_date: string
          visit_duration_minutes: number | null
          visit_notes: string | null
          visitor_email: string | null
          visitor_name: string
          waste_management: Json | null
          water_access: Json | null
          weather_conditions: string | null
          weather_impact: string | null
        }
        Insert: {
          accessibility_issues?: string | null
          created_at?: string | null
          created_by?: string | null
          encampment_id: string
          enforcement_action?: string | null
          estimated_population?: number | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          fuel_sources?: Json | null
          id?: string
          immediate_needs?: Json | null
          overall_condition?: string | null
          population_notes?: string | null
          safety_level?: string | null
          services_provided?: Json | null
          shelter_types?: Json | null
          structure_count?: number | null
          tent_count?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_count?: number | null
          violations_observed?: Json | null
          visit_date?: string
          visit_duration_minutes?: number | null
          visit_notes?: string | null
          visitor_email?: string | null
          visitor_name: string
          waste_management?: Json | null
          water_access?: Json | null
          weather_conditions?: string | null
          weather_impact?: string | null
        }
        Update: {
          accessibility_issues?: string | null
          created_at?: string | null
          created_by?: string | null
          encampment_id?: string
          enforcement_action?: string | null
          estimated_population?: number | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          fuel_sources?: Json | null
          id?: string
          immediate_needs?: Json | null
          overall_condition?: string | null
          population_notes?: string | null
          safety_level?: string | null
          services_provided?: Json | null
          shelter_types?: Json | null
          structure_count?: number | null
          tent_count?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_count?: number | null
          violations_observed?: Json | null
          visit_date?: string
          visit_duration_minutes?: number | null
          visit_notes?: string | null
          visitor_email?: string | null
          visitor_name?: string
          waste_management?: Json | null
          water_access?: Json | null
          weather_conditions?: string | null
          weather_impact?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encampment_visits_encampment_id_fkey"
            columns: ["encampment_id"]
            isOneToOne: false
            referencedRelation: "encampments"
            referencedColumns: ["id"]
          },
        ]
      }
      encampments: {
        Row: {
          address_id: number | null
          coordinates: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_population: number | null
          id: string
          last_visited: string | null
          location: string | null
          name: string
          safety_concerns: string | null
          services_needed: string | null
          status: Database["core"]["Enums"]["encampment_status_enum"]
          type: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address_id?: number | null
          coordinates?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_population?: number | null
          id?: string
          last_visited?: string | null
          location?: string | null
          name: string
          safety_concerns?: string | null
          services_needed?: string | null
          status?: Database["core"]["Enums"]["encampment_status_enum"]
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address_id?: number | null
          coordinates?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_population?: number | null
          id?: string
          last_visited?: string | null
          location?: string | null
          name?: string
          safety_concerns?: string | null
          services_needed?: string | null
          status?: Database["core"]["Enums"]["encampment_status_enum"]
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encampments_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_relationships: {
        Row: {
          confidence_level: string | null
          created_at: string | null
          created_by: string | null
          episode_1_id: string
          episode_2_id: string
          id: string
          identified_by: string
          person_id: number
          relationship_description: string | null
          relationship_type: string
          time_between_episodes: unknown
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string | null
          created_by?: string | null
          episode_1_id: string
          episode_2_id: string
          id?: string
          identified_by: string
          person_id: number
          relationship_description?: string | null
          relationship_type: string
          time_between_episodes?: unknown
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          confidence_level?: string | null
          created_at?: string | null
          created_by?: string | null
          episode_1_id?: string
          episode_2_id?: string
          id?: string
          identified_by?: string
          person_id?: number
          relationship_description?: string | null
          relationship_type?: string
          time_between_episodes?: unknown
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episode_relationships_episode_1_id_fkey"
            columns: ["episode_1_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_relationships_episode_1_id_fkey"
            columns: ["episode_1_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_relationships_episode_2_id_fkey"
            columns: ["episode_2_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_relationships_episode_2_id_fkey"
            columns: ["episode_2_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_relationships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          active: boolean
          category: string
          cost_per_unit: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          minimum_threshold: number | null
          name: string
          supplier: string | null
          unit_type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          category: string
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          minimum_threshold?: number | null
          name: string
          supplier?: string | null
          unit_type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          category?: string
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          minimum_threshold?: number | null
          name?: string
          supplier?: string | null
          unit_type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      media: {
        Row: {
          content_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          file_size: number | null
          filename: string
          id: number
          record_id: number
          record_type: string
          stored_at: string
          updated_at: string | null
          updated_by: string | null
          uploaded_at: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_size?: number | null
          filename: string
          id?: number
          record_id: number
          record_type: string
          stored_at: string
          updated_at?: string | null
          updated_by?: string | null
          uploaded_at?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_size?: number | null
          filename?: string
          id?: number
          record_id?: number
          record_type?: string
          stored_at?: string
          updated_at?: string | null
          updated_by?: string | null
          uploaded_at?: string | null
        }
        Relationships: []
      }
      medical_conditions: {
        Row: {
          category: string
          common_in_homeless: boolean | null
          condition_name: string
          created_at: string | null
          description: string | null
          id: string
          plain_language_name: string
          severity_indicator: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          common_in_homeless?: boolean | null
          condition_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          plain_language_name: string
          severity_indicator?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          common_in_homeless?: boolean | null
          condition_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          plain_language_name?: string
          severity_indicator?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      medical_episode_documents: {
        Row: {
          document_type: string
          episode_id: string
          file_path: string
          file_size: number | null
          id: string
          notes: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          document_type: string
          episode_id: string
          file_path: string
          file_size?: number | null
          id?: string
          notes?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          document_type?: string
          episode_id?: string
          file_path?: string
          file_size?: number | null
          id?: string
          notes?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_episode_documents_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_episode_documents_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes_full"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_episode_signatures: {
        Row: {
          consent_scope: string | null
          created_by: string | null
          episode_id: string
          id: string
          signature_payload: Json | null
          signed_at: string
          signer_name: string
          signer_type: string
          witness_name: string | null
        }
        Insert: {
          consent_scope?: string | null
          created_by?: string | null
          episode_id: string
          id?: string
          signature_payload?: Json | null
          signed_at?: string
          signer_name: string
          signer_type: string
          witness_name?: string | null
        }
        Update: {
          consent_scope?: string | null
          created_by?: string | null
          episode_id?: string
          id?: string
          signature_payload?: Json | null
          signed_at?: string
          signer_name?: string
          signer_type?: string
          witness_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_episode_signatures_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_episode_signatures_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes_full"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_episodes: {
        Row: {
          assessment_data: Json | null
          assessment_summary: string | null
          body_location_ids: string[] | null
          chart_lock_metadata: Json | null
          check_in_id: string | null
          chief_complaint: string | null
          condition_id: string | null
          condition_instance_id: string | null
          consent_status: string | null
          created_at: string | null
          created_by: string | null
          days_since_onset: number | null
          destination_facility: string | null
          diagnosis_source: string | null
          duration_observed: string | null
          environmental_factors: string | null
          episode_date: string
          episode_datetime: string | null
          episode_end_date: string | null
          episode_status:
            | Database["public"]["Enums"]["medical_status_enum"]
            | null
          episode_type: string
          escalation_needed: boolean | null
          facility_involved: string | null
          follow_up_needed: boolean | null
          follow_up_notes: string | null
          follow_up_timeline:
            | Database["core"]["Enums"]["follow_up_plan_enum"]
            | null
          gps_latitude: number | null
          gps_longitude: number | null
          healthcare_provider: string | null
          id: string
          incident_role: string | null
          initial_photo_urls: string[] | null
          intervention_details: Json | null
          intervention_ids: string[] | null
          interventions_used: string | null
          is_diagnosed: boolean | null
          last_assessment_date: string | null
          location_accuracy: number | null
          location_address: string | null
          location_occurred: string | null
          location_source: string | null
          location_timestamp: string | null
          medical_issue_type_ids: string[] | null
          objective_findings: string | null
          observable_symptoms: Json | null
          outcome: string | null
          outcome_id: string | null
          person_id: number
          person_response: string | null
          photo_urls: string[] | null
          plan_summary: string | null
          possible_triggers: string | null
          primary_condition: string
          primary_issue_type_id: string | null
          primary_symptom_ids: string[] | null
          progress_photo_urls: Json | null
          progression_status:
            | Database["core"]["Enums"]["progression_status"]
            | null
          referrals_made: string | null
          refusal_reason: string | null
          related_incident_id: number | null
          risk_to_others: string | null
          risk_to_self: string | null
          safety_plan_discussed: boolean | null
          scene_arrival_at: string | null
          scene_departure_at: string | null
          severity_factors: string[] | null
          severity_level:
            | Database["core"]["Enums"]["severity_level_enum"]
            | null
          severity_score: number | null
          situation_context: string | null
          subjective_notes: string | null
          transport_decision: string | null
          updated_at: string | null
          updated_by: string | null
          urgency_level:
            | Database["public"]["Enums"]["medical_urgency_enum"]
            | null
          visible_symptom_ids: string[] | null
          warning_signs: string[] | null
          wound_details: Json | null
          wound_location_id: string | null
        }
        Insert: {
          assessment_data?: Json | null
          assessment_summary?: string | null
          body_location_ids?: string[] | null
          chart_lock_metadata?: Json | null
          check_in_id?: string | null
          chief_complaint?: string | null
          condition_id?: string | null
          condition_instance_id?: string | null
          consent_status?: string | null
          created_at?: string | null
          created_by?: string | null
          days_since_onset?: number | null
          destination_facility?: string | null
          diagnosis_source?: string | null
          duration_observed?: string | null
          environmental_factors?: string | null
          episode_date: string
          episode_datetime?: string | null
          episode_end_date?: string | null
          episode_status?:
            | Database["public"]["Enums"]["medical_status_enum"]
            | null
          episode_type: string
          escalation_needed?: boolean | null
          facility_involved?: string | null
          follow_up_needed?: boolean | null
          follow_up_notes?: string | null
          follow_up_timeline?:
            | Database["core"]["Enums"]["follow_up_plan_enum"]
            | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          healthcare_provider?: string | null
          id?: string
          incident_role?: string | null
          initial_photo_urls?: string[] | null
          intervention_details?: Json | null
          intervention_ids?: string[] | null
          interventions_used?: string | null
          is_diagnosed?: boolean | null
          last_assessment_date?: string | null
          location_accuracy?: number | null
          location_address?: string | null
          location_occurred?: string | null
          location_source?: string | null
          location_timestamp?: string | null
          medical_issue_type_ids?: string[] | null
          objective_findings?: string | null
          observable_symptoms?: Json | null
          outcome?: string | null
          outcome_id?: string | null
          person_id: number
          person_response?: string | null
          photo_urls?: string[] | null
          plan_summary?: string | null
          possible_triggers?: string | null
          primary_condition: string
          primary_issue_type_id?: string | null
          primary_symptom_ids?: string[] | null
          progress_photo_urls?: Json | null
          progression_status?:
            | Database["core"]["Enums"]["progression_status"]
            | null
          referrals_made?: string | null
          refusal_reason?: string | null
          related_incident_id?: number | null
          risk_to_others?: string | null
          risk_to_self?: string | null
          safety_plan_discussed?: boolean | null
          scene_arrival_at?: string | null
          scene_departure_at?: string | null
          severity_factors?: string[] | null
          severity_level?:
            | Database["core"]["Enums"]["severity_level_enum"]
            | null
          severity_score?: number | null
          situation_context?: string | null
          subjective_notes?: string | null
          transport_decision?: string | null
          updated_at?: string | null
          updated_by?: string | null
          urgency_level?:
            | Database["public"]["Enums"]["medical_urgency_enum"]
            | null
          visible_symptom_ids?: string[] | null
          warning_signs?: string[] | null
          wound_details?: Json | null
          wound_location_id?: string | null
        }
        Update: {
          assessment_data?: Json | null
          assessment_summary?: string | null
          body_location_ids?: string[] | null
          chart_lock_metadata?: Json | null
          check_in_id?: string | null
          chief_complaint?: string | null
          condition_id?: string | null
          condition_instance_id?: string | null
          consent_status?: string | null
          created_at?: string | null
          created_by?: string | null
          days_since_onset?: number | null
          destination_facility?: string | null
          diagnosis_source?: string | null
          duration_observed?: string | null
          environmental_factors?: string | null
          episode_date?: string
          episode_datetime?: string | null
          episode_end_date?: string | null
          episode_status?:
            | Database["public"]["Enums"]["medical_status_enum"]
            | null
          episode_type?: string
          escalation_needed?: boolean | null
          facility_involved?: string | null
          follow_up_needed?: boolean | null
          follow_up_notes?: string | null
          follow_up_timeline?:
            | Database["core"]["Enums"]["follow_up_plan_enum"]
            | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          healthcare_provider?: string | null
          id?: string
          incident_role?: string | null
          initial_photo_urls?: string[] | null
          intervention_details?: Json | null
          intervention_ids?: string[] | null
          interventions_used?: string | null
          is_diagnosed?: boolean | null
          last_assessment_date?: string | null
          location_accuracy?: number | null
          location_address?: string | null
          location_occurred?: string | null
          location_source?: string | null
          location_timestamp?: string | null
          medical_issue_type_ids?: string[] | null
          objective_findings?: string | null
          observable_symptoms?: Json | null
          outcome?: string | null
          outcome_id?: string | null
          person_id?: number
          person_response?: string | null
          photo_urls?: string[] | null
          plan_summary?: string | null
          possible_triggers?: string | null
          primary_condition?: string
          primary_issue_type_id?: string | null
          primary_symptom_ids?: string[] | null
          progress_photo_urls?: Json | null
          progression_status?:
            | Database["core"]["Enums"]["progression_status"]
            | null
          referrals_made?: string | null
          refusal_reason?: string | null
          related_incident_id?: number | null
          risk_to_others?: string | null
          risk_to_self?: string | null
          safety_plan_discussed?: boolean | null
          scene_arrival_at?: string | null
          scene_departure_at?: string | null
          severity_factors?: string[] | null
          severity_level?:
            | Database["core"]["Enums"]["severity_level_enum"]
            | null
          severity_score?: number | null
          situation_context?: string | null
          subjective_notes?: string | null
          transport_decision?: string | null
          updated_at?: string | null
          updated_by?: string | null
          urgency_level?:
            | Database["public"]["Enums"]["medical_urgency_enum"]
            | null
          visible_symptom_ids?: string[] | null
          warning_signs?: string[] | null
          wound_details?: Json | null
          wound_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_episodes_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "medical_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_episodes_condition_instance_id_fkey"
            columns: ["condition_instance_id"]
            isOneToOne: false
            referencedRelation: "person_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_episodes_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "medical_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_episodes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_episodes_wound_location_id_fkey"
            columns: ["wound_location_id"]
            isOneToOne: false
            referencedRelation: "medical_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_interventions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          intervention_name: string
          intervention_type: string
          plain_language_name: string
          requires_supplies: boolean | null
          requires_training: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          intervention_name: string
          intervention_type: string
          plain_language_name: string
          requires_supplies?: boolean | null
          requires_training?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          intervention_name?: string
          intervention_type?: string
          plain_language_name?: string
          requires_supplies?: boolean | null
          requires_training?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      medical_issue_types: {
        Row: {
          assessment_fields: Json | null
          category: string
          common_in_homeless: boolean | null
          created_at: string | null
          description: string | null
          id: string
          issue_type: string
          plain_language_name: string
          requires_degree: boolean | null
          requires_depth: boolean | null
          requires_size: boolean | null
          severity_weight: number | null
          updated_at: string | null
        }
        Insert: {
          assessment_fields?: Json | null
          category: string
          common_in_homeless?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          issue_type: string
          plain_language_name: string
          requires_degree?: boolean | null
          requires_depth?: boolean | null
          requires_size?: boolean | null
          severity_weight?: number | null
          updated_at?: string | null
        }
        Update: {
          assessment_fields?: Json | null
          category?: string
          common_in_homeless?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          issue_type?: string
          plain_language_name?: string
          requires_degree?: boolean | null
          requires_depth?: boolean | null
          requires_size?: boolean | null
          severity_weight?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      medical_issues: {
        Row: {
          antibiotics_prescribed: string | null
          category: string
          condition_name: string
          created_at: string | null
          created_by: string | null
          diagnosis_date: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          frequency_of_use: string | null
          healthcare_provider: string | null
          id: number
          infection_site: string | null
          infection_type: string | null
          is_active: boolean | null
          last_use_date: string | null
          medication: string | null
          mental_health_crisis: boolean | null
          notes: string | null
          person_id: number
          requires_immediate_care: boolean | null
          risk_assessment: string | null
          route_of_administration: string | null
          seeking_treatment: boolean | null
          severity: string | null
          source_type: string
          status: string | null
          subcategory: string | null
          substance_type: string | null
          suicide_risk: boolean | null
          suspected_cause: string | null
          treatment_notes: string | null
          updated_at: string | null
          updated_by: string | null
          withdrawal_symptoms: string | null
          wound_description: string | null
        }
        Insert: {
          antibiotics_prescribed?: string | null
          category?: string
          condition_name: string
          created_at?: string | null
          created_by?: string | null
          diagnosis_date?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          frequency_of_use?: string | null
          healthcare_provider?: string | null
          id?: number
          infection_site?: string | null
          infection_type?: string | null
          is_active?: boolean | null
          last_use_date?: string | null
          medication?: string | null
          mental_health_crisis?: boolean | null
          notes?: string | null
          person_id: number
          requires_immediate_care?: boolean | null
          risk_assessment?: string | null
          route_of_administration?: string | null
          seeking_treatment?: boolean | null
          severity?: string | null
          source_type?: string
          status?: string | null
          subcategory?: string | null
          substance_type?: string | null
          suicide_risk?: boolean | null
          suspected_cause?: string | null
          treatment_notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
          withdrawal_symptoms?: string | null
          wound_description?: string | null
        }
        Update: {
          antibiotics_prescribed?: string | null
          category?: string
          condition_name?: string
          created_at?: string | null
          created_by?: string | null
          diagnosis_date?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          frequency_of_use?: string | null
          healthcare_provider?: string | null
          id?: number
          infection_site?: string | null
          infection_type?: string | null
          is_active?: boolean | null
          last_use_date?: string | null
          medication?: string | null
          mental_health_crisis?: boolean | null
          notes?: string | null
          person_id?: number
          requires_immediate_care?: boolean | null
          risk_assessment?: string | null
          route_of_administration?: string | null
          seeking_treatment?: boolean | null
          severity?: string | null
          source_type?: string
          status?: string | null
          subcategory?: string | null
          substance_type?: string | null
          suicide_risk?: boolean | null
          suspected_cause?: string | null
          treatment_notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
          withdrawal_symptoms?: string | null
          wound_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_issues_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_locations: {
        Row: {
          body_region: string
          created_at: string | null
          id: string
          location_code: string
          sort_order: number | null
          specific_location: string
        }
        Insert: {
          body_region: string
          created_at?: string | null
          id?: string
          location_code: string
          sort_order?: number | null
          specific_location: string
        }
        Update: {
          body_region?: string
          created_at?: string | null
          id?: string
          location_code?: string
          sort_order?: number | null
          specific_location?: string
        }
        Relationships: []
      }
      medical_medication_logs: {
        Row: {
          administered_at: string | null
          administered_by: string | null
          adverse_events: string | null
          created_at: string
          created_by: string | null
          dose: string | null
          dose_unit: string | null
          episode_id: string
          frequency: string | null
          id: string
          medication_name: string
          response: string | null
          route: string | null
        }
        Insert: {
          administered_at?: string | null
          administered_by?: string | null
          adverse_events?: string | null
          created_at?: string
          created_by?: string | null
          dose?: string | null
          dose_unit?: string | null
          episode_id: string
          frequency?: string | null
          id?: string
          medication_name: string
          response?: string | null
          route?: string | null
        }
        Update: {
          administered_at?: string | null
          administered_by?: string | null
          adverse_events?: string | null
          created_at?: string
          created_by?: string | null
          dose?: string | null
          dose_unit?: string | null
          episode_id?: string
          frequency?: string | null
          id?: string
          medication_name?: string
          response?: string | null
          route?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_medication_logs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_medication_logs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes_full"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_outcomes: {
        Row: {
          created_at: string | null
          follow_up_required: boolean | null
          id: string
          outcome_description: string
          outcome_type: string
          plain_language_name: string
        }
        Insert: {
          created_at?: string | null
          follow_up_required?: boolean | null
          id?: string
          outcome_description: string
          outcome_type: string
          plain_language_name: string
        }
        Update: {
          created_at?: string | null
          follow_up_required?: boolean | null
          id?: string
          outcome_description?: string
          outcome_type?: string
          plain_language_name?: string
        }
        Relationships: []
      }
      medical_progressions: {
        Row: {
          assessment_date: string | null
          created_at: string | null
          created_by: string | null
          episode_id: string | null
          id: string
          notes: string | null
          photo_urls: string[] | null
          progression_status:
            | Database["core"]["Enums"]["progression_status"]
            | null
          symptom_changes: Json | null
        }
        Insert: {
          assessment_date?: string | null
          created_at?: string | null
          created_by?: string | null
          episode_id?: string | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          progression_status?:
            | Database["core"]["Enums"]["progression_status"]
            | null
          symptom_changes?: Json | null
        }
        Update: {
          assessment_date?: string | null
          created_at?: string | null
          created_by?: string | null
          episode_id?: string | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          progression_status?:
            | Database["core"]["Enums"]["progression_status"]
            | null
          symptom_changes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_progressions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_progressions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes_full"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_symptoms: {
        Row: {
          created_at: string | null
          id: string
          observable_by_outreach: boolean | null
          plain_language_description: string
          severity_weight: number | null
          symptom_category: string
          symptom_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          observable_by_outreach?: boolean | null
          plain_language_description: string
          severity_weight?: number | null
          symptom_category: string
          symptom_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          observable_by_outreach?: boolean | null
          plain_language_description?: string
          severity_weight?: number | null
          symptom_category?: string
          symptom_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      medical_tissue_characteristics: {
        Row: {
          characteristic_type: string
          characteristic_value: string
          created_at: string | null
          description: string | null
          id: string
          plain_language_name: string
          severity_indicator: number | null
          visual_indicator: string | null
        }
        Insert: {
          characteristic_type: string
          characteristic_value: string
          created_at?: string | null
          description?: string | null
          id?: string
          plain_language_name: string
          severity_indicator?: number | null
          visual_indicator?: string | null
        }
        Update: {
          characteristic_type?: string
          characteristic_value?: string
          created_at?: string | null
          description?: string | null
          id?: string
          plain_language_name?: string
          severity_indicator?: number | null
          visual_indicator?: string | null
        }
        Relationships: []
      }
      medical_treatments: {
        Row: {
          adherence_level: string | null
          aid_level: string | null
          aid_timestamp: string | null
          created_at: string | null
          created_by: string | null
          dosage: string | null
          effectiveness: string | null
          end_date: string | null
          episode_id: string
          facility: string | null
          frequency: string | null
          id: string
          instructions: string | null
          planned_duration: string | null
          provider: string | null
          provider_role: string | null
          side_effects: string | null
          start_date: string
          treatment_name: string
          treatment_type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          adherence_level?: string | null
          aid_level?: string | null
          aid_timestamp?: string | null
          created_at?: string | null
          created_by?: string | null
          dosage?: string | null
          effectiveness?: string | null
          end_date?: string | null
          episode_id: string
          facility?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          planned_duration?: string | null
          provider?: string | null
          provider_role?: string | null
          side_effects?: string | null
          start_date: string
          treatment_name: string
          treatment_type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          adherence_level?: string | null
          aid_level?: string | null
          aid_timestamp?: string | null
          created_at?: string | null
          created_by?: string | null
          dosage?: string | null
          effectiveness?: string | null
          end_date?: string | null
          episode_id?: string
          facility?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          planned_duration?: string | null
          provider?: string | null
          provider_role?: string | null
          side_effects?: string | null
          start_date?: string
          treatment_name?: string
          treatment_type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_treatments_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_treatments_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes_full"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_vitals: {
        Row: {
          bgl_mmol: number | null
          bp_diastolic: number | null
          bp_systolic: number | null
          created_at: string
          created_by: string | null
          episode_id: string
          gcs_eye: number | null
          gcs_motor: number | null
          gcs_verbal: number | null
          gps_lat: number | null
          gps_lng: number | null
          hr_bpm: number | null
          id: string
          notes: string | null
          observed_at: string
          pain_0_10: number | null
          person_id: number
          pupils_left: string | null
          pupils_right: string | null
          rr_bpm: number | null
          spo2_pct: number | null
          temp_c: number | null
        }
        Insert: {
          bgl_mmol?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          created_by?: string | null
          episode_id: string
          gcs_eye?: number | null
          gcs_motor?: number | null
          gcs_verbal?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          hr_bpm?: number | null
          id?: string
          notes?: string | null
          observed_at?: string
          pain_0_10?: number | null
          person_id: number
          pupils_left?: string | null
          pupils_right?: string | null
          rr_bpm?: number | null
          spo2_pct?: number | null
          temp_c?: number | null
        }
        Update: {
          bgl_mmol?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          created_by?: string | null
          episode_id?: string
          gcs_eye?: number | null
          gcs_motor?: number | null
          gcs_verbal?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          hr_bpm?: number | null
          id?: string
          notes?: string | null
          observed_at?: string
          pain_0_10?: number | null
          person_id?: number
          pupils_left?: string | null
          pupils_right?: string | null
          rr_bpm?: number | null
          spo2_pct?: number | null
          temp_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_vitals_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_vitals_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_vitals_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      mental_health_observations: {
        Row: {
          additional_observations: string | null
          behavioral_symptoms: Json | null
          cognitive_symptoms: Json | null
          communication_ability:
            | Database["core"]["Enums"]["communication_ability_enum"]
            | null
          cooperation_level:
            | Database["core"]["Enums"]["cooperation_level_enum"]
            | null
          created_at: string | null
          created_by: string | null
          episode_id: string
          id: string
          medication_details: string | null
          medications_mentioned: boolean | null
          mood_symptoms: Json | null
          observation_datetime: string
          observation_duration:
            | Database["core"]["Enums"]["mental_observation_duration_enum"]
            | null
          observer_name: string
          physical_symptoms: Json | null
          reality_orientation:
            | Database["core"]["Enums"]["reality_orientation_enum"]
            | null
          self_care_ability:
            | Database["core"]["Enums"]["self_care_ability_enum"]
            | null
          social_engagement:
            | Database["core"]["Enums"]["social_engagement_enum"]
            | null
          substance_details: string | null
          substances_suspected: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          additional_observations?: string | null
          behavioral_symptoms?: Json | null
          cognitive_symptoms?: Json | null
          communication_ability?:
            | Database["core"]["Enums"]["communication_ability_enum"]
            | null
          cooperation_level?:
            | Database["core"]["Enums"]["cooperation_level_enum"]
            | null
          created_at?: string | null
          created_by?: string | null
          episode_id: string
          id?: string
          medication_details?: string | null
          medications_mentioned?: boolean | null
          mood_symptoms?: Json | null
          observation_datetime: string
          observation_duration?:
            | Database["core"]["Enums"]["mental_observation_duration_enum"]
            | null
          observer_name: string
          physical_symptoms?: Json | null
          reality_orientation?:
            | Database["core"]["Enums"]["reality_orientation_enum"]
            | null
          self_care_ability?:
            | Database["core"]["Enums"]["self_care_ability_enum"]
            | null
          social_engagement?:
            | Database["core"]["Enums"]["social_engagement_enum"]
            | null
          substance_details?: string | null
          substances_suspected?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          additional_observations?: string | null
          behavioral_symptoms?: Json | null
          cognitive_symptoms?: Json | null
          communication_ability?:
            | Database["core"]["Enums"]["communication_ability_enum"]
            | null
          cooperation_level?:
            | Database["core"]["Enums"]["cooperation_level_enum"]
            | null
          created_at?: string | null
          created_by?: string | null
          episode_id?: string
          id?: string
          medication_details?: string | null
          medications_mentioned?: boolean | null
          mood_symptoms?: Json | null
          observation_datetime?: string
          observation_duration?:
            | Database["core"]["Enums"]["mental_observation_duration_enum"]
            | null
          observer_name?: string
          physical_symptoms?: Json | null
          reality_orientation?:
            | Database["core"]["Enums"]["reality_orientation_enum"]
            | null
          self_care_ability?:
            | Database["core"]["Enums"]["self_care_ability_enum"]
            | null
          social_engagement?:
            | Database["core"]["Enums"]["social_engagement_enum"]
            | null
          substance_details?: string | null
          substances_suspected?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mental_health_observations_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mental_health_observations_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes_full"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_people: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string | null
          id: number
          is_primary: boolean
          job_title: string | null
          notes: string | null
          organization_id: number
          person_id: number
          relationship_type: Database["core"]["Enums"]["organization_person_relationship_enum"]
          start_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: number
          is_primary?: boolean
          job_title?: string | null
          notes?: string | null
          organization_id: number
          person_id: number
          relationship_type: Database["core"]["Enums"]["organization_person_relationship_enum"]
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: number
          is_primary?: boolean
          job_title?: string | null
          notes?: string | null
          organization_id?: number
          person_id?: number
          relationship_type?: Database["core"]["Enums"]["organization_person_relationship_enum"]
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_people_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          availability_notes: string | null
          city: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          contact_title: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          email: string | null
          id: number
          is_active: boolean | null
          name: string
          notes: string | null
          operating_hours: string | null
          organization_type: string | null
          partnership_type: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          referral_process: string | null
          services_provided: string | null
          services_tags: Json | null
          special_requirements: string | null
          status: Database["core"]["Enums"]["organization_status_enum"] | null
          updated_at: string | null
          updated_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          availability_notes?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_title?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          notes?: string | null
          operating_hours?: string | null
          organization_type?: string | null
          partnership_type?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          referral_process?: string | null
          services_provided?: string | null
          services_tags?: Json | null
          special_requirements?: string | null
          status?: Database["core"]["Enums"]["organization_status_enum"] | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          availability_notes?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_title?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          notes?: string | null
          operating_hours?: string | null
          organization_type?: string | null
          partnership_type?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          referral_process?: string | null
          services_provided?: string | null
          services_tags?: Json | null
          special_requirements?: string | null
          status?: Database["core"]["Enums"]["organization_status_enum"] | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Relationships: []
      }
      people: {
        Row: {
          age: number | null
          created_at: string
          created_by: string | null
          data_sharing_consent: boolean | null
          date_of_birth: string | null
          email: string | null
          emergency_contact: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          gender: Database["core"]["Enums"]["gender_enum"] | null
          has_id_documents:
            | Database["core"]["Enums"]["document_status_enum"]
            | null
          housing_status:
            | Database["core"]["Enums"]["housing_status_enum"]
            | null
          id: number
          income_source: Database["core"]["Enums"]["income_source_enum"] | null
          last_name: string | null
          last_service_date: string | null
          last_verification_date: string | null
          notes: string | null
          organization_name: string | null
          person_category: Database["core"]["Enums"]["person_category"] | null
          person_type: Database["core"]["Enums"]["person_type"] | null
          phone: string | null
          preferred_contact_method: string | null
          preferred_pronouns: string | null
          primary_language: string | null
          privacy_restrictions: string | null
          professional_title: string | null
          related_person_id: number | null
          relationship_to_client: string | null
          risk_level: Database["core"]["Enums"]["risk_level_enum"] | null
          service_eligibility_status:
            | Database["core"]["Enums"]["eligibility_status_enum"]
            | null
          status: Database["core"]["Enums"]["person_status"]
          updated_at: string | null
          updated_by: string | null
          verification_method: string | null
          veteran_status:
            | Database["core"]["Enums"]["veteran_status_enum"]
            | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          created_by?: string | null
          data_sharing_consent?: boolean | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          gender?: Database["core"]["Enums"]["gender_enum"] | null
          has_id_documents?:
            | Database["core"]["Enums"]["document_status_enum"]
            | null
          housing_status?:
            | Database["core"]["Enums"]["housing_status_enum"]
            | null
          id?: number
          income_source?: Database["core"]["Enums"]["income_source_enum"] | null
          last_name?: string | null
          last_service_date?: string | null
          last_verification_date?: string | null
          notes?: string | null
          organization_name?: string | null
          person_category?: Database["core"]["Enums"]["person_category"] | null
          person_type?: Database["core"]["Enums"]["person_type"] | null
          phone?: string | null
          preferred_contact_method?: string | null
          preferred_pronouns?: string | null
          primary_language?: string | null
          privacy_restrictions?: string | null
          professional_title?: string | null
          related_person_id?: number | null
          relationship_to_client?: string | null
          risk_level?: Database["core"]["Enums"]["risk_level_enum"] | null
          service_eligibility_status?:
            | Database["core"]["Enums"]["eligibility_status_enum"]
            | null
          status?: Database["core"]["Enums"]["person_status"]
          updated_at?: string | null
          updated_by?: string | null
          verification_method?: string | null
          veteran_status?:
            | Database["core"]["Enums"]["veteran_status_enum"]
            | null
        }
        Update: {
          age?: number | null
          created_at?: string
          created_by?: string | null
          data_sharing_consent?: boolean | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          gender?: Database["core"]["Enums"]["gender_enum"] | null
          has_id_documents?:
            | Database["core"]["Enums"]["document_status_enum"]
            | null
          housing_status?:
            | Database["core"]["Enums"]["housing_status_enum"]
            | null
          id?: number
          income_source?: Database["core"]["Enums"]["income_source_enum"] | null
          last_name?: string | null
          last_service_date?: string | null
          last_verification_date?: string | null
          notes?: string | null
          organization_name?: string | null
          person_category?: Database["core"]["Enums"]["person_category"] | null
          person_type?: Database["core"]["Enums"]["person_type"] | null
          phone?: string | null
          preferred_contact_method?: string | null
          preferred_pronouns?: string | null
          primary_language?: string | null
          privacy_restrictions?: string | null
          professional_title?: string | null
          related_person_id?: number | null
          relationship_to_client?: string | null
          risk_level?: Database["core"]["Enums"]["risk_level_enum"] | null
          service_eligibility_status?:
            | Database["core"]["Enums"]["eligibility_status_enum"]
            | null
          status?: Database["core"]["Enums"]["person_status"]
          updated_at?: string | null
          updated_by?: string | null
          verification_method?: string | null
          veteran_status?:
            | Database["core"]["Enums"]["veteran_status_enum"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "people_related_person_id_fkey"
            columns: ["related_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people_activities: {
        Row: {
          activity_date: string
          activity_time: string | null
          activity_type: string
          address_id: number | null
          attachments: Json | null
          coordinates: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          gps_accuracy: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          gps_timestamp: string | null
          id: string
          location: string | null
          metadata: Json | null
          outcome: string | null
          person_id: number
          priority: string | null
          provider_org_id: number | null
          provider_profile_id: string | null
          staff_member: string
          tags: string[] | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activity_date: string
          activity_time?: string | null
          activity_type: string
          address_id?: number | null
          attachments?: Json | null
          coordinates?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          gps_accuracy?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_timestamp?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          outcome?: string | null
          person_id: number
          priority?: string | null
          provider_org_id?: number | null
          provider_profile_id?: string | null
          staff_member: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activity_date?: string
          activity_time?: string | null
          activity_type?: string
          address_id?: number | null
          attachments?: Json | null
          coordinates?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          gps_accuracy?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_timestamp?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          outcome?: string | null
          person_id?: number
          priority?: string | null
          provider_org_id?: number | null
          provider_profile_id?: string | null
          staff_member?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_people_activities_address_id"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_activities_provider_org_fk"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      people_aliases: {
        Row: {
          alias_name: string
          created_at: string
          created_by: string | null
          id: number
          person_id: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          alias_name: string
          created_at?: string
          created_by?: string | null
          id?: number
          person_id: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          alias_name?: string
          created_at?: string
          created_by?: string | null
          id?: number
          person_id?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_aliases_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people_relationships: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string | null
          id: number
          metadata: Json | null
          notes: string | null
          person1_id: number
          person2_id: number
          relationship_status: string | null
          relationship_subtype: string | null
          relationship_type: string
          start_date: string | null
          updated_at: string
          updated_by: string | null
          verified: boolean | null
          verified_by: string | null
          verified_date: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: number
          metadata?: Json | null
          notes?: string | null
          person1_id: number
          person2_id: number
          relationship_status?: string | null
          relationship_subtype?: string | null
          relationship_type: string
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
          verified?: boolean | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: number
          metadata?: Json | null
          notes?: string | null
          person1_id?: number
          person2_id?: number
          relationship_status?: string | null
          relationship_subtype?: string | null
          relationship_type?: string
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
          verified?: boolean | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_relationships_person1_id_fkey"
            columns: ["person1_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_relationships_person2_id_fkey"
            columns: ["person2_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          domain: string
          id: string
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domain?: string
          id?: string
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domain?: string
          id?: string
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      person_access_grants: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string
          grantee_org_id: number | null
          grantee_user_id: string | null
          id: string
          person_id: number
          scope: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by: string
          grantee_org_id?: number | null
          grantee_user_id?: string | null
          id?: string
          person_id: number
          scope: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string
          grantee_org_id?: number | null
          grantee_user_id?: string | null
          id?: string
          person_id?: number
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_access_grants_org_fkey"
            columns: ["grantee_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_access_grants_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_conditions: {
        Row: {
          care_plan: Json
          care_plan_version: number
          category: string
          condition_name: string
          created_at: string
          created_by: string
          diagnosis_code: string | null
          id: string
          is_primary: boolean
          last_confirmed_at: string | null
          notes: string | null
          onset_date: string | null
          person_id: number
          primary_clinician: string | null
          reference_condition_id: string | null
          risk_flags: Database["core"]["Enums"]["person_condition_risk_flag_enum"][]
          status: Database["core"]["Enums"]["person_condition_status_enum"]
          updated_at: string
          updated_by: string
          verification_level: Database["core"]["Enums"]["person_condition_verification_enum"]
        }
        Insert: {
          care_plan?: Json
          care_plan_version?: number
          category?: string
          condition_name: string
          created_at?: string
          created_by?: string
          diagnosis_code?: string | null
          id?: string
          is_primary?: boolean
          last_confirmed_at?: string | null
          notes?: string | null
          onset_date?: string | null
          person_id: number
          primary_clinician?: string | null
          reference_condition_id?: string | null
          risk_flags?: Database["core"]["Enums"]["person_condition_risk_flag_enum"][]
          status?: Database["core"]["Enums"]["person_condition_status_enum"]
          updated_at?: string
          updated_by?: string
          verification_level?: Database["core"]["Enums"]["person_condition_verification_enum"]
        }
        Update: {
          care_plan?: Json
          care_plan_version?: number
          category?: string
          condition_name?: string
          created_at?: string
          created_by?: string
          diagnosis_code?: string | null
          id?: string
          is_primary?: boolean
          last_confirmed_at?: string | null
          notes?: string | null
          onset_date?: string | null
          person_id?: number
          primary_clinician?: string | null
          reference_condition_id?: string | null
          risk_flags?: Database["core"]["Enums"]["person_condition_risk_flag_enum"][]
          status?: Database["core"]["Enums"]["person_condition_status_enum"]
          updated_at?: string
          updated_by?: string
          verification_level?: Database["core"]["Enums"]["person_condition_verification_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "person_conditions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_conditions_reference_condition_id_fkey"
            columns: ["reference_condition_id"]
            isOneToOne: false
            referencedRelation: "medical_conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      person_death_details: {
        Row: {
          cause_category: Database["core"]["Enums"]["death_cause_category"]
          confirmation_source: Database["core"]["Enums"]["death_confirmation_source"]
          created_at: string
          created_by: string | null
          death_datetime: string
          id: string
          notes: string | null
          person_id: number
          place_of_death: string
          related_episode_id: string | null
          tox_pending: boolean
        }
        Insert: {
          cause_category?: Database["core"]["Enums"]["death_cause_category"]
          confirmation_source?: Database["core"]["Enums"]["death_confirmation_source"]
          created_at?: string
          created_by?: string | null
          death_datetime: string
          id?: string
          notes?: string | null
          person_id: number
          place_of_death: string
          related_episode_id?: string | null
          tox_pending?: boolean
        }
        Update: {
          cause_category?: Database["core"]["Enums"]["death_cause_category"]
          confirmation_source?: Database["core"]["Enums"]["death_confirmation_source"]
          created_at?: string
          created_by?: string | null
          death_datetime?: string
          id?: string
          notes?: string | null
          person_id?: number
          place_of_death?: string
          related_episode_id?: string | null
          tox_pending?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "person_death_details_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_death_details_related_episode_id_fkey"
            columns: ["related_episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_death_details_related_episode_id_fkey"
            columns: ["related_episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes_full"
            referencedColumns: ["id"]
          },
        ]
      }
      person_field_visibility: {
        Row: {
          created_at: string | null
          field_name: string
          id: number
          is_editable: boolean | null
          is_required: boolean | null
          is_visible: boolean | null
          person_type: Database["core"]["Enums"]["person_type"]
          privacy_level: string | null
        }
        Insert: {
          created_at?: string | null
          field_name: string
          id?: number
          is_editable?: boolean | null
          is_required?: boolean | null
          is_visible?: boolean | null
          person_type: Database["core"]["Enums"]["person_type"]
          privacy_level?: string | null
        }
        Update: {
          created_at?: string | null
          field_name?: string
          id?: number
          is_editable?: boolean | null
          is_required?: boolean | null
          is_visible?: boolean | null
          person_type?: Database["core"]["Enums"]["person_type"]
          privacy_level?: string | null
        }
        Relationships: []
      }
      pets: {
        Row: {
          age: number | null
          breed: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: number
          medical_notes: string | null
          microchip_number: string | null
          name: string
          person_id: number
          species: string | null
          updated_at: string | null
          updated_by: string | null
          vaccination_status: string | null
        }
        Insert: {
          age?: number | null
          breed?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          medical_notes?: string | null
          microchip_number?: string | null
          name: string
          person_id: number
          species?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vaccination_status?: string | null
        }
        Update: {
          age?: number | null
          breed?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          medical_notes?: string | null
          microchip_number?: string | null
          name?: string
          person_id?: number
          species?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vaccination_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      pit_count_observations: {
        Row: {
          addiction_response:
            | Database["core"]["Enums"]["pit_boolean_response"]
            | null
          addiction_severity:
            | Database["core"]["Enums"]["pit_severity_level"]
            | null
          age_bracket: Database["core"]["Enums"]["pit_age_bracket"] | null
          created_at: string
          created_by: string | null
          external_id: string | null
          gender: Database["core"]["Enums"]["gender_enum"] | null
          homelessness_response:
            | Database["core"]["Enums"]["pit_boolean_response"]
            | null
          id: string
          location_type: Database["core"]["Enums"]["pit_location_type"] | null
          mental_health_response:
            | Database["core"]["Enums"]["pit_boolean_response"]
            | null
          mental_health_severity:
            | Database["core"]["Enums"]["pit_severity_level"]
            | null
          metadata: Json
          municipality: string | null
          notes: string | null
          observed_at: string
          person_id: number | null
          pit_count_id: string
          updated_at: string
          updated_by: string | null
          wants_treatment:
            | Database["core"]["Enums"]["pit_treatment_interest"]
            | null
        }
        Insert: {
          addiction_response?:
            | Database["core"]["Enums"]["pit_boolean_response"]
            | null
          addiction_severity?:
            | Database["core"]["Enums"]["pit_severity_level"]
            | null
          age_bracket?: Database["core"]["Enums"]["pit_age_bracket"] | null
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          gender?: Database["core"]["Enums"]["gender_enum"] | null
          homelessness_response?:
            | Database["core"]["Enums"]["pit_boolean_response"]
            | null
          id?: string
          location_type?: Database["core"]["Enums"]["pit_location_type"] | null
          mental_health_response?:
            | Database["core"]["Enums"]["pit_boolean_response"]
            | null
          mental_health_severity?:
            | Database["core"]["Enums"]["pit_severity_level"]
            | null
          metadata?: Json
          municipality?: string | null
          notes?: string | null
          observed_at?: string
          person_id?: number | null
          pit_count_id: string
          updated_at?: string
          updated_by?: string | null
          wants_treatment?:
            | Database["core"]["Enums"]["pit_treatment_interest"]
            | null
        }
        Update: {
          addiction_response?:
            | Database["core"]["Enums"]["pit_boolean_response"]
            | null
          addiction_severity?:
            | Database["core"]["Enums"]["pit_severity_level"]
            | null
          age_bracket?: Database["core"]["Enums"]["pit_age_bracket"] | null
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          gender?: Database["core"]["Enums"]["gender_enum"] | null
          homelessness_response?:
            | Database["core"]["Enums"]["pit_boolean_response"]
            | null
          id?: string
          location_type?: Database["core"]["Enums"]["pit_location_type"] | null
          mental_health_response?:
            | Database["core"]["Enums"]["pit_boolean_response"]
            | null
          mental_health_severity?:
            | Database["core"]["Enums"]["pit_severity_level"]
            | null
          metadata?: Json
          municipality?: string | null
          notes?: string | null
          observed_at?: string
          person_id?: number | null
          pit_count_id?: string
          updated_at?: string
          updated_by?: string | null
          wants_treatment?:
            | Database["core"]["Enums"]["pit_treatment_interest"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "pit_count_observations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pit_count_observations_pit_count_id_fkey"
            columns: ["pit_count_id"]
            isOneToOne: false
            referencedRelation: "pit_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      pit_counts: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          external_reference: string | null
          id: string
          lead_profile_id: string | null
          methodology: string | null
          municipality: string | null
          observed_end: string | null
          observed_start: string | null
          slug: string
          status: Database["core"]["Enums"]["pit_count_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_reference?: string | null
          id?: string
          lead_profile_id?: string | null
          methodology?: string | null
          municipality?: string | null
          observed_end?: string | null
          observed_start?: string | null
          slug: string
          status?: Database["core"]["Enums"]["pit_count_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_reference?: string | null
          id?: string
          lead_profile_id?: string | null
          methodology?: string | null
          municipality?: string | null
          observed_end?: string | null
          observed_start?: string | null
          slug?: string
          status?: Database["core"]["Enums"]["pit_count_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ranger_activity_people: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: number
          people_id: number
          ranger_activity_log_id: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          people_id: number
          ranger_activity_log_id: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          people_id?: number
          ranger_activity_log_id?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_people"
            columns: ["people_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_types: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number | null
          id: number
          is_active: boolean | null
          is_symmetric: boolean | null
          reciprocal_code: string
          reciprocal_label: string
          type_code: string
          type_label: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          is_symmetric?: boolean | null
          reciprocal_code: string
          reciprocal_label: string
          type_code: string
          type_label: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          is_symmetric?: boolean | null
          reciprocal_code?: string
          reciprocal_label?: string
          type_code?: string
          type_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          created_by: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_id: string | null
          role_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string | null
          role_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string | null
          role_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          domain: string
          id: string
          is_system_role: boolean | null
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          domain?: string
          id?: string
          is_system_role?: boolean | null
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          domain?: string
          id?: string
          is_system_role?: boolean | null
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      schema_versions: {
        Row: {
          applied_at: string
          applied_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
          version: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          version: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: string
        }
        Relationships: []
      }
      service_barriers: {
        Row: {
          barrier_type: string
          created_at: string | null
          created_by: string | null
          description: string
          id: number
          identified_date: string | null
          person_id: number
          resolution_notes: string | null
          resolved_date: string | null
          severity: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          barrier_type: string
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: number
          identified_date?: string | null
          person_id: number
          resolution_notes?: string | null
          resolved_date?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          barrier_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: number
          identified_date?: string | null
          person_id?: number
          resolution_notes?: string | null
          resolved_date?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_barriers_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_break_entries: {
        Row: {
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          started_at: string
          time_entry_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          time_entry_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          time_entry_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_break_entries_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "staff_time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_time_entries: {
        Row: {
          created_at: string
          created_by: string
          end_lat: number | null
          end_lng: number | null
          id: string
          notes: string | null
          shift_end: string | null
          shift_start: string
          start_lat: number | null
          start_lng: number | null
          status: string
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          end_lat?: number | null
          end_lng?: number | null
          id?: string
          notes?: string | null
          shift_end?: string | null
          shift_start?: string
          start_lat?: number | null
          start_lng?: number | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_lat?: number | null
          end_lng?: number | null
          id?: string
          notes?: string | null
          shift_end?: string | null
          shift_start?: string
          start_lat?: number | null
          start_lng?: number | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      supply_provisions: {
        Row: {
          activity_id: string
          created_at: string | null
          created_by: string | null
          id: string
          item_id: string
          notes: string | null
          quantity_provided: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activity_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id: string
          notes?: string | null
          quantity_provided: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activity_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          quantity_provided?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_provisions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "people_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_provisions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      support_contacts: {
        Row: {
          address: string | null
          availability: string | null
          contact_name: string
          contact_type: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: number
          is_emergency_contact: boolean | null
          is_primary: boolean | null
          notes: string | null
          person_id: number
          phone: string | null
          relationship: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          availability?: string | null
          contact_name: string
          contact_type?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: number
          is_emergency_contact?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          person_id: number
          phone?: string | null
          relationship?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          availability?: string | null
          contact_name?: string
          contact_type?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: number
          is_emergency_contact?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          person_id?: number
          phone?: string | null
          relationship?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          setting_key: string
          setting_type: string
          setting_value: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      user_people: {
        Row: {
          id: string
          linked_at: string
          person_id: number
          profile_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          linked_at?: string
          person_id: number
          profile_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          linked_at?: string
          person_id?: number
          profile_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_people_person_fk"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          role_id: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_activities: {
        Row: {
          activity_date: string
          activity_time: string | null
          activity_type: string
          attachments: Json | null
          citation_number: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          location: string | null
          officer_badge: string | null
          outcome: string | null
          priority: string | null
          staff_member: string
          tags: string[] | null
          title: string
          updated_at: string | null
          updated_by: string | null
          vehicle_id: number
        }
        Insert: {
          activity_date: string
          activity_time?: string | null
          activity_type: string
          attachments?: Json | null
          citation_number?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          location?: string | null
          officer_badge?: string | null
          outcome?: string | null
          priority?: string | null
          staff_member: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
          vehicle_id: number
        }
        Update: {
          activity_date?: string
          activity_time?: string | null
          activity_type?: string
          attachments?: Json | null
          citation_number?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          location?: string | null
          officer_badge?: string | null
          outcome?: string | null
          priority?: string | null
          staff_member?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          vehicle_id?: number
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          notes: string | null
          owner_name: string | null
          plate_number: string
          province: string | null
          updated_at: string | null
          updated_by: string | null
          vehicle_color: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_type: string | null
          vehicle_year: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: number
          notes?: string | null
          owner_name?: string | null
          plate_number: string
          province?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: number
          notes?: string | null
          owner_name?: string | null
          plate_number?: string
          province?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
        }
        Relationships: []
      }
      wizard_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_step: number | null
          data: Json | null
          description: string | null
          id: string
          paused_at: string | null
          started_at: string
          started_by: string | null
          status: string
          steps: string[]
          title: string
          type: string
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step?: number | null
          data?: Json | null
          description?: string | null
          id: string
          paused_at?: string | null
          started_at?: string
          started_by?: string | null
          status?: string
          steps: string[]
          title: string
          type: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step?: number | null
          data?: Json | null
          description?: string | null
          id?: string
          paused_at?: string | null
          started_at?: string
          started_by?: string | null
          status?: string
          steps?: string[]
          title?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      medical_episodes_full: {
        Row: {
          body_region: string | null
          calculated_days_since_onset: number | null
          check_in_id: string | null
          condition_category: string | null
          condition_id: string | null
          condition_name: string | null
          condition_plain_name: string | null
          created_at: string | null
          created_by: string | null
          days_since_onset: number | null
          diagnosis_source: string | null
          duration_observed: string | null
          environmental_factors: string | null
          episode_date: string | null
          episode_end_date: string | null
          episode_type: string | null
          escalation_needed: boolean | null
          facility_involved: string | null
          follow_up_needed: boolean | null
          follow_up_notes: string | null
          healthcare_provider: string | null
          id: string | null
          incident_role: string | null
          intervention_details: Json | null
          intervention_ids: string[] | null
          intervention_names: string[] | null
          interventions_used: string | null
          is_active: boolean | null
          is_diagnosed: boolean | null
          last_assessment_date: string | null
          location_occurred: string | null
          observable_symptoms: Json | null
          outcome: string | null
          outcome_description: string | null
          outcome_id: string | null
          outcome_plain_name: string | null
          outcome_requires_followup: boolean | null
          person_id: number | null
          person_response: string | null
          photo_urls: string[] | null
          possible_triggers: string | null
          primary_condition: string | null
          primary_symptom_ids: string[] | null
          progression_status:
            | Database["core"]["Enums"]["progression_status"]
            | null
          referrals_made: string | null
          related_incident_id: number | null
          risk_to_others: string | null
          risk_to_self: string | null
          safety_plan_discussed: boolean | null
          severity_level:
            | Database["core"]["Enums"]["severity_level_enum"]
            | null
          severity_score: number | null
          situation_context: string | null
          symptom_names: string[] | null
          updated_at: string | null
          updated_by: string | null
          wound_details: Json | null
          wound_location_id: string | null
          wound_location_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_episodes_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "medical_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_episodes_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "medical_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_episodes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_episodes_wound_location_id_fkey"
            columns: ["wound_location_id"]
            isOneToOne: false
            referencedRelation: "medical_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_episode_vitals_latest: {
        Row: {
          bp_diastolic: number | null
          bp_systolic: number | null
          episode_id: string | null
          gcs_total: number | null
          hr_bpm: number | null
          observed_at: string | null
          pain_0_10: number | null
          rr_bpm: number | null
          spo2_pct: number | null
          temp_c: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_vitals_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_vitals_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "medical_episodes_full"
            referencedColumns: ["id"]
          },
        ]
      }
      v_organization_contacts: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          end_date: string | null
          first_name: string | null
          full_name: string | null
          id: number | null
          is_primary: boolean | null
          job_title: string | null
          last_name: string | null
          legacy_organization_name: string | null
          notes: string | null
          organization_id: number | null
          person_id: number | null
          person_status: Database["core"]["Enums"]["person_status"] | null
          person_type: Database["core"]["Enums"]["person_type"] | null
          phone: string | null
          preferred_contact_method: string | null
          professional_title: string | null
          relationship_type:
            | Database["core"]["Enums"]["organization_person_relationship_enum"]
            | null
          start_date: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_people_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      v_person_condition_authorized: {
        Row: {
          email: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_user_role: {
        Args: {
          assigned_by?: string
          role_name: string
          target_user_id: string
        }
        Returns: boolean
      }
      bulk_upsert_people: {
        Args: { people_data: Json[] }
        Returns: {
          operation_type: string
          record_id: number
          success: boolean
        }[]
      }
      check_person_duplicate: {
        Args: {
          p_email?: string
          p_first_name: string
          p_last_name: string
          p_phone?: string
        }
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
        }[]
      }
      execute_batch_rollback: { Args: { p_snapshot_id: number }; Returns: Json }
      find_potential_duplicates: {
        Args: {
          p_date_of_birth?: string
          p_email?: string
          p_first_name: string
          p_last_name: string
          p_phone?: string
        }
        Returns: {
          confidence_score: number
          date_of_birth: string
          email: string
          first_name: string
          id: number
          last_name: string
          match_type: string
          phone: string
        }[]
      }
      get_available_enums: {
        Args: never
        Returns: {
          enum_name: string
          enum_schema: string
        }[]
      }
      get_enum_info: {
        Args: { p_enum_name: string }
        Returns: {
          enum_labels: string[]
          enum_name: string
          enum_schema: string
          enum_values: string[]
        }[]
      }
      get_enum_values: {
        Args: { enum_name: string }
        Returns: {
          enum_schema: string
          label: string
          value: string
        }[]
      }
      get_import_template_metadata: { Args: never; Returns: Json }
      get_people_list_with_types: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_person_category?: Database["core"]["Enums"]["person_category"]
          p_person_types?: Database["core"]["Enums"]["person_type"][]
          p_search_term?: string
          p_sort_by?: string
          p_sort_order?: string
          p_status?: Database["core"]["Enums"]["person_status"]
        }
        Returns: {
          created_at: string
          data_sharing_consent: boolean
          email: string
          first_name: string
          housing_status: string
          id: number
          last_name: string
          last_service_date: string
          organization_name: string
          person_category: Database["core"]["Enums"]["person_category"]
          person_type: Database["core"]["Enums"]["person_type"]
          phone: string
          professional_title: string
          relationship_to_client: string
          risk_level: string
          status: Database["core"]["Enums"]["person_status"]
          total_count: number
          updated_at: string
        }[]
      }
      get_person_field_visibility: {
        Args: {
          p_field_name?: string
          p_person_type: Database["core"]["Enums"]["person_type"]
        }
        Returns: {
          field_name: string
          is_editable: boolean
          is_required: boolean
          is_visible: boolean
          privacy_level: string
        }[]
      }
      get_user_permissions: {
        Args: { user_uuid?: string }
        Returns: {
          permission_name: string
        }[]
      }
      get_user_roles: {
        Args: { user_uuid?: string }
        Returns: {
          role_name: string
        }[]
      }
      has_permission: { Args: { permission_name: string }; Returns: boolean }
      is_user_in_roles: {
        Args: { p_roles: string[]; p_user?: string }
        Returns: boolean
      }
      refresh_user_permissions: { Args: { user_uuid?: string }; Returns: Json }
      remove_user_role: {
        Args: { role_name: string; target_user_id: string }
        Returns: boolean
      }
      staff_caseload: {
        Args: { staff_uuid: string }
        Returns: {
          client_name: string
          next_at: string
          next_step: string
          person_id: number
          status: string
        }[]
      }
      staff_outreach_logs: {
        Args: { limit_rows?: number; staff_uuid: string }
        Returns: {
          id: string
          location: string
          occurred_at: string
          summary: string
          title: string
        }[]
      }
      staff_shifts_today: {
        Args: { staff_uuid: string }
        Returns: {
          ends_at: string
          id: string
          location: string
          starts_at: string
          title: string
        }[]
      }
      validate_admin_access: { Args: never; Returns: boolean }
    }
    Enums: {
      activity_type_enum:
        | "visit"
        | "contact"
        | "note"
        | "welfare_check"
        | "service_referral"
        | "incident"
        | "follow_up"
        | "supply_provision"
        | "other"
      address_category:
        | "residential"
        | "commercial"
        | "institutional"
        | "industrial"
        | "mixed_use"
        | "temporary"
        | "emergency_shelter"
        | "transitional_housing"
        | "supportive_housing"
        | "service_location"
        | "incident_location"
        | "other"
      address_type:
        | "street_address"
        | "informal_location"
        | "coordinates"
        | "landmark_area"
      address_type_enum:
        | "residential"
        | "commercial"
        | "institutional"
        | "industrial"
        | "vacant"
        | "other"
      assessment_urgency:
        | "emergency"
        | "urgent"
        | "concern"
        | "followup"
        | "routine"
      burn_degree: "first" | "second" | "third" | "fourth"
      canadian_province:
        | "ON"
        | "BC"
        | "AB"
        | "SK"
        | "MB"
        | "QC"
        | "NB"
        | "NS"
        | "PE"
        | "NL"
        | "YT"
        | "NT"
        | "NU"
      cfs_origin_enum: "community" | "system"
      cfs_source_enum:
        | "web_form"
        | "phone"
        | "sms"
        | "email"
        | "social"
        | "api"
        | "staff_observed"
      cfs_status_enum: "received" | "triaged" | "dismissed" | "converted"
      citizenship_status_enum:
        | "canadian_citizen"
        | "permanent_resident"
        | "refugee"
        | "refugee_claimant"
        | "temporary_resident"
        | "work_permit"
        | "student_visa"
        | "undocumented"
        | "other"
        | "prefer_not_to_say"
      communication_ability_enum: "normal" | "impaired" | "minimal" | "none"
      contact_frequency_enum:
        | "daily"
        | "multiple_weekly"
        | "weekly"
        | "bi_weekly"
        | "monthly"
        | "as_needed"
        | "crisis_only"
      contact_method_enum:
        | "phone"
        | "text"
        | "email"
        | "in_person"
        | "drop_in"
        | "outreach"
      contact_time_pref_enum:
        | "morning"
        | "afternoon"
        | "evening"
        | "anytime"
        | "weekends"
      cooperation_level_enum:
        | "fully_cooperative"
        | "mostly_cooperative"
        | "somewhat_cooperative"
        | "uncooperative"
        | "hostile"
      court_compliance_enum:
        | "compliant"
        | "mostly_compliant"
        | "some_violations"
        | "non_compliant"
        | "not_applicable"
      death_cause_category:
        | "suspected_overdose"
        | "confirmed_overdose"
        | "medical_other"
        | "trauma"
        | "unknown"
      death_confirmation_source:
        | "coroner"
        | "hospital"
        | "family"
        | "police"
        | "staff_observation"
        | "unknown"
      dispatch_priority:
        | "informational"
        | "low"
        | "medium"
        | "high"
        | "critical"
      dispatch_priority_enum:
        | "informational"
        | "low"
        | "medium"
        | "high"
        | "critical"
      document_status_enum: "yes" | "no" | "partial" | "unknown"
      eligibility_status_enum:
        | "eligible"
        | "ineligible"
        | "pending_assessment"
        | "under_review"
      encampment_status_enum: "active" | "monitoring" | "inactive" | "cleared"
      environmental_factors_enum:
        | "rain"
        | "snow"
        | "ice"
        | "extreme_heat"
        | "extreme_cold"
        | "poor_lighting"
        | "unstable_structure"
        | "weather_hazards"
        | "traffic_road"
        | "wildlife"
        | "contamination"
        | "structural_damage"
        | "other"
      ethnicity_enum:
        | "indigenous"
        | "black_african"
        | "east_asian"
        | "south_asian"
        | "southeast_asian"
        | "west_asian"
        | "latin_american"
        | "white_european"
        | "mixed"
        | "other"
        | "prefer_not_to_say"
      follow_up_plan_enum:
        | "immediate"
        | "urgent"
        | "weekly"
        | "routine"
        | "client_initiated"
      follow_up_urgency_enum:
        | "immediate"
        | "today"
        | "tomorrow"
        | "few_days"
        | "one_week"
      gender_enum:
        | "Male"
        | "Female"
        | "Non-binary"
        | "Other"
        | "Prefer not to say"
      hazmat_collection_status_enum:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "deferred"
      hazmat_priority: "low" | "standard" | "high" | "emergency"
      hazmat_source:
        | "public_report"
        | "staff_discovery"
        | "property_sweep"
        | "follow_up_collection"
        | "emergency_response"
      hazmat_test_method_enum:
        | "fentanyl_test_strip"
        | "field_test_kit"
        | "chemical_spot_test"
        | "visual_indicator"
        | "other"
      hazmat_test_result_enum:
        | "positive"
        | "negative"
        | "inconclusive"
        | "not_performed"
      health_card_status_enum: "yes_valid" | "yes_expired" | "no" | "unknown"
      health_concern_enum:
        | "mental_health"
        | "addiction_substance_use"
        | "physical_health"
        | "chronic_conditions"
        | "disabilities"
        | "none"
      housing_status_enum:
        | "housed"
        | "emergency_shelter"
        | "transitional_housing"
        | "temporarily_housed"
        | "unsheltered"
        | "unknown"
      incident_complexity_enum: "simple" | "moderate" | "complex" | "major"
      incident_outcome_enum:
        | "REMOVED"
        | "NHF"
        | "EMS_REFER"
        | "POLICE_REFER"
        | "HOSPITAL_TX"
        | "SUPPLIES_PROVIDED"
        | "UTL"
        | "DUP"
      incident_priority_enum: "low" | "medium" | "high" | "critical"
      incident_status: "draft" | "open" | "in_progress" | "resolved" | "closed"
      incident_status_enum:
        | "draft"
        | "open"
        | "in_progress"
        | "resolved"
        | "closed"
      incident_type_enum:
        | "outreach"
        | "welfare_check"
        | "medical"
        | "mental_health"
        | "mental_health_crisis"
        | "overdose"
        | "death"
        | "assault"
        | "theft"
        | "disturbance"
        | "property_damage"
        | "fire"
        | "cleanup"
        | "supply_distribution"
        | "other"
      income_source_enum:
        | "employment"
        | "benefits"
        | "disability"
        | "pension"
        | "other"
        | "none"
        | "unknown"
      interpreter_need_enum: "none" | "language" | "sign_language" | "unknown"
      intervention_urgency:
        | "immediate"
        | "within_hour"
        | "same_day"
        | "next_day"
        | "within_week"
      justice_type_enum: "arrest" | "summons" | "warrant" | "violation"
      language: "english" | "spanish" | "french" | "other" | "unknown"
      legal_status_enum:
        | "no_involvement"
        | "pending_charges"
        | "on_bail"
        | "probation"
        | "parole"
        | "community_service"
        | "warrant"
      location_method_enum:
        | "street_address"
        | "informal_location"
        | "coordinates"
        | "landmark_area"
      location_type:
        | "street"
        | "shelter"
        | "camp"
        | "hospital"
        | "clinic"
        | "home"
        | "other"
      mental_behavioral_symptom_enum:
        | "agitation"
        | "withdrawal"
        | "aggression"
        | "restlessness"
        | "hyperactivity"
        | "lethargy"
        | "self_harm"
      mental_mood_symptom_enum:
        | "depressed"
        | "anxious"
        | "manic"
        | "irritable"
        | "euphoric"
        | "flat_affect"
        | "labile"
      mental_observation_duration_enum:
        | "under_2_min"
        | "minutes_5"
        | "minutes_10"
        | "minutes_15"
        | "minutes_30"
        | "minutes_60"
        | "ongoing"
      mood_presentation_enum:
        | "stable"
        | "anxious"
        | "depressed"
        | "agitated"
        | "confused"
        | "intoxicated"
      notify_channel_enum: "none" | "email" | "sms"
      organization_person_relationship_enum:
        | "employee"
        | "volunteer"
        | "contractor"
        | "partner_staff"
        | "liaison"
        | "board_member"
        | "sponsor"
        | "other"
      organization_status_enum:
        | "active"
        | "inactive"
        | "pending"
        | "under_review"
      organization_type:
        | "addiction"
        | "crisis_support"
        | "food_services"
        | "housing"
        | "mental_health"
        | "multi_service"
        | "healthcare"
        | "government"
        | "non_profit"
        | "faith_based"
        | "community_center"
        | "legal_services"
        | "other"
      partnership_type:
        | "referral_partner"
        | "service_provider"
        | "funding_partner"
        | "collaborative_partner"
        | "resource_partner"
        | "other"
      party_role_enum:
        | "subject"
        | "reporter"
        | "responder"
        | "agency"
        | "bystander"
      person_category:
        | "service_recipient"
        | "community"
        | "professional"
        | "support"
      person_condition_risk_flag_enum:
        | "self_harm_risk"
        | "risk_to_others"
        | "medication_nonadherence"
        | "substance_trigger"
        | "medical_instability"
        | "needs_meds_support"
        | "housing_instability"
        | "legal_concern"
      person_condition_status_enum:
        | "active"
        | "remission"
        | "ruled_out"
        | "inactive"
        | "resolved"
        | "unknown"
      person_condition_verification_enum:
        | "self_report"
        | "clinician_diagnosis"
        | "chart_confirmed"
        | "collateral_report"
        | "screening_assessment"
      person_status:
        | "active"
        | "inactive"
        | "deceased"
        | "archived"
        | "pending_verification"
        | "do_not_contact"
        | "merged"
      person_type:
        | "client"
        | "former_client"
        | "community_member"
        | "potential_client"
        | "resident"
        | "concerned_citizen"
        | "agency_contact"
        | "case_worker"
        | "healthcare_provider"
        | "emergency_contact"
        | "family_member"
        | "support_person"
      photo_type: "initial" | "progress" | "final" | "comparison" | "detail"
      pit_age_bracket:
        | "under_19"
        | "age_20_39"
        | "age_40_59"
        | "age_60_plus"
        | "unknown"
      pit_boolean_response: "yes" | "no" | "maybe" | "unknown" | "not_answered"
      pit_count_status: "planned" | "active" | "closed"
      pit_location_type:
        | "encampment"
        | "shelter"
        | "street"
        | "vehicle"
        | "motel"
        | "couch_surfing"
        | "institutional"
        | "other"
        | "unknown"
      pit_severity_level:
        | "none"
        | "mild"
        | "moderate"
        | "severe"
        | "critical"
        | "unknown"
        | "not_recorded"
        | "not_applicable"
      pit_treatment_interest: "yes" | "no" | "not_suitable" | "not_applicable"
      place_of_origin_enum:
        | "Port Hope"
        | "Cobourg"
        | "Northumberland County (other)"
        | "Durham Region"
        | "Peterborough"
        | "Prince Edward County"
        | "GTA (including Toronto)"
        | "Outside of Province"
        | "Outside of Country"
      preferred_service_enum:
        | "case_management"
        | "housing_support"
        | "counseling"
        | "group_programs"
        | "life_skills"
        | "employment_support"
        | "financial_assistance"
        | "health_advocacy"
        | "legal_support"
        | "peer_support"
        | "drop_in"
        | "outreach"
        | "id_replacement"
        | "food_programs"
        | "medical_referral"
        | "mental_health_referral"
        | "addiction_treatment_referral"
        | "transportation_assistance"
        | "other"
      primary_worker_assignee_enum:
        | "intake_worker"
        | "case_manager"
        | "housing_worker"
        | "outreach_worker"
        | "to_be_assigned"
      priority_level:
        | "low"
        | "medium"
        | "high"
        | "critical"
        | "urgent"
        | "emergency"
      priority_level_enum: "low" | "medium" | "high" | "urgent"
      progression_status:
        | "new"
        | "improving"
        | "stable"
        | "worsening"
        | "much_worse"
        | "resolved"
        | "unknown"
      property_category: "found" | "seized" | "evidence"
      property_type:
        | "electronics"
        | "jewelry"
        | "clothing"
        | "documents"
        | "vehicle"
        | "bicycle"
        | "bag"
        | "keys"
        | "wallet"
        | "other"
      public_safety_impact_enum:
        | "none"
        | "minimal"
        | "moderate"
        | "significant"
        | "major"
      reality_orientation_enum:
        | "oriented"
        | "confused"
        | "disoriented"
        | "unknown"
      record_status:
        | "active"
        | "inactive"
        | "pending"
        | "completed"
        | "cancelled"
        | "draft"
        | "under_review"
      risk_factor_enum:
        | "Substance Use"
        | "Mental Health"
        | "Domestic Violence"
        | "Justice Involvement"
        | "Chronic Health"
        | "Weather Exposure"
        | "Mobility Issue"
      risk_level_enum: "low" | "medium" | "high" | "critical" | "unknown"
      self_care_ability_enum:
        | "independent"
        | "needs_prompting"
        | "needs_assistance"
        | "unable"
      severity_level_enum:
        | "minimal"
        | "mild"
        | "moderate"
        | "severe"
        | "critical"
      social_engagement_enum:
        | "normal"
        | "withdrawn"
        | "overly_talkative"
        | "inappropriate"
        | "refused"
      structure_type_enum: "temporary" | "permanent" | "seasonal"
      substance_indicators_enum:
        | "alcohol"
        | "cannabis"
        | "hard_drugs"
        | "needles_paraphernalia"
        | "pills_medication"
        | "smoking_materials"
        | "unknown_substances"
        | "other"
      support_network_enum: "strong" | "some_support" | "limited" | "isolated"
      vehicle_activity_outcome_enum:
        | "citation_issued"
        | "warning_issued"
        | "no_action"
        | "arrest_made"
        | "vehicle_impounded"
        | "vehicle_released"
        | "case_closed"
        | "follow_up_required"
      vehicle_activity_type_enum:
        | "traffic_stop"
        | "citation_issued"
        | "warning_issued"
        | "vehicle_search"
        | "impound"
        | "release"
        | "inspection"
        | "accident_report"
        | "theft_report"
        | "recovery"
        | "maintenance"
        | "other"
      vehicle_color_enum:
        | "Black"
        | "White"
        | "Silver"
        | "Grey"
        | "Gray"
        | "Red"
        | "Blue"
        | "Green"
        | "Yellow"
        | "Orange"
        | "Purple"
        | "Brown"
        | "Beige"
        | "Tan"
        | "Gold"
        | "Maroon"
        | "Navy"
        | "Teal"
        | "Pink"
        | "Multi-colored"
        | "Unknown"
        | "Other"
      vehicle_make_enum:
        | "Acura"
        | "Audi"
        | "BMW"
        | "Buick"
        | "Cadillac"
        | "Chevrolet"
        | "Chrysler"
        | "Dodge"
        | "Ford"
        | "GMC"
        | "Honda"
        | "Hyundai"
        | "Infiniti"
        | "Jeep"
        | "Kia"
        | "Lexus"
        | "Lincoln"
        | "Mazda"
        | "Mercedes-Benz"
        | "Mitsubishi"
        | "Nissan"
        | "Pontiac"
        | "Ram"
        | "Subaru"
        | "Toyota"
        | "Volkswagen"
        | "Volvo"
        | "Other"
      vehicle_type:
        | "sedan"
        | "suv"
        | "truck"
        | "van"
        | "motorcycle"
        | "bicycle"
        | "rv"
        | "trailer"
        | "other"
      veteran_status_enum: "yes" | "no" | "unknown"
      visibility_enum: "excellent" | "good" | "fair" | "poor"
      welcome_resource_enum:
        | "service_directory"
        | "emergency_contacts"
        | "crisis_line_info"
        | "housing_resources"
        | "health_resources"
        | "food_resources"
        | "transit_tokens"
        | "hygiene_kit"
      workflow_status:
        | "reported"
        | "assigned"
        | "en_route"
        | "on_scene"
        | "in_progress"
        | "collecting"
        | "collected"
        | "in_storage"
        | "disposed"
        | "returned"
        | "claimed"
        | "cancelled"
      wound_depth:
        | "superficial"
        | "partial"
        | "full_thickness"
        | "to_subcutaneous"
        | "to_fascia"
        | "to_muscle"
        | "to_bone"
      wound_size_category:
        | "tiny"
        | "small"
        | "medium"
        | "large"
        | "very_large"
        | "extensive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  donations: {
    Tables: {
      catalog_items: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          default_quantity: number
          id: string
          image_url: string | null
          inventory_item_id: string
          is_active: boolean
          long_description: string | null
          priority: number
          short_description: string | null
          slug: string
          stripe_price_id: string | null
          target_buffer: number | null
          title: string
          unit_cost_cents: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          default_quantity?: number
          id?: string
          image_url?: string | null
          inventory_item_id: string
          is_active?: boolean
          long_description?: string | null
          priority?: number
          short_description?: string | null
          slug: string
          stripe_price_id?: string | null
          target_buffer?: number | null
          title: string
          unit_cost_cents?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          default_quantity?: number
          id?: string
          image_url?: string | null
          inventory_item_id?: string
          is_active?: boolean
          long_description?: string | null
          priority?: number
          short_description?: string | null
          slug?: string
          stripe_price_id?: string | null
          target_buffer?: number | null
          title?: string
          unit_cost_cents?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      donation_intents: {
        Row: {
          completed_at: string | null
          created_at: string
          currency: string
          donor_email: string | null
          id: string
          items: Json
          metadata: Json | null
          status: Database["donations"]["Enums"]["donation_intent_status"]
          stripe_session_id: string | null
          total_amount_cents: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          currency?: string
          donor_email?: string | null
          id?: string
          items?: Json
          metadata?: Json | null
          status?: Database["donations"]["Enums"]["donation_intent_status"]
          stripe_session_id?: string | null
          total_amount_cents: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          currency?: string
          donor_email?: string | null
          id?: string
          items?: Json
          metadata?: Json | null
          status?: Database["donations"]["Enums"]["donation_intent_status"]
          stripe_session_id?: string | null
          total_amount_cents?: number
        }
        Relationships: []
      }
      donation_payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          donation_intent_id: string
          id: string
          processed_at: string
          provider: string
          provider_payment_id: string | null
          raw_payload: Json | null
          status: Database["donations"]["Enums"]["donation_payment_status"]
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          donation_intent_id: string
          id?: string
          processed_at?: string
          provider?: string
          provider_payment_id?: string | null
          raw_payload?: Json | null
          status?: Database["donations"]["Enums"]["donation_payment_status"]
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          donation_intent_id?: string
          id?: string
          processed_at?: string
          provider?: string
          provider_payment_id?: string | null
          raw_payload?: Json | null
          status?: Database["donations"]["Enums"]["donation_payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "donation_payments_donation_intent_id_fkey"
            columns: ["donation_intent_id"]
            isOneToOne: false
            referencedRelation: "donation_intents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      catalog_item_metrics: {
        Row: {
          catalog_item_id: string | null
          current_stock: number | null
          distributed_last_30_days: number | null
          distributed_last_365_days: number | null
          inventory_item_category: string | null
          inventory_item_id: string | null
          inventory_item_name: string | null
          target_buffer: number | null
          unit_type: string | null
        }
        Relationships: []
      }
      v_distribution_30d: {
        Row: {
          inventory_item_id: string | null
          units_distributed: number | null
        }
        Relationships: []
      }
      v_distribution_365d: {
        Row: {
          inventory_item_id: string | null
          units_distributed: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      donation_intent_status:
        | "pending"
        | "requires_payment"
        | "paid"
        | "failed"
        | "cancelled"
      donation_payment_status:
        | "succeeded"
        | "requires_action"
        | "failed"
        | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  hazmat: {
    Tables: {
      hazmat_custody_transfers: {
        Row: {
          compliance_notes: string | null
          container_condition: string | null
          container_id: string | null
          container_type: string
          created_at: string | null
          created_by: string
          episode_id: string
          from_location: string
          from_person: string
          from_role: string | null
          id: string
          irregularities_noted: string | null
          official_receipt_provided: boolean | null
          photo_documentation: boolean | null
          purpose_of_transfer: string
          receipt_number: string | null
          requires_official_receipt: boolean | null
          seal_applied: boolean | null
          seal_condition_after: string | null
          seal_condition_before: string | null
          seal_manufacturer: string | null
          seal_serial_number: string | null
          to_location: string
          to_person: string
          to_role: string | null
          transfer_datetime: string
          transfer_notes: string | null
          transfer_type: string
          transport_method: string | null
          updated_at: string | null
          updated_by: string | null
          witness_person: string | null
        }
        Insert: {
          compliance_notes?: string | null
          container_condition?: string | null
          container_id?: string | null
          container_type: string
          created_at?: string | null
          created_by: string
          episode_id: string
          from_location: string
          from_person: string
          from_role?: string | null
          id?: string
          irregularities_noted?: string | null
          official_receipt_provided?: boolean | null
          photo_documentation?: boolean | null
          purpose_of_transfer: string
          receipt_number?: string | null
          requires_official_receipt?: boolean | null
          seal_applied?: boolean | null
          seal_condition_after?: string | null
          seal_condition_before?: string | null
          seal_manufacturer?: string | null
          seal_serial_number?: string | null
          to_location: string
          to_person: string
          to_role?: string | null
          transfer_datetime: string
          transfer_notes?: string | null
          transfer_type: string
          transport_method?: string | null
          updated_at?: string | null
          updated_by?: string | null
          witness_person?: string | null
        }
        Update: {
          compliance_notes?: string | null
          container_condition?: string | null
          container_id?: string | null
          container_type?: string
          created_at?: string | null
          created_by?: string
          episode_id?: string
          from_location?: string
          from_person?: string
          from_role?: string | null
          id?: string
          irregularities_noted?: string | null
          official_receipt_provided?: boolean | null
          photo_documentation?: boolean | null
          purpose_of_transfer?: string
          receipt_number?: string | null
          requires_official_receipt?: boolean | null
          seal_applied?: boolean | null
          seal_condition_after?: string | null
          seal_condition_before?: string | null
          seal_manufacturer?: string | null
          seal_serial_number?: string | null
          to_location?: string
          to_person?: string
          to_role?: string | null
          transfer_datetime?: string
          transfer_notes?: string | null
          transfer_type?: string
          transport_method?: string | null
          updated_at?: string | null
          updated_by?: string | null
          witness_person?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hazmat_custody_transfers_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "hazmat_episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      hazmat_disposal_records: {
        Row: {
          budget_code: string | null
          certificate_number: string | null
          chain_of_custody_completed: boolean | null
          compliance_documentation: string | null
          created_at: string | null
          created_by: string
          disposal_authorized_by: string | null
          disposal_certificate_received: boolean | null
          disposal_confirmed_by: string | null
          disposal_cost: number | null
          disposal_date: string
          disposal_datetime: string
          disposal_method: string
          disposal_notes: string | null
          disposal_photos_taken: boolean | null
          environmental_impact_notes: string | null
          episode_id: string
          final_seal_status: string | null
          final_seal_verification: boolean | null
          id: string
          official_receipt_number: string | null
          permit_numbers: string | null
          receiving_authority_type: string | null
          receiving_contact_info: string | null
          receiving_contact_person: string | null
          receiving_organization: string
          regulatory_body: string | null
          regulatory_requirements_met: boolean | null
          updated_at: string | null
          updated_by: string | null
          witness_to_disposal: string | null
        }
        Insert: {
          budget_code?: string | null
          certificate_number?: string | null
          chain_of_custody_completed?: boolean | null
          compliance_documentation?: string | null
          created_at?: string | null
          created_by: string
          disposal_authorized_by?: string | null
          disposal_certificate_received?: boolean | null
          disposal_confirmed_by?: string | null
          disposal_cost?: number | null
          disposal_date: string
          disposal_datetime: string
          disposal_method: string
          disposal_notes?: string | null
          disposal_photos_taken?: boolean | null
          environmental_impact_notes?: string | null
          episode_id: string
          final_seal_status?: string | null
          final_seal_verification?: boolean | null
          id?: string
          official_receipt_number?: string | null
          permit_numbers?: string | null
          receiving_authority_type?: string | null
          receiving_contact_info?: string | null
          receiving_contact_person?: string | null
          receiving_organization: string
          regulatory_body?: string | null
          regulatory_requirements_met?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          witness_to_disposal?: string | null
        }
        Update: {
          budget_code?: string | null
          certificate_number?: string | null
          chain_of_custody_completed?: boolean | null
          compliance_documentation?: string | null
          created_at?: string | null
          created_by?: string
          disposal_authorized_by?: string | null
          disposal_certificate_received?: boolean | null
          disposal_confirmed_by?: string | null
          disposal_cost?: number | null
          disposal_date?: string
          disposal_datetime?: string
          disposal_method?: string
          disposal_notes?: string | null
          disposal_photos_taken?: boolean | null
          environmental_impact_notes?: string | null
          episode_id?: string
          final_seal_status?: string | null
          final_seal_verification?: boolean | null
          id?: string
          official_receipt_number?: string | null
          permit_numbers?: string | null
          receiving_authority_type?: string | null
          receiving_contact_info?: string | null
          receiving_contact_person?: string | null
          receiving_organization?: string
          regulatory_body?: string | null
          regulatory_requirements_met?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          witness_to_disposal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hazmat_disposal_records_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "hazmat_episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      hazmat_episodes: {
        Row: {
          additional_notes: string | null
          address_id: number | null
          caller_contact: string | null
          caller_name: string | null
          children_present: boolean | null
          collected_by: string | null
          collection_datetime: string | null
          collection_duration: unknown
          collection_status: string | null
          controlled_substance_present: boolean
          created_at: string | null
          created_by: string
          custody_tracking_started_at: string | null
          discovered_by: string
          discovery_date: string
          discovery_location: string | null
          discovery_time: string | null
          episode_number: string
          episode_type: string
          gps_coordinates: string | null
          id: string
          immediate_risk_present: boolean | null
          location_notes: string
          location_type: string | null
          pets_present: boolean | null
          photo_documentation_available: boolean | null
          priority_level: string | null
          public_access_restricted: boolean | null
          related_incident_id: string | null
          related_person_id: number | null
          reported_by_user_id: string | null
          safety_concerns: string | null
          situation_description: string
          source_cfs_id: number | null
          updated_at: string | null
          updated_by: string | null
          visibility_conditions: string | null
          weather_conditions: string | null
          witness_statements: string | null
        }
        Insert: {
          additional_notes?: string | null
          address_id?: number | null
          caller_contact?: string | null
          caller_name?: string | null
          children_present?: boolean | null
          collected_by?: string | null
          collection_datetime?: string | null
          collection_duration?: unknown
          collection_status?: string | null
          controlled_substance_present?: boolean
          created_at?: string | null
          created_by: string
          custody_tracking_started_at?: string | null
          discovered_by: string
          discovery_date: string
          discovery_location?: string | null
          discovery_time?: string | null
          episode_number: string
          episode_type: string
          gps_coordinates?: string | null
          id?: string
          immediate_risk_present?: boolean | null
          location_notes: string
          location_type?: string | null
          pets_present?: boolean | null
          photo_documentation_available?: boolean | null
          priority_level?: string | null
          public_access_restricted?: boolean | null
          related_incident_id?: string | null
          related_person_id?: number | null
          reported_by_user_id?: string | null
          safety_concerns?: string | null
          situation_description: string
          source_cfs_id?: number | null
          updated_at?: string | null
          updated_by?: string | null
          visibility_conditions?: string | null
          weather_conditions?: string | null
          witness_statements?: string | null
        }
        Update: {
          additional_notes?: string | null
          address_id?: number | null
          caller_contact?: string | null
          caller_name?: string | null
          children_present?: boolean | null
          collected_by?: string | null
          collection_datetime?: string | null
          collection_duration?: unknown
          collection_status?: string | null
          controlled_substance_present?: boolean
          created_at?: string | null
          created_by?: string
          custody_tracking_started_at?: string | null
          discovered_by?: string
          discovery_date?: string
          discovery_location?: string | null
          discovery_time?: string | null
          episode_number?: string
          episode_type?: string
          gps_coordinates?: string | null
          id?: string
          immediate_risk_present?: boolean | null
          location_notes?: string
          location_type?: string | null
          pets_present?: boolean | null
          photo_documentation_available?: boolean | null
          priority_level?: string | null
          public_access_restricted?: boolean | null
          related_incident_id?: string | null
          related_person_id?: number | null
          reported_by_user_id?: string | null
          safety_concerns?: string | null
          situation_description?: string
          source_cfs_id?: number | null
          updated_at?: string | null
          updated_by?: string | null
          visibility_conditions?: string | null
          weather_conditions?: string | null
          witness_statements?: string | null
        }
        Relationships: []
      }
      hazmat_items: {
        Row: {
          chain_of_custody_required: boolean
          chain_of_custody_started_at: string | null
          collection_container_type: string | null
          collection_method: string | null
          color_description: string | null
          contamination_type: string | null
          created_at: string | null
          created_by: string
          cross_contamination_risk: string | null
          episode_id: string
          estimated_quantity: string | null
          evidence_tag_applied: boolean | null
          evidence_tag_number: string | null
          hazard_level: string | null
          id: string
          item_description: string
          item_number: number
          item_type: string
          photo_taken: boolean | null
          physical_condition: string | null
          size_description: string | null
          special_handling_notes: string | null
          special_handling_required: boolean | null
          tamper_seal_applied: boolean
          tamper_seal_serial: string | null
          test_count: number | null
          test_method:
            | Database["core"]["Enums"]["hazmat_test_method_enum"]
            | null
          test_notes: string | null
          test_observed_color: string | null
          test_performed: boolean
          test_result:
            | Database["core"]["Enums"]["hazmat_test_result_enum"]
            | null
          updated_at: string | null
          updated_by: string | null
          visible_contamination: boolean | null
        }
        Insert: {
          chain_of_custody_required?: boolean
          chain_of_custody_started_at?: string | null
          collection_container_type?: string | null
          collection_method?: string | null
          color_description?: string | null
          contamination_type?: string | null
          created_at?: string | null
          created_by: string
          cross_contamination_risk?: string | null
          episode_id: string
          estimated_quantity?: string | null
          evidence_tag_applied?: boolean | null
          evidence_tag_number?: string | null
          hazard_level?: string | null
          id?: string
          item_description: string
          item_number: number
          item_type: string
          photo_taken?: boolean | null
          physical_condition?: string | null
          size_description?: string | null
          special_handling_notes?: string | null
          special_handling_required?: boolean | null
          tamper_seal_applied?: boolean
          tamper_seal_serial?: string | null
          test_count?: number | null
          test_method?:
            | Database["core"]["Enums"]["hazmat_test_method_enum"]
            | null
          test_notes?: string | null
          test_observed_color?: string | null
          test_performed?: boolean
          test_result?:
            | Database["core"]["Enums"]["hazmat_test_result_enum"]
            | null
          updated_at?: string | null
          updated_by?: string | null
          visible_contamination?: boolean | null
        }
        Update: {
          chain_of_custody_required?: boolean
          chain_of_custody_started_at?: string | null
          collection_container_type?: string | null
          collection_method?: string | null
          color_description?: string | null
          contamination_type?: string | null
          created_at?: string | null
          created_by?: string
          cross_contamination_risk?: string | null
          episode_id?: string
          estimated_quantity?: string | null
          evidence_tag_applied?: boolean | null
          evidence_tag_number?: string | null
          hazard_level?: string | null
          id?: string
          item_description?: string
          item_number?: number
          item_type?: string
          photo_taken?: boolean | null
          physical_condition?: string | null
          size_description?: string | null
          special_handling_notes?: string | null
          special_handling_required?: boolean | null
          tamper_seal_applied?: boolean
          tamper_seal_serial?: string | null
          test_count?: number | null
          test_method?:
            | Database["core"]["Enums"]["hazmat_test_method_enum"]
            | null
          test_notes?: string | null
          test_observed_color?: string | null
          test_performed?: boolean
          test_result?:
            | Database["core"]["Enums"]["hazmat_test_result_enum"]
            | null
          updated_at?: string | null
          updated_by?: string | null
          visible_contamination?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hazmat_items_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "hazmat_episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      hazmat_safety_incidents: {
        Row: {
          additional_training_needed: string | null
          containment_actions: string | null
          contributing_factors: string | null
          corrective_actions_identified: string | null
          created_at: string | null
          created_by: string
          decontamination_performed: boolean | null
          episode_id: string
          exposure_duration: string | null
          external_agencies_notified: string | null
          external_reporting_required: boolean | null
          follow_up_medical_required: boolean | null
          id: string
          immediate_cause: string | null
          immediate_response_taken: string | null
          incident_datetime: string
          incident_description: string
          incident_reported_by: string
          incident_type: string
          incident_witnessed_by: string | null
          investigation_completed: boolean | null
          investigation_findings: string | null
          location_of_incident: string | null
          materials_involved: string | null
          medical_attention_required: boolean | null
          medical_response_details: string | null
          people_involved_count: number | null
          policy_changes_recommended: string | null
          potential_exposure_routes: string | null
          protective_equipment_effectiveness: string | null
          protective_equipment_used: string | null
          public_count: number | null
          public_involved: boolean | null
          report_approved_by: string | null
          report_reviewed_by: string | null
          severity_level: string | null
          staff_involved: string | null
          supervisor_notified: boolean | null
          supervisor_notified_datetime: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          additional_training_needed?: string | null
          containment_actions?: string | null
          contributing_factors?: string | null
          corrective_actions_identified?: string | null
          created_at?: string | null
          created_by: string
          decontamination_performed?: boolean | null
          episode_id: string
          exposure_duration?: string | null
          external_agencies_notified?: string | null
          external_reporting_required?: boolean | null
          follow_up_medical_required?: boolean | null
          id?: string
          immediate_cause?: string | null
          immediate_response_taken?: string | null
          incident_datetime: string
          incident_description: string
          incident_reported_by: string
          incident_type: string
          incident_witnessed_by?: string | null
          investigation_completed?: boolean | null
          investigation_findings?: string | null
          location_of_incident?: string | null
          materials_involved?: string | null
          medical_attention_required?: boolean | null
          medical_response_details?: string | null
          people_involved_count?: number | null
          policy_changes_recommended?: string | null
          potential_exposure_routes?: string | null
          protective_equipment_effectiveness?: string | null
          protective_equipment_used?: string | null
          public_count?: number | null
          public_involved?: boolean | null
          report_approved_by?: string | null
          report_reviewed_by?: string | null
          severity_level?: string | null
          staff_involved?: string | null
          supervisor_notified?: boolean | null
          supervisor_notified_datetime?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          additional_training_needed?: string | null
          containment_actions?: string | null
          contributing_factors?: string | null
          corrective_actions_identified?: string | null
          created_at?: string | null
          created_by?: string
          decontamination_performed?: boolean | null
          episode_id?: string
          exposure_duration?: string | null
          external_agencies_notified?: string | null
          external_reporting_required?: boolean | null
          follow_up_medical_required?: boolean | null
          id?: string
          immediate_cause?: string | null
          immediate_response_taken?: string | null
          incident_datetime?: string
          incident_description?: string
          incident_reported_by?: string
          incident_type?: string
          incident_witnessed_by?: string | null
          investigation_completed?: boolean | null
          investigation_findings?: string | null
          location_of_incident?: string | null
          materials_involved?: string | null
          medical_attention_required?: boolean | null
          medical_response_details?: string | null
          people_involved_count?: number | null
          policy_changes_recommended?: string | null
          potential_exposure_routes?: string | null
          protective_equipment_effectiveness?: string | null
          protective_equipment_used?: string | null
          public_count?: number | null
          public_involved?: boolean | null
          report_approved_by?: string | null
          report_reviewed_by?: string | null
          severity_level?: string | null
          staff_involved?: string | null
          supervisor_notified?: boolean | null
          supervisor_notified_datetime?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hazmat_safety_incidents_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "hazmat_episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      hazmat_storage_logs: {
        Row: {
          access_authorized_by: string | null
          access_level_required: string | null
          container_integrity_check: boolean | null
          container_status: string | null
          created_at: string | null
          created_by: string | null
          episode_id: string
          humidity_logged: boolean | null
          humidity_reading: string | null
          id: string
          log_datetime: string
          log_description: string
          log_type: string
          logged_by: string
          logged_by_role: string | null
          maintenance_performed: string | null
          recommendations: string | null
          safety_concerns_noted: string | null
          safety_inspection_performed: boolean | null
          seal_status: string | null
          seal_status_check: boolean | null
          security_check_performed: boolean | null
          storage_facility: string
          storage_position: string | null
          storage_unit: string | null
          supervisor_name: string | null
          supervisor_notified: boolean | null
          temperature_logged: boolean | null
          temperature_reading: string | null
          updated_at: string | null
          updated_by: string | null
          ventilation_status: string | null
        }
        Insert: {
          access_authorized_by?: string | null
          access_level_required?: string | null
          container_integrity_check?: boolean | null
          container_status?: string | null
          created_at?: string | null
          created_by?: string | null
          episode_id: string
          humidity_logged?: boolean | null
          humidity_reading?: string | null
          id?: string
          log_datetime: string
          log_description: string
          log_type: string
          logged_by: string
          logged_by_role?: string | null
          maintenance_performed?: string | null
          recommendations?: string | null
          safety_concerns_noted?: string | null
          safety_inspection_performed?: boolean | null
          seal_status?: string | null
          seal_status_check?: boolean | null
          security_check_performed?: boolean | null
          storage_facility: string
          storage_position?: string | null
          storage_unit?: string | null
          supervisor_name?: string | null
          supervisor_notified?: boolean | null
          temperature_logged?: boolean | null
          temperature_reading?: string | null
          updated_at?: string | null
          updated_by?: string | null
          ventilation_status?: string | null
        }
        Update: {
          access_authorized_by?: string | null
          access_level_required?: string | null
          container_integrity_check?: boolean | null
          container_status?: string | null
          created_at?: string | null
          created_by?: string | null
          episode_id?: string
          humidity_logged?: boolean | null
          humidity_reading?: string | null
          id?: string
          log_datetime?: string
          log_description?: string
          log_type?: string
          logged_by?: string
          logged_by_role?: string | null
          maintenance_performed?: string | null
          recommendations?: string | null
          safety_concerns_noted?: string | null
          safety_inspection_performed?: boolean | null
          seal_status?: string | null
          seal_status_check?: boolean | null
          security_check_performed?: boolean | null
          storage_facility?: string
          storage_position?: string | null
          storage_unit?: string | null
          supervisor_name?: string | null
          supervisor_notified?: boolean | null
          temperature_logged?: boolean | null
          temperature_reading?: string | null
          updated_at?: string | null
          updated_by?: string | null
          ventilation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hazmat_storage_logs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "hazmat_episodes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  inventory: {
    Tables: {
      distribution_items: {
        Row: {
          batch_id: string | null
          created_at: string | null
          created_by: string | null
          distribution_id: string
          id: string
          item_id: string
          qty: number
          unit_cost: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          distribution_id: string
          id?: string
          item_id: string
          qty: number
          unit_cost?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          distribution_id?: string
          id?: string
          item_id?: string
          qty?: number
          unit_cost?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "item_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_items_distribution_id_fkey"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "distributions"
            referencedColumns: ["id"]
          },
        ]
      }
      distributions: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          gps_accuracy: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          gps_timestamp: string | null
          id: string
          location_id: string
          notes: string | null
          performed_by: string | null
          person_id: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          gps_accuracy?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_timestamp?: string | null
          id?: string
          location_id: string
          notes?: string | null
          performed_by?: string | null
          person_id?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          gps_accuracy?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_timestamp?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          performed_by?: string | null
          person_id?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distributions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          error_message: string | null
          external_system: string
          external_transaction_id: string
          id: string
          processed_at: string | null
          sync_status: string
          transaction_data: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          external_system: string
          external_transaction_id: string
          id?: string
          processed_at?: string | null
          sync_status?: string
          transaction_data: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          external_system?: string
          external_transaction_id?: string
          id?: string
          processed_at?: string | null
          sync_status?: string
          transaction_data?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      inventory_count_items: {
        Row: {
          batch_id: string | null
          counted_qty: number | null
          created_at: string | null
          created_by: string | null
          expected_qty: number | null
          id: string
          inventory_count_id: string
          item_id: string
          notes: string | null
          updated_at: string | null
          updated_by: string | null
          variance: number | null
        }
        Insert: {
          batch_id?: string | null
          counted_qty?: number | null
          created_at?: string | null
          created_by?: string | null
          expected_qty?: number | null
          id?: string
          inventory_count_id: string
          item_id: string
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
          variance?: number | null
        }
        Update: {
          batch_id?: string | null
          counted_qty?: number | null
          created_at?: string | null
          created_by?: string | null
          expected_qty?: number | null
          id?: string
          inventory_count_id?: string
          item_id?: string
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "item_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_items_inventory_count_id_fkey"
            columns: ["inventory_count_id"]
            isOneToOne: false
            referencedRelation: "inventory_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          counted_at: string | null
          counted_by: string | null
          created_at: string
          created_by: string | null
          id: string
          location_id: string
          notes: string | null
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          counted_at?: string | null
          counted_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id: string
          notes?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          counted_at?: string | null
          counted_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          location_id: string
          notes: string | null
          provider_organization_id: number | null
          qty: number
          reason_code: string
          ref_id: string | null
          ref_type: string | null
          unit_cost: number | null
          unit_multiplier: number | null
          uom: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          location_id: string
          notes?: string | null
          provider_organization_id?: number | null
          qty: number
          reason_code: string
          ref_id?: string | null
          ref_type?: string | null
          unit_cost?: number | null
          unit_multiplier?: number | null
          uom?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          location_id?: string
          notes?: string | null
          provider_organization_id?: number | null
          qty?: number
          reason_code?: string
          ref_id?: string | null
          ref_type?: string | null
          unit_cost?: number | null
          unit_multiplier?: number | null
          uom?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "item_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_provider_org_fk"
            columns: ["provider_organization_id"]
            isOneToOne: false
            referencedRelation: "v_receipts_by_org"
            referencedColumns: ["provider_org_id"]
          },
          {
            foreignKeyName: "inventory_transactions_provider_org_fk"
            columns: ["provider_organization_id"]
            isOneToOne: false
            referencedRelation: "v_transactions_with_org"
            referencedColumns: ["provider_org_id"]
          },
        ]
      }
      item_batches: {
        Row: {
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          item_id: string
          lot_number: string | null
          notes: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          item_id: string
          lot_number?: string | null
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string
          lot_number?: string | null
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          active: boolean
          address: Json | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          address?: Json | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          address?: Json | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          batch_info: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          item_id: string
          location_id: string | null
          ordered_qty: number
          purchase_order_id: string
          received_qty: number
          unit_cost: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          batch_info?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id: string
          location_id?: string | null
          ordered_qty: number
          purchase_order_id: string
          received_qty?: number
          unit_cost?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          batch_info?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string
          location_id?: string | null
          ordered_qty?: number
          purchase_order_id?: string
          received_qty?: number
          unit_cost?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_type: string
          po_number: string | null
          status: string
          supplier_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_type?: string
          po_number?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_type?: string
          po_number?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_balances: {
        Row: {
          batch_id: string | null
          item_id: string | null
          location_id: string | null
          onhand_qty: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "item_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_expiring_soon: {
        Row: {
          category: string | null
          created_at: string | null
          days_until_expiry: number | null
          expiry_date: string | null
          id: string | null
          item_id: string | null
          item_name: string | null
          lot_number: string | null
          notes: string | null
          onhand_qty: number | null
        }
        Relationships: []
      }
      v_items_with_balances: {
        Row: {
          active: boolean | null
          category: string | null
          cost_per_unit: number | null
          created_at: string | null
          description: string | null
          id: string | null
          is_low_stock: boolean | null
          minimum_threshold: number | null
          name: string | null
          onhand_qty: number | null
          supplier: string | null
          unit_type: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_low_stock: {
        Row: {
          active: boolean | null
          category: string | null
          cost_per_unit: number | null
          created_at: string | null
          description: string | null
          id: string | null
          is_low_stock: boolean | null
          minimum_threshold: number | null
          name: string | null
          onhand_qty: number | null
          supplier: string | null
          unit_type: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_receipts_by_org: {
        Row: {
          provider_org_id: number | null
          provider_org_name: string | null
          receipt_date: string | null
          total_qty: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
      v_transactions_with_org: {
        Row: {
          batch_expiry_date: string | null
          batch_id: string | null
          batch_lot_number: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          item_category: string | null
          item_id: string | null
          item_name: string | null
          location_code: string | null
          location_id: string | null
          location_name: string | null
          notes: string | null
          provider_org_id: number | null
          provider_org_name: string | null
          provider_org_type: string | null
          provider_organization_id: number | null
          qty: number | null
          reason_code: string | null
          ref_id: string | null
          ref_type: string | null
          unit_cost: number | null
          unit_multiplier: number | null
          uom: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "item_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_provider_org_fk"
            columns: ["provider_organization_id"]
            isOneToOne: false
            referencedRelation: "v_receipts_by_org"
            referencedColumns: ["provider_org_id"]
          },
          {
            foreignKeyName: "inventory_transactions_provider_org_fk"
            columns: ["provider_organization_id"]
            isOneToOne: false
            referencedRelation: "v_transactions_with_org"
            referencedColumns: ["provider_org_id"]
          },
        ]
      }
    }
    Functions: {
      _parse_org_id_from_notes: { Args: { p_notes: string }; Returns: number }
      adjust_stock: {
        Args: {
          p_batch_id?: string
          p_item_id: string
          p_location_id: string
          p_notes?: string
          p_qty_delta: number
          p_reason: string
          p_unit_cost?: number
        }
        Returns: undefined
      }
      distribute_items: { Args: { p_payload: Json }; Returns: string }
      get_active_locations: {
        Args: never
        Returns: {
          active: boolean
          address: Json
          code: string
          created_at: string
          created_by: string
          id: string
          name: string
          type: string
        }[]
      }
      get_distribution_summary: {
        Args: {
          p_end_date?: string
          p_location_id?: string
          p_start_date?: string
        }
        Returns: {
          distribution_date: string
          location_name: string
          total_distributions: number
          total_items_distributed: number
          unique_items_count: number
        }[]
      }
      get_expiring_items: {
        Args: { days_ahead?: number }
        Returns: {
          batch_id: string
          category: string
          days_until_expiry: number
          expiry_date: string
          item_id: string
          item_name: string
          location_name: string
          lot_number: string
          onhand_qty: number
        }[]
      }
      get_field_app_items: {
        Args: { p_location_code?: string }
        Returns: {
          category: string
          current_stock: number
          description: string
          item_id: string
          location_code: string
          location_name: string
          minimum_threshold: number
          name: string
          unit_type: string
        }[]
      }
      get_item_balances: {
        Args: { p_item_id?: string; p_location_id?: string }
        Returns: {
          batch_id: string
          expiry_date: string
          item_id: string
          item_name: string
          location_id: string
          location_name: string
          lot_number: string
          onhand_qty: number
        }[]
      }
      get_items_with_balances: {
        Args: never
        Returns: {
          active: boolean
          category: string
          cost_per_unit: number
          created_at: string
          description: string
          id: string
          is_low_stock: boolean
          minimum_threshold: number
          name: string
          onhand_qty: number
          supplier: string
          unit_type: string
          updated_at: string
        }[]
      }
      get_pending_external_transactions: {
        Args: { p_system?: string }
        Returns: {
          created_at: string
          created_by: string | null
          error_message: string | null
          external_system: string
          external_transaction_id: string
          id: string
          processed_at: string | null
          sync_status: string
          transaction_data: Json
          updated_at: string | null
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "external_transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_suppliers: {
        Args: never
        Returns: {
          active: boolean
          address: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "suppliers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      process_bulk_field_handouts: {
        Args: { p_handouts: Json }
        Returns: {
          distribution_id: string
          error_message: string
          external_id: string
          success: boolean
        }[]
      }
      process_field_handout:
        | {
            Args: {
              p_client_identifier?: string
              p_external_id: string
              p_handout_timestamp?: string
              p_items: Json
              p_location_code: string
              p_notes?: string
              p_staff_member: string
            }
            Returns: string
          }
        | {
            Args: {
              p_client_identifier?: string
              p_external_id: string
              p_gps_accuracy?: number
              p_gps_latitude?: number
              p_gps_longitude?: number
              p_gps_timestamp?: string
              p_handout_timestamp?: string
              p_items: Json
              p_location_code: string
              p_notes?: string
              p_person_id?: number
              p_staff_member: string
            }
            Returns: string
          }
      receive_stock: {
        Args: {
          p_batch_id?: string
          p_expiry_date?: string
          p_item_id: string
          p_location_id: string
          p_lot_number?: string
          p_notes?: string
          p_qty: number
          p_unit_cost?: number
        }
        Returns: string
      }
      receive_stock_with_source: {
        Args: {
          p_batch_id?: string
          p_expiry_date?: string
          p_item_id: string
          p_location_id: string
          p_lot_number?: string
          p_notes?: string
          p_provider_org_id?: number
          p_qty: number
          p_source_type?: string
          p_unit_cost?: number
        }
        Returns: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          location_id: string
          notes: string | null
          provider_organization_id: number | null
          qty: number
          reason_code: string
          ref_id: string | null
          ref_type: string | null
          unit_cost: number | null
          unit_multiplier: number | null
          uom: string | null
          updated_at: string | null
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "inventory_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_field_transaction: {
        Args: {
          p_external_id?: string
          p_location_code: string
          p_outreach_transaction_id: string
        }
        Returns: string
      }
      transfer_stock: {
        Args: {
          p_batch_id?: string
          p_from_location_id: string
          p_item_id: string
          p_notes?: string
          p_qty: number
          p_to_location_id: string
        }
        Returns: undefined
      }
      update_transaction_source: {
        Args: {
          p_notes?: string
          p_provider_org_id: number
          p_source_type?: string
          p_transaction_id: string
        }
        Returns: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          location_id: string
          notes: string | null
          provider_organization_id: number | null
          qty: number
          reason_code: string
          ref_id: string | null
          ref_type: string | null
          unit_cost: number | null
          unit_multiplier: number | null
          uom: string | null
          updated_at: string | null
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "inventory_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  justice: {
    Tables: {
      condition_pack: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          scope: string
          updated_at: string | null
          updated_by: string | null
          version: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          scope?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          scope?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      condition_pack_item: {
        Row: {
          created_at: string
          created_by: string | null
          default_details: Json
          id: string
          label: string
          pack_id: string
          required: boolean
          sort_order: number
          type: Database["justice"]["Enums"]["condition_type_enum"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_details?: Json
          id?: string
          label: string
          pack_id: string
          required?: boolean
          sort_order?: number
          type: Database["justice"]["Enums"]["condition_type_enum"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_details?: Json
          id?: string
          label?: string
          pack_id?: string
          required?: boolean
          sort_order?: number
          type?: Database["justice"]["Enums"]["condition_type_enum"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "condition_pack_item_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "condition_pack"
            referencedColumns: ["id"]
          },
        ]
      }
      facility: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          phone: string | null
          region: string | null
          type: Database["justice"]["Enums"]["facility_type_enum"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          phone?: string | null
          region?: string | null
          type: Database["justice"]["Enums"]["facility_type_enum"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          phone?: string | null
          region?: string | null
          type?: Database["justice"]["Enums"]["facility_type_enum"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      je_charge: {
        Row: {
          amended_from_id: string | null
          code: string | null
          created_at: string
          created_by: string | null
          id: string
          je_id: string
          label: string | null
          severity: Database["justice"]["Enums"]["charge_severity_enum"]
          status: Database["justice"]["Enums"]["charge_status_enum"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amended_from_id?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          je_id: string
          label?: string | null
          severity?: Database["justice"]["Enums"]["charge_severity_enum"]
          status?: Database["justice"]["Enums"]["charge_status_enum"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amended_from_id?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          je_id?: string
          label?: string | null
          severity?: Database["justice"]["Enums"]["charge_severity_enum"]
          status?: Database["justice"]["Enums"]["charge_status_enum"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_charge_amended_from"
            columns: ["amended_from_id"]
            isOneToOne: false
            referencedRelation: "je_charge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "je_charge_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "justice_episode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "je_charge_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "v_je_status"
            referencedColumns: ["je_id"]
          },
        ]
      }
      je_condition: {
        Row: {
          created_at: string
          created_by: string | null
          details: Json
          end_dt: string | null
          id: string
          je_id: string
          source_event_id: string | null
          start_dt: string
          type: Database["justice"]["Enums"]["condition_type_enum"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          details?: Json
          end_dt?: string | null
          id?: string
          je_id: string
          source_event_id?: string | null
          start_dt?: string
          type: Database["justice"]["Enums"]["condition_type_enum"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          details?: Json
          end_dt?: string | null
          id?: string
          je_id?: string
          source_event_id?: string | null
          start_dt?: string
          type?: Database["justice"]["Enums"]["condition_type_enum"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "je_condition_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "justice_episode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "je_condition_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "v_je_status"
            referencedColumns: ["je_id"]
          },
          {
            foreignKeyName: "je_condition_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "je_event"
            referencedColumns: ["id"]
          },
        ]
      }
      je_contact: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          email: string | null
          ended_at: string | null
          id: string
          je_id: string | null
          name: string
          notes: string | null
          org: string | null
          person_id: number
          phone: string | null
          role: Database["justice"]["Enums"]["contact_role_enum"]
          started_at: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email?: string | null
          ended_at?: string | null
          id?: string
          je_id?: string | null
          name: string
          notes?: string | null
          org?: string | null
          person_id: number
          phone?: string | null
          role: Database["justice"]["Enums"]["contact_role_enum"]
          started_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email?: string | null
          ended_at?: string | null
          id?: string
          je_id?: string | null
          name?: string
          notes?: string | null
          org?: string | null
          person_id?: number
          phone?: string | null
          role?: Database["justice"]["Enums"]["contact_role_enum"]
          started_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "je_contact_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "justice_episode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "je_contact_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "v_je_status"
            referencedColumns: ["je_id"]
          },
        ]
      }
      je_custody_episode: {
        Row: {
          created_at: string
          created_by: string | null
          end_dt: string | null
          facility_id: string
          id: string
          je_id: string
          reason: Database["justice"]["Enums"]["custody_reason_enum"]
          start_dt: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_dt?: string | null
          facility_id: string
          id?: string
          je_id: string
          reason?: Database["justice"]["Enums"]["custody_reason_enum"]
          start_dt: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_dt?: string | null
          facility_id?: string
          id?: string
          je_id?: string
          reason?: Database["justice"]["Enums"]["custody_reason_enum"]
          start_dt?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "je_custody_episode_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "je_custody_episode_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "justice_episode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "je_custody_episode_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "v_je_status"
            referencedColumns: ["je_id"]
          },
        ]
      }
      je_event: {
        Row: {
          created_at: string
          created_by: string | null
          entered_by: string | null
          event_dt: string
          event_type: Database["justice"]["Enums"]["event_type_enum"]
          id: string
          je_id: string
          payload: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entered_by?: string | null
          event_dt?: string
          event_type: Database["justice"]["Enums"]["event_type_enum"]
          id?: string
          je_id: string
          payload?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entered_by?: string | null
          event_dt?: string
          event_type?: Database["justice"]["Enums"]["event_type_enum"]
          id?: string
          je_id?: string
          payload?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "je_event_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "justice_episode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "je_event_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "v_je_status"
            referencedColumns: ["je_id"]
          },
        ]
      }
      je_warrant: {
        Row: {
          created_at: string
          created_by: string | null
          executed_dt: string | null
          id: string
          issued_dt: string
          je_id: string
          notes: string | null
          status: Database["justice"]["Enums"]["warrant_status_enum"]
          type: Database["justice"]["Enums"]["warrant_type_enum"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          executed_dt?: string | null
          id?: string
          issued_dt: string
          je_id: string
          notes?: string | null
          status?: Database["justice"]["Enums"]["warrant_status_enum"]
          type: Database["justice"]["Enums"]["warrant_type_enum"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          executed_dt?: string | null
          id?: string
          issued_dt?: string
          je_id?: string
          notes?: string | null
          status?: Database["justice"]["Enums"]["warrant_status_enum"]
          type?: Database["justice"]["Enums"]["warrant_type_enum"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "je_warrant_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "justice_episode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "je_warrant_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "v_je_status"
            referencedColumns: ["je_id"]
          },
        ]
      }
      justice_episode: {
        Row: {
          created_at: string
          created_by: string | null
          current_state: Database["justice"]["Enums"]["episode_state_enum"]
          id: string
          jurisdiction: string | null
          origin: Database["justice"]["Enums"]["origin_enum"]
          origin_agency: string | null
          origin_dt: string
          person_id: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_state?: Database["justice"]["Enums"]["episode_state_enum"]
          id?: string
          jurisdiction?: string | null
          origin: Database["justice"]["Enums"]["origin_enum"]
          origin_agency?: string | null
          origin_dt: string
          person_id: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_state?: Database["justice"]["Enums"]["episode_state_enum"]
          id?: string
          jurisdiction?: string | null
          origin?: Database["justice"]["Enums"]["origin_enum"]
          origin_agency?: string | null
          origin_dt?: string
          person_id?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_je_active_conditions: {
        Row: {
          active_conditions_summary: string | null
          je_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "je_condition_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "justice_episode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "je_condition_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "v_je_status"
            referencedColumns: ["je_id"]
          },
        ]
      }
      v_je_current_custody: {
        Row: {
          custody_id: string | null
          end_dt: string | null
          facility_name: string | null
          facility_type:
            | Database["justice"]["Enums"]["facility_type_enum"]
            | null
          je_id: string | null
          start_dt: string | null
        }
        Relationships: [
          {
            foreignKeyName: "je_custody_episode_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "justice_episode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "je_custody_episode_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "v_je_status"
            referencedColumns: ["je_id"]
          },
        ]
      }
      v_je_next_court: {
        Row: {
          je_id: string | null
          next_court_dt: string | null
        }
        Relationships: [
          {
            foreignKeyName: "je_event_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "justice_episode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "je_event_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "v_je_status"
            referencedColumns: ["je_id"]
          },
        ]
      }
      v_je_status: {
        Row: {
          active_conditions_summary: string | null
          current_facility: string | null
          current_facility_type:
            | Database["justice"]["Enums"]["facility_type_enum"]
            | null
          current_state:
            | Database["justice"]["Enums"]["episode_state_enum"]
            | null
          has_warrant: boolean | null
          je_id: string | null
          next_court_dt: string | null
          origin_dt: string | null
          person_id: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_user_permission: {
        Args: { required_roles: string[] }
        Returns: boolean
      }
      fn_apply_condition_pack: {
        Args: {
          p_end_dt?: string
          p_je_id: string
          p_overrides?: Json
          p_pack_id: string
          p_replace_existing?: boolean
          p_source_event_id: string
          p_start_dt?: string
        }
        Returns: number
      }
      fn_recompute_episode_state: {
        Args: { p_je_id: string }
        Returns: undefined
      }
      fn_validate_condition_overrides: {
        Args: { p_overrides: Json }
        Returns: undefined
      }
      get_episode_status: {
        Args: { episode_id_param: string }
        Returns: {
          active_conditions_summary: string
          current_facility: string
          current_facility_type: Database["justice"]["Enums"]["facility_type_enum"]
          current_state: Database["justice"]["Enums"]["episode_state_enum"]
          has_warrant: boolean
          je_id: string
          next_court_dt: string
          origin_dt: string
          person_id: number
        }[]
      }
      get_person_episodes: {
        Args: { person_id_param: number }
        Returns: {
          active_conditions_summary: string
          current_facility: string
          current_facility_type: Database["justice"]["Enums"]["facility_type_enum"]
          current_state: Database["justice"]["Enums"]["episode_state_enum"]
          has_warrant: boolean
          je_id: string
          next_court_dt: string
          origin_dt: string
          person_id: number
        }[]
      }
    }
    Enums: {
      charge_severity_enum: "IND" | "SUMM" | "HYBRID" | "OTHER"
      charge_status_enum:
        | "PENDING"
        | "WITHDRAWN"
        | "STAYED"
        | "GUILTY"
        | "ACQUITTED"
        | "PEACEBOND"
        | "DISCHARGED_ABSOLUTE"
        | "DISCHARGED_CONDITIONAL"
      condition_type_enum:
        | "CURFEW"
        | "NO_CONTACT"
        | "NO_GO"
        | "ABSTAIN"
        | "REPORT"
        | "WEAPONS"
        | "ADDRESS_KEEP"
        | "OTHER"
      contact_role_enum:
        | "LAWYER"
        | "DUTY_COUNSEL"
        | "PROBATION"
        | "PAROLE"
        | "LEGAL_AID"
        | "SURETY"
        | "OTHER"
      custody_reason_enum: "REMAND" | "SENTENCE" | "OTHER"
      episode_state_enum:
        | "UNKNOWN"
        | "PRE_CHARGE"
        | "ARRESTED_POLICE_CELLS"
        | "HELD_FOR_BAIL"
        | "ON_REMAND_POLICE_CELLS"
        | "ON_REMAND_DETENTION_CENTRE"
        | "RELEASED_PENDING"
        | "COURT_ACTIVE"
        | "SENTENCED_CUSTODIAL"
        | "SENTENCED_COMMUNITY"
        | "COMPLETED"
        | "WARRANT_OUTSTANDING"
        | "BREACH_PROCEEDING"
      event_type_enum:
        | "ARRESTED"
        | "NOTICE_ISSUED"
        | "HELD_FOR_BAIL"
        | "TRANSFER_TO_FACILITY"
        | "BAIL_HEARING"
        | "RELEASE_ORDER"
        | "CONDITIONS_SET"
        | "COURT_APPEARANCE"
        | "WARRANT_ISSUED"
        | "WARRANT_EXECUTED"
        | "DISPOSITION_UPDATE"
        | "SENTENCE"
        | "PROBATION_ORDER"
        | "BREACH"
        | "NOTE"
      facility_type_enum:
        | "POLICE_CELLS"
        | "DETENTION_CENTRE"
        | "JAIL"
        | "PRISON"
        | "OTHER"
      origin_enum: "ARREST" | "SUMMONS" | "OTHER"
      warrant_status_enum: "OUTSTANDING" | "EXECUTED" | "CANCELLED"
      warrant_type_enum: "BENCH" | "ARREST" | "OTHER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  portal: {
    Tables: {
      appointments: {
        Row: {
          canceled_at: string | null
          cancellation_reason: string | null
          client_profile_id: string
          confirmed_at: string | null
          confirmed_by_profile_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          location: string | null
          location_type: Database["portal"]["Enums"]["appointment_channel"]
          meeting_url: string | null
          occurs_at: string | null
          organization_id: number | null
          outcome_notes: string | null
          requested_window: string | null
          requester_profile_id: string
          reschedule_note: string | null
          staff_profile_id: string | null
          status: Database["portal"]["Enums"]["appointment_status"]
          title: string
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          cancellation_reason?: string | null
          client_profile_id: string
          confirmed_at?: string | null
          confirmed_by_profile_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          location?: string | null
          location_type?: Database["portal"]["Enums"]["appointment_channel"]
          meeting_url?: string | null
          occurs_at?: string | null
          organization_id?: number | null
          outcome_notes?: string | null
          requested_window?: string | null
          requester_profile_id: string
          reschedule_note?: string | null
          staff_profile_id?: string | null
          status?: Database["portal"]["Enums"]["appointment_status"]
          title: string
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          cancellation_reason?: string | null
          client_profile_id?: string
          confirmed_at?: string | null
          confirmed_by_profile_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          location?: string | null
          location_type?: Database["portal"]["Enums"]["appointment_channel"]
          meeting_url?: string | null
          occurs_at?: string | null
          organization_id?: number | null
          outcome_notes?: string | null
          requested_window?: string | null
          requester_profile_id?: string
          reschedule_note?: string | null
          staff_profile_id?: string | null
          status?: Database["portal"]["Enums"]["appointment_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_confirmed_by_profile_id_fkey"
            columns: ["confirmed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_profile_id: string | null
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flags: {
        Row: {
          created_at: string
          details: string | null
          entity_id: string
          entity_type: Database["portal"]["Enums"]["flag_entity_type"]
          id: string
          reason: Database["portal"]["Enums"]["flag_reason"]
          reporter_profile_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by_profile_id: string | null
          status: Database["portal"]["Enums"]["flag_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          entity_id: string
          entity_type: Database["portal"]["Enums"]["flag_entity_type"]
          id?: string
          reason: Database["portal"]["Enums"]["flag_reason"]
          reporter_profile_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by_profile_id?: string | null
          status?: Database["portal"]["Enums"]["flag_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          entity_id?: string
          entity_type?: Database["portal"]["Enums"]["flag_entity_type"]
          id?: string
          reason?: Database["portal"]["Enums"]["flag_reason"]
          reporter_profile_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by_profile_id?: string | null
          status?: Database["portal"]["Enums"]["flag_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flags_reporter_profile_id_fkey"
            columns: ["reporter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_resolved_by_profile_id_fkey"
            columns: ["resolved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_catalog: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      metric_daily: {
        Row: {
          created_at: string
          metric_date: string
          metric_id: string
          notes: string | null
          source: string | null
          updated_at: string
          value: number | null
          value_status: Database["portal"]["Enums"]["metric_value_status"]
        }
        Insert: {
          created_at?: string
          metric_date: string
          metric_id: string
          notes?: string | null
          source?: string | null
          updated_at?: string
          value?: number | null
          value_status?: Database["portal"]["Enums"]["metric_value_status"]
        }
        Update: {
          created_at?: string
          metric_date?: string
          metric_id?: string
          notes?: string | null
          source?: string | null
          updated_at?: string
          value?: number | null
          value_status?: Database["portal"]["Enums"]["metric_value_status"]
        }
        Relationships: [
          {
            foreignKeyName: "metric_daily_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metric_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_relays: {
        Row: {
          api_key: string | null
          api_url: string | null
          channel: Database["portal"]["Enums"]["notification_channel"]
          created_at: string
          created_by_profile_id: string | null
          from_email: string | null
          from_phone: string | null
          id: string
          is_active: boolean
          provider: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          channel: Database["portal"]["Enums"]["notification_channel"]
          created_at?: string
          created_by_profile_id?: string | null
          from_email?: string | null
          from_phone?: string | null
          id?: string
          is_active?: boolean
          provider: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          channel?: Database["portal"]["Enums"]["notification_channel"]
          created_at?: string
          created_by_profile_id?: string | null
          from_email?: string | null
          from_phone?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_relays_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          acknowledged_at: string | null
          body_html: string | null
          body_text: string
          channels: string[]
          created_at: string
          id: string
          notification_type: string
          payload: Json
          profile_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          acknowledged_at?: string | null
          body_html?: string | null
          body_text: string
          channels?: string[]
          created_at?: string
          id?: string
          notification_type: string
          payload?: Json
          profile_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          acknowledged_at?: string | null
          body_html?: string | null
          body_text?: string
          channels?: string[]
          created_at?: string
          id?: string
          notification_type?: string
          payload?: Json
          profile_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      petition_signatures: {
        Row: {
          created_at: string
          display_preference: Database["portal"]["Enums"]["petition_display_preference"]
          email_contact_id: string | null
          first_name: string
          id: string
          last_name: string
          petition_id: string
          phone_contact_id: string | null
          postal_code: string
          profile_id: string
          share_with_partners: boolean
          statement: string | null
          user_id: string | null
          withdrawn_at: string | null
        }
        Insert: {
          created_at?: string
          display_preference: Database["portal"]["Enums"]["petition_display_preference"]
          email_contact_id?: string | null
          first_name: string
          id?: string
          last_name: string
          petition_id: string
          phone_contact_id?: string | null
          postal_code: string
          profile_id: string
          share_with_partners?: boolean
          statement?: string | null
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          created_at?: string
          display_preference?: Database["portal"]["Enums"]["petition_display_preference"]
          email_contact_id?: string | null
          first_name?: string
          id?: string
          last_name?: string
          petition_id?: string
          phone_contact_id?: string | null
          postal_code?: string
          profile_id?: string
          share_with_partners?: boolean
          statement?: string | null
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petition_signatures_email_contact_id_fkey"
            columns: ["email_contact_id"]
            isOneToOne: false
            referencedRelation: "profile_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petition_signatures_petition_id_fkey"
            columns: ["petition_id"]
            isOneToOne: false
            referencedRelation: "petition_public_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petition_signatures_petition_id_fkey"
            columns: ["petition_id"]
            isOneToOne: false
            referencedRelation: "petitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petition_signatures_phone_contact_id_fkey"
            columns: ["phone_contact_id"]
            isOneToOne: false
            referencedRelation: "profile_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petition_signatures_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      petitions: {
        Row: {
          created_at: string
          cta_label: string
          description: string | null
          hero_statement: string | null
          id: string
          is_active: boolean
          lede: string
          pledge_statement: string
          slug: string
          target_signatures: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string
          description?: string | null
          hero_statement?: string | null
          id?: string
          is_active?: boolean
          lede: string
          pledge_statement: string
          slug: string
          target_signatures?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string
          description?: string | null
          hero_statement?: string | null
          id?: string
          is_active?: boolean
          lede?: string
          pledge_statement?: string
          slug?: string
          target_signatures?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          body_html: string
          category: Database["portal"]["Enums"]["policy_category"]
          created_at: string
          created_by_profile_id: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          internal_ref: string | null
          is_published: boolean | null
          last_reviewed_at: string
          short_summary: string
          slug: string
          sort_order: number
          status: Database["portal"]["Enums"]["policy_status"]
          title: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          body_html?: string
          category?: Database["portal"]["Enums"]["policy_category"]
          created_at?: string
          created_by_profile_id?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          internal_ref?: string | null
          is_published?: boolean | null
          last_reviewed_at?: string
          short_summary: string
          slug: string
          sort_order?: number
          status?: Database["portal"]["Enums"]["policy_status"]
          title: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          body_html?: string
          category?: Database["portal"]["Enums"]["policy_category"]
          created_at?: string
          created_by_profile_id?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          internal_ref?: string | null
          is_published?: boolean | null
          last_reviewed_at?: string
          short_summary?: string
          slug?: string
          sort_order?: number
          status?: Database["portal"]["Enums"]["policy_status"]
          title?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_contacts: {
        Row: {
          contact_type: Database["portal"]["Enums"]["contact_method"]
          contact_value: string
          created_at: string
          id: string
          normalized_value: string
          profile_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact_type: Database["portal"]["Enums"]["contact_method"]
          contact_value: string
          created_at?: string
          id?: string
          normalized_value: string
          profile_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_type?: Database["portal"]["Enums"]["contact_method"]
          contact_value?: string
          created_at?: string
          id?: string
          normalized_value?: string
          profile_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_invites: {
        Row: {
          affiliation_type: Database["portal"]["Enums"]["affiliation_type"]
          created_at: string
          display_name: string | null
          email: string
          id: string
          invited_by_profile_id: string | null
          invited_by_user_id: string | null
          message: string | null
          organization_id: number | null
          position_title: string | null
          profile_id: string | null
          responded_at: string | null
          status: Database["portal"]["Enums"]["invite_status"]
          token: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          affiliation_type: Database["portal"]["Enums"]["affiliation_type"]
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          invited_by_profile_id?: string | null
          invited_by_user_id?: string | null
          message?: string | null
          organization_id?: number | null
          position_title?: string | null
          profile_id?: string | null
          responded_at?: string | null
          status?: Database["portal"]["Enums"]["invite_status"]
          token?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          affiliation_type?: Database["portal"]["Enums"]["affiliation_type"]
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          invited_by_profile_id?: string | null
          invited_by_user_id?: string | null
          message?: string | null
          organization_id?: number | null
          position_title?: string | null
          profile_id?: string | null
          responded_at?: string | null
          status?: Database["portal"]["Enums"]["invite_status"]
          token?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_invites_invited_by_profile_id_fkey"
            columns: ["invited_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_invites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          affiliation_requested_at: string | null
          affiliation_reviewed_at: string | null
          affiliation_reviewed_by: string | null
          affiliation_status: Database["portal"]["Enums"]["affiliation_status"]
          affiliation_type: Database["portal"]["Enums"]["affiliation_type"]
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          display_name_confirmed_at: string | null
          government_role_type:
            | Database["portal"]["Enums"]["government_role_type"]
            | null
          has_signed_petition: boolean
          homelessness_experience: Database["portal"]["Enums"]["lived_experience_status"]
          id: string
          last_seen_at: string | null
          organization_id: number | null
          petition_signed_at: string | null
          position_title: string | null
          requested_government_level:
            | Database["portal"]["Enums"]["government_level"]
            | null
          requested_government_name: string | null
          requested_government_role:
            | Database["portal"]["Enums"]["government_role_type"]
            | null
          requested_organization_name: string | null
          rules_acknowledged_at: string | null
          substance_use_experience: Database["portal"]["Enums"]["lived_experience_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          affiliation_requested_at?: string | null
          affiliation_reviewed_at?: string | null
          affiliation_reviewed_by?: string | null
          affiliation_status?: Database["portal"]["Enums"]["affiliation_status"]
          affiliation_type?: Database["portal"]["Enums"]["affiliation_type"]
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          display_name_confirmed_at?: string | null
          government_role_type?:
            | Database["portal"]["Enums"]["government_role_type"]
            | null
          has_signed_petition?: boolean
          homelessness_experience?: Database["portal"]["Enums"]["lived_experience_status"]
          id?: string
          last_seen_at?: string | null
          organization_id?: number | null
          petition_signed_at?: string | null
          position_title?: string | null
          requested_government_level?:
            | Database["portal"]["Enums"]["government_level"]
            | null
          requested_government_name?: string | null
          requested_government_role?:
            | Database["portal"]["Enums"]["government_role_type"]
            | null
          requested_organization_name?: string | null
          rules_acknowledged_at?: string | null
          substance_use_experience?: Database["portal"]["Enums"]["lived_experience_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          affiliation_requested_at?: string | null
          affiliation_reviewed_at?: string | null
          affiliation_reviewed_by?: string | null
          affiliation_status?: Database["portal"]["Enums"]["affiliation_status"]
          affiliation_type?: Database["portal"]["Enums"]["affiliation_type"]
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          display_name_confirmed_at?: string | null
          government_role_type?:
            | Database["portal"]["Enums"]["government_role_type"]
            | null
          has_signed_petition?: boolean
          homelessness_experience?: Database["portal"]["Enums"]["lived_experience_status"]
          id?: string
          last_seen_at?: string | null
          organization_id?: number | null
          petition_signed_at?: string | null
          position_title?: string | null
          requested_government_level?:
            | Database["portal"]["Enums"]["government_level"]
            | null
          requested_government_name?: string | null
          requested_government_role?:
            | Database["portal"]["Enums"]["government_role_type"]
            | null
          requested_organization_name?: string | null
          rules_acknowledged_at?: string | null
          substance_use_experience?: Database["portal"]["Enums"]["lived_experience_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_affiliation_reviewed_by_fkey"
            columns: ["affiliation_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_settings: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          description: string | null
          id: string
          is_public: boolean
          setting_key: string
          setting_type: string
          setting_value: string | null
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          setting_key: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          setting_key?: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_settings_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_settings_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_flows: {
        Row: {
          chosen_name: string
          claimed_at: string | null
          consent_contact: boolean | null
          consent_data_sharing: boolean | null
          consent_terms: boolean | null
          contact_email: string | null
          contact_phone: string | null
          contact_phone_safe_call: boolean | null
          contact_phone_safe_text: boolean | null
          contact_phone_safe_voicemail: boolean | null
          contact_window: string | null
          created_at: string
          created_by_user_id: string | null
          date_of_birth_month: number | null
          date_of_birth_year: number | null
          disability: string | null
          flow_type: string
          gender_identity: string | null
          id: string
          indigenous_identity: string | null
          legal_name: string | null
          metadata: Json
          portal_code: string | null
          postal_code: string | null
          profile_id: string | null
          pronouns: string | null
          status: string
          supabase_user_id: string | null
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          chosen_name: string
          claimed_at?: string | null
          consent_contact?: boolean | null
          consent_data_sharing?: boolean | null
          consent_terms?: boolean | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_phone_safe_call?: boolean | null
          contact_phone_safe_text?: boolean | null
          contact_phone_safe_voicemail?: boolean | null
          contact_window?: string | null
          created_at?: string
          created_by_user_id?: string | null
          date_of_birth_month?: number | null
          date_of_birth_year?: number | null
          disability?: string | null
          flow_type: string
          gender_identity?: string | null
          id?: string
          indigenous_identity?: string | null
          legal_name?: string | null
          metadata?: Json
          portal_code?: string | null
          postal_code?: string | null
          profile_id?: string | null
          pronouns?: string | null
          status?: string
          supabase_user_id?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          chosen_name?: string
          claimed_at?: string | null
          consent_contact?: boolean | null
          consent_data_sharing?: boolean | null
          consent_terms?: boolean | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_phone_safe_call?: boolean | null
          contact_phone_safe_text?: boolean | null
          contact_phone_safe_voicemail?: boolean | null
          contact_window?: string | null
          created_at?: string
          created_by_user_id?: string | null
          date_of_birth_month?: number | null
          date_of_birth_year?: number | null
          disability?: string | null
          flow_type?: string
          gender_identity?: string | null
          id?: string
          indigenous_identity?: string | null
          legal_name?: string | null
          metadata?: Json
          portal_code?: string | null
          postal_code?: string | null
          profile_id?: string | null
          pronouns?: string | null
          status?: string
          supabase_user_id?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_flows_profile_fk"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_pages: {
        Row: {
          attachments: Json
          body_html: string
          cover_image: string | null
          created_at: string
          created_by_profile_id: string | null
          date_published: string
          embed: Json | null
          embed_placement: Database["portal"]["Enums"]["resource_embed_placement"]
          id: string
          is_published: boolean
          kind: Database["portal"]["Enums"]["resource_kind"]
          location: string | null
          slug: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          attachments?: Json
          body_html?: string
          cover_image?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          date_published: string
          embed?: Json | null
          embed_placement?: Database["portal"]["Enums"]["resource_embed_placement"]
          id?: string
          is_published?: boolean
          kind?: Database["portal"]["Enums"]["resource_kind"]
          location?: string | null
          slug: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          attachments?: Json
          body_html?: string
          cover_image?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          date_published?: string
          embed?: Json | null
          embed_placement?: Database["portal"]["Enums"]["resource_embed_placement"]
          id?: string
          is_published?: boolean
          kind?: Database["portal"]["Enums"]["resource_kind"]
          location?: string | null
          slug?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_pages_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_pages_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_activities: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_important: boolean | null
          is_private: boolean | null
          metadata: Json | null
          title: string
          volunteer_profile_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          is_important?: boolean | null
          is_private?: boolean | null
          metadata?: Json | null
          title: string
          volunteer_profile_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_important?: boolean | null
          is_private?: boolean | null
          metadata?: Json | null
          title?: string
          volunteer_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_activities_volunteer_profile_id_fkey"
            columns: ["volunteer_profile_id"]
            isOneToOne: false
            referencedRelation: "volunteer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_profiles: {
        Row: {
          active: boolean
          address_line1: string | null
          address_line2: string | null
          availability_notes: string | null
          background_check_completed: boolean | null
          background_check_date: string | null
          background_check_expiry: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          current_status_id: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          id: string
          interests: string[] | null
          last_name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          profile_id: string | null
          skills: string[] | null
          state_province: string | null
          training_completed: boolean | null
          training_completion_date: string | null
          updated_at: string
          updated_by: string | null
          volunteer_code: string
        }
        Insert: {
          active?: boolean
          address_line1?: string | null
          address_line2?: string | null
          availability_notes?: string | null
          background_check_completed?: boolean | null
          background_check_date?: string | null
          background_check_expiry?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_status_id?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          id?: string
          interests?: string[] | null
          last_name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          profile_id?: string | null
          skills?: string[] | null
          state_province?: string | null
          training_completed?: boolean | null
          training_completion_date?: string | null
          updated_at?: string
          updated_by?: string | null
          volunteer_code: string
        }
        Update: {
          active?: boolean
          address_line1?: string | null
          address_line2?: string | null
          availability_notes?: string | null
          background_check_completed?: boolean | null
          background_check_date?: string | null
          background_check_expiry?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_status_id?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          id?: string
          interests?: string[] | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          profile_id?: string | null
          skills?: string[] | null
          state_province?: string | null
          training_completed?: boolean | null
          training_completion_date?: string | null
          updated_at?: string
          updated_by?: string | null
          volunteer_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_profiles_current_status_id_fkey"
            columns: ["current_status_id"]
            isOneToOne: false
            referencedRelation: "volunteer_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_role_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_current: boolean
          notes: string | null
          reason: string | null
          role_id: string
          volunteer_profile_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_current?: boolean
          notes?: string | null
          reason?: string | null
          role_id: string
          volunteer_profile_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_current?: boolean
          notes?: string | null
          reason?: string | null
          role_id?: string
          volunteer_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "volunteer_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_role_assignments_volunteer_profile_id_fkey"
            columns: ["volunteer_profile_id"]
            isOneToOne: false
            referencedRelation: "volunteer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_roles: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_name: string
          id: string
          name: string
          requires_training: boolean
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          name: string
          requires_training?: boolean
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          name?: string
          requires_training?: boolean
        }
        Relationships: []
      }
      volunteer_status_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          is_current: boolean
          notes: string | null
          reason: string | null
          status_id: string
          volunteer_profile_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          notes?: string | null
          reason?: string | null
          status_id: string
          volunteer_profile_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          notes?: string | null
          reason?: string | null
          status_id?: string
          volunteer_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_status_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_status_assignments_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "volunteer_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_status_assignments_volunteer_profile_id_fkey"
            columns: ["volunteer_profile_id"]
            isOneToOne: false
            referencedRelation: "volunteer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_statuses: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_name: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      volunteer_verify_tokens: {
        Row: {
          created_at: string
          expires_at: string
          jti: string
          used: boolean
          volunteer_profile_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          jti: string
          used?: boolean
          volunteer_profile_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          jti?: string
          used?: boolean
          volunteer_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_verify_tokens_volunteer_profile_id_fkey"
            columns: ["volunteer_profile_id"]
            isOneToOne: false
            referencedRelation: "volunteer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      donation_catalog_public: {
        Row: {
          category: string | null
          currency: string | null
          current_stock: number | null
          default_quantity: number | null
          distributed_last_30_days: number | null
          distributed_last_365_days: number | null
          id: string | null
          image_url: string | null
          long_description: string | null
          priority: number | null
          short_description: string | null
          slug: string | null
          target_buffer: number | null
          title: string | null
          unit_cost_cents: number | null
        }
        Relationships: []
      }
      petition_public_signers: {
        Row: {
          created_at: string | null
          display_name: string | null
          display_preference:
            | Database["portal"]["Enums"]["petition_display_preference"]
            | null
          petition_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: never
          display_preference?:
            | Database["portal"]["Enums"]["petition_display_preference"]
            | null
          petition_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: never
          display_preference?:
            | Database["portal"]["Enums"]["petition_display_preference"]
            | null
          petition_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petition_signatures_petition_id_fkey"
            columns: ["petition_id"]
            isOneToOne: false
            referencedRelation: "petition_public_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petition_signatures_petition_id_fkey"
            columns: ["petition_id"]
            isOneToOne: false
            referencedRelation: "petitions"
            referencedColumns: ["id"]
          },
        ]
      }
      petition_public_summary: {
        Row: {
          created_at: string | null
          cta_label: string | null
          description: string | null
          first_signed_at: string | null
          hero_statement: string | null
          id: string | null
          is_active: boolean | null
          last_signed_at: string | null
          lede: string | null
          pledge_statement: string | null
          signature_count: number | null
          slug: string | null
          target_signatures: number | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      petition_signature_totals: {
        Row: {
          first_signed_at: string | null
          last_signed_at: string | null
          petition_id: string | null
          signature_count: number | null
        }
        Relationships: []
      }
      pit_public_breakdowns: {
        Row: {
          bucket: string | null
          bucket_label: string | null
          bucket_sort: number | null
          dimension: string | null
          dimension_label: string | null
          dimension_sort: number | null
          last_observation_at: string | null
          percentage: number | null
          pit_count_id: string | null
          suppressed: boolean | null
          suppressed_reason: string | null
          total: number | null
          total_encounters: number | null
        }
        Relationships: []
      }
      pit_public_summary: {
        Row: {
          addiction_positive_count: number | null
          description: string | null
          homelessness_confirmed_count: number | null
          id: string | null
          is_active: boolean | null
          last_observation_at: string | null
          mental_health_positive_count: number | null
          methodology: string | null
          municipality: string | null
          observed_end: string | null
          observed_start: string | null
          slug: string | null
          status: Database["core"]["Enums"]["pit_count_status"] | null
          title: string | null
          total_encounters: number | null
          updated_at: string | null
          wants_treatment_no_count: number | null
          wants_treatment_not_applicable_count: number | null
          wants_treatment_not_suitable_count: number | null
          wants_treatment_yes_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      actor_is_approved: { Args: never; Returns: boolean }
      actor_org_id: { Args: never; Returns: number }
      add_guest_petition_signature: {
        Args: {
          p_display_preference?: Database["portal"]["Enums"]["petition_display_preference"]
          p_email: string
          p_first_name: string
          p_last_name: string
          p_petition_id: string
          p_postal_code: string
          p_share_with_partners?: boolean
          p_statement?: string
        }
        Returns: {
          profile_id: string
          signature_id: string
        }[]
      }
      claim_registration_flow: {
        Args: {
          p_chosen_name?: string
          p_contact_email?: string
          p_contact_phone?: string
          p_date_of_birth_month?: number
          p_date_of_birth_year?: number
          p_portal_code?: string
        }
        Returns: {
          portal_code: string
          reason: string
          registration_id: string
          success: boolean
        }[]
      }
      current_organization_id: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      normalize_phone: { Args: { value: string }; Returns: string }
      now_toronto: { Args: never; Returns: string }
      petition_signature_totals_public: {
        Args: never
        Returns: {
          first_signed_at: string
          last_signed_at: string
          petition_id: string
          signature_count: number
        }[]
      }
      refresh_profile_claims: { Args: { p_profile_id: string }; Returns: Json }
      same_org: { Args: { p_profile_id: string }; Returns: boolean }
      set_profile_role: {
        Args: { p_enable?: boolean; p_profile_id: string; p_role_name: string }
        Returns: undefined
      }
    }
    Enums: {
      affiliation_status: "approved" | "pending" | "revoked"
      affiliation_type:
        | "community_member"
        | "agency_partner"
        | "government_partner"
      appointment_channel: "in_person" | "phone" | "video" | "field" | "other"
      appointment_status:
        | "requested"
        | "pending_confirmation"
        | "scheduled"
        | "reschedule_requested"
        | "cancelled_by_client"
        | "cancelled_by_staff"
        | "completed"
        | "no_show"
      comment_type: "question" | "suggestion" | "response" | "official_note"
      contact_method: "email" | "phone"
      flag_entity_type: "idea" | "comment"
      flag_reason: "privacy" | "abuse" | "hate" | "spam" | "wrong_cat" | "other"
      flag_status: "open" | "reviewing" | "resolved" | "rejected"
      government_level:
        | "municipal"
        | "county"
        | "provincial"
        | "federal"
        | "other"
      government_role_type: "staff" | "politician"
      idea_category:
        | "Housing"
        | "Health"
        | "Policing"
        | "Community"
        | "Prevention"
        | "Other"
      idea_publication_status: "draft" | "published" | "archived"
      idea_status:
        | "new"
        | "under_review"
        | "in_progress"
        | "adopted"
        | "not_feasible"
        | "archived"
      invite_status: "pending" | "accepted" | "cancelled" | "expired"
      lived_experience_status:
        | "none"
        | "current"
        | "former"
        | "prefer_not_to_share"
      metric_value_status: "reported" | "pending"
      notification_channel: "email" | "sms"
      organization_category: "community" | "government"
      petition_display_preference:
        | "full_name"
        | "first_name_last_initial"
        | "anonymous"
      plan_update_status:
        | "draft"
        | "open"
        | "accepted"
        | "not_moving_forward"
        | "added_to_plan"
      policy_category:
        | "client_rights"
        | "safety"
        | "staff"
        | "governance"
        | "operations"
        | "finance"
      policy_status: "draft" | "published" | "archived"
      reaction_type:
        | "like"
        | "love"
        | "hooray"
        | "rocket"
        | "eyes"
        | "laugh"
        | "confused"
        | "sad"
        | "angry"
        | "minus_one"
      resource_embed_placement: "above" | "below"
      resource_kind:
        | "delegation"
        | "report"
        | "presentation"
        | "policy"
        | "press"
        | "dataset"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_settings: {
        Row: {
          agent_name: string
          created_at: string
          instructions: string | null
          metadata: Json | null
          model: string | null
          tools_enabled: Json | null
          updated_at: string
          voice: string | null
        }
        Insert: {
          agent_name: string
          created_at?: string
          instructions?: string | null
          metadata?: Json | null
          model?: string | null
          tools_enabled?: Json | null
          updated_at?: string
          voice?: string | null
        }
        Update: {
          agent_name?: string
          created_at?: string
          instructions?: string | null
          metadata?: Json | null
          model?: string | null
          tools_enabled?: Json | null
          updated_at?: string
          voice?: string | null
        }
        Relationships: []
      }
      domain_knowledge: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback_submissions: {
        Row: {
          created_at: string | null
          description: string
          email: string | null
          error_message: string | null
          feedback_type: string
          github_issue_number: number | null
          github_issue_url: string | null
          id: string
          status: string | null
          submitted_at: string | null
          title: string
          updated_at: string | null
          url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          email?: string | null
          error_message?: string | null
          feedback_type: string
          github_issue_number?: number | null
          github_issue_url?: string | null
          id?: string
          status?: string | null
          submitted_at?: string | null
          title: string
          updated_at?: string | null
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          email?: string | null
          error_message?: string | null
          feedback_type?: string
          github_issue_number?: number | null
          github_issue_url?: string | null
          id?: string
          status?: string | null
          submitted_at?: string | null
          title?: string
          updated_at?: string | null
          url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      myth_busting_entries: {
        Row: {
          analysis: string
          created_at: string
          fact_statement: string
          id: string
          is_published: boolean
          myth_statement: string
          order_index: number
          slug: string
          sources: Json
          status: Database["public"]["Enums"]["myth_truth_status"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          analysis: string
          created_at?: string
          fact_statement: string
          id?: string
          is_published?: boolean
          myth_statement: string
          order_index?: number
          slug: string
          sources?: Json
          status?: Database["public"]["Enums"]["myth_truth_status"]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          analysis?: string
          created_at?: string
          fact_statement?: string
          id?: string
          is_published?: boolean
          myth_statement?: string
          order_index?: number
          slug?: string
          sources?: Json
          status?: Database["public"]["Enums"]["myth_truth_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      public_resources: {
        Row: {
          address: string | null
          category: string
          city: string | null
          created_at: string
          description: string | null
          hours: string | null
          id: string
          metadata: Json | null
          name: string
          phone: string | null
          postal_code: string | null
          priority: number
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category: string
          city?: string | null
          created_at?: string
          description?: string | null
          hours?: string | null
          id?: string
          metadata?: Json | null
          name: string
          phone?: string | null
          postal_code?: string | null
          priority?: number
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string
          city?: string | null
          created_at?: string
          description?: string | null
          hours?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          priority?: number
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ranger_activity_log: {
        Row: {
          address_non_geocoded: string | null
          created_at: string
          id: number
          notes: string | null
          ranger_creator: string | null
        }
        Insert: {
          address_non_geocoded?: string | null
          created_at?: string
          id?: number
          notes?: string | null
          ranger_creator?: string | null
        }
        Update: {
          address_non_geocoded?: string | null
          created_at?: string
          id?: number
          notes?: string | null
          ranger_creator?: string | null
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          id: string
          ip_address: unknown
          results_count: number | null
          search_query: string
          searched_at: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_address?: unknown
          results_count?: number | null
          search_query: string
          searched_at?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_address?: unknown
          results_count?: number | null
          search_query?: string
          searched_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      vector_store: {
        Row: {
          content: string | null
          embedding: string | null
          file_path: string
          id: number
          inserted_at: string | null
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          file_path: string
          id?: never
          inserted_at?: string | null
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          file_path?: string
          id?: never
          inserted_at?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_audit_trigger: {
        Args: { schema_name: string; table_name: string }
        Returns: undefined
      }
      assign_user_role: {
        Args: { assigned_by: string; role_name: string; target_user_id: string }
        Returns: boolean
      }
      bs_submit_feedback: {
        Args: {
          p_description: string
          p_email?: string
          p_title: string
          p_type: string
          p_url?: string
          p_user_agent?: string
        }
        Returns: Json
      }
      calculate_age: { Args: { birth_date: string }; Returns: number }
      check_iharc_admin_role: { Args: never; Returns: boolean }
      check_iharc_role: { Args: never; Returns: boolean }
      check_iharc_staff_role: { Args: never; Returns: boolean }
      cleanup_expired_ai_cache: { Args: never; Returns: number }
      complete_outreach_transaction: {
        Args: {
          activity_data: Json
          distribution_data: Json
          distribution_items: Json[]
          person_data: Json
        }
        Returns: Json
      }
      create_custom_role: {
        Args: {
          description?: string
          display_name: string
          permission_names?: string[]
          role_name: string
        }
        Returns: string
      }
      create_episode_relationship: {
        Args: {
          p_confidence_level?: string
          p_created_by?: string
          p_episode_1_id: string
          p_episode_2_id: string
          p_identified_by?: string
          p_person_id: number
          p_relationship_description?: string
          p_relationship_type: string
        }
        Returns: {
          confidence_level: string
          created_at: string
          created_by: string
          episode_1_id: string
          episode_2_id: string
          id: string
          identified_by: string
          person_id: number
          relationship_description: string
          relationship_type: string
          time_between_episodes: unknown
        }[]
      }
      create_incident: {
        Args: { p_agent_name: string; p_payload: Json }
        Returns: {
          created_at: string
          incident_id: string
          requires_review: boolean
          status: string
        }[]
      }
      delete_custom_role: { Args: { role_id: string }; Returns: boolean }
      delete_distribution_with_cleanup: {
        Args: { distribution_id: string }
        Returns: Json
      }
      distribute_items: { Args: { p_payload: Json }; Returns: Json }
      generate_incident_number: { Args: never; Returns: string }
      get_addresses_list: {
        Args: {
          p_filters?: Json
          p_page_number?: number
          p_page_size?: number
          p_search_term?: string
          p_sort_direction?: string
          p_sort_field?: string
        }
        Returns: Json
      }
      get_all_permissions: {
        Args: never
        Returns: {
          category: string
          description: string
          permission_id: string
          permission_name: string
        }[]
      }
      get_all_roles_for_admin: {
        Args: never
        Returns: {
          created_at: string
          description: string
          display_name: string
          id: string
          is_system_role: boolean
          name: string
          permission_count: number
          user_count: number
        }[]
      }
      get_cached_ai_insights: {
        Args: { p_person_id: number }
        Returns: {
          cache_status: string
          insights_data: Json
          recommendations_data: Json
          risk_data: Json
        }[]
      }
      get_distributions_list: {
        Args: {
          p_filters?: Json
          p_page_number?: number
          p_page_size?: number
          p_search_term?: string
          p_sort_direction?: string
          p_sort_field?: string
        }
        Returns: Json
      }
      get_enhanced_list: {
        Args: {
          p_columns?: string
          p_filters?: Json
          p_page_number?: number
          p_page_size?: number
          p_schema_name: string
          p_search_fields?: string[]
          p_search_term?: string
          p_sort_direction?: string
          p_sort_field?: string
          p_table_name: string
          p_use_full_text?: boolean
        }
        Returns: Json
      }
      get_incidents_list: {
        Args: {
          p_filters?: Json
          p_page_number?: number
          p_page_size?: number
          p_search_term?: string
          p_sort_direction?: string
          p_sort_field?: string
        }
        Returns: Json
      }
      get_people_list: {
        Args: {
          p_filters?: Json
          p_page_number?: number
          p_page_size?: number
          p_search_term?: string
          p_sort_direction?: string
          p_sort_field?: string
        }
        Returns: Json
      }
      get_role_with_permissions: {
        Args: { role_id: string }
        Returns: {
          description: string
          display_name: string
          id: string
          is_system_role: boolean
          name: string
          permissions: string[]
          user_count: number
        }[]
      }
      get_schema_tables: {
        Args: { schema_names: string[] }
        Returns: {
          schema_name: string
          table_name: string
        }[]
      }
      get_secret_by_name: { Args: { secret_name: string }; Returns: string }
      get_table_count_filtered: {
        Args: { p_filters?: Json; p_schema_name: string; p_table_name: string }
        Returns: number
      }
      get_table_schema: {
        Args: { schema_name: string; table_name: string }
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      get_user_permissions: {
        Args: { user_uuid?: string }
        Returns: {
          permission_name: string
        }[]
      }
      get_user_roles: { Args: { user_uuid: string }; Returns: string[] }
      get_users_with_roles_debug: {
        Args: never
        Returns: {
          email: string
          full_name: string
          permissions: string[]
          roles: string[]
          user_id: string
        }[]
      }
      get_vehicles_by_criteria: {
        Args: {
          p_criteria?: Json
          p_page_number?: number
          p_page_size?: number
          p_sort_direction?: string
          p_sort_field?: string
        }
        Returns: Json
      }
      get_vehicles_list: {
        Args: {
          p_filters?: Json
          p_page_number?: number
          p_page_size?: number
          p_search_term?: string
          p_sort_direction?: string
          p_sort_field?: string
        }
        Returns: Json
      }
      has_permission:
        | {
            Args: { permission_name: string; user_uuid?: string }
            Returns: boolean
          }
        | { Args: { permission_name: string }; Returns: boolean }
      has_permission_single: {
        Args: { permission_name: string }
        Returns: boolean
      }
      is_iharc_user: { Args: never; Returns: boolean }
      is_voice_agent: { Args: never; Returns: boolean }
      portal_accept_invite: {
        Args: { p_invite_id: string; p_profile_id: string }
        Returns: undefined
      }
      portal_check_rate_limit: {
        Args: { p_cooldown_ms?: number; p_event: string; p_limit: number }
        Returns: {
          allowed: boolean
          retry_in_ms: number
        }[]
      }
      portal_get_pending_invite: {
        Args: { p_email: string }
        Returns: Database["portal"]["Tables"]["profile_invites"]["Row"]
        SetofOptions: {
          from: "*"
          to: "profile_invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      portal_get_user_email: {
        Args: { p_profile_id?: string }
        Returns: string
      }
      portal_log_audit_event: {
        Args: {
          p_action: string
          p_actor_profile_id?: string
          p_entity_id: string
          p_entity_type: string
          p_meta?: Json
        }
        Returns: undefined
      }
      portal_queue_notification: {
        Args: {
          p_body_html?: string
          p_body_text?: string
          p_payload?: Json
          p_profile_id?: string
          p_recipient_email?: string
          p_subject?: string
          p_type?: string
        }
        Returns: string
      }
      portal_refresh_profile_claims: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      refresh_user_permissions: { Args: { user_uuid?: string }; Returns: Json }
      remove_user_role: {
        Args: { role_name: string; target_user_id: string }
        Returns: boolean
      }
      search_stolen_bikes: {
        Args: { search_term: string }
        Returns: {
          color: string
          id: number
          make: string
          model: string
          owner_email: string
          owner_name: string
          photo_base64: string
          registered_at: string
          serial_number: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_custom_role: {
        Args: {
          description?: string
          display_name?: string
          permission_names?: string[]
          role_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      canadian_provinces_enum:
        | "ON"
        | "BC"
        | "AB"
        | "SK"
        | "MB"
        | "QC"
        | "NB"
        | "NS"
        | "PE"
        | "NL"
        | "YT"
        | "NT"
        | "NU"
      condition_enum: "excellent" | "good" | "fair" | "poor" | "unknown"
      disposition_type_enum:
        | "destroyed"
        | "donated"
        | "sold"
        | "recycled"
        | "other"
      emergency_status_enum: "yes" | "no"
      encampment_type_enum: "temporary" | "permanent" | "seasonal"
      "Fuel Sources":
        | "Propane Tank(s)"
        | "Gasoline"
        | "Diesel"
        | "Open Fire Pit"
        | "Candles"
        | "Other"
        | "Non Observed"
      general_priority_enum: "low" | "normal" | "high" | "urgent"
      "Ignition Sources":
        | "BBQ"
        | "Propane Heater"
        | "Generator"
        | "Camp Stove"
        | "Propane Torch"
        | "Other"
      justice_disposition_enum:
        | "None"
        | "Fine"
        | "Probation"
        | "Conditional Sentence"
        | "Jail Time"
        | "Community Service"
        | "Restitution"
      location_confidence_enum:
        | "exact"
        | "approximate"
        | "general_area"
        | "unknown"
      medical_category_enum:
        | "wound_infection"
        | "mental_health"
        | "substance_related"
        | "chronic_disease"
        | "acute_illness"
      medical_location_type_enum:
        | "street"
        | "shelter"
        | "encampment"
        | "hospital"
        | "other"
      medical_status_enum: "active" | "monitoring" | "resolved" | "transferred"
      medical_urgency_enum:
        | "emergency"
        | "urgent"
        | "moderate"
        | "routine"
        | "wellness"
      myth_truth_status:
        | "true"
        | "false"
        | "partially_true"
        | "context_dependent"
        | "needs_more_evidence"
      organization_service_type_enum:
        | "Addiction"
        | "Crisis Support"
        | "Food Services"
        | "Housing"
        | "Mental Health"
        | "Multi-Service"
        | "Healthcare"
        | "Government"
        | "Non-Profit"
        | "Faith-Based"
        | "Community Center"
        | "Legal Services"
        | "Other"
      partnership_type_enum:
        | "Referral Partner"
        | "Service Provider"
        | "Funding Partner"
        | "Collaborative Partner"
        | "Resource Partner"
        | "Other"
      property_category_enum: "found" | "seized" | "evidence"
      property_status_enum: "found" | "claimed" | "returned" | "disposed"
      property_type_enum:
        | "electronics"
        | "jewelry"
        | "clothing"
        | "documents"
        | "vehicle"
        | "bicycle"
        | "bag"
        | "keys"
        | "wallet"
        | "other"
      report_method_enum:
        | "phone"
        | "walk_in"
        | "social_media"
        | "email"
        | "radio"
        | "agency_transfer"
        | "online_form"
      report_priority_assessment_enum:
        | "immediate"
        | "urgent"
        | "routine"
        | "informational"
      reporter_relationship_enum:
        | "witness"
        | "victim"
        | "passerby"
        | "neighbor"
        | "property_owner"
        | "family_member"
        | "friend"
        | "official"
        | "other"
      reporter_type_enum: "individual" | "organization" | "anonymous"
      return_method_enum: "delivered" | "picked_up" | "mailed" | "other"
      severity_scale_enum: "1" | "2" | "3" | "4" | "5"
      urgency_indicators_enum:
        | "injury"
        | "weapon"
        | "ongoing"
        | "public_safety"
        | "property_damage"
        | "mental_health"
        | "substance_use"
        | "vulnerable_person"
      verification_method_enum:
        | "callback"
        | "field_check"
        | "agency_confirm"
        | "cross_reference"
        | "none_required"
      verification_status_enum:
        | "pending"
        | "verified"
        | "unverified"
        | "unable_to_verify"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  audit: {
    Enums: {},
  },
  auth: {
    Enums: {
      aal_level: ["aal1", "aal2", "aal3"],
      code_challenge_method: ["s256", "plain"],
      factor_status: ["unverified", "verified"],
      factor_type: ["totp", "webauthn", "phone"],
      oauth_authorization_status: ["pending", "approved", "denied", "expired"],
      oauth_client_type: ["public", "confidential"],
      oauth_registration_type: ["dynamic", "manual"],
      oauth_response_type: ["code"],
      one_time_token_type: [
        "confirmation_token",
        "reauthentication_token",
        "recovery_token",
        "email_change_token_new",
        "email_change_token_current",
        "phone_change_token",
      ],
    },
  },
  case_mgmt: {
    Enums: {},
  },
  core: {
    Enums: {
      activity_type_enum: [
        "visit",
        "contact",
        "note",
        "welfare_check",
        "service_referral",
        "incident",
        "follow_up",
        "supply_provision",
        "other",
      ],
      address_category: [
        "residential",
        "commercial",
        "institutional",
        "industrial",
        "mixed_use",
        "temporary",
        "emergency_shelter",
        "transitional_housing",
        "supportive_housing",
        "service_location",
        "incident_location",
        "other",
      ],
      address_type: [
        "street_address",
        "informal_location",
        "coordinates",
        "landmark_area",
      ],
      address_type_enum: [
        "residential",
        "commercial",
        "institutional",
        "industrial",
        "vacant",
        "other",
      ],
      assessment_urgency: [
        "emergency",
        "urgent",
        "concern",
        "followup",
        "routine",
      ],
      burn_degree: ["first", "second", "third", "fourth"],
      canadian_province: [
        "ON",
        "BC",
        "AB",
        "SK",
        "MB",
        "QC",
        "NB",
        "NS",
        "PE",
        "NL",
        "YT",
        "NT",
        "NU",
      ],
      cfs_origin_enum: ["community", "system"],
      cfs_source_enum: [
        "web_form",
        "phone",
        "sms",
        "email",
        "social",
        "api",
        "staff_observed",
      ],
      cfs_status_enum: ["received", "triaged", "dismissed", "converted"],
      citizenship_status_enum: [
        "canadian_citizen",
        "permanent_resident",
        "refugee",
        "refugee_claimant",
        "temporary_resident",
        "work_permit",
        "student_visa",
        "undocumented",
        "other",
        "prefer_not_to_say",
      ],
      communication_ability_enum: ["normal", "impaired", "minimal", "none"],
      contact_frequency_enum: [
        "daily",
        "multiple_weekly",
        "weekly",
        "bi_weekly",
        "monthly",
        "as_needed",
        "crisis_only",
      ],
      contact_method_enum: [
        "phone",
        "text",
        "email",
        "in_person",
        "drop_in",
        "outreach",
      ],
      contact_time_pref_enum: [
        "morning",
        "afternoon",
        "evening",
        "anytime",
        "weekends",
      ],
      cooperation_level_enum: [
        "fully_cooperative",
        "mostly_cooperative",
        "somewhat_cooperative",
        "uncooperative",
        "hostile",
      ],
      court_compliance_enum: [
        "compliant",
        "mostly_compliant",
        "some_violations",
        "non_compliant",
        "not_applicable",
      ],
      death_cause_category: [
        "suspected_overdose",
        "confirmed_overdose",
        "medical_other",
        "trauma",
        "unknown",
      ],
      death_confirmation_source: [
        "coroner",
        "hospital",
        "family",
        "police",
        "staff_observation",
        "unknown",
      ],
      dispatch_priority: ["informational", "low", "medium", "high", "critical"],
      dispatch_priority_enum: [
        "informational",
        "low",
        "medium",
        "high",
        "critical",
      ],
      document_status_enum: ["yes", "no", "partial", "unknown"],
      eligibility_status_enum: [
        "eligible",
        "ineligible",
        "pending_assessment",
        "under_review",
      ],
      encampment_status_enum: ["active", "monitoring", "inactive", "cleared"],
      environmental_factors_enum: [
        "rain",
        "snow",
        "ice",
        "extreme_heat",
        "extreme_cold",
        "poor_lighting",
        "unstable_structure",
        "weather_hazards",
        "traffic_road",
        "wildlife",
        "contamination",
        "structural_damage",
        "other",
      ],
      ethnicity_enum: [
        "indigenous",
        "black_african",
        "east_asian",
        "south_asian",
        "southeast_asian",
        "west_asian",
        "latin_american",
        "white_european",
        "mixed",
        "other",
        "prefer_not_to_say",
      ],
      follow_up_plan_enum: [
        "immediate",
        "urgent",
        "weekly",
        "routine",
        "client_initiated",
      ],
      follow_up_urgency_enum: [
        "immediate",
        "today",
        "tomorrow",
        "few_days",
        "one_week",
      ],
      gender_enum: [
        "Male",
        "Female",
        "Non-binary",
        "Other",
        "Prefer not to say",
      ],
      hazmat_collection_status_enum: [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
        "deferred",
      ],
      hazmat_priority: ["low", "standard", "high", "emergency"],
      hazmat_source: [
        "public_report",
        "staff_discovery",
        "property_sweep",
        "follow_up_collection",
        "emergency_response",
      ],
      hazmat_test_method_enum: [
        "fentanyl_test_strip",
        "field_test_kit",
        "chemical_spot_test",
        "visual_indicator",
        "other",
      ],
      hazmat_test_result_enum: [
        "positive",
        "negative",
        "inconclusive",
        "not_performed",
      ],
      health_card_status_enum: ["yes_valid", "yes_expired", "no", "unknown"],
      health_concern_enum: [
        "mental_health",
        "addiction_substance_use",
        "physical_health",
        "chronic_conditions",
        "disabilities",
        "none",
      ],
      housing_status_enum: [
        "housed",
        "emergency_shelter",
        "transitional_housing",
        "temporarily_housed",
        "unsheltered",
        "unknown",
      ],
      incident_complexity_enum: ["simple", "moderate", "complex", "major"],
      incident_outcome_enum: [
        "REMOVED",
        "NHF",
        "EMS_REFER",
        "POLICE_REFER",
        "HOSPITAL_TX",
        "SUPPLIES_PROVIDED",
        "UTL",
        "DUP",
      ],
      incident_priority_enum: ["low", "medium", "high", "critical"],
      incident_status: ["draft", "open", "in_progress", "resolved", "closed"],
      incident_status_enum: [
        "draft",
        "open",
        "in_progress",
        "resolved",
        "closed",
      ],
      incident_type_enum: [
        "outreach",
        "welfare_check",
        "medical",
        "mental_health",
        "mental_health_crisis",
        "overdose",
        "death",
        "assault",
        "theft",
        "disturbance",
        "property_damage",
        "fire",
        "cleanup",
        "supply_distribution",
        "other",
      ],
      income_source_enum: [
        "employment",
        "benefits",
        "disability",
        "pension",
        "other",
        "none",
        "unknown",
      ],
      interpreter_need_enum: ["none", "language", "sign_language", "unknown"],
      intervention_urgency: [
        "immediate",
        "within_hour",
        "same_day",
        "next_day",
        "within_week",
      ],
      justice_type_enum: ["arrest", "summons", "warrant", "violation"],
      language: ["english", "spanish", "french", "other", "unknown"],
      legal_status_enum: [
        "no_involvement",
        "pending_charges",
        "on_bail",
        "probation",
        "parole",
        "community_service",
        "warrant",
      ],
      location_method_enum: [
        "street_address",
        "informal_location",
        "coordinates",
        "landmark_area",
      ],
      location_type: [
        "street",
        "shelter",
        "camp",
        "hospital",
        "clinic",
        "home",
        "other",
      ],
      mental_behavioral_symptom_enum: [
        "agitation",
        "withdrawal",
        "aggression",
        "restlessness",
        "hyperactivity",
        "lethargy",
        "self_harm",
      ],
      mental_mood_symptom_enum: [
        "depressed",
        "anxious",
        "manic",
        "irritable",
        "euphoric",
        "flat_affect",
        "labile",
      ],
      mental_observation_duration_enum: [
        "under_2_min",
        "minutes_5",
        "minutes_10",
        "minutes_15",
        "minutes_30",
        "minutes_60",
        "ongoing",
      ],
      mood_presentation_enum: [
        "stable",
        "anxious",
        "depressed",
        "agitated",
        "confused",
        "intoxicated",
      ],
      notify_channel_enum: ["none", "email", "sms"],
      organization_person_relationship_enum: [
        "employee",
        "volunteer",
        "contractor",
        "partner_staff",
        "liaison",
        "board_member",
        "sponsor",
        "other",
      ],
      organization_status_enum: [
        "active",
        "inactive",
        "pending",
        "under_review",
      ],
      organization_type: [
        "addiction",
        "crisis_support",
        "food_services",
        "housing",
        "mental_health",
        "multi_service",
        "healthcare",
        "government",
        "non_profit",
        "faith_based",
        "community_center",
        "legal_services",
        "other",
      ],
      partnership_type: [
        "referral_partner",
        "service_provider",
        "funding_partner",
        "collaborative_partner",
        "resource_partner",
        "other",
      ],
      party_role_enum: [
        "subject",
        "reporter",
        "responder",
        "agency",
        "bystander",
      ],
      person_category: [
        "service_recipient",
        "community",
        "professional",
        "support",
      ],
      person_condition_risk_flag_enum: [
        "self_harm_risk",
        "risk_to_others",
        "medication_nonadherence",
        "substance_trigger",
        "medical_instability",
        "needs_meds_support",
        "housing_instability",
        "legal_concern",
      ],
      person_condition_status_enum: [
        "active",
        "remission",
        "ruled_out",
        "inactive",
        "resolved",
        "unknown",
      ],
      person_condition_verification_enum: [
        "self_report",
        "clinician_diagnosis",
        "chart_confirmed",
        "collateral_report",
        "screening_assessment",
      ],
      person_status: [
        "active",
        "inactive",
        "deceased",
        "archived",
        "pending_verification",
        "do_not_contact",
        "merged",
      ],
      person_type: [
        "client",
        "former_client",
        "community_member",
        "potential_client",
        "resident",
        "concerned_citizen",
        "agency_contact",
        "case_worker",
        "healthcare_provider",
        "emergency_contact",
        "family_member",
        "support_person",
      ],
      photo_type: ["initial", "progress", "final", "comparison", "detail"],
      pit_age_bracket: [
        "under_19",
        "age_20_39",
        "age_40_59",
        "age_60_plus",
        "unknown",
      ],
      pit_boolean_response: ["yes", "no", "maybe", "unknown", "not_answered"],
      pit_count_status: ["planned", "active", "closed"],
      pit_location_type: [
        "encampment",
        "shelter",
        "street",
        "vehicle",
        "motel",
        "couch_surfing",
        "institutional",
        "other",
        "unknown",
      ],
      pit_severity_level: [
        "none",
        "mild",
        "moderate",
        "severe",
        "critical",
        "unknown",
        "not_recorded",
        "not_applicable",
      ],
      pit_treatment_interest: ["yes", "no", "not_suitable", "not_applicable"],
      place_of_origin_enum: [
        "Port Hope",
        "Cobourg",
        "Northumberland County (other)",
        "Durham Region",
        "Peterborough",
        "Prince Edward County",
        "GTA (including Toronto)",
        "Outside of Province",
        "Outside of Country",
      ],
      preferred_service_enum: [
        "case_management",
        "housing_support",
        "counseling",
        "group_programs",
        "life_skills",
        "employment_support",
        "financial_assistance",
        "health_advocacy",
        "legal_support",
        "peer_support",
        "drop_in",
        "outreach",
        "id_replacement",
        "food_programs",
        "medical_referral",
        "mental_health_referral",
        "addiction_treatment_referral",
        "transportation_assistance",
        "other",
      ],
      primary_worker_assignee_enum: [
        "intake_worker",
        "case_manager",
        "housing_worker",
        "outreach_worker",
        "to_be_assigned",
      ],
      priority_level: [
        "low",
        "medium",
        "high",
        "critical",
        "urgent",
        "emergency",
      ],
      priority_level_enum: ["low", "medium", "high", "urgent"],
      progression_status: [
        "new",
        "improving",
        "stable",
        "worsening",
        "much_worse",
        "resolved",
        "unknown",
      ],
      property_category: ["found", "seized", "evidence"],
      property_type: [
        "electronics",
        "jewelry",
        "clothing",
        "documents",
        "vehicle",
        "bicycle",
        "bag",
        "keys",
        "wallet",
        "other",
      ],
      public_safety_impact_enum: [
        "none",
        "minimal",
        "moderate",
        "significant",
        "major",
      ],
      reality_orientation_enum: [
        "oriented",
        "confused",
        "disoriented",
        "unknown",
      ],
      record_status: [
        "active",
        "inactive",
        "pending",
        "completed",
        "cancelled",
        "draft",
        "under_review",
      ],
      risk_factor_enum: [
        "Substance Use",
        "Mental Health",
        "Domestic Violence",
        "Justice Involvement",
        "Chronic Health",
        "Weather Exposure",
        "Mobility Issue",
      ],
      risk_level_enum: ["low", "medium", "high", "critical", "unknown"],
      self_care_ability_enum: [
        "independent",
        "needs_prompting",
        "needs_assistance",
        "unable",
      ],
      severity_level_enum: [
        "minimal",
        "mild",
        "moderate",
        "severe",
        "critical",
      ],
      social_engagement_enum: [
        "normal",
        "withdrawn",
        "overly_talkative",
        "inappropriate",
        "refused",
      ],
      structure_type_enum: ["temporary", "permanent", "seasonal"],
      substance_indicators_enum: [
        "alcohol",
        "cannabis",
        "hard_drugs",
        "needles_paraphernalia",
        "pills_medication",
        "smoking_materials",
        "unknown_substances",
        "other",
      ],
      support_network_enum: ["strong", "some_support", "limited", "isolated"],
      vehicle_activity_outcome_enum: [
        "citation_issued",
        "warning_issued",
        "no_action",
        "arrest_made",
        "vehicle_impounded",
        "vehicle_released",
        "case_closed",
        "follow_up_required",
      ],
      vehicle_activity_type_enum: [
        "traffic_stop",
        "citation_issued",
        "warning_issued",
        "vehicle_search",
        "impound",
        "release",
        "inspection",
        "accident_report",
        "theft_report",
        "recovery",
        "maintenance",
        "other",
      ],
      vehicle_color_enum: [
        "Black",
        "White",
        "Silver",
        "Grey",
        "Gray",
        "Red",
        "Blue",
        "Green",
        "Yellow",
        "Orange",
        "Purple",
        "Brown",
        "Beige",
        "Tan",
        "Gold",
        "Maroon",
        "Navy",
        "Teal",
        "Pink",
        "Multi-colored",
        "Unknown",
        "Other",
      ],
      vehicle_make_enum: [
        "Acura",
        "Audi",
        "BMW",
        "Buick",
        "Cadillac",
        "Chevrolet",
        "Chrysler",
        "Dodge",
        "Ford",
        "GMC",
        "Honda",
        "Hyundai",
        "Infiniti",
        "Jeep",
        "Kia",
        "Lexus",
        "Lincoln",
        "Mazda",
        "Mercedes-Benz",
        "Mitsubishi",
        "Nissan",
        "Pontiac",
        "Ram",
        "Subaru",
        "Toyota",
        "Volkswagen",
        "Volvo",
        "Other",
      ],
      vehicle_type: [
        "sedan",
        "suv",
        "truck",
        "van",
        "motorcycle",
        "bicycle",
        "rv",
        "trailer",
        "other",
      ],
      veteran_status_enum: ["yes", "no", "unknown"],
      visibility_enum: ["excellent", "good", "fair", "poor"],
      welcome_resource_enum: [
        "service_directory",
        "emergency_contacts",
        "crisis_line_info",
        "housing_resources",
        "health_resources",
        "food_resources",
        "transit_tokens",
        "hygiene_kit",
      ],
      workflow_status: [
        "reported",
        "assigned",
        "en_route",
        "on_scene",
        "in_progress",
        "collecting",
        "collected",
        "in_storage",
        "disposed",
        "returned",
        "claimed",
        "cancelled",
      ],
      wound_depth: [
        "superficial",
        "partial",
        "full_thickness",
        "to_subcutaneous",
        "to_fascia",
        "to_muscle",
        "to_bone",
      ],
      wound_size_category: [
        "tiny",
        "small",
        "medium",
        "large",
        "very_large",
        "extensive",
      ],
    },
  },
  donations: {
    Enums: {
      donation_intent_status: [
        "pending",
        "requires_payment",
        "paid",
        "failed",
        "cancelled",
      ],
      donation_payment_status: [
        "succeeded",
        "requires_action",
        "failed",
        "refunded",
      ],
    },
  },
  hazmat: {
    Enums: {},
  },
  inventory: {
    Enums: {},
  },
  justice: {
    Enums: {
      charge_severity_enum: ["IND", "SUMM", "HYBRID", "OTHER"],
      charge_status_enum: [
        "PENDING",
        "WITHDRAWN",
        "STAYED",
        "GUILTY",
        "ACQUITTED",
        "PEACEBOND",
        "DISCHARGED_ABSOLUTE",
        "DISCHARGED_CONDITIONAL",
      ],
      condition_type_enum: [
        "CURFEW",
        "NO_CONTACT",
        "NO_GO",
        "ABSTAIN",
        "REPORT",
        "WEAPONS",
        "ADDRESS_KEEP",
        "OTHER",
      ],
      contact_role_enum: [
        "LAWYER",
        "DUTY_COUNSEL",
        "PROBATION",
        "PAROLE",
        "LEGAL_AID",
        "SURETY",
        "OTHER",
      ],
      custody_reason_enum: ["REMAND", "SENTENCE", "OTHER"],
      episode_state_enum: [
        "UNKNOWN",
        "PRE_CHARGE",
        "ARRESTED_POLICE_CELLS",
        "HELD_FOR_BAIL",
        "ON_REMAND_POLICE_CELLS",
        "ON_REMAND_DETENTION_CENTRE",
        "RELEASED_PENDING",
        "COURT_ACTIVE",
        "SENTENCED_CUSTODIAL",
        "SENTENCED_COMMUNITY",
        "COMPLETED",
        "WARRANT_OUTSTANDING",
        "BREACH_PROCEEDING",
      ],
      event_type_enum: [
        "ARRESTED",
        "NOTICE_ISSUED",
        "HELD_FOR_BAIL",
        "TRANSFER_TO_FACILITY",
        "BAIL_HEARING",
        "RELEASE_ORDER",
        "CONDITIONS_SET",
        "COURT_APPEARANCE",
        "WARRANT_ISSUED",
        "WARRANT_EXECUTED",
        "DISPOSITION_UPDATE",
        "SENTENCE",
        "PROBATION_ORDER",
        "BREACH",
        "NOTE",
      ],
      facility_type_enum: [
        "POLICE_CELLS",
        "DETENTION_CENTRE",
        "JAIL",
        "PRISON",
        "OTHER",
      ],
      origin_enum: ["ARREST", "SUMMONS", "OTHER"],
      warrant_status_enum: ["OUTSTANDING", "EXECUTED", "CANCELLED"],
      warrant_type_enum: ["BENCH", "ARREST", "OTHER"],
    },
  },
  portal: {
    Enums: {
      affiliation_status: ["approved", "pending", "revoked"],
      affiliation_type: [
        "community_member",
        "agency_partner",
        "government_partner",
      ],
      appointment_channel: ["in_person", "phone", "video", "field", "other"],
      appointment_status: [
        "requested",
        "pending_confirmation",
        "scheduled",
        "reschedule_requested",
        "cancelled_by_client",
        "cancelled_by_staff",
        "completed",
        "no_show",
      ],
      comment_type: ["question", "suggestion", "response", "official_note"],
      contact_method: ["email", "phone"],
      flag_entity_type: ["idea", "comment"],
      flag_reason: ["privacy", "abuse", "hate", "spam", "wrong_cat", "other"],
      flag_status: ["open", "reviewing", "resolved", "rejected"],
      government_level: [
        "municipal",
        "county",
        "provincial",
        "federal",
        "other",
      ],
      government_role_type: ["staff", "politician"],
      idea_category: [
        "Housing",
        "Health",
        "Policing",
        "Community",
        "Prevention",
        "Other",
      ],
      idea_publication_status: ["draft", "published", "archived"],
      idea_status: [
        "new",
        "under_review",
        "in_progress",
        "adopted",
        "not_feasible",
        "archived",
      ],
      invite_status: ["pending", "accepted", "cancelled", "expired"],
      lived_experience_status: [
        "none",
        "current",
        "former",
        "prefer_not_to_share",
      ],
      metric_value_status: ["reported", "pending"],
      notification_channel: ["email", "sms"],
      organization_category: ["community", "government"],
      petition_display_preference: [
        "full_name",
        "first_name_last_initial",
        "anonymous",
      ],
      plan_update_status: [
        "draft",
        "open",
        "accepted",
        "not_moving_forward",
        "added_to_plan",
      ],
      policy_category: [
        "client_rights",
        "safety",
        "staff",
        "governance",
        "operations",
        "finance",
      ],
      policy_status: ["draft", "published", "archived"],
      reaction_type: [
        "like",
        "love",
        "hooray",
        "rocket",
        "eyes",
        "laugh",
        "confused",
        "sad",
        "angry",
        "minus_one",
      ],
      resource_embed_placement: ["above", "below"],
      resource_kind: [
        "delegation",
        "report",
        "presentation",
        "policy",
        "press",
        "dataset",
        "other",
      ],
    },
  },
  public: {
    Enums: {
      canadian_provinces_enum: [
        "ON",
        "BC",
        "AB",
        "SK",
        "MB",
        "QC",
        "NB",
        "NS",
        "PE",
        "NL",
        "YT",
        "NT",
        "NU",
      ],
      condition_enum: ["excellent", "good", "fair", "poor", "unknown"],
      disposition_type_enum: [
        "destroyed",
        "donated",
        "sold",
        "recycled",
        "other",
      ],
      emergency_status_enum: ["yes", "no"],
      encampment_type_enum: ["temporary", "permanent", "seasonal"],
      "Fuel Sources": [
        "Propane Tank(s)",
        "Gasoline",
        "Diesel",
        "Open Fire Pit",
        "Candles",
        "Other",
        "Non Observed",
      ],
      general_priority_enum: ["low", "normal", "high", "urgent"],
      "Ignition Sources": [
        "BBQ",
        "Propane Heater",
        "Generator",
        "Camp Stove",
        "Propane Torch",
        "Other",
      ],
      justice_disposition_enum: [
        "None",
        "Fine",
        "Probation",
        "Conditional Sentence",
        "Jail Time",
        "Community Service",
        "Restitution",
      ],
      location_confidence_enum: [
        "exact",
        "approximate",
        "general_area",
        "unknown",
      ],
      medical_category_enum: [
        "wound_infection",
        "mental_health",
        "substance_related",
        "chronic_disease",
        "acute_illness",
      ],
      medical_location_type_enum: [
        "street",
        "shelter",
        "encampment",
        "hospital",
        "other",
      ],
      medical_status_enum: ["active", "monitoring", "resolved", "transferred"],
      medical_urgency_enum: [
        "emergency",
        "urgent",
        "moderate",
        "routine",
        "wellness",
      ],
      myth_truth_status: [
        "true",
        "false",
        "partially_true",
        "context_dependent",
        "needs_more_evidence",
      ],
      organization_service_type_enum: [
        "Addiction",
        "Crisis Support",
        "Food Services",
        "Housing",
        "Mental Health",
        "Multi-Service",
        "Healthcare",
        "Government",
        "Non-Profit",
        "Faith-Based",
        "Community Center",
        "Legal Services",
        "Other",
      ],
      partnership_type_enum: [
        "Referral Partner",
        "Service Provider",
        "Funding Partner",
        "Collaborative Partner",
        "Resource Partner",
        "Other",
      ],
      property_category_enum: ["found", "seized", "evidence"],
      property_status_enum: ["found", "claimed", "returned", "disposed"],
      property_type_enum: [
        "electronics",
        "jewelry",
        "clothing",
        "documents",
        "vehicle",
        "bicycle",
        "bag",
        "keys",
        "wallet",
        "other",
      ],
      report_method_enum: [
        "phone",
        "walk_in",
        "social_media",
        "email",
        "radio",
        "agency_transfer",
        "online_form",
      ],
      report_priority_assessment_enum: [
        "immediate",
        "urgent",
        "routine",
        "informational",
      ],
      reporter_relationship_enum: [
        "witness",
        "victim",
        "passerby",
        "neighbor",
        "property_owner",
        "family_member",
        "friend",
        "official",
        "other",
      ],
      reporter_type_enum: ["individual", "organization", "anonymous"],
      return_method_enum: ["delivered", "picked_up", "mailed", "other"],
      severity_scale_enum: ["1", "2", "3", "4", "5"],
      urgency_indicators_enum: [
        "injury",
        "weapon",
        "ongoing",
        "public_safety",
        "property_damage",
        "mental_health",
        "substance_use",
        "vulnerable_person",
      ],
      verification_method_enum: [
        "callback",
        "field_check",
        "agency_confirm",
        "cross_reference",
        "none_required",
      ],
      verification_status_enum: [
        "pending",
        "verified",
        "unverified",
        "unable_to_verify",
      ],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
