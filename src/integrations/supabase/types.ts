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
      data_records: {
        Row: {
          created_at: string
          file_id: string
          id: string
          row_data: Json
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          row_data: Json
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          row_data?: Json
        }
        Relationships: []
      }
      uploaded_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          row_count: number | null
          schema_info: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          row_count?: number | null
          schema_info?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          row_count?: number | null
          schema_info?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      visualizations: {
        Row: {
          chart_config: Json
          chart_type: string
          created_at: string
          file_id: string
          id: string
          insight: string | null
        }
        Insert: {
          chart_config: Json
          chart_type: string
          created_at?: string
          file_id: string
          id?: string
          insight?: string | null
        }
        Update: {
          chart_config?: Json
          chart_type?: string
          created_at?: string
          file_id?: string
          id?: string
          insight?: string | null
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
