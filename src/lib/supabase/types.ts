import type {
  Checklist,
  CollabRequest,
  FrictionRecord,
  NotificationType,
  Problem,
  ProblemPayload,
  Profile,
} from "@/lib/types";

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
          looking_for_collaborators: boolean;
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
          looking_for_collaborators?: boolean;
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
          looking_for_collaborators?: boolean;
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
      collab_requests: {
        Row: {
          id: string;
          problem_id: string | null;
          from_profile_id: string;
          to_profile_id: string;
          message: string;
          status: CollabRequest["status"];
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          problem_id?: string | null;
          from_profile_id: string;
          to_profile_id: string;
          message?: string;
          status?: CollabRequest["status"];
        };
        Update: {
          status?: CollabRequest["status"];
          responded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "collab_requests_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "problems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collab_requests_from_profile_id_fkey";
            columns: ["from_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collab_requests_to_profile_id_fkey";
            columns: ["to_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      problem_likes: {
        Row: {
          problem_id: string;
          profile_id: string;
          created_at: string;
        };
        Insert: {
          problem_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["problem_likes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "problem_likes_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "problems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "problem_likes_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      problem_comments: {
        Row: {
          id: string;
          problem_id: string;
          profile_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          problem_id: string;
          profile_id: string;
          body: string;
        };
        Update: {
          body?: string;
        };
        Relationships: [
          {
            foreignKeyName: "problem_comments_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "problems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "problem_comments_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          type: NotificationType;
          actor_profile_id: string | null;
          problem_id: string | null;
          collab_request_id: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          profile_id: string;
          type: NotificationType;
          actor_profile_id?: string | null;
          problem_id?: string | null;
          collab_request_id?: string | null;
          read?: boolean;
        };
        Update: {
          read?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_actor_profile_id_fkey";
            columns: ["actor_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "problems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_collab_request_id_fkey";
            columns: ["collab_request_id"];
            isOneToOne: false;
            referencedRelation: "collab_requests";
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
