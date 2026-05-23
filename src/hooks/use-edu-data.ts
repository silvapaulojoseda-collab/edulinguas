import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAlunos,
  fetchNotificacoes,
  type Aluno,
  type Notificacao,
} from "@/lib/edu-api";

export function useAlunos() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlunos()
      .then((d) => setAlunos(d))
      .finally(() => setLoading(false));
  }, []);

  return { alunos, loading };
}

export function useNotificacoes() {
  const [items, setItems] = useState<Notificacao[]>([]);
  const reload = useCallback(() => {
    fetchNotificacoes().then(setItems);
  }, []);

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("notificacoes-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes" },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [reload]);

  const naoLidas = items.filter((n) => !n.lida).length;
  return { items, naoLidas, reload };
}
