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
      alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          assigned_to: string | null
          created_at: string
          event_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["alert_status"]
          updated_at: string
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          assigned_to?: string | null
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          updated_at?: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          assigned_to?: string | null
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      cameras: {
        Row: {
          created_at: string
          detection_models: string[] | null
          id: string
          is_active: boolean
          name: string
          off_time_end: string | null
          off_time_start: string | null
          point_type: Database["public"]["Enums"]["camera_point_type"]
          rtsp_url: string | null
          updated_at: string
          zone_id: string
        }
        Insert: {
          created_at?: string
          detection_models?: string[] | null
          id?: string
          is_active?: boolean
          name: string
          off_time_end?: string | null
          off_time_start?: string | null
          point_type?: Database["public"]["Enums"]["camera_point_type"]
          rtsp_url?: string | null
          updated_at?: string
          zone_id: string
        }
        Update: {
          created_at?: string
          detection_models?: string[] | null
          id?: string
          is_active?: boolean
          name?: string
          off_time_end?: string | null
          off_time_start?: string | null
          point_type?: Database["public"]["Enums"]["camera_point_type"]
          rtsp_url?: string | null
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cameras_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_aggregates: {
        Row: {
          created_at: string
          id: string
          period_end: string
          period_start: string
          ppe_compliance: Json | null
          total_events: number
          total_violations: number
          violation_breakdown: Json | null
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          ppe_compliance?: Json | null
          total_events?: number
          total_violations?: number
          violation_breakdown?: Json | null
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          ppe_compliance?: Json | null
          total_events?: number
          total_violations?: number
          violation_breakdown?: Json | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_aggregates_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          camera_id: string
          clip_url: string | null
          confidence_score: number | null
          created_at: string
          detected_at: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          ppe_results: Json | null
          snapshot_url: string | null
          worker_id: string | null
        }
        Insert: {
          camera_id: string
          clip_url?: string | null
          confidence_score?: number | null
          created_at?: string
          detected_at?: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          ppe_results?: Json | null
          snapshot_url?: string | null
          worker_id?: string | null
        }
        Update: {
          camera_id?: string
          clip_url?: string | null
          confidence_score?: number | null
          created_at?: string
          detected_at?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          ppe_results?: Json | null
          snapshot_url?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      exit_permits: {
        Row: {
          approved_by: string | null
          created_at: string
          id: string
          reason: string
          requested_by: string
          status: Database["public"]["Enums"]["permit_status"]
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          worker_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          id?: string
          reason: string
          requested_by: string
          status?: Database["public"]["Enums"]["permit_status"]
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          worker_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          id?: string
          reason?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["permit_status"]
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exit_permits_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_exports: {
        Row: {
          created_at: string
          exported_by: string
          file_url: string | null
          format: string
          id: string
          period_end: string
          period_start: string
          report_type: string
        }
        Insert: {
          created_at?: string
          exported_by: string
          file_url?: string | null
          format?: string
          id?: string
          period_end: string
          period_start: string
          report_type: string
        }
        Update: {
          created_at?: string
          exported_by?: string
          file_url?: string | null
          format?: string
          id?: string
          period_end?: string
          period_start?: string
          report_type?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          page_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          page_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          page_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      supervisor_validations: {
        Row: {
          alasan_keluar: string | null
          alasan_text: string | null
          alasan_type: Database["public"]["Enums"]["alasan_type"] | null
          alert_id: string
          apd_manual_check: Json | null
          created_at: string
          id: string
          komentar: string | null
          status: Database["public"]["Enums"]["validation_status"]
          supervisor_id: string
          validation_level: string | null
        }
        Insert: {
          alasan_keluar?: string | null
          alasan_text?: string | null
          alasan_type?: Database["public"]["Enums"]["alasan_type"] | null
          alert_id: string
          apd_manual_check?: Json | null
          created_at?: string
          id?: string
          komentar?: string | null
          status: Database["public"]["Enums"]["validation_status"]
          supervisor_id: string
          validation_level?: string | null
        }
        Update: {
          alasan_keluar?: string | null
          alasan_text?: string | null
          alasan_type?: Database["public"]["Enums"]["alasan_type"] | null
          alert_id?: string
          apd_manual_check?: Json | null
          created_at?: string
          id?: string
          komentar?: string | null
          status?: Database["public"]["Enums"]["validation_status"]
          supervisor_id?: string
          validation_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_validations_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      worker_face_embeddings: {
        Row: {
          created_at: string
          face_id: string | null
          id: string
          photo_url: string
          quality_score: number | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          face_id?: string | null
          id?: string
          photo_url: string
          quality_score?: number | null
          worker_id: string
        }
        Update: {
          created_at?: string
          face_id?: string | null
          id?: string
          photo_url?: string
          quality_score?: number | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_face_embeddings_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          created_at: string
          departemen: string
          enrollment_status: Database["public"]["Enums"]["enrollment_status"]
          foto_url: string | null
          id: string
          is_active: boolean
          jabatan: string
          nama: string
          shift: Database["public"]["Enums"]["worker_shift"]
          sid: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          departemen: string
          enrollment_status?: Database["public"]["Enums"]["enrollment_status"]
          foto_url?: string | null
          id?: string
          is_active?: boolean
          jabatan: string
          nama: string
          shift?: Database["public"]["Enums"]["worker_shift"]
          sid: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          departemen?: string
          enrollment_status?: Database["public"]["Enums"]["enrollment_status"]
          foto_url?: string | null
          id?: string
          is_active?: boolean
          jabatan?: string
          nama?: string
          shift?: Database["public"]["Enums"]["worker_shift"]
          sid?: string
          updated_at?: string
        }
        Relationships: []
      }
      zone_access_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          jabatan: string | null
          shift: Database["public"]["Enums"]["worker_shift"] | null
          time_end: string | null
          time_start: string | null
          worker_id: string | null
          zone_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          jabatan?: string | null
          shift?: Database["public"]["Enums"]["worker_shift"] | null
          time_end?: string | null
          time_start?: string | null
          worker_id?: string | null
          zone_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          jabatan?: string | null
          shift?: Database["public"]["Enums"]["worker_shift"] | null
          time_end?: string | null
          time_start?: string | null
          worker_id?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_access_rules_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_access_rules_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_ppe_rules: {
        Row: {
          camera_id: string | null
          created_at: string
          id: string
          is_required: boolean
          jabatan: string | null
          ppe_item: Database["public"]["Enums"]["ppe_item"]
          zone_id: string
        }
        Insert: {
          camera_id?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          jabatan?: string | null
          ppe_item: Database["public"]["Enums"]["ppe_item"]
          zone_id: string
        }
        Update: {
          camera_id?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          jabatan?: string | null
          ppe_item?: Database["public"]["Enums"]["ppe_item"]
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_ppe_rules_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_ppe_rules_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          shift: string | null
          shift_end: string | null
          shift_start: string | null
          site_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          shift?: string | null
          shift_end?: string | null
          shift_start?: string | null
          site_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          shift?: string | null
          shift_end?: string | null
          shift_start?: string | null
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zones_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alasan_type: "APD_TIDAK_LENGKAP" | "SUDAH_IZIN" | "LAINNYA"
      alert_status: "BARU" | "DITERUSKAN" | "SELESAI"
      alert_type: "UNAUTHORIZED_EXIT" | "APD_VIOLATION" | "UNKNOWN_PERSON"
      app_role: "admin" | "operator" | "supervisor" | "safety_manager"
      camera_point_type: "entry" | "exit" | "area"
      enrollment_status: "NOT_ENROLLED" | "ENROLLING" | "ENROLLED" | "FAILED"
      event_type: "MASUK" | "KELUAR" | "UNKNOWN"
      permit_status: "PENDING" | "APPROVED" | "REJECTED"
      ppe_item:
        | "HEAD_COVER"
        | "HAND_COVER"
        | "FACE_COVER"
        | "SAFETY_SHOES"
        | "REFLECTIVE_VEST"
        | "SAFETY_GLASSES"
      validation_status: "VALID" | "TIDAK_VALID"
      worker_shift: "day" | "night" | "rotating"
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
    Enums: {
      alasan_type: ["APD_TIDAK_LENGKAP", "SUDAH_IZIN", "LAINNYA"],
      alert_status: ["BARU", "DITERUSKAN", "SELESAI"],
      alert_type: ["UNAUTHORIZED_EXIT", "APD_VIOLATION", "UNKNOWN_PERSON"],
      app_role: ["admin", "operator", "supervisor", "safety_manager"],
      camera_point_type: ["entry", "exit", "area"],
      enrollment_status: ["NOT_ENROLLED", "ENROLLING", "ENROLLED", "FAILED"],
      event_type: ["MASUK", "KELUAR", "UNKNOWN"],
      permit_status: ["PENDING", "APPROVED", "REJECTED"],
      ppe_item: [
        "HEAD_COVER",
        "HAND_COVER",
        "FACE_COVER",
        "SAFETY_SHOES",
        "REFLECTIVE_VEST",
        "SAFETY_GLASSES",
      ],
      validation_status: ["VALID", "TIDAK_VALID"],
      worker_shift: ["day", "night", "rotating"],
    },
  },
} as const
