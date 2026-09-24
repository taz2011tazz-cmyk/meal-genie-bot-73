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

function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
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
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
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
            : extractErrorMessage(err, "Authentication failed"),
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
