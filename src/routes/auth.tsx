import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { MealMateLogo } from "@/components/mealmate-logo";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in | MealMate" },
    { name: "description", content: "Sign in or create your MealMate account to save recipes, lists, and meal plans." },
    { property: "og:title", content: "Sign in | MealMate" },
    { property: "og:description", content: "Access your saved recipes, lists, and meal plans." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthPage,
});

function getAuthRedirectUrl(path: string): string {
  const configured = import.meta.env["VITE_SUPABASE_REDIRECT_URL"] || process.env["NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL"];
  if (configured) {
    const base = configured.replace(/\/$/, "");
    return `${base}${path}`;
  }
  return `${window.location.origin}${path}`;
}

type SupabaseAuthError = {
  message?: unknown;
  error_description?: unknown;
  error?: unknown;
  msg?: unknown;
  code?: unknown;
  status?: unknown;
};

function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object") {
    const e = err as SupabaseAuthError;
    if (typeof e.message === "string" && e.message) return e.message;
    if (typeof e.error_description === "string" && e.error_description) return e.error_description;
    if (typeof e.error === "string" && e.error) return e.error;
    if (typeof e.msg === "string" && e.msg) return e.msg;
  }
  return fallback;
}

function describeAuthError(err: unknown, fallback: string): string {
  const message = extractErrorMessage(err, fallback);
  if (typeof err !== "object" || !err) return message;

  const details = err as SupabaseAuthError;
  const code = typeof details.code === "string" ? details.code : undefined;
  const status = typeof details.status === "number" ? `HTTP ${details.status}` : undefined;
  return [message, code && `Code: ${code}`, status].filter(Boolean).join(" ");
}

async function startOAuth(provider: "google" | "apple") {
  const redirectTo = getAuthRedirectUrl("/auth");
  console.info(`[Auth] Starting ${provider} OAuth`, { redirectTo });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Supabase did not return an OAuth authorization URL.");

  const authorizationUrl = new URL(data.url);
  const returnedRedirectTo = authorizationUrl.searchParams.get("redirect_to");
  if (returnedRedirectTo !== redirectTo) {
    throw new Error(
      `Supabase returned an unexpected OAuth redirect_to value: ${returnedRedirectTo || "missing"}. Expected ${redirectTo}.`,
    );
  }

  window.location.assign(data.url);
}


function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/", replace: true });
  }, [user, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || password.length < 6) {
        toast.error("Enter a valid email and a password with at least 6 characters.");
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl("/auth"),
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        // With email confirmation required, no session is returned until the user
        // clicks the verification link. Show guidance instead of navigating.
        if (!data.session) {
          toast.success("Check your inbox to verify your email before signing in.");
          setMode("signin");
          setPassword("");
          return;
        }
        toast.success("Welcome to MealMate!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/", replace: true });
    } catch (err) {
      console.error("[Auth] submit error:", err);
      const message = extractErrorMessage(err, "Authentication failed").toLowerCase();
      toast.error(
        message.includes("invalid login credentials") || message.includes("invalid email or password")
          ? "Invalid email or password."
          : message.includes("email not confirmed")
            ? "Please verify your email before signing in."
            : describeAuthError(err, "Authentication failed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <MealMateLogo imageClassName="size-14" className="flex-col gap-2" />
          <h1 className="mt-4 font-display text-3xl">
            {mode === "signin" ? "Welcome back" : "Join MealMate"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to save recipes and plan meals."
              : "Create an account to start cooking."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Chef Thabo"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </Button>
          {mode === "signin" && (
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline"
              disabled={busy}
              onClick={async () => {
                if (!email) {
                  toast.error("Enter your email first, then tap forgot password.");
                  return;
                }
                setBusy(true);
                try {
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: getAuthRedirectUrl("/reset-password"),
                  });
                  if (error) throw error;
                  toast.success("Check your inbox for a reset link.");
                } catch (err) {
                  toast.error("Could not send the reset email. Please check the address and try again.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Forgot password?
            </button>
          )}
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          OR
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await startOAuth("google");
              } catch (err) {
                console.error("[Auth] Google sign-in error:", err);
                toast.error(describeAuthError(err, "Google sign-in failed"));
                setBusy(false);
              }
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.3 14.7 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/>
            </svg>
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await startOAuth("apple");
              } catch (err) {
                console.error("[Auth] Apple sign-in error:", err);
                toast.error(describeAuthError(err, "Apple sign-in failed"));
                setBusy(false);
              }
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.365 12.855c-.02-2.115 1.72-3.13 1.8-3.185-.98-1.435-2.51-1.63-3.055-1.655-1.3-.13-2.54.765-3.2.765-.66 0-1.68-.745-2.765-.725-1.42.02-2.735.825-3.465 2.095-1.48 2.565-.375 6.36 1.06 8.44.705 1.02 1.545 2.165 2.645 2.125 1.06-.045 1.46-.685 2.745-.685 1.285 0 1.645.685 2.77.66 1.145-.02 1.87-1.03 2.57-2.055.815-1.185 1.15-2.34 1.17-2.4-.025-.01-2.24-.86-2.275-3.38ZM14.09 6.5c.585-.71.98-1.695.87-2.68-.84.035-1.865.56-2.47 1.27-.54.63-1.015 1.635-.885 2.6.94.07 1.895-.475 2.485-1.19Z"/>
            </svg>
            Continue with Apple
          </Button>
        </div>


        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-medium text-foreground hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}
