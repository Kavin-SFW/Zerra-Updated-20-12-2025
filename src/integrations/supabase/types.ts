export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      data_records: {
        Row: {
          created_at: string;
          file_id: string;
          id: string;
          row_data: Json;
        };
        Insert: {
          created_at?: string;
          file_id: string;
          id?: string;
          row_data: Json;
        };
        Update: {
          created_at?: string;
          file_id?: string;
          id?: string;
          row_data?: Json;
        };
        Relationships: [];
      };
      data_sources: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          last_synced_at: string | null;
          name: string;
          row_count: number | null;
          schema_info: Json | null;
          status: string;
          type: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          last_synced_at?: string | null;
          name: string;
          row_count?: number | null;
          schema_info?: Json | null;
          status?: string;
          type: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          last_synced_at?: string | null;
          name?: string;
          row_count?: number | null;
          schema_info?: Json | null;
          status?: string;
          type?: string;
        };
        Relationships: [];
      };
      uploaded_files: {
        Row: {
          created_at: string;
          file_name: string;
          file_size: number;
          file_type: string;
          id: string;
          row_count: number | null;
          schema_info: Json | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          file_size: number;
          file_type: string;
          id?: string;
          row_count?: number | null;
          schema_info?: Json | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          file_size?: number;
          file_type?: string;
          id?: string;
          row_count?: number | null;
          schema_info?: Json | null;
          user_id?: string;
        };
        Relationships: [];
      };
      visualizations: {
        Row: {
          chart_config: Json;
          chart_type: string;
          created_at: string;
          file_id: string;
          id: string;
          insight: string | null;
        };
        Insert: {
          chart_config: Json;
          chart_type: string;
          created_at?: string;
          file_id: string;
          id?: string;
          insight?: string | null;
        };
        Update: {
          chart_config?: Json;
          chart_type?: string;
          created_at?: string;
          file_id?: string;
          id?: string;
          insight?: string | null;
        };
        Relationships: [];
      };
      logs: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          action_type: string;
          module: string | null;
          message: string | null;
          metadata: Json | null;
          level: string | null;
          client_timestamp: string | null;
          client_timezone: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          action_type: string;
          module?: string | null;
          message?: string | null;
          metadata?: Json | null;
          level?: string | null;
          client_timestamp?: string | null;
          client_timezone?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          action_type?: string;
          module?: string | null;
          message?: string | null;
          metadata?: Json | null;
          level?: string | null;
          client_timestamp?: string | null;
          client_timezone?: string | null;
        };
        Relationships: [];
      };
      tenants: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          status: string;
          subscription_tier: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          status?: string;
          subscription_tier?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          status?: string;
          subscription_tier?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          last_login_at: string | null;
          metadata: Json | null;
          role: string;
          tenant_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          last_login_at?: string | null;
          metadata?: Json | null;
          role?: string;
          tenant_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          last_login_at?: string | null;
          metadata?: Json | null;
          role?: string;
          tenant_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      gdpr_consents: {
        Row: {
          consent_type: string;
          created_at: string;
          granted: boolean;
          id: string;
          tenant_id: string | null;
          updated_at: string;
          user_id: string;
          version: string;
        };
        Insert: {
          consent_type: string;
          created_at?: string;
          granted?: boolean;
          id?: string;
          tenant_id?: string | null;
          updated_at?: string;
          user_id: string;
          version: string;
        };
        Update: {
          consent_type?: string;
          created_at?: string;
          granted?: boolean;
          id?: string;
          tenant_id?: string | null;
          updated_at?: string;
          user_id?: string;
          version?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
