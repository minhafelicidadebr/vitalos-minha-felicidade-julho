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
      wave_invites: {
        Row: {
          created_at: string | null
          emailed_at: string | null
          token: string
          used_at: string | null
          wave_id: string
        }
        Insert: {
          created_at?: string | null
          emailed_at?: string | null
          token?: string
          used_at?: string | null
          wave_id: string
        }
        Update: {
          created_at?: string | null
          emailed_at?: string | null
          token?: string
          used_at?: string | null
          wave_id?: string
        }
        Relationships: [
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
          id: string
          invite_token: string | null
          submitted_at: string | null
          wave_id: string
        }
        Insert: {
          answers: Json
          id?: string
          invite_token?: string | null
          submitted_at?: string | null
          wave_id: string
        }
        Update: {
          answers?: Json
          id?: string
          invite_token?: string | null
          submitted_at?: string | null
          wave_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wave_responses_invite_token_fkey"
            columns: ["invite_token"]
            isOneToOne: false
            referencedRelation: "wave_invites"
            referencedColumns: ["token"]
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
      count_wave_responses: { Args: { p_wave_id: string }; Returns: number }
      is_invite_valid: { Args: { p_token: string }; Returns: boolean }
      is_invite_valid_for_wave: {
        Args: { p_token: string; p_wave_id: string }
        Returns: boolean
      }
      mark_invite_used: { Args: { p_token: string }; Returns: undefined }
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
      submit_sector_response: {
        Args: { p_answers: Json; p_token_hash: string }
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
