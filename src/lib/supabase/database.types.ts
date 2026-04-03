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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          id: string
          metadata: Json | null
          question_id: string
          response_id: string
          text: string | null
        }
        Insert: {
          id?: string
          metadata?: Json | null
          question_id: string
          response_id: string
          text?: string | null
        }
        Update: {
          id?: string
          metadata?: Json | null
          question_id?: string
          response_id?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_reactions: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_reactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cashouts: {
        Row: {
          amount_cents: number
          completed_at: string | null
          created_at: string
          failure_reason: string | null
          id: string
          respondent_id: string
          status: string
          stripe_transfer_id: string | null
        }
        Insert: {
          amount_cents: number
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          respondent_id: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Update: {
          amount_cents?: number
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          respondent_id?: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashouts_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience_experience_level: string | null
          audience_industry: string | null
          audience_niche_qualifier: string | null
          audience_occupation: string | null
          auto_extended: boolean
          baseline_reach_units: number
          bonus_available: boolean | null
          brief_cache: Json | null
          brief_cached_at: string | null
          brief_response_count: number | null
          brief_verdicts: Json | null
          campaign_strength: number | null
          category: string | null
          created_at: string | null
          creator_id: string
          current_responses: number | null
          deadline: string | null
          description: string | null
          distributable_amount: number | null
          economics_version: number | null
          effective_reach_units: number | null
          estimated_minutes: number | null
          estimated_responses_high: number | null
          estimated_responses_low: number | null
          expires_at: string | null
          format: string | null
          funded_at: string | null
          funded_reach_units: number
          id: string
          is_subsidized: boolean | null
          key_assumptions: string[] | null
          match_priority: number
          parent_campaign_id: string | null
          payout_status: string | null
          quality_score: number | null
          quality_scores: Json | null
          ranking_status: string | null
          reach_served: number
          reciprocal_gate_status: string | null
          reciprocal_responses_completed: number
          reward_amount: number | null
          reward_type: string | null
          rewards_top_answers: boolean | null
          round_number: number
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          tags: string[] | null
          target_age_ranges: string[] | null
          target_expertise: string[] | null
          target_interests: string[] | null
          target_location: string | null
          target_responses: number | null
          title: string
          total_reach_units: number
          updated_at: string | null
        }
        Insert: {
          audience_experience_level?: string | null
          audience_industry?: string | null
          audience_niche_qualifier?: string | null
          audience_occupation?: string | null
          auto_extended?: boolean
          baseline_reach_units?: number
          bonus_available?: boolean | null
          brief_cache?: Json | null
          brief_cached_at?: string | null
          brief_response_count?: number | null
          brief_verdicts?: Json | null
          campaign_strength?: number | null
          category?: string | null
          created_at?: string | null
          creator_id: string
          current_responses?: number | null
          deadline?: string | null
          description?: string | null
          distributable_amount?: number | null
          economics_version?: number | null
          effective_reach_units?: number | null
          estimated_minutes?: number | null
          estimated_responses_high?: number | null
          estimated_responses_low?: number | null
          expires_at?: string | null
          format?: string | null
          funded_at?: string | null
          funded_reach_units?: number
          id?: string
          is_subsidized?: boolean | null
          key_assumptions?: string[] | null
          match_priority?: number
          parent_campaign_id?: string | null
          payout_status?: string | null
          quality_score?: number | null
          quality_scores?: Json | null
          ranking_status?: string | null
          reach_served?: number
          reciprocal_gate_status?: string | null
          reciprocal_responses_completed?: number
          reward_amount?: number | null
          reward_type?: string | null
          rewards_top_answers?: boolean | null
          round_number?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          tags?: string[] | null
          target_age_ranges?: string[] | null
          target_expertise?: string[] | null
          target_interests?: string[] | null
          target_location?: string | null
          target_responses?: number | null
          title: string
          total_reach_units?: number
          updated_at?: string | null
        }
        Update: {
          audience_experience_level?: string | null
          audience_industry?: string | null
          audience_niche_qualifier?: string | null
          audience_occupation?: string | null
          auto_extended?: boolean
          baseline_reach_units?: number
          bonus_available?: boolean | null
          brief_cache?: Json | null
          brief_cached_at?: string | null
          brief_response_count?: number | null
          brief_verdicts?: Json | null
          campaign_strength?: number | null
          category?: string | null
          created_at?: string | null
          creator_id?: string
          current_responses?: number | null
          deadline?: string | null
          description?: string | null
          distributable_amount?: number | null
          economics_version?: number | null
          effective_reach_units?: number | null
          estimated_minutes?: number | null
          estimated_responses_high?: number | null
          estimated_responses_low?: number | null
          expires_at?: string | null
          format?: string | null
          funded_at?: string | null
          funded_reach_units?: number
          id?: string
          is_subsidized?: boolean | null
          key_assumptions?: string[] | null
          match_priority?: number
          parent_campaign_id?: string | null
          payout_status?: string | null
          quality_score?: number | null
          quality_scores?: Json | null
          ranking_status?: string | null
          reach_served?: number
          reciprocal_gate_status?: string | null
          reciprocal_responses_completed?: number
          reward_amount?: number | null
          reward_type?: string | null
          rewards_top_answers?: boolean | null
          round_number?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          tags?: string[] | null
          target_age_ranges?: string[] | null
          target_expertise?: string[] | null
          target_interests?: string[] | null
          target_location?: string | null
          target_responses?: number | null
          title?: string
          total_reach_units?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_parent_campaign_id_fkey"
            columns: ["parent_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          amount: number | null
          body: string | null
          campaign_id: string | null
          created_at: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          body?: string | null
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number | null
          body?: string | null
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_notes: string | null
          campaign_id: string
          created_at: string
          id: string
          reason: string
          resolved_at: string | null
          respondent_id: string
          response_id: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          campaign_id: string
          created_at?: string
          id?: string
          reason: string
          resolved_at?: string | null
          respondent_id: string
          response_id: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          campaign_id?: string
          created_at?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          respondent_id?: string
          response_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          base_amount: number | null
          bonus_amount: number | null
          campaign_id: string
          created_at: string | null
          founder_id: string
          id: string
          platform_fee: number
          respondent_id: string
          response_id: string
          status: string
        }
        Insert: {
          amount: number
          base_amount?: number | null
          bonus_amount?: number | null
          campaign_id: string
          created_at?: string | null
          founder_id: string
          id?: string
          platform_fee?: number
          respondent_id: string
          response_id: string
          status?: string
        }
        Update: {
          amount?: number
          base_amount?: number | null
          bonus_amount?: number | null
          campaign_id?: string
          created_at?: string | null
          founder_id?: string
          id?: string
          platform_fee?: number
          respondent_id?: string
          response_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_range: string | null
          available_balance_cents: number | null
          avatar_url: string | null
          average_quality_score: number | null
          created_at: string | null
          expertise: string[] | null
          full_name: string
          has_posted: boolean | null
          has_responded: boolean | null
          id: string
          interests: string[] | null
          last_cashout_at: string | null
          location: string | null
          notification_preferences: Json | null
          occupation: string | null
          onboarding_completed: boolean | null
          pending_balance_cents: number | null
          platform_credit_cents: number | null
          platform_credit_expires_at: string | null
          profile_completed: boolean | null
          reputation_score: number | null
          reputation_tier: string | null
          reputation_updated_at: string | null
          role: string
          stripe_connect_account_id: string | null
          stripe_connect_onboarding_complete: boolean
          stripe_customer_id: string | null
          subsidized_campaign_used: boolean | null
          total_earned: number | null
          total_responses_completed: number | null
        }
        Insert: {
          age_range?: string | null
          available_balance_cents?: number | null
          avatar_url?: string | null
          average_quality_score?: number | null
          created_at?: string | null
          expertise?: string[] | null
          full_name: string
          has_posted?: boolean | null
          has_responded?: boolean | null
          id: string
          interests?: string[] | null
          last_cashout_at?: string | null
          location?: string | null
          notification_preferences?: Json | null
          occupation?: string | null
          onboarding_completed?: boolean | null
          pending_balance_cents?: number | null
          platform_credit_cents?: number | null
          platform_credit_expires_at?: string | null
          profile_completed?: boolean | null
          reputation_score?: number | null
          reputation_tier?: string | null
          reputation_updated_at?: string | null
          role?: string
          stripe_connect_account_id?: string | null
          stripe_connect_onboarding_complete?: boolean
          stripe_customer_id?: string | null
          subsidized_campaign_used?: boolean | null
          total_earned?: number | null
          total_responses_completed?: number | null
        }
        Update: {
          age_range?: string | null
          available_balance_cents?: number | null
          avatar_url?: string | null
          average_quality_score?: number | null
          created_at?: string | null
          expertise?: string[] | null
          full_name?: string
          has_posted?: boolean | null
          has_responded?: boolean | null
          id?: string
          interests?: string[] | null
          last_cashout_at?: string | null
          location?: string | null
          notification_preferences?: Json | null
          occupation?: string | null
          onboarding_completed?: boolean | null
          pending_balance_cents?: number | null
          platform_credit_cents?: number | null
          platform_credit_expires_at?: string | null
          profile_completed?: boolean | null
          reputation_score?: number | null
          reputation_tier?: string | null
          reputation_updated_at?: string | null
          role?: string
          stripe_connect_account_id?: string | null
          stripe_connect_onboarding_complete?: boolean
          stripe_customer_id?: string | null
          subsidized_campaign_used?: boolean | null
          total_earned?: number | null
          total_responses_completed?: number | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          anchors: Json | null
          assumption_index: number | null
          campaign_id: string
          category: string | null
          id: string
          is_baseline: boolean | null
          options: Json | null
          sort_order: number
          text: string
          type: string
        }
        Insert: {
          anchors?: Json | null
          assumption_index?: number | null
          campaign_id: string
          category?: string | null
          id?: string
          is_baseline?: boolean | null
          options?: Json | null
          sort_order?: number
          text: string
          type?: string
        }
        Update: {
          anchors?: Json | null
          assumption_index?: number | null
          campaign_id?: string
          category?: string | null
          id?: string
          is_baseline?: boolean | null
          options?: Json | null
          sort_order?: number
          text?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      reach_impressions: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reach_impressions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          ai_feedback: string | null
          assigned_question_ids: string[] | null
          available_at: string | null
          base_payout: number | null
          bonus_payout: number | null
          campaign_id: string
          created_at: string | null
          disqualification_reasons: string[] | null
          id: string
          is_partial: boolean
          is_qualified: boolean | null
          locked_at: string | null
          money_state: string | null
          payout_amount: number | null
          quality_score: number | null
          ranked_at: string | null
          respondent_id: string
          scoring_confidence: number | null
          scoring_dimensions: Json | null
          scoring_history: Json | null
          scoring_source: string | null
          status: string
        }
        Insert: {
          ai_feedback?: string | null
          assigned_question_ids?: string[] | null
          available_at?: string | null
          base_payout?: number | null
          bonus_payout?: number | null
          campaign_id: string
          created_at?: string | null
          disqualification_reasons?: string[] | null
          id?: string
          is_partial?: boolean
          is_qualified?: boolean | null
          locked_at?: string | null
          money_state?: string | null
          payout_amount?: number | null
          quality_score?: number | null
          ranked_at?: string | null
          respondent_id: string
          scoring_confidence?: number | null
          scoring_dimensions?: Json | null
          scoring_history?: Json | null
          scoring_source?: string | null
          status?: string
        }
        Update: {
          ai_feedback?: string | null
          assigned_question_ids?: string[] | null
          available_at?: string | null
          base_payout?: number | null
          bonus_payout?: number | null
          campaign_id?: string
          created_at?: string | null
          disqualification_reasons?: string[] | null
          id?: string
          is_partial?: boolean
          is_qualified?: boolean | null
          locked_at?: string | null
          money_state?: string | null
          payout_amount?: number | null
          quality_score?: number | null
          ranked_at?: string | null
          respondent_id?: string
          scoring_confidence?: number | null
          scoring_dimensions?: Json | null
          scoring_history?: Json | null
          scoring_source?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          campaign_limit_override: number | null
          campaigns_used_this_period: number
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string | null
          user_id: string
          welcome_credit_used: boolean
        }
        Insert: {
          campaign_limit_override?: number | null
          campaigns_used_this_period?: number
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string | null
          user_id: string
          welcome_credit_used?: boolean
        }
        Update: {
          campaign_limit_override?: number | null
          campaigns_used_this_period?: number
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string | null
          user_id?: string
          welcome_credit_used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
