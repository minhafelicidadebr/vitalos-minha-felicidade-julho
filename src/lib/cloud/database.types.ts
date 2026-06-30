// Tipos TypeScript do schema Supabase (ADR-003 Migration v1.0.0).
// Gerado manualmente — após "bun run supabase gen types" estará auto-gerado.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          pack_id: string;
          plan: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["organizations"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          org_id: string;
          role: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at"> & {
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      waves: {
        Row: {
          id: string;
          org_id: string;
          instrument: string;
          label: string | null;
          status: WaveStatus;
          invited_count: number;
          closes_at: string | null;
          created_at: string;
          sealed_at: string | null;
          seal_outcome: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["waves"]["Row"],
          "id" | "created_at" | "invited_count" | "status"
        > & {
          id?: string;
          created_at?: string;
          invited_count?: number;
          status?: WaveStatus;
        };
        Update: Partial<Database["public"]["Tables"]["waves"]["Insert"]>;
      };
      wave_invites: {
        Row: {
          token: string;
          wave_id: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["wave_invites"]["Row"], "token" | "created_at"> & {
          token?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wave_invites"]["Insert"]>;
      };
      wave_responses: {
        Row: {
          id: string;
          wave_id: string;
          invite_token: string | null;
          answers: Json;
          submitted_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["wave_responses"]["Row"],
          "id" | "submitted_at"
        > & {
          id?: string;
          submitted_at?: string;
        };
        Update: never; // respostas são imutáveis
      };
      wave_capsules: {
        Row: {
          id: string;
          wave_id: string;
          org_id: string;
          instrument: string;
          participant_count: number;
          aggregated_at: string;
          closed_on: string | null;
          cohort_id: string | null;
          dimensions: Json;
          outcomes: Json | null;
          suppressed_dims: string[] | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["wave_capsules"]["Row"],
          "id" | "aggregated_at"
        > & {
          id?: string;
          aggregated_at?: string;
        };
        Update: never; // capsules são imutáveis
      };
    };
    Functions: {
      count_wave_responses: {
        Args: { p_wave_id: string };
        Returns: number;
      };
      is_invite_valid: {
        Args: { p_token: string };
        Returns: boolean;
      };
    };
  };
}

export type WaveStatus =
  | "draft"
  | "scheduled"
  | "collecting"
  | "sealed"
  | "archived"
  | "cancelled";

export type OrgRow = Database["public"]["Tables"]["organizations"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type WaveRow = Database["public"]["Tables"]["waves"]["Row"];
export type WaveInviteRow = Database["public"]["Tables"]["wave_invites"]["Row"];
export type WaveCapsuleRow = Database["public"]["Tables"]["wave_capsules"]["Row"];
