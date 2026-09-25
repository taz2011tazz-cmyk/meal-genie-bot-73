import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallback });

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      setError("The sign-in link is missing or expired.");
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      if (exchangeError) {
        setError("The sign-in link is invalid or expired.");
        return;
      }
      void navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  if (error) return <main className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6"><p className="text-center text-sm text-destructive">{error}</p></main>;
  return <main className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6"><p className="text-sm text-muted-foreground">Completing sign-in…</p></main>;
}
