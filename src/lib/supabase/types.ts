import type { Checklist, FrictionRecord, Problem, ProblemPayload, Profile } from "@/lib/types";

/**
 * Hand-written to match supabase/schema.sql, in the same shape the Supabase
 * CLI's `gen types` would produce. `@supabase/postgrest-js`'s generic table
 * constraint requires `Relationships` (even if empty) to resolve insert/
 * update/select overloads correctly - omit it and every write silently
 * infers as `never`. Keep this in sync when the schema changes.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          handle: string;
          display_name: string;
          bio: string;
          skills: Profile["skills"];
          interests: string[];
          artifact_prefs: string[];
          time_budget: Profile["timeBudget"];
          team_size: Profile["teamSize"];
          appetite: Profile["appetite"];
          is_admin: boolean;
          discoverable: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          handle: string;
          display_name: string;
          bio?: string;
          skills: Profile["skills"];
          interests: string[];
          artifact_prefs: string[];
          time_budget: Profile["timeBudget"];
          team_size: Profile["teamSize"];
          appetite: Profile["appetite"];
          discoverable?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["follows"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      problems: {
        Row: {
          id: string;
          fingerprint: string;
          profile_id: string;
          payload: ProblemPayload;
          status: Problem["status"];
          notes: string;
          checklist: Checklist;
          feedback: Problem["feedback"];
          domain_id: string;
          friction_id: string | null;
          fit: number;
          difficulty: number;
          created_at: string;
        };
        Insert: {
          id: string;
          fingerprint: string;
          profile_id: string;
          payload: ProblemPayload;
          status: Problem["status"];
          notes: string;
          checklist?: Checklist;
          feedback?: Problem["feedback"];
          domain_id: string;
          friction_id?: string | null;
          fit: number;
          difficulty: number;
          created_at: string;
        };
        Update: {
          status?: Problem["status"];
          notes?: string;
          checklist?: Checklist;
          feedback?: Problem["feedback"];
        };
        Relationships: [
          {
            foreignKeyName: "problems_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "problems_friction_id_fkey";
            columns: ["friction_id"];
            isOneToOne: false;
            referencedRelation: "frictions";
            referencedColumns: ["id"];
          },
        ];
      };
      frictions: {
        Row: {
          id: string;
          domain_id: string;
          actor: string;
          text: string;
          mechanics: string[];
          status: FrictionRecord["status"];
          submitted_by: string | null;
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          domain_id: string;
          actor: string;
          text: string;
          mechanics: string[];
          status?: FrictionRecord["status"];
          submitted_by?: string | null;
        };
        Update: {
          status?: FrictionRecord["status"];
          reviewed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "frictions_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      progress_entries: {
        Row: {
          id: string;
          problem_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          problem_id: string;
          body: string;
        };
        Update: {
          body?: string;
        };
        Relationships: [
          {
            foreignKeyName: "progress_entries_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "problems";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
