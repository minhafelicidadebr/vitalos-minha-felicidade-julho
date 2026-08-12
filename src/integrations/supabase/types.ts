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
      action_items: {
        Row: {
          amb_emoji: string | null
          amb_id: string | null
          amb_name: string | null
          cmo_context: string | null
          cmo_mechanism: string | null
          cmo_outcome: string | null
          control_tier: string | null
          created_at: string
          description: string
          due_on: string | null
          effort: string
          end_week: number
          esg_codes: string[]
          expected_ivo_lift: number
          id: string
          is_quick_win: boolean
          lens_color: string | null
          lens_id: string | null
          lens_label: string | null
          lever_id: string
          metric_baseline: number | null
          metric_label: string | null
          metric_target: number | null
          metric_unit: string | null
          milestone_week: number
          org_id: string
          owner_role_label: string | null
          owner_user_id: string | null
          plan_id: string
          rank: number
          start_week: number
          status: string
          title: string
          updated_at: string
          weeks_budget: number
        }
        Insert: {
          amb_emoji?: string | null
          amb_id?: string | null
          amb_name?: string | null
          cmo_context?: string | null
          cmo_mechanism?: string | null
          cmo_outcome?: string | null
          control_tier?: string | null
          created_at?: string
          description?: string
          due_on?: string | null
          effort: string
          end_week: number
          esg_codes?: string[]
          expected_ivo_lift?: number
          id?: string
          is_quick_win?: boolean
          lens_color?: string | null
          lens_id?: string | null
          lens_label?: string | null
          lever_id: string
          metric_baseline?: number | null
          metric_label?: string | null
          metric_target?: number | null
          metric_unit?: string | null
          milestone_week: number
          org_id: string
          owner_role_label?: string | null
          owner_user_id?: string | null
          plan_id: string
          rank: number
          start_week: number
          status?: string
          title: string
          updated_at?: string
          weeks_budget: number
        }
        Update: {
          amb_emoji?: string | null
          amb_id?: string | null
          amb_name?: string | null
          cmo_context?: string | null
          cmo_mechanism?: string | null
          cmo_outcome?: string | null
          control_tier?: string | null
          created_at?: string
          description?: string
          due_on?: string | null
          effort?: string
          end_week?: number
          esg_codes?: string[]
          expected_ivo_lift?: number
          id?: string
          is_quick_win?: boolean
          lens_color?: string | null
          lens_id?: string | null
          lens_label?: string | null
          lever_id?: string
          metric_baseline?: number | null
          metric_label?: string | null
          metric_target?: number | null
          metric_unit?: string | null
          milestone_week?: number
          org_id?: string
          owner_role_label?: string | null
          owner_user_id?: string | null
          plan_id?: string
          rank?: number
          start_week?: number
          status?: string
          title?: string
          updated_at?: string
          weeks_budget?: number
        }
        Relationships: [
          {
            foreignKeyName: "action_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "action_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      action_log: {
        Row: {
          actor_role_label: string
          actor_user_id: string
          event_kind: string
          evidence_id: string | null
          id: string
          item_id: string
          maintained: boolean | null
          note: string | null
          occurred_at: string
          org_id: string
          to_status: string | null
        }
        Insert: {
          actor_role_label: string
          actor_user_id: string
          event_kind: string
          evidence_id?: string | null
          id?: string
          item_id: string
          maintained?: boolean | null
          note?: string | null
          occurred_at?: string
          org_id: string
          to_status?: string | null
        }
        Update: {
          actor_role_label?: string
          actor_user_id?: string
          event_kind?: string
          evidence_id?: string | null
          id?: string
          item_id?: string
          maintained?: boolean | null
          note?: string | null
          occurred_at?: string
          org_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_log_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_log_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      action_plans: {
        Row: {
          activated_at: string | null
          created_at: string
          created_by: string
          cycle_key: string
          id: string
          org_id: string
          season_name: string
          source_capsule_id: string | null
          status: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          created_by: string
          cycle_key: string
          id?: string
          org_id: string
          season_name: string
          source_capsule_id?: string | null
          status?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          created_by?: string
          cycle_key?: string
          id?: string
          org_id?: string
          season_name?: string
          source_capsule_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_source_capsule_id_fkey"
            columns: ["source_capsule_id"]
            isOneToOne: false
            referencedRelation: "wave_capsules"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_sessions: {
        Row: {
          created_at: string
          driver_id: string
          embassy_id: string
          facilitator_id: string
          id: string
          occurred_on: string
          org_id: string
          presence_count: number
        }
        Insert: {
          created_at?: string
          driver_id: string
          embassy_id: string
          facilitator_id: string
          id?: string
          occurred_on: string
          org_id: string
          presence_count: number
        }
        Update: {
          created_at?: string
          driver_id?: string
          embassy_id?: string
          facilitator_id?: string
          id?: string
          occurred_on?: string
          org_id?: string
          presence_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "circle_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      devolutiva_sessions: {
        Row: {
          attendance_count: number
          capsule_id: string | null
          closed_at: string | null
          created_at: string
          facilitator_user_id: string
          held_on: string
          id: string
          org_id: string
          pauta_driver_ids: string[] | null
          priority_votes: Json
          script_version: string
          status: string
        }
        Insert: {
          attendance_count?: number
          capsule_id?: string | null
          closed_at?: string | null
          created_at?: string
          facilitator_user_id: string
          held_on?: string
          id?: string
          org_id: string
          pauta_driver_ids?: string[] | null
          priority_votes?: Json
          script_version?: string
          status?: string
        }
        Update: {
          attendance_count?: number
          capsule_id?: string | null
          closed_at?: string | null
          created_at?: string
          facilitator_user_id?: string
          held_on?: string
          id?: string
          org_id?: string
          pauta_driver_ids?: string[] | null
          priority_votes?: Json
          script_version?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "devolutiva_sessions_capsule_id_fkey"
            columns: ["capsule_id"]
            isOneToOne: false
            referencedRelation: "wave_capsules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolutiva_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      esg_report_snapshots: {
        Row: {
          content_hash: string
          generated_at: string
          generated_by: string
          id: string
          org_id: string
          payload: Json
          year: number
        }
        Insert: {
          content_hash: string
          generated_at?: string
          generated_by: string
          id?: string
          org_id: string
          payload: Json
          year: number
        }
        Update: {
          content_hash?: string
          generated_at?: string
          generated_by?: string
          id?: string
          org_id?: string
          payload?: Json
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "esg_report_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_records: {
        Row: {
          consent_ref: string | null
          content_ref: string
          created_at: string
          evidence_kind: string
          id: string
          item_id: string
          lever_id: string
          occurred_on: string
          org_id: string
          recorded_by: string
          source_kind: string
        }
        Insert: {
          consent_ref?: string | null
          content_ref: string
          created_at?: string
          evidence_kind: string
          id?: string
          item_id: string
          lever_id: string
          occurred_on: string
          org_id: string
          recorded_by: string
          source_kind?: string
        }
        Update: {
          consent_ref?: string | null
          content_ref?: string
          created_at?: string
          evidence_kind?: string
          id?: string
          item_id?: string
          lever_id?: string
          occurred_on?: string
          org_id?: string
          recorded_by?: string
          source_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_records_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      item_funnel_events: {
        Row: {
          completed: boolean
          created_at: string
          elapsed_ms: number
          id: string
          instrument: string
          item_timings: Json
          pack_id: string
          total_items: number
        }
        Insert: {
          completed: boolean
          created_at?: string
          elapsed_ms: number
          id?: string
          instrument: string
          item_timings: Json
          pack_id: string
          total_items: number
        }
        Update: {
          completed?: boolean
          created_at?: string
          elapsed_ms?: number
          id?: string
          instrument?: string
          item_timings?: Json
          pack_id?: string
          total_items?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          company: string
          consent: boolean
          consent_version: string
          created_at: string
          email: string
          id: string
          interest: string
          name: string
          role: string | null
          source_page: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          whatsapp: string | null
        }
        Insert: {
          company: string
          consent: boolean
          consent_version: string
          created_at?: string
          email: string
          id?: string
          interest: string
          name: string
          role?: string | null
          source_page: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp?: string | null
        }
        Update: {
          company?: string
          consent?: boolean
          consent_version?: string
          created_at?: string
          email?: string
          id?: string
          interest?: string
          name?: string
          role?: string | null
          source_page?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      member_invites: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string | null
          org_id: string
          role: string
          token: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at?: string | null
          org_id: string
          role: string
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string | null
          org_id?: string
          role?: string
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_events: {
        Row: {
          context: Json
          event: string
          id: string
          occurred_at: string
          org_id: string | null
          reason: string | null
          wave_id: string | null
        }
        Insert: {
          context?: Json
          event: string
          id?: string
          occurred_at?: string
          org_id?: string | null
          reason?: string | null
          wave_id?: string | null
        }
        Update: {
          context?: Json
          event?: string
          id?: string
          occurred_at?: string
          org_id?: string | null
          reason?: string | null
          wave_id?: string | null
        }
        Relationships: []
      }
      org_cycle_registry: {
        Row: {
          capsule_id: string
          cycle_key: string
          id: string
          instrument: string
          org_id: string
          registered_at: string
          registered_by: string
        }
        Insert: {
          capsule_id: string
          cycle_key: string
          id?: string
          instrument: string
          org_id: string
          registered_at?: string
          registered_by: string
        }
        Update: {
          capsule_id?: string
          cycle_key?: string
          id?: string
          instrument?: string
          org_id?: string
          registered_at?: string
          registered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_cycle_registry_capsule_id_fkey"
            columns: ["capsule_id"]
            isOneToOne: true
            referencedRelation: "wave_capsules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_cycle_registry_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invites: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          expires_at: string | null
          plan: string | null
          token: string
          used_at: string | null
          used_by_org_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          plan?: string | null
          token?: string
          used_at?: string | null
          used_by_org_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          plan?: string | null
          token?: string
          used_at?: string | null
          used_by_org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_used_by_org_id_fkey"
            columns: ["used_by_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string | null
          id: string
          name: string
          pack_id: string
          phone: string | null
          plan: string
          segment: string | null
          slug: string
          team_size_band: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          name: string
          pack_id?: string
          phone?: string | null
          plan?: string
          segment?: string | null
          slug: string
          team_size_band?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          name?: string
          pack_id?: string
          phone?: string | null
          plan?: string
          segment?: string | null
          slug?: string
          team_size_band?: string | null
        }
        Relationships: []
      }
      pair_directory_entries: {
        Row: {
          display_name: string
          focus_driver_id: string
          id: string
          org_id: string
          shared_strength_ids: string[]
          updated_at: string
          user_id: string
          visible: boolean
        }
        Insert: {
          display_name: string
          focus_driver_id: string
          id?: string
          org_id: string
          shared_strength_ids?: string[]
          updated_at?: string
          user_id: string
          visible?: boolean
        }
        Update: {
          display_name?: string
          focus_driver_id?: string
          id?: string
          org_id?: string
          shared_strength_ids?: string[]
          updated_at?: string
          user_id?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pair_directory_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pair_invites: {
        Row: {
          created_at: string
          focus_driver_id: string
          from_user: string
          id: string
          org_id: string
          responded_at: string | null
          status: string
          to_user: string
        }
        Insert: {
          created_at?: string
          focus_driver_id: string
          from_user: string
          id?: string
          org_id: string
          responded_at?: string | null
          status?: string
          to_user: string
        }
        Update: {
          created_at?: string
          focus_driver_id?: string
          from_user?: string
          id?: string
          org_id?: string
          responded_at?: string | null
          status?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "pair_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pair_records: {
        Row: {
          active: boolean
          dissolved_at: string | null
          focus_driver_id: string
          formed_on: string
          id: string
          member_a: string
          member_b: string
          org_id: string
        }
        Insert: {
          active?: boolean
          dissolved_at?: string | null
          focus_driver_id: string
          formed_on?: string
          id?: string
          member_a: string
          member_b: string
          org_id: string
        }
        Update: {
          active?: boolean
          dissolved_at?: string | null
          focus_driver_id?: string
          formed_on?: string
          id?: string
          member_a?: string
          member_b?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pair_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      participation_events: {
        Row: {
          capped: boolean
          category: string
          created_at: string
          event_id: string
          id: string
          kind: string
          occurred_on: string
          source_id: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          capped?: boolean
          category: string
          created_at?: string
          event_id: string
          id?: string
          kind: string
          occurred_on: string
          source_id: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          capped?: boolean
          category?: string
          created_at?: string
          event_id?: string
          id?: string
          kind?: string
          occurred_on?: string
          source_id?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      personal_assessments: {
        Row: {
          created_at: string
          engine_version: string
          id: string
          instrument: string
          instrument_version: string
          result: Json
          taken_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engine_version: string
          id?: string
          instrument: string
          instrument_version: string
          result: Json
          taken_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          engine_version?: string
          id?: string
          instrument?: string
          instrument_version?: string
          result?: Json
          taken_at?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_entries: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          kind: string
          occurred_on: string
          org_id: string
          share_consent: boolean
          summary: string
          user_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          kind: string
          occurred_on: string
          org_id: string
          share_consent?: boolean
          summary: string
          user_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          kind?: string
          occurred_on?: string
          org_id?: string
          share_consent?: boolean
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          org_id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id: string
          org_id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          org_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_links: {
        Row: {
          access_mode: string
          created_at: string
          expires_at: string
          id: string
          org_id: string
          revoked_at: string | null
          sector_label: string
          status: string
          token_hash: string
          wave_id: string
        }
        Insert: {
          access_mode?: string
          created_at?: string
          expires_at: string
          id?: string
          org_id: string
          revoked_at?: string | null
          sector_label: string
          status?: string
          token_hash: string
          wave_id: string
        }
        Update: {
          access_mode?: string
          created_at?: string
          expires_at?: string
          id?: string
          org_id?: string
          revoked_at?: string | null
          sector_label?: string
          status?: string
          token_hash?: string
          wave_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sector_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_links_wave_id_fkey"
            columns: ["wave_id"]
            isOneToOne: false
            referencedRelation: "waves"
            referencedColumns: ["id"]
          },
        ]
      }
      seed_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          item_id: string | null
          kind: string
          occurred_on: string
          org_id: string
          pool_id: string | null
          recipient_id: string | null
          source_kind: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          item_id?: string | null
          kind: string
          occurred_on: string
          org_id: string
          pool_id?: string | null
          recipient_id?: string | null
          source_kind?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          item_id?: string | null
          kind?: string
          occurred_on?: string
          org_id?: string
          pool_id?: string | null
          recipient_id?: string | null
          source_kind?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seed_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sm2_card_state: {
        Row: {
          card_id: string
          easiness: number
          id: string
          interval_days: number
          lapses: number
          repetition: number
          reviewed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          easiness?: number
          id?: string
          interval_days?: number
          lapses?: number
          repetition?: number
          reviewed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          easiness?: number
          id?: string
          interval_days?: number
          lapses?: number
          repetition?: number
          reviewed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      victory_records: {
        Row: {
          content_hash: string
          cycle_key: string
          driver_id: string
          id: string
          issued_at: string
          issued_by: string
          org_id: string
          payload: Json
        }
        Insert: {
          content_hash: string
          cycle_key: string
          driver_id: string
          id?: string
          issued_at?: string
          issued_by: string
          org_id: string
          payload: Json
        }
        Update: {
          content_hash?: string
          cycle_key?: string
          driver_id?: string
          id?: string
          issued_at?: string
          issued_by?: string
          org_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "victory_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wave_capsules: {
        Row: {
          aggregated_at: string | null
          closed_on: string | null
          cohort_id: string | null
          dimensions: Json
          id: string
          instrument: string
          org_id: string
          outcomes: Json | null
          participant_count: number
          suppressed_dims: string[] | null
          wave_id: string
        }
        Insert: {
          aggregated_at?: string | null
          closed_on?: string | null
          cohort_id?: string | null
          dimensions: Json
          id?: string
          instrument: string
          org_id: string
          outcomes?: Json | null
          participant_count: number
          suppressed_dims?: string[] | null
          wave_id: string
        }
        Update: {
          aggregated_at?: string | null
          closed_on?: string | null
          cohort_id?: string | null
          dimensions?: Json
          id?: string
          instrument?: string
          org_id?: string
          outcomes?: Json | null
          participant_count?: number
          suppressed_dims?: string[] | null
          wave_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wave_capsules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wave_capsules_wave_id_fkey"
            columns: ["wave_id"]
            isOneToOne: true
            referencedRelation: "waves"
            referencedColumns: ["id"]
          },
        ]
      }
      wave_cohorts: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string
          org_id: string
          wave_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label: string
          org_id: string
          wave_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string
          org_id?: string
          wave_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wave_cohorts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wave_cohorts_wave_id_fkey"
            columns: ["wave_id"]
            isOneToOne: false
            referencedRelation: "waves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wave_cohorts_wave_org_fk"
            columns: ["wave_id", "org_id"]
            isOneToOne: false
            referencedRelation: "waves"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      wave_invites: {
        Row: {
          cohort_id: string | null
          created_at: string | null
          email: string | null
          emailed_at: string | null
          expires_at: string | null
          token: string
          used_at: string | null
          wave_id: string
        }
        Insert: {
          cohort_id?: string | null
          created_at?: string | null
          email?: string | null
          emailed_at?: string | null
          expires_at?: string | null
          token?: string
          used_at?: string | null
          wave_id: string
        }
        Update: {
          cohort_id?: string | null
          created_at?: string | null
          email?: string | null
          emailed_at?: string | null
          expires_at?: string | null
          token?: string
          used_at?: string | null
          wave_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wave_invites_cohort_wave_fk"
            columns: ["cohort_id", "wave_id"]
            isOneToOne: false
            referencedRelation: "wave_cohorts"
            referencedColumns: ["id", "wave_id"]
          },
          {
            foreignKeyName: "wave_invites_wave_id_fkey"
            columns: ["wave_id"]
            isOneToOne: false
            referencedRelation: "waves"
            referencedColumns: ["id"]
          },
        ]
      }
      wave_responses: {
        Row: {
          answers: Json
          cohort_id: string | null
          consent_accepted_at: string | null
          consent_version: string | null
          id: string
          instrument: string | null
          instrument_version: string | null
          submitted_at: string | null
          wave_id: string
        }
        Insert: {
          answers: Json
          cohort_id?: string | null
          consent_accepted_at?: string | null
          consent_version?: string | null
          id?: string
          instrument?: string | null
          instrument_version?: string | null
          submitted_at?: string | null
          wave_id: string
        }
        Update: {
          answers?: Json
          cohort_id?: string | null
          consent_accepted_at?: string | null
          consent_version?: string | null
          id?: string
          instrument?: string | null
          instrument_version?: string | null
          submitted_at?: string | null
          wave_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wave_responses_cohort_wave_fk"
            columns: ["cohort_id", "wave_id"]
            isOneToOne: false
            referencedRelation: "wave_cohorts"
            referencedColumns: ["id", "wave_id"]
          },
          {
            foreignKeyName: "wave_responses_wave_id_fkey"
            columns: ["wave_id"]
            isOneToOne: false
            referencedRelation: "waves"
            referencedColumns: ["id"]
          },
        ]
      }
      waves: {
        Row: {
          closes_at: string | null
          created_at: string | null
          id: string
          instrument: string
          instrument_version: string | null
          invited_count: number | null
          label: string | null
          org_id: string
          seal_outcome: string | null
          sealed_at: string | null
          status: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string | null
          id?: string
          instrument: string
          instrument_version?: string | null
          invited_count?: number | null
          label?: string | null
          org_id: string
          seal_outcome?: string | null
          sealed_at?: string | null
          status?: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string | null
          id?: string
          instrument?: string
          instrument_version?: string | null
          invited_count?: number | null
          label?: string | null
          org_id?: string
          seal_outcome?: string | null
          sealed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "waves_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_member_invite: {
        Args: { p_invite_token: string; p_user_id: string }
        Returns: {
          error: string
          org_id: string
          role: string
        }[]
      }
      accept_pair_invite: {
        Args: { p_invite_id: string }
        Returns: {
          accepted: boolean
          pair_id: string
          reason: string
        }[]
      }
      activate_action_plan: {
        Args: { p_plan_id: string }
        Returns: {
          accepted: boolean
          incomplete_count: number
          reason: string
        }[]
      }
      aggregate_cohort_responses: {
        Args: { p_cohort_id: string; p_wave_id: string }
        Returns: {
          domain_means: Json
          factor_scores: Json
          item_means: Json
          k_min: number
          response_count: number
          response_count_label: string
          suppression_reason: string
          visible: boolean
        }[]
      }
      cancel_pair_invite: { Args: { p_invite_id: string }; Returns: boolean }
      cast_priority_vote: {
        Args: { p_driver_id: string; p_session_id: string }
        Returns: {
          accepted: boolean
          reason: string
          votes: Json
        }[]
      }
      close_devolutiva_session: {
        Args: { p_candidate_driver_ids: string[]; p_session_id: string }
        Returns: {
          accepted: boolean
          pauta: string[]
          published: boolean
          reason: string
        }[]
      }
      count_cohort_participation: {
        Args: { p_cohort_id: string; p_wave_id: string }
        Returns: number
      }
      count_wave_responses: { Args: { p_wave_id: string }; Returns: number }
      create_action_plan: {
        Args: {
          p_created_by: string
          p_cycle_key: string
          p_items: Json
          p_org_id: string
          p_season_name: string
          p_source_capsule_id: string
        }
        Returns: {
          accepted: boolean
          plan_id: string
          reason: string
        }[]
      }
      create_esg_snapshot: {
        Args: {
          p_content_hash: string
          p_generated_by: string
          p_org_id: string
          p_payload: Json
          p_year: number
        }
        Returns: {
          accepted: boolean
          reason: string
          snapshot_id: string
        }[]
      }
      decline_pair_invite: { Args: { p_invite_id: string }; Returns: boolean }
      erase_my_assessments: {
        Args: never
        Returns: {
          accepted: boolean
          erased_count: number
        }[]
      }
      is_invite_valid: { Args: { p_token: string }; Returns: boolean }
      is_invite_valid_for_wave: {
        Args: { p_token: string; p_wave_id: string }
        Returns: boolean
      }
      mark_invite_used: { Args: { p_token: string }; Returns: undefined }
      open_devolutiva_session: {
        Args: {
          p_capsule_id: string
          p_facilitator_user_id: string
          p_org_id: string
          p_script_version: string
        }
        Returns: {
          accepted: boolean
          reason: string
          session_id: string
        }[]
      }
      provision_organization_from_invite: {
        Args: {
          p_address?: string
          p_cnpj: string
          p_invite_token: string
          p_org_name: string
          p_org_slug: string
          p_pack_id: string
          p_phone: string
          p_role: string
          p_segment?: string
          p_team_size_band: string
          p_user_id: string
        }
        Returns: {
          error: string
          org_id: string
          plan: string
          profile_id: string
        }[]
      }
      record_action_event: {
        Args: {
          p_actor_role_label: string
          p_actor_user_id: string
          p_event_kind: string
          p_item_id: string
          p_maintained: boolean
          p_note: string
          p_to_status: string
        }
        Returns: {
          accepted: boolean
          reason: string
        }[]
      }
      record_evidence: {
        Args: {
          p_actor_role_label: string
          p_consent_ref: string
          p_content_ref: string
          p_evidence_kind: string
          p_item_id: string
          p_occurred_on: string
          p_recorded_by: string
          p_source_kind: string
        }
        Returns: {
          accepted: boolean
          evidence_id: string
          reason: string
        }[]
      }
      record_item_funnel_event: {
        Args: {
          p_completed: boolean
          p_elapsed_ms: number
          p_instrument: string
          p_item_timings: Json
          p_pack_id: string
          p_total_items: number
        }
        Returns: {
          accepted: boolean
          reason: string
        }[]
      }
      register_org_cycle: {
        Args: {
          p_capsule_id: string
          p_cycle_key: string
          p_instrument: string
          p_org_id: string
          p_registered_by: string
        }
        Returns: {
          accepted: boolean
          reason: string
          registry_id: string
        }[]
      }
      seal_victory_record: {
        Args: {
          p_content_hash: string
          p_cycle_key: string
          p_driver_id: string
          p_issued_by: string
          p_org_id: string
          p_payload: Json
        }
        Returns: {
          accepted: boolean
          reason: string
          record_id: string
        }[]
      }
      set_action_item_accountability: {
        Args: {
          p_cmo_context: string
          p_cmo_mechanism: string
          p_cmo_outcome: string
          p_control_tier: string
          p_due_on: string
          p_item_id: string
          p_metric_baseline: number
          p_metric_label: string
          p_metric_target: number
          p_metric_unit: string
          p_owner_role_label: string
          p_owner_user_id: string
        }
        Returns: {
          accepted: boolean
          reason: string
        }[]
      }
      set_devolutiva_attendance: {
        Args: { p_attendance_count: number; p_session_id: string }
        Returns: {
          accepted: boolean
          reason: string
        }[]
      }
      submit_sector_response: {
        Args: { p_answers: Json; p_consent_version: string; p_token_hash: string }
        Returns: {
          accepted: boolean
          reason: string
          response_count: number
        }[]
      }
      submit_wave_response: {
        Args: { p_answers: Json; p_invite_token: string; p_wave_id: string }
        Returns: {
          accepted: boolean
          reason: string
          response_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
