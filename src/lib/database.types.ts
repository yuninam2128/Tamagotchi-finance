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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          choice: number
          correct: boolean
          created_at: string
          day: string
          id: number
          item_id: string
          ms: number | null
          points: number
          uid: string
        }
        Insert: {
          choice: number
          correct: boolean
          created_at?: string
          day: string
          id?: never
          item_id: string
          ms?: number | null
          points?: number
          uid: string
        }
        Update: {
          choice?: number
          correct?: boolean
          created_at?: string
          day?: string
          id?: never
          item_id?: string
          ms?: number | null
          points?: number
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uid"]
          },
        ]
      }
      daily_sets: {
        Row: {
          day: string
          extra_ids: string[]
          idx: number
          item_ids: string[]
          reasons: Json
          uid: string
        }
        Insert: {
          day: string
          extra_ids?: string[]
          idx?: number
          item_ids: string[]
          reasons: Json
          uid: string
        }
        Update: {
          day?: string
          extra_ids?: string[]
          idx?: number
          item_ids?: string[]
          reasons?: Json
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_sets_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uid"]
          },
        ]
      }
      forecasts: {
        Row: {
          asset: Database["public"]["Enums"]["asset_kind"]
          day: string
          hit: boolean | null
          move: number | null
          notified_at: string | null
          pick: string
          points: number
          resolved_at: string | null
          uid: string
        }
        Insert: {
          asset: Database["public"]["Enums"]["asset_kind"]
          day: string
          hit?: boolean | null
          move?: number | null
          notified_at?: string | null
          pick: string
          points?: number
          resolved_at?: string | null
          uid: string
        }
        Update: {
          asset?: Database["public"]["Enums"]["asset_kind"]
          day?: string
          hit?: boolean | null
          move?: number | null
          notified_at?: string | null
          pick?: string
          points?: number
          resolved_at?: string | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecasts_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uid"]
          },
        ]
      }
      items: {
        Row: {
          active: boolean
          answer: number
          body: Json
          diagnostic: boolean
          difficulty: number
          explanation: string
          id: string
          promo: Json | null
          skill_id: string
          sources: Json
          type: Database["public"]["Enums"]["item_type"]
        }
        Insert: {
          active?: boolean
          answer: number
          body: Json
          diagnostic?: boolean
          difficulty?: number
          explanation: string
          id: string
          promo?: Json | null
          skill_id: string
          sources?: Json
          type: Database["public"]["Enums"]["item_type"]
        }
        Update: {
          active?: boolean
          answer?: number
          body?: Json
          diagnostic?: boolean
          difficulty?: number
          explanation?: string
          id?: string
          promo?: Json | null
          skill_id?: string
          sources?: Json
          type?: Database["public"]["Enums"]["item_type"]
        }
        Relationships: [
          {
            foreignKeyName: "items_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      market_moves: {
        Row: {
          asset: Database["public"]["Enums"]["asset_kind"]
          base: number
          base_at: string | null
          day: string
          fetched_at: string
          move: number
          target: number
          target_at: string | null
        }
        Insert: {
          asset: Database["public"]["Enums"]["asset_kind"]
          base: number
          base_at?: string | null
          day: string
          fetched_at?: string
          move: number
          target: number
          target_at?: string | null
        }
        Update: {
          asset?: Database["public"]["Enums"]["asset_kind"]
          base?: number
          base_at?: string | null
          day?: string
          fetched_at?: string
          move?: number
          target?: number
          target_at?: string | null
        }
        Relationships: []
      }
      news: {
        Row: {
          fetched_at: string
          id: string
          link: string
          published_at: string
          source: string | null
          title: string
        }
        Insert: {
          fetched_at?: string
          id: string
          link: string
          published_at: string
          source?: string | null
          title: string
        }
        Update: {
          fetched_at?: string
          id?: string
          link?: string
          published_at?: string
          source?: string | null
          title?: string
        }
        Relationships: []
      }
      pets: {
        Row: {
          born_on: string | null
          days: number
          form: string
          gen: number
          graduated_at: string
          id: number
          stats_end: Json | null
          stats_start: Json | null
          uid: string
        }
        Insert: {
          born_on?: string | null
          days: number
          form: string
          gen: number
          graduated_at?: string
          id?: never
          stats_end?: Json | null
          stats_start?: Json | null
          uid: string
        }
        Update: {
          born_on?: string | null
          days?: number
          form?: string
          gen?: number
          graduated_at?: string
          id?: never
          stats_end?: Json | null
          stats_start?: Json | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "pets_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uid"]
          },
        ]
      }
      player_skills: {
        Row: {
          interval_days: number
          last_seen: string
          mastery: number
          next_due: string
          skill_id: string
          uid: string
        }
        Insert: {
          interval_days: number
          last_seen: string
          mastery: number
          next_due: string
          skill_id: string
          uid: string
        }
        Update: {
          interval_days?: number
          last_seen?: string
          mastery?: number
          next_due?: string
          skill_id?: string
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_skills_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uid"]
          },
        ]
      }
      players: {
        Row: {
          adult_on: string | null
          baseline: Json | null
          born_at: string | null
          created_at: string
          gen_stats: Json | null
          league_code: string | null
          nick: string | null
          pet_focus: string | null
          pet_form: string | null
          pet_gen: number
          pet_stage: number
          pet_start: string | null
          tier: number
          uid: string
        }
        Insert: {
          adult_on?: string | null
          baseline?: Json | null
          born_at?: string | null
          created_at?: string
          gen_stats?: Json | null
          league_code?: string | null
          nick?: string | null
          pet_focus?: string | null
          pet_form?: string | null
          pet_gen?: number
          pet_stage?: number
          pet_start?: string | null
          tier?: number
          uid: string
        }
        Update: {
          adult_on?: string | null
          baseline?: Json | null
          born_at?: string | null
          created_at?: string
          gen_stats?: Json | null
          league_code?: string | null
          nick?: string | null
          pet_focus?: string | null
          pet_form?: string | null
          pet_gen?: number
          pet_stage?: number
          pet_start?: string | null
          tier?: number
          uid?: string
        }
        Relationships: []
      }
      point_ledger: {
        Row: {
          day: string
          delta: number
          id: number
          reason: string
          ref_id: string | null
          ts: string
          uid: string
        }
        Insert: {
          day: string
          delta: number
          id?: never
          reason: string
          ref_id?: string | null
          ts?: string
          uid: string
        }
        Update: {
          day?: string
          delta?: number
          id?: never
          reason?: string
          ref_id?: string | null
          ts?: string
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_ledger_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uid"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          p256dh: string
          uid: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          p256dh: string
          uid: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          p256dh?: string
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uid"]
          },
        ]
      }
      redemptions: {
        Row: {
          amount: number
          id: number
          partner: string
          status: Database["public"]["Enums"]["redemption_status"]
          ts: string
          uid: string
        }
        Insert: {
          amount: number
          id?: never
          partner: string
          status?: Database["public"]["Enums"]["redemption_status"]
          ts?: string
          uid: string
        }
        Update: {
          amount?: number
          id?: never
          partner?: string
          status?: Database["public"]["Enums"]["redemption_status"]
          ts?: string
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uid"]
          },
        ]
      }
      skills: {
        Row: {
          id: string
          name: string
          sort: number
          stat: Database["public"]["Enums"]["stat_kind"]
        }
        Insert: {
          id: string
          name: string
          sort: number
          stat: Database["public"]["Enums"]["stat_kind"]
        }
        Update: {
          id?: string
          name?: string
          sort?: number
          stat?: Database["public"]["Enums"]["stat_kind"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_points: {
        Args: {
          p_day: string
          p_raw: number
          p_reason: string
          p_ref: string
          p_uid: string
        }
        Returns: number
      }
      build_daily_set: {
        Args: { p_day: string; p_uid: string }
        Returns: {
          day: string
          extra_ids: string[]
          idx: number
          item_ids: string[]
          reasons: Json
          uid: string
        }
        SetofOptions: {
          from: "*"
          to: "daily_sets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      choose_egg: { Args: { p_focus: string }; Returns: Json }
      effective_mastery: {
        Args: {
          p_interval: number
          p_mastery: number
          p_next_due: string
          p_today: string
        }
        Returns: number
      }
      get_daily_set: { Args: never; Returns: Json }
      get_home: { Args: never; Returns: Json }
      get_league: { Args: never; Returns: Json }
      get_my_skills: {
        Args: never
        Returns: {
          mastery: number
          name: string
          next_due: string
          skill_id: string
          sort: number
          stat: Database["public"]["Enums"]["stat_kind"]
        }[]
      }
      get_pet: { Args: never; Returns: Json }
      graduate_pet: { Args: never; Returns: Json }
      items_json: {
        Args: { p_day: string; p_ids: string[]; p_uid: string }
        Returns: Json
      }
      kst_today: { Args: never; Returns: string }
      pet_days: { Args: { p_from: string; p_uid: string }; Returns: number }
      resolve_forecasts: { Args: { p_day: string }; Returns: number }
      set_league: { Args: { p_code?: string }; Returns: string }
      start_treatment: {
        Args: { p_stat: Database["public"]["Enums"]["stat_kind"] }
        Returns: Json
      }
      stat_values: {
        Args: { p_uid: string }
        Returns: {
          stat: Database["public"]["Enums"]["stat_kind"]
          value: number
        }[]
      }
      submit_answer: {
        Args: { p_choice: number; p_item_id: string; p_ms?: number }
        Returns: Json
      }
      submit_diagnosis: { Args: { p_answers: Json }; Returns: Json }
      submit_forecast: {
        Args: {
          p_asset: Database["public"]["Enums"]["asset_kind"]
          p_pick: string
        }
        Returns: Json
      }
      update_pet: { Args: { p_uid: string }; Returns: Json }
      week_start: { Args: { p_day: string }; Returns: string }
    }
    Enums: {
      asset_kind: "kr" | "fx" | "coin"
      item_type: "quiz" | "fraud" | "case"
      redemption_status: "pending" | "done" | "failed" | "canceled"
      stat_kind: "shield" | "credit" | "home" | "flow"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      asset_kind: ["kr", "fx", "coin"],
      item_type: ["quiz", "fraud", "case"],
      redemption_status: ["pending", "done", "failed", "canceled"],
      stat_kind: ["shield", "credit", "home", "flow"],
    },
  },
} as const
