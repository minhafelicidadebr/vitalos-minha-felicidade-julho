// Detecta se o usuário atual é um cliente REAL logado (organização provisionada
// via /ativar/:token), em oposição a alguém explorando a demonstração. Usa
// só o client anônimo do Supabase — RLS já restringe cada linha ao próprio
// usuário (profiles: id = auth.uid(); organizations: id in profiles do usuário),
// então não precisa de service role nem de server function.
//
// Consumido por AppShell (esconde seletor de setor/persona) e pelos
// dashboards (trocam conteúdo de demonstração por uma visão real e vazia).

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isCloudReady } from "@/lib/cloud/supabase-client";

export interface RealOrgSession {
  userId: string;
  orgId: string;
  orgName: string;
  orgPlan: string;
  orgPackId: string;
  role: string;
  displayName: string | null;
}

interface RealOrgSessionState {
  loading: boolean;
  org: RealOrgSession | null;
}

const INITIAL_STATE: RealOrgSessionState = { loading: true, org: null };

export function useRealOrgSession(): RealOrgSessionState {
  const [state, setState] = useState<RealOrgSessionState>(
    isCloudReady() ? INITIAL_STATE : { loading: false, org: null },
  );

  useEffect(() => {
    if (!isCloudReady()) return;
    let active = true;

    async function resolve() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        if (active) setState({ loading: false, org: null });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id, role, display_name")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile) {
        if (active) setState({ loading: false, org: null });
        return;
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("name, plan, pack_id")
        .eq("id", (profile as { org_id: string }).org_id)
        .maybeSingle();

      if (!active) return;
      if (!org) {
        setState({ loading: false, org: null });
        return;
      }

      setState({
        loading: false,
        org: {
          userId: session.user.id,
          orgId: (profile as { org_id: string }).org_id,
          orgName: (org as { name: string }).name,
          orgPlan: (org as { plan: string }).plan,
          orgPackId: (org as { pack_id: string }).pack_id,
          role: (profile as { role: string }).role,
          displayName: (profile as { display_name: string | null }).display_name,
        },
      });
    }

    resolve();
    return () => {
      active = false;
    };
  }, []);

  return state;
}
