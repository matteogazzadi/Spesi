export type Database = {
  public: {
    Tables: {
      monthly_totals: {
        Row: {
          id: string
          user_id: string
          month: string
          total_spent: number
          last_imported_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: string
          total_spent?: number
          last_imported_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: string
          total_spent?: number
          last_imported_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'monthly_totals_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      exclusion_rules: {
        Row: {
          id: string
          user_id: string
          pattern: string
          match_type: 'contains' | 'exact'
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pattern: string
          match_type?: 'contains' | 'exact'
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          pattern?: string
          match_type?: 'contains' | 'exact'
          active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'exclusion_rules_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          monthly_total_id: string
          date: string
          description: string
          amount: number
          excluded: boolean
          excluded_by_rule_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          monthly_total_id: string
          date: string
          description: string
          amount: number
          excluded?: boolean
          excluded_by_rule_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          monthly_total_id?: string
          date?: string
          description?: string
          amount?: number
          excluded?: boolean
          excluded_by_rule_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_monthly_total_id_fkey'
            columns: ['monthly_total_id']
            isOneToOne: false
            referencedRelation: 'monthly_totals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_excluded_by_rule_id_fkey'
            columns: ['excluded_by_rule_id']
            isOneToOne: false
            referencedRelation: 'exclusion_rules'
            referencedColumns: ['id']
          },
        ]
      }
      user_settings: {
        Row: {
          user_id: string
          budgeting_mode: 'all_time' | 'rolling_12mo'
          annual_target: number | null
          theme: 'light' | 'dark' | null
        }
        Insert: {
          user_id: string
          budgeting_mode?: 'all_time' | 'rolling_12mo'
          annual_target?: number | null
          theme?: 'light' | 'dark' | null
        }
        Update: {
          user_id?: string
          budgeting_mode?: 'all_time' | 'rolling_12mo'
          annual_target?: number | null
          theme?: 'light' | 'dark' | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_settings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
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
      match_type: 'contains' | 'exact'
      budgeting_mode: 'all_time' | 'rolling_12mo'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
