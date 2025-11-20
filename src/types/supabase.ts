export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  public: {
    Tables: {
      agent_settings: {
        Row: {
          agent_name: string;
          created_at: string;
          instructions: string | null;
          metadata: Json | null;
          model: string | null;
          tools_enabled: Json | null;
          updated_at: string;
          voice: string | null;
        };
        Insert: {
          agent_name: string;
          created_at?: string;
          instructions?: string | null;
          metadata?: Json | null;
          model?: string | null;
          tools_enabled?: Json | null;
          updated_at?: string;
          voice?: string | null;
        };
        Update: {
          agent_name?: string;
          created_at?: string;
          instructions?: string | null;
          metadata?: Json | null;
          model?: string | null;
          tools_enabled?: Json | null;
          updated_at?: string;
          voice?: string | null;
        };
        Relationships: [];
      };
      domain_knowledge: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          metadata: Json | null;
          tags: string[];
          title: string;
          updated_at: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          tags?: string[];
          title: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          tags?: string[];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      feedback_submissions: {
        Row: {
          created_at: string | null;
          description: string;
          email: string | null;
          error_message: string | null;
          feedback_type: string;
          github_issue_number: number | null;
          github_issue_url: string | null;
          id: string;
          status: string | null;
          submitted_at: string | null;
          title: string;
          updated_at: string | null;
          url: string | null;
          user_agent: string | null;
        };
        Insert: {
          created_at?: string | null;
          description: string;
          email?: string | null;
          error_message?: string | null;
          feedback_type: string;
          github_issue_number?: number | null;
          github_issue_url?: string | null;
          id?: string;
          status?: string | null;
          submitted_at?: string | null;
          title: string;
          updated_at?: string | null;
          url?: string | null;
          user_agent?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string;
          email?: string | null;
          error_message?: string | null;
          feedback_type?: string;
          github_issue_number?: number | null;
          github_issue_url?: string | null;
          id?: string;
          status?: string | null;
          submitted_at?: string | null;
          title?: string;
          updated_at?: string | null;
          url?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      myth_busting_entries: {
        Row: {
          analysis: string;
          created_at: string;
          fact_statement: string;
          id: string;
          is_published: boolean;
          myth_statement: string;
          order_index: number;
          slug: string;
          sources: Json;
          status: Database["public"]["Enums"]["myth_truth_status"];
          tags: string[];
          title: string;
          updated_at: string;
        };
        Insert: {
          analysis: string;
          created_at?: string;
          fact_statement: string;
          id?: string;
          is_published?: boolean;
          myth_statement: string;
          order_index?: number;
          slug: string;
          sources?: Json;
          status?: Database["public"]["Enums"]["myth_truth_status"];
          tags?: string[];
          title: string;
          updated_at?: string;
        };
        Update: {
          analysis?: string;
          created_at?: string;
          fact_statement?: string;
          id?: string;
          is_published?: boolean;
          myth_statement?: string;
          order_index?: number;
          slug?: string;
          sources?: Json;
          status?: Database["public"]["Enums"]["myth_truth_status"];
          tags?: string[];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      n8n_chat_histories: {
        Row: {
          id: number;
          message: Json;
          session_id: string;
        };
        Insert: {
          id?: number;
          message: Json;
          session_id: string;
        };
        Update: {
          id?: number;
          message?: Json;
          session_id?: string;
        };
        Relationships: [];
      };
      public_resources: {
        Row: {
          address: string | null;
          category: string;
          city: string | null;
          created_at: string;
          description: string | null;
          hours: string | null;
          id: string;
          metadata: Json | null;
          name: string;
          phone: string | null;
          postal_code: string | null;
          priority: number;
          state: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          category: string;
          city?: string | null;
          created_at?: string;
          description?: string | null;
          hours?: string | null;
          id?: string;
          metadata?: Json | null;
          name: string;
          phone?: string | null;
          postal_code?: string | null;
          priority?: number;
          state?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          category?: string;
          city?: string | null;
          created_at?: string;
          description?: string | null;
          hours?: string | null;
          id?: string;
          metadata?: Json | null;
          name?: string;
          phone?: string | null;
          postal_code?: string | null;
          priority?: number;
          state?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      ranger_activity_log: {
        Row: {
          address_non_geocoded: string | null;
          created_at: string;
          id: number;
          notes: string | null;
          ranger_creator: string | null;
        };
        Insert: {
          address_non_geocoded?: string | null;
          created_at?: string;
          id?: number;
          notes?: string | null;
          ranger_creator?: string | null;
        };
        Update: {
          address_non_geocoded?: string | null;
          created_at?: string;
          id?: number;
          notes?: string | null;
          ranger_creator?: string | null;
        };
        Relationships: [];
      };
      search_logs: {
        Row: {
          id: string;
          ip_address: unknown | null;
          results_count: number | null;
          search_query: string;
          searched_at: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          ip_address?: unknown | null;
          results_count?: number | null;
          search_query: string;
          searched_at?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          ip_address?: unknown | null;
          results_count?: number | null;
          search_query?: string;
          searched_at?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      vector_store: {
        Row: {
          content: string | null;
          embedding: string | null;
          file_path: string;
          id: number;
          inserted_at: string | null;
          metadata: Json | null;
        };
        Insert: {
          content?: string | null;
          embedding?: string | null;
          file_path: string;
          id?: never;
          inserted_at?: string | null;
          metadata?: Json | null;
        };
        Update: {
          content?: string | null;
          embedding?: string | null;
          file_path?: string;
          id?: never;
          inserted_at?: string | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: {
      plan_updates_v: {
        Row: {
          id: string;
          plan_id: string;
          author_profile_id: string;
          problem: string;
          evidence: string;
          proposed_change: string;
          impact: string;
          risks: string;
          measurement: string;
          status: Database["portal"]["Enums"]["plan_update_status"];
          opened_at: string | null;
          decided_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      add_audit_trigger: {
        Args: { schema_name: string; table_name: string };
        Returns: undefined;
      };
      assign_user_role: {
        Args: { assigned_by: string; role_name: string; target_user_id: string };
        Returns: boolean;
      };
      bs_submit_feedback: {
        Args: {
          p_description: string;
          p_email?: string;
          p_title: string;
          p_type: string;
          p_url?: string;
          p_user_agent?: string;
        };
        Returns: Json;
      };
      calculate_age: {
        Args: { birth_date: string };
        Returns: number;
      };
      check_iharc_admin_role: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      check_iharc_role: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      check_iharc_staff_role: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      portal_accept_invite: {
        Args: { p_invite_id: string; p_profile_id: string };
        Returns: undefined;
      };
      portal_check_rate_limit: {
        Args: { p_event: string; p_limit: number; p_cooldown_ms?: number | null };
        Returns: { allowed: boolean; retry_in_ms: number }[];
      };
      portal_get_pending_invite: {
        Args: { p_email: string };
        Returns: Database["portal"]["Tables"]["profile_invites"]["Row"] | null;
      };
      portal_get_user_email: {
        Args: { p_profile_id?: string | null };
        Returns: string | null;
      };
      portal_log_audit_event: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string | null;
          p_meta?: Json | null;
          p_actor_profile_id?: string | null;
        };
        Returns: undefined;
      };
      claim_registration_flow: {
        Args: {
          p_portal_code?: string | null;
          p_chosen_name?: string | null;
          p_date_of_birth_month?: number | null;
          p_date_of_birth_year?: number | null;
          p_contact_email?: string | null;
          p_contact_phone?: string | null;
        };
        Returns: {
          success: boolean | null;
          reason: string | null;
          portal_code: string | null;
          registration_id: string | null;
        }[];
      };
      portal_queue_notification: {
        Args: {
          p_subject: string;
          p_body_text: string;
          p_profile_id?: string | null;
          p_body_html?: string | null;
          p_idea_id?: string | null;
          p_type?: string | null;
          p_payload?: Json | null;
          p_recipient_email?: string | null;
        };
        Returns: string | null;
      };
      portal_refresh_profile_claims: {
        Args: { p_profile_id: string };
        Returns: Json;
      };
      cleanup_expired_ai_cache: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      complete_outreach_transaction: {
        Args: {
          activity_data: Json;
          distribution_data: Json;
          distribution_items: Json[];
          person_data: Json;
        };
        Returns: Json;
      };
      create_custom_role: {
        Args: {
          description?: string;
          display_name: string;
          permission_names?: string[];
          role_name: string;
        };
        Returns: string;
      };
      create_episode_relationship: {
        Args: {
          p_confidence_level?: string;
          p_created_by?: string;
          p_episode_1_id: string;
          p_episode_2_id: string;
          p_identified_by?: string;
          p_person_id: number;
          p_relationship_description?: string;
          p_relationship_type: string;
        };
        Returns: {
          confidence_level: string;
          created_at: string;
          created_by: string;
          episode_1_id: string;
          episode_2_id: string;
          id: string;
          identified_by: string;
          person_id: number;
          relationship_description: string;
          relationship_type: string;
          time_between_episodes: unknown;
        }[];
      };
      create_incident: {
        Args: { p_agent_name: string; p_payload: Json };
        Returns: {
          created_at: string;
          incident_id: string;
          requires_review: boolean;
          status: string;
        }[];
      };
      delete_custom_role: {
        Args: { role_id: string };
        Returns: boolean;
      };
      delete_distribution_with_cleanup: {
        Args: { distribution_id: string };
        Returns: Json;
      };
      distribute_items: {
        Args: { p_payload: Json };
        Returns: Json;
      };
      generate_incident_number: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_addresses_list: {
        Args: {
          p_filters?: Json;
          p_page_number?: number;
          p_page_size?: number;
          p_search_term?: string;
          p_sort_direction?: string;
          p_sort_field?: string;
        };
        Returns: Json;
      };
      get_all_permissions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          category: string;
          description: string;
          permission_id: string;
          permission_name: string;
        }[];
      };
      get_all_roles_for_admin: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          description: string;
          display_name: string;
          id: string;
          is_system_role: boolean;
          name: string;
          permission_count: number;
          user_count: number;
        }[];
      };
      get_cached_ai_insights: {
        Args: { p_person_id: number };
        Returns: {
          cache_status: string;
          insights_data: Json;
          recommendations_data: Json;
          risk_data: Json;
        }[];
      };
      get_distributions_list: {
        Args: {
          p_filters?: Json;
          p_page_number?: number;
          p_page_size?: number;
          p_search_term?: string;
          p_sort_direction?: string;
          p_sort_field?: string;
        };
        Returns: Json;
      };
      get_enhanced_list: {
        Args: {
          p_columns?: string;
          p_filters?: Json;
          p_page_number?: number;
          p_page_size?: number;
          p_schema_name: string;
          p_search_fields?: string[];
          p_search_term?: string;
          p_sort_direction?: string;
          p_sort_field?: string;
          p_table_name: string;
          p_use_full_text?: boolean;
        };
        Returns: Json;
      };
      get_incidents_list: {
        Args: {
          p_filters?: Json;
          p_page_number?: number;
          p_page_size?: number;
          p_search_term?: string;
          p_sort_direction?: string;
          p_sort_field?: string;
        };
        Returns: Json;
      };
      get_people_list: {
        Args: {
          p_filters?: Json;
          p_page_number?: number;
          p_page_size?: number;
          p_search_term?: string;
          p_sort_direction?: string;
          p_sort_field?: string;
        };
        Returns: Json;
      };
      get_role_with_permissions: {
        Args: { role_id: string };
        Returns: {
          description: string;
          display_name: string;
          id: string;
          is_system_role: boolean;
          name: string;
          permissions: string[];
          user_count: number;
        }[];
      };
      get_schema_tables: {
        Args: { schema_names: string[] };
        Returns: {
          schema_name: string;
          table_name: string;
        }[];
      };
      get_secret_by_name: {
        Args: { secret_name: string };
        Returns: string;
      };
      get_table_count_filtered: {
        Args: { p_filters?: Json; p_schema_name: string; p_table_name: string };
        Returns: number;
      };
      get_table_schema: {
        Args: { schema_name: string; table_name: string };
        Returns: {
          column_default: string;
          column_name: string;
          data_type: string;
          is_nullable: string;
        }[];
      };
      get_user_permissions: {
        Args: { user_uuid?: string };
        Returns: {
          permission_name: string;
        }[];
      };
      get_user_roles: {
        Args: { user_uuid: string };
        Returns: string[];
      };
      get_users_with_roles_debug: {
        Args: Record<PropertyKey, never>;
        Returns: {
          email: string;
          full_name: string;
          permissions: string[];
          roles: string[];
          user_id: string;
        }[];
      };
      get_vehicles_by_criteria: {
        Args: {
          p_criteria?: Json;
          p_page_number?: number;
          p_page_size?: number;
          p_sort_direction?: string;
          p_sort_field?: string;
        };
        Returns: Json;
      };
      get_vehicles_list: {
        Args: {
          p_filters?: Json;
          p_page_number?: number;
          p_page_size?: number;
          p_search_term?: string;
          p_sort_direction?: string;
          p_sort_field?: string;
        };
        Returns: Json;
      };
      gtrgm_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_decompress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_options: {
        Args: { "": unknown };
        Returns: undefined;
      };
      gtrgm_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      has_permission: {
        Args:
          | { permission_name: string }
          | { permission_name: string; user_uuid?: string };
        Returns: boolean;
      };
      has_permission_single: {
        Args: { permission_name: string };
        Returns: boolean;
      };
      is_iharc_user: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_voice_agent: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      refresh_user_claims: {
        Args: { user_uuid: string };
        Returns: Json;
      };
      refresh_user_permissions: {
        Args: { user_uuid?: string };
        Returns: Json;
      };
      remove_user_role: {
        Args: { role_name: string; target_user_id: string };
        Returns: boolean;
      };
      search_stolen_bikes: {
        Args: { search_term: string };
        Returns: {
          color: string;
          id: number;
          make: string;
          model: string;
          owner_email: string;
          owner_name: string;
          photo_base64: string;
          registered_at: string;
          serial_number: string;
        }[];
      };
      set_limit: {
        Args: { "": number };
        Returns: number;
      };
      show_limit: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      show_trgm: {
        Args: { "": string };
        Returns: string[];
      };
      update_custom_role: {
        Args: {
          description?: string;
          display_name?: string;
          permission_names?: string[];
          role_id: string;
        };
        Returns: boolean;
      };
    };
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
        | "NU";
      condition_enum: "excellent" | "good" | "fair" | "poor" | "unknown";
      disposition_type_enum:
        | "destroyed"
        | "donated"
        | "sold"
        | "recycled"
        | "other";
      emergency_status_enum: "yes" | "no";
      encampment_type_enum: "temporary" | "permanent" | "seasonal";
      "Fuel Sources":
        | "Propane Tank(s)"
        | "Gasoline"
        | "Diesel"
        | "Open Fire Pit"
        | "Candles"
        | "Other"
        | "Non Observed";
      general_priority_enum: "low" | "normal" | "high" | "urgent";
      "Ignition Sources":
        | "BBQ"
        | "Propane Heater"
        | "Generator"
        | "Camp Stove"
        | "Propane Torch"
        | "Other";
      justice_disposition_enum:
        | "None"
        | "Fine"
        | "Probation"
        | "Conditional Sentence"
        | "Jail Time"
        | "Community Service"
        | "Restitution";
      location_confidence_enum:
        | "exact"
        | "approximate"
        | "general_area"
        | "unknown";
      medical_category_enum:
        | "wound_infection"
        | "mental_health"
        | "substance_related"
        | "chronic_disease"
        | "acute_illness";
      medical_location_type_enum:
        | "street"
        | "shelter"
        | "encampment"
        | "hospital"
        | "other";
      medical_status_enum: "active" | "monitoring" | "resolved" | "transferred";
      medical_urgency_enum:
        | "emergency"
        | "urgent"
        | "moderate"
        | "routine"
        | "wellness";
      myth_truth_status:
        | "true"
        | "false"
        | "partially_true"
        | "context_dependent"
        | "needs_more_evidence";
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
        | "Other";
      partnership_type_enum:
        | "Referral Partner"
        | "Service Provider"
        | "Funding Partner"
        | "Collaborative Partner"
        | "Resource Partner"
        | "Other";
      property_category_enum: "found" | "seized" | "evidence";
      property_status_enum: "found" | "claimed" | "returned" | "disposed";
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
        | "other";
      report_method_enum:
        | "phone"
        | "walk_in"
        | "social_media"
        | "email"
        | "radio"
        | "agency_transfer"
        | "online_form";
      report_priority_assessment_enum:
        | "immediate"
        | "urgent"
        | "routine"
        | "informational";
      reporter_relationship_enum:
        | "witness"
        | "victim"
        | "passerby"
        | "neighbor"
        | "property_owner"
        | "family_member"
        | "friend"
        | "official"
        | "other";
      reporter_type_enum: "individual" | "organization" | "anonymous";
      return_method_enum: "delivered" | "picked_up" | "mailed" | "other";
      severity_scale_enum: "1" | "2" | "3" | "4" | "5";
      urgency_indicators_enum:
        | "injury"
        | "weapon"
        | "ongoing"
        | "public_safety"
        | "property_damage"
        | "mental_health"
        | "substance_use"
        | "vulnerable_person";
      verification_method_enum:
        | "callback"
        | "field_check"
        | "agency_confirm"
        | "cross_reference"
        | "none_required";
      verification_status_enum:
        | "pending"
        | "verified"
        | "unverified"
        | "unable_to_verify";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  portal: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          website: string | null;
          verified: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          category: Database["portal"]["Enums"]["organization_category"];
          government_level: Database["portal"]["Enums"]["government_level"] | null;
        };
        Insert: {
          id?: string;
          name: string;
          website?: string | null;
          verified?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          category?: Database["portal"]["Enums"]["organization_category"];
          government_level?: Database["portal"]["Enums"]["government_level"] | null;
        };
        Update: {
          id?: string;
          name?: string;
          website?: string | null;
          verified?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          category?: Database["portal"]["Enums"]["organization_category"];
          government_level?: Database["portal"]["Enums"]["government_level"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "organizations_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }?,
        ];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string | null;
          display_name: string;
          organization_id: string | null;
          role: Database["portal"]["Enums"]["profile_role"];
          avatar_url: string | null;
          bio: string | null;
          rules_acknowledged_at: string | null;
          last_seen_at: string | null;
          display_name_confirmed_at: string | null;
          position_title: string | null;
          affiliation_type: Database["portal"]["Enums"]["affiliation_type"];
          affiliation_status: Database["portal"]["Enums"]["affiliation_status"];
          affiliation_requested_at: string | null;
          affiliation_reviewed_at: string | null;
          affiliation_reviewed_by: string | null;
          homelessness_experience: Database["portal"]["Enums"]["lived_experience_status"];
          substance_use_experience: Database["portal"]["Enums"]["lived_experience_status"];
          has_signed_petition: boolean;
          petition_signed_at: string | null;
          government_role_type: Database["portal"]["Enums"]["government_role_type"] | null;
          requested_organization_name: string | null;
          requested_government_name: string | null;
          requested_government_level: Database["portal"]["Enums"]["government_level"] | null;
          requested_government_role: Database["portal"]["Enums"]["government_role_type"] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          display_name: string;
          organization_id?: string | null;
          role?: Database["portal"]["Enums"]["profile_role"];
          avatar_url?: string | null;
          bio?: string | null;
          rules_acknowledged_at?: string | null;
          last_seen_at?: string | null;
          display_name_confirmed_at?: string | null;
          position_title?: string | null;
          affiliation_type?: Database["portal"]["Enums"]["affiliation_type"];
          affiliation_status?: Database["portal"]["Enums"]["affiliation_status"];
          affiliation_requested_at?: string | null;
          affiliation_reviewed_at?: string | null;
          affiliation_reviewed_by?: string | null;
          homelessness_experience?: Database["portal"]["Enums"]["lived_experience_status"];
          substance_use_experience?: Database["portal"]["Enums"]["lived_experience_status"];
          has_signed_petition?: boolean;
          petition_signed_at?: string | null;
          government_role_type?: Database["portal"]["Enums"]["government_role_type"] | null;
          requested_organization_name?: string | null;
          requested_government_name?: string | null;
          requested_government_level?: Database["portal"]["Enums"]["government_level"] | null;
          requested_government_role?: Database["portal"]["Enums"]["government_role_type"] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          display_name?: string;
          organization_id?: string | null;
          role?: Database["portal"]["Enums"]["profile_role"];
          avatar_url?: string | null;
          bio?: string | null;
          rules_acknowledged_at?: string | null;
          last_seen_at?: string | null;
          display_name_confirmed_at?: string | null;
          position_title?: string | null;
          affiliation_type?: Database["portal"]["Enums"]["affiliation_type"];
          affiliation_status?: Database["portal"]["Enums"]["affiliation_status"];
          affiliation_requested_at?: string | null;
          affiliation_reviewed_at?: string | null;
          affiliation_reviewed_by?: string | null;
          homelessness_experience?: Database["portal"]["Enums"]["lived_experience_status"];
          substance_use_experience?: Database["portal"]["Enums"]["lived_experience_status"];
          has_signed_petition?: boolean;
          petition_signed_at?: string | null;
          government_role_type?: Database["portal"]["Enums"]["government_role_type"] | null;
          requested_organization_name?: string | null;
          requested_government_name?: string | null;
          requested_government_level?: Database["portal"]["Enums"]["government_level"] | null;
          requested_government_role?: Database["portal"]["Enums"]["government_role_type"] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "profiles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "profiles_affiliation_reviewed_by_fkey";
            columns: ["affiliation_reviewed_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
        ];
      };
      profile_contacts: {
        Row: {
          id: string;
          profile_id: string;
          user_id: string | null;
          contact_type: Database["portal"]["Enums"]["contact_method"];
          contact_value: string;
          normalized_value: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          user_id?: string | null;
          contact_type: Database["portal"]["Enums"]["contact_method"];
          contact_value: string;
          normalized_value: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          user_id?: string | null;
          contact_type?: Database["portal"]["Enums"]["contact_method"];
          contact_value?: string;
          normalized_value?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_contacts_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "profile_contacts_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }?,
        ];
      };
      registration_flows: {
        Row: {
          id: string;
          flow_type: string;
          status: string;
          portal_code: string | null;
          supabase_user_id: string | null;
          profile_id: string | null;
          chosen_name: string;
          legal_name: string | null;
          pronouns: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          contact_phone_safe_call: boolean | null;
          contact_phone_safe_text: boolean | null;
          contact_phone_safe_voicemail: boolean | null;
          contact_window: string | null;
          date_of_birth_month: number | null;
          date_of_birth_year: number | null;
          postal_code: string | null;
          indigenous_identity: string | null;
          disability: string | null;
          gender_identity: string | null;
          consent_data_sharing: boolean | null;
          consent_contact: boolean | null;
          consent_terms: boolean | null;
          metadata: Json;
          claimed_at: string | null;
          created_at: string;
          updated_at: string;
          created_by_user_id: string | null;
          updated_by_user_id: string | null;
        };
        Insert: {
          id?: string;
          flow_type: string;
          status?: string;
          portal_code?: string | null;
          supabase_user_id?: string | null;
          profile_id?: string | null;
          chosen_name: string;
          legal_name?: string | null;
          pronouns?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          contact_phone_safe_call?: boolean | null;
          contact_phone_safe_text?: boolean | null;
          contact_phone_safe_voicemail?: boolean | null;
          contact_window?: string | null;
          date_of_birth_month?: number | null;
          date_of_birth_year?: number | null;
          postal_code?: string | null;
          indigenous_identity?: string | null;
          disability?: string | null;
          gender_identity?: string | null;
          consent_data_sharing?: boolean | null;
          consent_contact?: boolean | null;
          consent_terms?: boolean | null;
          metadata?: Json;
          claimed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by_user_id?: string | null;
          updated_by_user_id?: string | null;
        };
        Update: {
          id?: string;
          flow_type?: string;
          status?: string;
          portal_code?: string | null;
          supabase_user_id?: string | null;
          profile_id?: string | null;
          chosen_name?: string;
          legal_name?: string | null;
          pronouns?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          contact_phone_safe_call?: boolean | null;
          contact_phone_safe_text?: boolean | null;
          contact_phone_safe_voicemail?: boolean | null;
          contact_window?: string | null;
          date_of_birth_month?: number | null;
          date_of_birth_year?: number | null;
          postal_code?: string | null;
          indigenous_identity?: string | null;
          disability?: string | null;
          gender_identity?: string | null;
          consent_data_sharing?: boolean | null;
          consent_contact?: boolean | null;
          consent_terms?: boolean | null;
          metadata?: Json;
          claimed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by_user_id?: string | null;
          updated_by_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "registration_flows_profile_fk";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "registration_flows_supabase_user_fk";
            columns: ["supabase_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }?,
        ];
      };
      roles: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          priority: number;
          is_system: boolean;
          created_at: string;
          updated_at: string;
          created_by_profile_id: string | null;
          updated_by_profile_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          priority?: number;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by_profile_id?: string | null;
          updated_by_profile_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
          priority?: number;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by_profile_id?: string | null;
          updated_by_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "roles_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "roles_updated_by_profile_id_fkey";
            columns: ["updated_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
        ];
      };
      permissions: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
          created_by_profile_id: string | null;
          updated_by_profile_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by_profile_id?: string | null;
          updated_by_profile_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by_profile_id?: string | null;
          updated_by_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "permissions_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "permissions_updated_by_profile_id_fkey";
            columns: ["updated_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
        ];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
          created_at: string;
          created_by_profile_id: string | null;
        };
        Insert: {
          role_id: string;
          permission_id: string;
          created_at?: string;
          created_by_profile_id?: string | null;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
          created_at?: string;
          created_by_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            referencedRelation: "roles";
            referencedColumns: ["id"];
          }?,
        ];
      };
      profile_roles: {
        Row: {
          id: string;
          profile_id: string;
          role_id: string;
          granted_by_profile_id: string | null;
          granted_at: string;
          revoked_at: string | null;
          updated_at: string;
          revoked_by_profile_id: string | null;
          reason: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          role_id: string;
          granted_by_profile_id?: string | null;
          granted_at?: string;
          revoked_at?: string | null;
          updated_at?: string;
          revoked_by_profile_id?: string | null;
          reason?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          role_id?: string;
          granted_by_profile_id?: string | null;
          granted_at?: string;
          revoked_at?: string | null;
          updated_at?: string;
          revoked_by_profile_id?: string | null;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profile_roles_granted_by_profile_id_fkey";
            columns: ["granted_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "profile_roles_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "profile_roles_revoked_by_profile_id_fkey";
            columns: ["revoked_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "profile_roles_role_id_fkey";
            columns: ["role_id"];
            referencedRelation: "roles";
            referencedColumns: ["id"];
          }?,
        ];
      };
      profile_invites: {
        Row: {
          id: string;
          email?: string | null;
          phone?: string | null;
          display_name: string | null;
          position_title: string | null;
          affiliation_type: Database["portal"]["Enums"]["affiliation_type"];
          organization_id: string | null;
          message: string | null;
          status: Database["portal"]["Enums"]["invite_status"];
          token: string;
          invited_by_profile_id: string | null;
          invited_by_user_id: string | null;
          user_id: string | null;
          profile_id: string | null;
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string | null;
          position_title?: string | null;
          affiliation_type: Database["portal"]["Enums"]["affiliation_type"];
          organization_id?: string | null;
          message?: string | null;
          status?: Database["portal"]["Enums"]["invite_status"];
          token?: string;
          invited_by_profile_id?: string | null;
          invited_by_user_id?: string | null;
          user_id?: string | null;
          profile_id?: string | null;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          display_name?: string | null;
          position_title?: string | null;
          affiliation_type?: Database["portal"]["Enums"]["affiliation_type"];
          organization_id?: string | null;
          message?: string | null;
          status?: Database["portal"]["Enums"]["invite_status"];
          token?: string;
          invited_by_profile_id?: string | null;
          invited_by_user_id?: string | null;
          user_id?: string | null;
          profile_id?: string | null;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_invites_invited_by_profile_id_fkey";
            columns: ["invited_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "profile_invites_invited_by_user_id_fkey";
            columns: ["invited_by_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "profile_invites_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "profile_invites_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "profile_invites_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
          referencedColumns: ["id"];
        }?,
      ];
      };
      petitions: {
        Row: {
          id: string;
          slug: string;
          title: string;
          lede: string;
          description: string | null;
          hero_statement: string | null;
          pledge_statement: string;
          cta_label: string;
          target_signatures: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          lede: string;
          description?: string | null;
          hero_statement?: string | null;
          pledge_statement: string;
          cta_label?: string;
          target_signatures?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          lede?: string;
          description?: string | null;
          hero_statement?: string | null;
          pledge_statement?: string;
          cta_label?: string;
          target_signatures?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      petition_signatures: {
        Row: {
          id: string;
          petition_id: string;
          profile_id: string;
          user_id: string | null;
          statement: string | null;
          share_with_partners: boolean;
          created_at: string;
          withdrawn_at: string | null;
          first_name: string;
          last_name: string;
          email_contact_id: string | null;
          phone_contact_id: string | null;
          postal_code: string;
          display_preference: Database["portal"]["Enums"]["petition_display_preference"];
        };
        Insert: {
          id?: string;
          petition_id: string;
          profile_id: string;
          user_id?: string | null;
          statement?: string | null;
          share_with_partners?: boolean;
          created_at?: string;
          withdrawn_at?: string | null;
          first_name: string;
          last_name: string;
          email_contact_id?: string | null;
          phone_contact_id?: string | null;
          postal_code: string;
          display_preference: Database["portal"]["Enums"]["petition_display_preference"];
        };
        Update: {
          id?: string;
          petition_id?: string;
          profile_id?: string;
          user_id?: string | null;
          statement?: string | null;
          share_with_partners?: boolean;
          created_at?: string;
          withdrawn_at?: string | null;
          first_name?: string;
          last_name?: string;
          email_contact_id?: string | null;
          phone_contact_id?: string | null;
          postal_code?: string;
          display_preference?: Database["portal"]["Enums"]["petition_display_preference"];
        };
        Relationships: [
          {
            foreignKeyName: "petition_signatures_petition_id_fkey";
            columns: ["petition_id"];
            referencedRelation: "petitions";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "petition_signatures_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "petition_signatures_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "petition_signatures_email_contact_id_fkey";
            columns: ["email_contact_id"];
            referencedRelation: "profile_contacts";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "petition_signatures_phone_contact_id_fkey";
            columns: ["phone_contact_id"];
            referencedRelation: "profile_contacts";
            referencedColumns: ["id"];
          }?,
        ];
      };
      ideas: {
        Row: {
          id: string;
          author_profile_id: string;
          title: string;
          body: string;
          problem_statement: string | null;
          evidence: string | null;
          proposal_summary: string | null;
          implementation_steps: string | null;
          risks: string | null;
          success_metrics: string | null;
          category: Database["portal"]["Enums"]["idea_category"];
          tags: string[];
          status: Database["portal"]["Enums"]["idea_status"];
          publication_status: Database["portal"]["Enums"]["idea_publication_status"];
          is_anonymous: boolean;
          attachments: Json;
          vote_count: number;
          comment_count: number;
          flag_count: number;
          assignee_profile_id: string | null;
          last_activity_at: string;
          created_at: string;
          updated_at: string;
          search_vector: unknown;
        };
        Insert: {
          id?: string;
          author_profile_id: string;
          title: string;
          body: string;
          problem_statement?: string | null;
          evidence?: string | null;
          proposal_summary?: string | null;
          implementation_steps?: string | null;
          risks?: string | null;
          success_metrics?: string | null;
          category?: Database["portal"]["Enums"]["idea_category"];
          tags?: string[];
          status?: Database["portal"]["Enums"]["idea_status"];
          publication_status?: Database["portal"]["Enums"]["idea_publication_status"];
          is_anonymous?: boolean;
          attachments?: Json;
          vote_count?: number;
          comment_count?: number;
          flag_count?: number;
          assignee_profile_id?: string | null;
          last_activity_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_profile_id?: string;
          title?: string;
          body?: string;
          problem_statement?: string | null;
          evidence?: string | null;
          proposal_summary?: string | null;
          implementation_steps?: string | null;
          risks?: string | null;
          success_metrics?: string | null;
          category?: Database["portal"]["Enums"]["idea_category"];
          tags?: string[];
          status?: Database["portal"]["Enums"]["idea_status"];
          publication_status?: Database["portal"]["Enums"]["idea_publication_status"];
          is_anonymous?: boolean;
          attachments?: Json;
          vote_count?: number;
          comment_count?: number;
          flag_count?: number;
          assignee_profile_id?: string | null;
          last_activity_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ideas_author_profile_id_fkey";
            columns: ["author_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "ideas_assignee_profile_id_fkey";
            columns: ["assignee_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
        ];
      };
      idea_edits: {
        Row: {
          id: string;
          idea_id: string;
          editor_profile_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          editor_profile_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          idea_id?: string;
          editor_profile_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_edits_editor_profile_id_fkey";
            columns: ["editor_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "idea_edits_idea_id_fkey";
            columns: ["idea_id"];
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          }?,
        ];
      };
      idea_metrics: {
        Row: {
          id: string;
          idea_id: string;
          metric_label: string;
          success_definition: string | null;
          baseline: string | null;
          target: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          metric_label: string;
          success_definition?: string | null;
          baseline?: string | null;
          target?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          idea_id?: string;
          metric_label?: string;
          success_definition?: string | null;
          baseline?: string | null;
          target?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_metrics_idea_id_fkey";
            columns: ["idea_id"];
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          }?,
        ];
      };
      plans: {
        Row: {
          id: string;
          idea_id: string;
          slug: string;
          title: string;
          canonical_summary: string;
          status: Database["portal"]["Enums"]["idea_status"];
          created_by_profile_id: string | null;
          promoted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          slug: string;
          title: string;
          canonical_summary: string;
          status?: Database["portal"]["Enums"]["idea_status"];
          created_by_profile_id?: string | null;
          promoted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          idea_id?: string;
          slug?: string;
          title?: string;
          canonical_summary?: string;
          status?: Database["portal"]["Enums"]["idea_status"];
          created_by_profile_id?: string | null;
          promoted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plans_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "plans_idea_id_fkey";
            columns: ["idea_id"];
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          }?,
        ];
      };
      plan_focus_areas: {
        Row: {
          id: string;
          plan_id: string;
          name: string;
          summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          name: string;
          summary?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          name?: string;
          summary?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_focus_areas_plan_id_fkey";
            columns: ["plan_id"];
            referencedRelation: "plans";
            referencedColumns: ["id"];
          }?,
        ];
      };
      plan_key_dates: {
        Row: {
          id: string;
          plan_id: string;
          title: string;
          scheduled_for: string;
          notes: string | null;
          created_by_profile_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          title: string;
          scheduled_for: string;
          notes?: string | null;
          created_by_profile_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          title?: string;
          scheduled_for?: string;
          notes?: string | null;
          created_by_profile_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_key_dates_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "plan_key_dates_plan_id_fkey";
            columns: ["plan_id"];
            referencedRelation: "plans";
            referencedColumns: ["id"];
          }?,
        ];
      };
      plan_updates: {
        Row: {
          id: string;
          plan_id: string;
          author_profile_id: string;
          problem: string;
          evidence: string;
          proposed_change: string;
          impact: string;
          risks: string;
          measurement: string;
          status: Database["portal"]["Enums"]["plan_update_status"];
          opened_at: string | null;
          decided_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          author_profile_id: string;
          problem: string;
          evidence: string;
          proposed_change: string;
          impact: string;
          risks: string;
          measurement: string;
          status?: Database["portal"]["Enums"]["plan_update_status"];
          opened_at?: string | null;
          decided_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          author_profile_id?: string;
          problem?: string;
          evidence?: string;
          proposed_change?: string;
          impact?: string;
          risks?: string;
          measurement?: string;
          status?: Database["portal"]["Enums"]["plan_update_status"];
          opened_at?: string | null;
          decided_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_updates_author_profile_id_fkey";
            columns: ["author_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "plan_updates_plan_id_fkey";
            columns: ["plan_id"];
            referencedRelation: "plans";
            referencedColumns: ["id"];
          }?,
        ];
      };
      plan_decision_notes: {
        Row: {
          id: string;
          plan_id: string;
          plan_update_id: string | null;
          author_profile_id: string | null;
          decision: string;
          summary: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          plan_update_id?: string | null;
          author_profile_id?: string | null;
          decision: string;
          summary: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          plan_update_id?: string | null;
          author_profile_id?: string | null;
          decision?: string;
          summary?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_decision_notes_author_profile_id_fkey";
            columns: ["author_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "plan_decision_notes_plan_id_fkey";
            columns: ["plan_id"];
            referencedRelation: "plans";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "plan_decision_notes_plan_update_id_fkey";
            columns: ["plan_update_id"];
            referencedRelation: "plan_updates";
            referencedColumns: ["id"];
          }?,
        ];
      };
      plan_update_votes: {
        Row: {
          plan_update_id: string;
          voter_profile_id: string;
          reaction: Database["portal"]["Enums"]["reaction_type"];
          created_at: string;
        };
        Insert: {
          plan_update_id: string;
          voter_profile_id: string;
          reaction?: Database["portal"]["Enums"]["reaction_type"];
          created_at?: string;
        };
        Update: {
          plan_update_id?: string;
          voter_profile_id?: string;
          reaction?: Database["portal"]["Enums"]["reaction_type"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_update_votes_plan_update_id_fkey";
            columns: ["plan_update_id"];
            referencedRelation: "plan_updates";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "plan_update_votes_voter_profile_id_fkey";
            columns: ["voter_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
        ];
      };
      resource_pages: {
        Row: {
          id: string;
          slug: string;
          title: string;
          kind: Database["portal"]["Enums"]["resource_kind"];
          summary: string | null;
          location: string | null;
          date_published: string;
          tags: string[];
          attachments: Json;
          embed: Json | null;
          embed_placement: Database["portal"]["Enums"]["resource_embed_placement"];
          body_html: string;
          is_published: boolean;
          cover_image: string | null;
          created_by_profile_id: string | null;
          updated_by_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          kind?: Database["portal"]["Enums"]["resource_kind"];
          summary?: string | null;
          location?: string | null;
          date_published: string;
          tags?: string[];
          attachments?: Json;
          embed?: Json | null;
          embed_placement?: Database["portal"]["Enums"]["resource_embed_placement"];
          body_html?: string;
          is_published?: boolean;
          cover_image?: string | null;
          created_by_profile_id?: string | null;
          updated_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          kind?: Database["portal"]["Enums"]["resource_kind"];
          summary?: string | null;
          location?: string | null;
          date_published?: string;
          tags?: string[];
          attachments?: Json;
          embed?: Json | null;
          embed_placement?: Database["portal"]["Enums"]["resource_embed_placement"];
          body_html?: string;
          is_published?: boolean;
          cover_image?: string | null;
          created_by_profile_id?: string | null;
          updated_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resource_pages_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "resource_pages_updated_by_profile_id_fkey";
            columns: ["updated_by_profile_id"];
          referencedRelation: "profiles";
          referencedColumns: ["id"];
          }?,
        ];
      };
      policies: {
        Row: {
          id: string;
          slug: string;
          title: string;
          category: Database["portal"]["Enums"]["policy_category"];
          short_summary: string;
          body_html: string;
          status: Database["portal"]["Enums"]["policy_status"];
          is_published: boolean | null;
          sort_order: number;
          last_reviewed_at: string;
          effective_from: string | null;
          effective_to: string | null;
          internal_ref: string | null;
          created_by_profile_id: string | null;
          updated_by_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          category?: Database["portal"]["Enums"]["policy_category"];
          short_summary: string;
          body_html?: string;
          status?: Database["portal"]["Enums"]["policy_status"];
          is_published?: boolean | null;
          sort_order?: number;
          last_reviewed_at?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          internal_ref?: string | null;
          created_by_profile_id?: string | null;
          updated_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          category?: Database["portal"]["Enums"]["policy_category"];
          short_summary?: string;
          body_html?: string;
          status?: Database["portal"]["Enums"]["policy_status"];
          is_published?: boolean | null;
          sort_order?: number;
          last_reviewed_at?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          internal_ref?: string | null;
          created_by_profile_id?: string | null;
          updated_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "policies_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "policies_updated_by_profile_id_fkey";
            columns: ["updated_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
        ];
      };
      site_footer_settings: {
        Row: {
          id: string;
          slot: string;
          primary_text: string;
          secondary_text: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by_profile_id: string | null;
          updated_by_profile_id: string | null;
        };
        Insert: {
          id?: string;
          slot?: string;
          primary_text: string;
          secondary_text?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by_profile_id?: string | null;
          updated_by_profile_id?: string | null;
        };
        Update: {
          id?: string;
          slot?: string;
          primary_text?: string;
          secondary_text?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by_profile_id?: string | null;
          updated_by_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "site_footer_settings_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "site_footer_settings_updated_by_profile_id_fkey";
            columns: ["updated_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
        ];
      };
      comments: {
        Row: {
          id: string;
          idea_id: string;
          author_profile_id: string;
          parent_comment_id: string | null;
          body: string;
          is_official: boolean;
          comment_type: Database["portal"]["Enums"]["comment_type"];
          depth: number;
          created_at: string;
          updated_at: string;
          evidence_url: string | null;
        };
        Insert: {
          id?: string;
          idea_id: string;
          author_profile_id: string;
          parent_comment_id?: string | null;
          body: string;
          is_official?: boolean;
          comment_type?: Database["portal"]["Enums"]["comment_type"];
          depth?: number;
          created_at?: string;
          updated_at?: string;
          evidence_url?: string | null;
        };
        Update: {
          id?: string;
          idea_id?: string;
          author_profile_id?: string;
          parent_comment_id?: string | null;
          body?: string;
          is_official?: boolean;
          comment_type?: Database["portal"]["Enums"]["comment_type"];
          depth?: number;
          created_at?: string;
          updated_at?: string;
          evidence_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comments_author_profile_id_fkey";
            columns: ["author_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "comments_parent_comment_id_fkey";
            columns: ["parent_comment_id"];
            referencedRelation: "comments";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "comments_idea_id_fkey";
            columns: ["idea_id"];
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          }?,
        ];
      };
      votes: {
        Row: {
          idea_id: string;
          voter_profile_id: string;
          reaction: Database["portal"]["Enums"]["reaction_type"];
          created_at: string;
        };
        Insert: {
          idea_id: string;
          voter_profile_id: string;
          reaction?: Database["portal"]["Enums"]["reaction_type"];
          created_at?: string;
        };
        Update: {
          idea_id?: string;
          voter_profile_id?: string;
          reaction?: Database["portal"]["Enums"]["reaction_type"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "votes_idea_id_fkey";
            columns: ["idea_id"];
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "votes_voter_profile_id_fkey";
            columns: ["voter_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
        ];
      };
      flags: {
        Row: {
          id: string;
          entity_type: Database["portal"]["Enums"]["flag_entity_type"];
          entity_id: string;
          reporter_profile_id: string;
          reason: Database["portal"]["Enums"]["flag_reason"];
          details: string | null;
          status: Database["portal"]["Enums"]["flag_status"];
          resolved_by_profile_id: string | null;
          resolved_at: string | null;
          resolution_note: string | null;
          created_at: string;
          updated_at: string;
          idea_id: string | null;
          comment_id: string | null;
        };
        Insert: {
          id?: string;
          entity_type: Database["portal"]["Enums"]["flag_entity_type"];
          entity_id: string;
          reporter_profile_id: string;
          reason: Database["portal"]["Enums"]["flag_reason"];
          details?: string | null;
          status?: Database["portal"]["Enums"]["flag_status"];
          resolved_by_profile_id?: string | null;
          resolved_at?: string | null;
          resolution_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: Database["portal"]["Enums"]["flag_entity_type"];
          entity_id?: string;
          reporter_profile_id?: string;
          reason?: Database["portal"]["Enums"]["flag_reason"];
          details?: string | null;
          status?: Database["portal"]["Enums"]["flag_status"];
          resolved_by_profile_id?: string | null;
          resolved_at?: string | null;
          resolution_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portal_flags_comment_fk";
            columns: ["comment_id"];
            referencedRelation: "comments";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "flags_reporter_profile_id_fkey";
            columns: ["reporter_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "flags_resolved_by_profile_id_fkey";
            columns: ["resolved_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "portal_flags_idea_fk";
            columns: ["idea_id"];
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          }?,
        ];
      };
      idea_decisions: {
        Row: {
          id: string;
          idea_id: string;
          author_profile_id: string | null;
          summary: string;
          visibility: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          author_profile_id?: string | null;
          summary: string;
          visibility?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          idea_id?: string;
          author_profile_id?: string | null;
          summary?: string;
          visibility?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_decisions_author_profile_id_fkey";
            columns: ["author_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "idea_decisions_idea_id_fkey";
            columns: ["idea_id"];
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          }?,
        ];
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string | null;
          recipient_email: string;
          subject: string;
          body_text: string;
          body_html: string | null;
          idea_id: string | null;
          notification_type: string;
          channels: string[];
          payload: Json;
          status: string;
          created_at: string;
          sent_at: string | null;
          acknowledged_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          recipient_email: string;
          subject: string;
          body_text: string;
          body_html?: string | null;
          idea_id?: string | null;
          notification_type: string;
          channels?: string[];
          payload?: Json;
          status?: string;
          created_at?: string;
          sent_at?: string | null;
          acknowledged_at?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          recipient_email?: string;
          subject?: string;
          body_text?: string;
          body_html?: string | null;
          idea_id?: string | null;
          notification_type?: string;
          channels?: string[];
          payload?: Json;
          status?: string;
          created_at?: string;
          sent_at?: string | null;
          acknowledged_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "notifications_idea_id_fkey";
            columns: ["idea_id"];
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          }?,
        ];
      };
      audit_log: {
        Row: {
          id: string;
          actor_profile_id: string | null;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_profile_id?: string | null;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_profile_id?: string | null;
          actor_user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_profile_id_fkey";
            columns: ["actor_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }?,
          {
            foreignKeyName: "audit_log_actor_user_id_fkey";
            columns: ["actor_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }?,
        ];
      };
      metric_catalog: {
        Row: {
          id: string;
          slug: string;
          label: string;
          unit: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          label: string;
          unit?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          label?: string;
          unit?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      metric_daily: {
        Row: {
          metric_date: string;
          metric_id: string;
          value: number | null;
          value_status: Database["portal"]["Enums"]["metric_value_status"];
          source: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          metric_date: string;
          metric_id: string;
          value?: number | null;
          value_status?: Database["portal"]["Enums"]["metric_value_status"];
          source?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          metric_date?: string;
          metric_id?: string;
          value?: number | null;
          value_status?: Database["portal"]["Enums"]["metric_value_status"];
          source?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "metric_daily_metric_id_fkey";
            columns: ["metric_id"];
            referencedRelation: "metric_catalog";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      idea_reaction_totals: {
        Row: {
          idea_id: string;
          reaction: Database["portal"]["Enums"]["reaction_type"];
          reaction_count: number;
        };
        Relationships: [];
      };
      plan_update_reaction_totals: {
        Row: {
          plan_update_id: string;
          reaction: Database["portal"]["Enums"]["reaction_type"];
          reaction_count: number;
        };
        Relationships: [];
      };
      petition_public_summary: {
        Row: {
          id: string;
          slug: string;
          title: string;
          lede: string;
          description: string | null;
          hero_statement: string | null;
          pledge_statement: string;
          cta_label: string;
          target_signatures: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          signature_count: number;
          first_signed_at: string | null;
          last_signed_at: string | null;
        };
        Relationships: [];
      };
      petition_public_signers: {
        Row: {
          petition_id: string | null;
          created_at: string | null;
          display_name: string | null;
          display_preference: Database["portal"]["Enums"]["petition_display_preference"] | null;
        };
        Relationships: [];
      };
      petition_signature_totals: {
        Row: {
          petition_id: string;
          signature_count: number;
          first_signed_at: string | null;
          last_signed_at: string | null;
        };
        Relationships: [];
      };
      pit_public_breakdowns: {
        Row: {
          pit_count_id: string;
          dimension: string;
          dimension_label: string;
          dimension_sort: number;
          bucket: string;
          bucket_label: string;
          bucket_sort: number;
          total: number | null;
          percentage: number | null;
          suppressed: boolean;
          suppressed_reason: string | null;
          total_encounters: number;
          last_observation_at: string | null;
        };
        Relationships: [];
      };
      pit_public_summary: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          status: "planned" | "active" | "closed";
          is_active: boolean;
          observed_start: string | null;
          observed_end: string | null;
          municipality: string | null;
          methodology: string | null;
          updated_at: string;
          last_observation_at: string | null;
          total_encounters: number;
          wants_treatment_yes_count: number;
          wants_treatment_no_count: number;
          wants_treatment_not_suitable_count: number;
          wants_treatment_not_applicable_count: number;
          addiction_positive_count: number;
          mental_health_positive_count: number;
          homelessness_confirmed_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      add_guest_petition_signature: {
        Args: {
          p_petition_id: string;
          p_first_name: string;
          p_last_name: string;
          p_email: string;
          p_postal_code: string;
          p_display_preference?: Database["portal"]["Enums"]["petition_display_preference"] | null;
          p_statement?: string | null;
          p_share_with_partners?: boolean | null;
        };
        Returns: {
          signature_id: string;
          profile_id: string;
        }[];
      };
      current_profile_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      current_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["portal"]["Enums"]["profile_role"] | null;
      };
      current_role_in: {
        Args: { roles: Database["portal"]["Enums"]["profile_role"][] };
        Returns: boolean;
      };
      normalize_phone: {
        Args: { value: string | null };
        Returns: string | null;
      };
    };
    Enums: {
      profile_role: "user" | "org_rep" | "moderator" | "admin";
      affiliation_type: "community_member" | "agency_partner" | "government_partner";
      affiliation_status: "approved" | "pending" | "revoked";
      lived_experience_status: "none" | "current" | "former" | "prefer_not_to_share";
      invite_status: "pending" | "accepted" | "cancelled" | "expired";
      contact_method: "email" | "phone";
      organization_category: "community" | "government";
      government_level: "municipal" | "county" | "provincial" | "federal" | "other";
      government_role_type: "staff" | "politician";
      idea_category: "Housing" | "Health" | "Policing" | "Community" | "Prevention" | "Other";
      idea_status:
        | "new"
        | "under_review"
        | "in_progress"
        | "adopted"
        | "not_feasible"
        | "archived";
      idea_publication_status: "draft" | "published" | "archived";
      comment_type: "question" | "suggestion" | "response" | "official_note";
      flag_entity_type: "idea" | "comment";
      flag_reason: "privacy" | "abuse" | "hate" | "spam" | "wrong_cat" | "other";
      flag_status: "open" | "reviewing" | "resolved" | "rejected";
      metric_value_status: "reported" | "pending";
      plan_update_status:
        | "draft"
        | "open"
        | "accepted"
        | "not_moving_forward"
        | "added_to_plan";
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
        | "minus_one";
      resource_kind:
        | "delegation"
        | "report"
        | "presentation"
        | "policy"
        | "press"
        | "dataset"
        | "other";
      resource_embed_placement: "above" | "below";
      policy_category:
        | "client_rights"
        | "safety"
        | "staff"
        | "governance"
        | "operations"
        | "finance";
      policy_status: "draft" | "published" | "archived";
      petition_display_preference:
        | "anonymous"
        | "first_name_last_initial"
        | "full_name";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          id: string;
          name: string;
          owner: string | null;
          public: boolean;
          avif_autodetection: boolean | null;
          allowed_mime_types: string[] | null;
          created_at: string | null;
          updated_at: string | null;
          file_size_limit: number | null;
          bucket_size_limit: number | null;
        };
        Insert: {
          id: string;
          name: string;
          owner?: string | null;
          public?: boolean;
          avif_autodetection?: boolean | null;
          allowed_mime_types?: string[] | null;
          created_at?: string | null;
          updated_at?: string | null;
          file_size_limit?: number | null;
          bucket_size_limit?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          owner?: string | null;
          public?: boolean;
          avif_autodetection?: boolean | null;
          allowed_mime_types?: string[] | null;
          created_at?: string | null;
          updated_at?: string | null;
          file_size_limit?: number | null;
          bucket_size_limit?: number | null;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          id: string;
          bucket_id: string | null;
          name: string | null;
          owner: string | null;
          created_at: string | null;
          updated_at: string | null;
          last_accessed_at: string | null;
          metadata: Json | null;
          path_tokens: string[] | null;
          version: string | null;
          size: number | null;
          mime_type: string | null;
        };
        Insert: {
          id?: string;
          bucket_id?: string | null;
          name?: string | null;
          owner?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          path_tokens?: string[] | null;
          version?: string | null;
          size?: number | null;
          mime_type?: string | null;
        };
        Update: {
          id?: string;
          bucket_id?: string | null;
          name?: string | null;
          owner?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          path_tokens?: string[] | null;
          version?: string | null;
          size?: number | null;
          mime_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          }?,
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

export type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  SchemaNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends SchemaNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[SchemaNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = SchemaNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[SchemaNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : SchemaNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][SchemaNameOrOptions]
    : never;

export const Constants = {
  portal: {
    Enums: {
      profile_role: ["user", "org_rep", "moderator", "admin"] as const,
      affiliation_type: ["community_member", "agency_partner", "government_partner"] as const,
      affiliation_status: ["approved", "pending", "revoked"] as const,
      lived_experience_status: ["none", "current", "former", "prefer_not_to_share"] as const,
      invite_status: ["pending", "accepted", "cancelled", "expired"] as const,
      contact_method: ["email", "phone"] as const,
      idea_category: ["Housing", "Health", "Policing", "Community", "Prevention", "Other"] as const,
      idea_status: ["new", "under_review", "in_progress", "adopted", "not_feasible", "archived"] as const,
      idea_publication_status: ["draft", "published", "archived"] as const,
      flag_entity_type: ["idea", "comment"] as const,
      flag_reason: ["privacy", "abuse", "hate", "spam", "wrong_cat", "other"] as const,
      flag_status: ["open", "reviewing", "resolved", "rejected"] as const,
      petition_display_preference: [
        "anonymous",
        "first_name_last_initial",
        "full_name",
      ] as const,
      resource_kind: [
        "delegation",
        "report",
        "presentation",
        "policy",
        "press",
        "dataset",
        "other",
      ] as const,
    },
  },
} as const;
