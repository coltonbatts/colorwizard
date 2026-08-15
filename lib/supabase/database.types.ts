export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          pro_unlocked_at: string | null
          stripe_customer_id: string | null
          stripe_last_checkout_session_id: string | null
          tier: 'free' | 'pro' | 'pro_lifetime'
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          pro_unlocked_at?: string | null
          stripe_customer_id?: string | null
          stripe_last_checkout_session_id?: string | null
          tier?: 'free' | 'pro' | 'pro_lifetime'
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          pro_unlocked_at?: string | null
          stripe_customer_id?: string | null
          stripe_last_checkout_session_id?: string | null
          tier?: 'free' | 'pro' | 'pro_lifetime'
        }
        Relationships: [
          {
            foreignKeyName: 'user_profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
