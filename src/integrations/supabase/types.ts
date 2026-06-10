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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alunos: {
        Row: {
          created_at: string
          escola_id: string | null
          id: string
          matricula: string | null
          media_geral: number | null
          nome: string
          progresso_spaece: number | null
          turma: string
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          escola_id?: string | null
          id?: string
          matricula?: string | null
          media_geral?: number | null
          nome: string
          progresso_spaece?: number | null
          turma: string
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          escola_id?: string | null
          id?: string
          matricula?: string | null
          media_geral?: number | null
          nome?: string
          progresso_spaece?: number | null
          turma?: string
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alunos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: string
          created_at: string
          entidade: string | null
          entidade_id: string | null
          escola_id: string | null
          id: string
          ip: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          entidade?: string | null
          entidade_id?: string | null
          escola_id?: string | null
          id?: string
          ip?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          entidade?: string | null
          entidade_id?: string | null
          escola_id?: string | null
          id?: string
          ip?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      avaliacoes: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          descritores: string[]
          disciplina: string
          escola_id: string
          id: string
          num_questoes: number
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string
          descritores?: string[]
          disciplina: string
          escola_id: string
          id?: string
          num_questoes?: number
          tipo?: string
          titulo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          descritores?: string[]
          disciplina?: string
          escola_id?: string
          id?: string
          num_questoes?: number
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      cartoes_ocr: {
        Row: {
          acertos: number | null
          aluno_id: string | null
          created_at: string
          file_path: string
          id: string
          lote_id: string
          marcacoes: Json | null
          motivo_erro: string | null
          qr_lido: string | null
          status: string
          total: number | null
        }
        Insert: {
          acertos?: number | null
          aluno_id?: string | null
          created_at?: string
          file_path: string
          id?: string
          lote_id: string
          marcacoes?: Json | null
          motivo_erro?: string | null
          qr_lido?: string | null
          status?: string
          total?: number | null
        }
        Update: {
          acertos?: number | null
          aluno_id?: string | null
          created_at?: string
          file_path?: string
          id?: string
          lote_id?: string
          marcacoes?: Json | null
          motivo_erro?: string | null
          qr_lido?: string | null
          status?: string
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_ocr_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_ocr_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_ocr"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          escola_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          escola_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          escola_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cursos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      escolas: {
        Row: {
          cidade: string | null
          created_at: string
          id: string
          inep: string | null
          nome: string
          uf: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          id?: string
          inep?: string | null
          nome: string
          uf?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          id?: string
          inep?: string | null
          nome?: string
          uf?: string | null
        }
        Relationships: []
      }
      gabaritos: {
        Row: {
          alternativa_correta: string
          avaliacao_id: string
          descritor: string | null
          id: string
          ordem: number
        }
        Insert: {
          alternativa_correta: string
          avaliacao_id: string
          descritor?: string | null
          id?: string
          ordem: number
        }
        Update: {
          alternativa_correta?: string
          avaliacao_id?: string
          descritor?: string | null
          id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "gabaritos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_logs: {
        Row: {
          acao: string
          ator: string | null
          created_at: string
          id: string
          invite_id: string
          metadata: Json | null
        }
        Insert: {
          acao: string
          ator?: string | null
          created_at?: string
          id?: string
          invite_id: string
          metadata?: Json | null
        }
        Update: {
          acao?: string
          ator?: string | null
          created_at?: string
          id?: string
          invite_id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      lotes_ocr: {
        Row: {
          avaliacao_id: string
          created_at: string
          criado_por: string | null
          erros: number
          escola_id: string
          id: string
          processados: number
          status: string
          total: number
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          criado_por?: string | null
          erros?: number
          escola_id: string
          id?: string
          processados?: number
          status?: string
          total?: number
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          criado_por?: string | null
          erros?: number
          escola_id?: string
          id?: string
          processados?: number
          status?: string
          total?: number
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_ocr_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_ocr_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_ocr_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          criada_em: string
          escola_id: string | null
          id: string
          lida: boolean
          link: string | null
          mensagem: string
          tipo: string
          user_id: string
        }
        Insert: {
          criada_em?: string
          escola_id?: string | null
          id?: string
          lida?: boolean
          link?: string | null
          mensagem: string
          tipo: string
          user_id: string
        }
        Update: {
          criada_em?: string
          escola_id?: string | null
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      pareceres_ia: {
        Row: {
          avaliacao_id: string | null
          created_at: string
          dados: Json | null
          disciplina: string | null
          escola_id: string
          gerado_por: string | null
          id: string
          modelo: string
          texto: string
          turma_id: string | null
        }
        Insert: {
          avaliacao_id?: string | null
          created_at?: string
          dados?: Json | null
          disciplina?: string | null
          escola_id: string
          gerado_por?: string | null
          id?: string
          modelo?: string
          texto: string
          turma_id?: string | null
        }
        Update: {
          avaliacao_id?: string | null
          created_at?: string
          dados?: Json | null
          disciplina?: string | null
          escola_id?: string
          gerado_por?: string | null
          id?: string
          modelo?: string
          texto?: string
          turma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pareceres_ia_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pareceres_ia_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pareceres_ia_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_turmas: {
        Row: {
          created_at: string
          disciplina: string | null
          id: string
          turma_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disciplina?: string | null
          id?: string
          turma_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          disciplina?: string | null
          id?: string
          turma_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professor_turmas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          escola_ativa_id: string | null
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          escola_ativa_id?: string | null
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          escola_ativa_id?: string | null
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_escola_ativa_id_fkey"
            columns: ["escola_ativa_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas: {
        Row: {
          cartao_id: string
          correta: boolean
          descritor: string | null
          id: string
          marcada: string | null
          questao_ordem: number
        }
        Insert: {
          cartao_id: string
          correta?: boolean
          descritor?: string | null
          id?: string
          marcada?: string | null
          questao_ordem: number
        }
        Update: {
          cartao_id?: string
          correta?: boolean
          descritor?: string | null
          id?: string
          marcada?: string | null
          questao_ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "respostas_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes_ocr"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_invites: {
        Row: {
          aceito_em: string | null
          aceito_por: string | null
          convidado_por: string
          created_at: string
          email: string
          escola_id: string
          expira_em: string
          id: string
          nome: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          aceito_em?: string | null
          aceito_por?: string | null
          convidado_por: string
          created_at?: string
          email: string
          escola_id: string
          expira_em?: string
          id?: string
          nome?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          aceito_em?: string | null
          aceito_por?: string | null
          convidado_por?: string
          created_at?: string
          email?: string
          escola_id?: string
          expira_em?: string
          id?: string
          nome?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      turmas: {
        Row: {
          ano_letivo: number
          ativo: boolean
          capacidade: number | null
          created_at: string
          curso: string | null
          curso_id: string | null
          escola_id: string
          id: string
          nome: string
          serie: string | null
          turno: string | null
          updated_at: string
        }
        Insert: {
          ano_letivo?: number
          ativo?: boolean
          capacidade?: number | null
          created_at?: string
          curso?: string | null
          curso_id?: string | null
          escola_id: string
          id?: string
          nome: string
          serie?: string | null
          turno?: string | null
          updated_at?: string
        }
        Update: {
          ano_letivo?: number
          ativo?: boolean
          capacidade?: number | null
          created_at?: string
          curso?: string | null
          curso_id?: string | null
          escola_id?: string
          id?: string
          nome?: string
          serie?: string | null
          turno?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          escola_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          escola_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          escola_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_school: {
        Args: { _escola_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _escola_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_gestor_ou_coordenador: {
        Args: { _escola_id: string; _user_id: string }
        Returns: boolean
      }
      is_member_of: {
        Args: { _escola_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _acao: string
          _entidade?: string
          _entidade_id?: string
          _escola_id: string
          _ip?: string
          _metadata?: Json
          _user_id: string
        }
        Returns: string
      }
      teaches_turma: {
        Args: { _turma_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "gestor" | "coordenador" | "professor"
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
      app_role: ["gestor", "coordenador", "professor"],
    },
  },
} as const
