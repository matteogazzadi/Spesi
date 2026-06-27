export type MatchType = 'contains' | 'exact'
export type BudgetingMode = 'all_time' | 'rolling_12mo'

export interface Database {
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
          total_spent?: number
          last_imported_at?: string
        }
      }
      exclusion_rules: {
        Row: {
          id: string
          user_id: string
          pattern: string
          match_type: MatchType
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pattern: string
          match_type?: MatchType
          active?: boolean
          created_at?: string
        }
        Update: {
          pattern?: string
          match_type?: MatchType
          active?: boolean
        }
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
          date?: string
          description?: string
          amount?: number
          excluded?: boolean
          excluded_by_rule_id?: string | null
        }
      }
      user_settings: {
        Row: {
          user_id: string
          budgeting_mode: BudgetingMode
        }
        Insert: {
          user_id: string
          budgeting_mode?: BudgetingMode
        }
        Update: {
          budgeting_mode?: BudgetingMode
        }
      }
    }
    Enums: {
      match_type: MatchType
      budgeting_mode: BudgetingMode
    }
  }
}
