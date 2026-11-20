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
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      certifications: {
        Row: {
          credential_url: string | null
          end_date: string | null
          featured: boolean
          id: string
          issuer: string
          position: number
          start_date: string | null
          title: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          credential_url?: string | null
          end_date?: string | null
          featured?: boolean
          id?: string
          issuer: string
          position?: number
          start_date?: string | null
          title: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          credential_url?: string | null
          end_date?: string | null
          featured?: boolean
          id?: string
          issuer?: string
          position?: number
          start_date?: string | null
          title?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      competencies: {
        Row: {
          id: string
          position: number
          text: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          id?: string
          position?: number
          text: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          id?: string
          position?: number
          text?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      content_version: {
        Row: {
          id: number
          updated_at: string
          version: number
        }
        Insert: {
          id?: number
          updated_at?: string
          version?: number
        }
        Update: {
          id?: number
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      education: {
        Row: {
          degree: string
          id: string
          institution: string
          note: string | null
          position: number
          score: string | null
          score_label: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          degree: string
          id?: string
          institution: string
          note?: string | null
          position?: number
          score?: string | null
          score_label?: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          degree?: string
          id?: string
          institution?: string
          note?: string | null
          position?: number
          score?: string | null
          score_label?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          email: string
          id: string
          is_read: boolean
          name: string
          subject: string | null
        }
        Insert: {
          body: string
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          name: string
          subject?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      overview_rows: {
        Row: {
          id: string
          label: string
          position: number
          updated_at: string
          value: string
          visible: boolean
        }
        Insert: {
          id?: string
          label: string
          position?: number
          updated_at?: string
          value: string
          visible?: boolean
        }
        Update: {
          id?: string
          label?: string
          position?: number
          updated_at?: string
          value?: string
          visible?: boolean
        }
        Relationships: []
      }
      profile: {
        Row: {
          avatar_url: string | null
          email: string | null
          full_name: string
          headline: string | null
          id: number
          location: string | null
          phone: string | null
          resume_url: string | null
          show_email: boolean
          show_phone: boolean
          summary: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string
          headline?: string | null
          id?: number
          location?: string | null
          phone?: string | null
          resume_url?: string | null
          show_email?: boolean
          show_phone?: boolean
          summary?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string
          headline?: string | null
          id?: number
          location?: string | null
          phone?: string | null
          resume_url?: string | null
          show_email?: boolean
          show_phone?: boolean
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          bullets: string[]
          cover_url: string | null
          featured: boolean
          files: Json
          github_url: string | null
          id: string
          kicker: string | null
          live_url: string | null
          outcome: string | null
          position: number
          summary: string | null
          tagline: string | null
          tech: string[]
          title: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          bullets?: string[]
          cover_url?: string | null
          featured?: boolean
          files?: Json
          github_url?: string | null
          id?: string
          kicker?: string | null
          live_url?: string | null
          outcome?: string | null
          position?: number
          summary?: string | null
          tagline?: string | null
          tech?: string[]
          title: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          bullets?: string[]
          cover_url?: string | null
          featured?: boolean
          files?: Json
          github_url?: string | null
          id?: string
          kicker?: string | null
          live_url?: string | null
          outcome?: string | null
          position?: number
          summary?: string | null
          tagline?: string | null
          tech?: string[]
          title?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      publications: {
        Row: {
          id: string
          position: number
          published_on: string | null
          reference: string | null
          summary: string | null
          title: string
          updated_at: string
          url: string | null
          venue: string | null
          visible: boolean
        }
        Insert: {
          id?: string
          position?: number
          published_on?: string | null
          reference?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          url?: string | null
          venue?: string | null
          visible?: boolean
        }
        Update: {
          id?: string
          position?: number
          published_on?: string | null
          reference?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          venue?: string | null
          visible?: boolean
        }
        Relationships: []
      }
      sections: {
        Row: {
          content: Json
          eyebrow: string | null
          id: string
          nav_label: string | null
          position: number
          show_in_nav: boolean
          slug: string
          subtitle: string | null
          title: string | null
          type: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          content?: Json
          eyebrow?: string | null
          id?: string
          nav_label?: string | null
          position?: number
          show_in_nav?: boolean
          slug: string
          subtitle?: string | null
          title?: string | null
          type: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          content?: Json
          eyebrow?: string | null
          id?: string
          nav_label?: string | null
          position?: number
          show_in_nav?: boolean
          slug?: string
          subtitle?: string | null
          title?: string | null
          type?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          brand_name: string
          footer: Json
          hero: Json
          id: number
          logo_text: string
          nav_cta_label: string
          seo: Json
          theme: Json
          updated_at: string
        }
        Insert: {
          brand_name?: string
          footer?: Json
          hero?: Json
          id?: number
          logo_text?: string
          nav_cta_label?: string
          seo?: Json
          theme?: Json
          updated_at?: string
        }
        Update: {
          brand_name?: string
          footer?: Json
          hero?: Json
          id?: number
          logo_text?: string
          nav_cta_label?: string
          seo?: Json
          theme?: Json
          updated_at?: string
        }
        Relationships: []
      }
      skill_domains: {
        Row: {
          id: string
          position: number
          status: string
          title: string
          tools: string[]
          updated_at: string
          visible: boolean
        }
        Insert: {
          id?: string
          position?: number
          status?: string
          title: string
          tools?: string[]
          updated_at?: string
          visible?: boolean
        }
        Update: {
          id?: string
          position?: number
          status?: string
          title?: string
          tools?: string[]
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      social_links: {
        Row: {
          icon: string | null
          id: string
          label: string
          position: number
          updated_at: string
          url: string
          visible: boolean
        }
        Insert: {
          icon?: string | null
          id?: string
          label: string
          position?: number
          updated_at?: string
          url: string
          visible?: boolean
        }
        Update: {
          icon?: string | null
          id?: string
          label?: string
          position?: number
          updated_at?: string
          url?: string
          visible?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      public_profile: {
        Row: {
          avatar_url: string | null
          email: string | null
          full_name: string | null
          headline: string | null
          id: number | null
          location: string | null
          phone: string | null
          resume_url: string | null
          summary: string | null
        }
        Insert: {
          avatar_url?: string | null
          email?: never
          full_name?: string | null
          headline?: string | null
          id?: number | null
          location?: string | null
          phone?: never
          resume_url?: string | null
          summary?: string | null
        }
        Update: {
          avatar_url?: string | null
          email?: never
          full_name?: string | null
          headline?: string | null
          id?: number | null
          location?: string | null
          phone?: never
          resume_url?: string | null
          summary?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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
    Enums: {},
  },
} as const
