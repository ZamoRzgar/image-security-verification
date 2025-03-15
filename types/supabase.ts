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
      images: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          name: string
          url: string
          hash: string
          signature: string
          verified: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          name: string
          url: string
          hash: string
          signature: string
          verified?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          name?: string
          url?: string
          hash?: string
          signature?: string
          verified?: boolean
        }
      }
      user_profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          public_key: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          public_key: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          public_key?: string
        }
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
  }
}
