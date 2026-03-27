export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      update_profile: {
        Args: {
          p_full_name: string;
          p_role: "student" | "staff";
          p_level: number | null;
          p_department: string | null;
          p_matric_number: string | null;
          p_staff_id: string | null;
        };
        Returns: void;
      };
    };
    Enums: {
      role_type: "admin" | "staff" | "student";
    };
    CompositeTypes: Record<string, never>;
  };
};
