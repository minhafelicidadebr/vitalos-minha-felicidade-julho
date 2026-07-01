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
      org_invites: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          expires_at: string | null
          token: string
          used_at: string | null
          used_by_org_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          token?: string
          used_at?: string | null
          used_by_org_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
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
          created_at: string | null
          id: string
          name: string
          pack_id: string
          plan: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          pack_id?: string
          plan?: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          pack_id?: string
          plan?: string
          slug?: string
        }
        Relationships: []
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
            isOneToOne: false
            referencedRelation: "waves"
            referencedColumns: ["id"]
          },
        ]
      }
      wave_invites: {
        Row: {
          created_at: string | null
          token: string
          used_at: string | null
          wave_id: string
        }
        Insert: {
          created_at?: string | null
          token?: string
          used_at?: string | null
          wave_id: string
        }
        Update: {
          created_at?: string | null
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
