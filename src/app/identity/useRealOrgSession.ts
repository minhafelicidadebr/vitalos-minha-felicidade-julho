// Navegação institucional com o client canônico; não concede autorização.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isCloudReady } from "@/lib/cloud/supabase-client";
import { observeOrgSession, resolveOrgSession, ORG_ANONYMOUS, ORG_LOADING, type OrgSessionState } from "./real-org-session";
export type { RealOrgSession } from "./real-org-session";

export function useRealOrgSession() {
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const [state, setState] = useState<OrgSessionState>(isCloudReady() ? ORG_LOADING : ORG_ANONYMOUS);
  useEffect(() => {
    if (!isCloudReady()) return;
    const observer = observeOrgSession(() => resolveOrgSession({
      async userId() {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session?.user.id ?? null;
      },
      async profile(userId) {
        return supabase.from("profiles").select("org_id, role, display_name").eq("id", userId).maybeSingle();
      },
      async organization(orgId) {
        return supabase.from("organizations").select("name, plan, pack_id").eq("id", orgId).maybeSingle();
      },
    }), setState);
    void observer.refresh();
    const { data } = supabase.auth.onAuthStateChange(() => { void observer.refresh(); });
    return () => { observer.dispose(); data.subscription.unsubscribe(); };
  }, [attempt]);
  return { ...state, retry };
}
