import type { Problem, Profile } from "@/lib/types";

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
          skills: Profile["skills"];
          interests: string[];
          artifact_prefs: string[];
          time_budget: Profile["timeBudget"];
          team_size: Profile["teamSize"];
          appetite: Profile["appetite"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          handle: string;
          display_name: string;
          skills: Profile["skills"];
          interests: string[];
          artifact_prefs: string[];
          time_budget: Profile["timeBudget"];
          team_size: Profile["teamSize"];
          appetite: Profile["appetite"];
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      problems: {
        Row: {
          id: string;
          fingerprint: string;
          profile_id: string;
          payload: Omit<
            Problem,
            "id" | "fingerprint" | "profileId" | "status" | "notes" | "createdAt"
          >;
          status: Problem["status"];
          notes: string;
          domain_id: string;
          fit: number;
          difficulty: number;
          created_at: string;
        };
        Insert: {
          id: string;
          fingerprint: string;
          profile_id: string;
          payload: Omit<
            Problem,
            "id" | "fingerprint" | "profileId" | "status" | "notes" | "createdAt"
          >;
          status: Problem["status"];
          notes: string;
          domain_id: string;
          fit: number;
          difficulty: number;
          created_at: string;
        };
        Update: {
          status?: Problem["status"];
          notes?: string;
        };
        Relationships: [
          {
            foreignKeyName: "problems_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
