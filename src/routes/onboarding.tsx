import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Plus, Sparkles, X } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreferences } from "@/hooks/use-preferences";
import { EMPTY_PREFERENCES, markOnboardingSeen, type FoodPreferences } from "@/lib/preferences";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Let's get to know you — MealMate" },
      {
        name: "description",
        content:
          "Answer a few quick questions and MealMate will personalise your recipes, meal plans and restaurant picks.",
      },
      { property: "og:title", content: "Let's get to know you — MealMate" },
      {
        property: "og:description",
        content: "Personalise MealMate around your goals, tastes, allergies, time and budget.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingPage,
});

type SingleStep = {
  kind: "single";
  key: "goal" | "meals_per_day" | "cooking_level" | "cooking_time" | "food_budget";
  title: string;
  hint?: string;
  options: string[];
};
type MultiStep = {
  kind: "multi";
  key: "favorite_foods" | "preferred_features";
  title: string;
  hint?: string;
  options: string[];
};
type TokensStep = {
  kind: "tokens";
  key: "avoid";
  title: string;
  hint?: string;
  groups: { key: "allergies" | "dietary_restrictions" | "disliked_foods"; label: string; suggestions: string[] }[];
};
type Step = SingleStep | MultiStep | TokensStep;

const STEPS: Step[] = [
  {
    kind: "single",
    key: "goal",
    title: "What are you trying to achieve?",
    hint: "We'll shape your recipes and plans around this.",
    options: [
      "Eat healthier",
      "Lose weight",
      "Gain weight",
      "Build muscle",
      "Save money",
      "Just enjoy good food",
    ],
  },
  {
    kind: "multi",
    key: "favorite_foods",
    title: "What kind of food do you enjoy?",
    hint: "Pick as many as you like.",
    options: [
      "Fast Food",
      "Home Cooking",
      "Healthy",
      "High Protein",
      "Vegetarian",
      "Vegan",
      "Halal",
      "Desserts",
      "African Food",
      "International",
    ],
  },
  {
    kind: "tokens",
    key: "avoid",
    title: "Any foods you don't eat?",
    hint: "We'll keep these out of your recommendations.",
    groups: [
      {
        key: "allergies",
        label: "Allergies",
        suggestions: ["Peanuts", "Tree nuts", "Shellfish", "Eggs", "Dairy", "Gluten", "Soy", "Sesame", "Fish"],
      },
      {
        key: "dietary_restrictions",
        label: "Dietary restrictions",
        suggestions: ["Halal", "Kosher", "Vegetarian", "Vegan", "Pescatarian", "No pork", "No beef", "Low carb", "Low sugar"],
      },
      {
        key: "disliked_foods",
        label: "Foods you dislike",
        suggestions: ["Mushrooms", "Olives", "Liver", "Brinjal", "Coriander", "Blue cheese", "Anchovies", "Beetroot"],
      },
    ],
  },
  {
    kind: "single",
    key: "meals_per_day",
    title: "How many meals do you usually eat?",
    options: ["1–2", "3", "4+", "It changes every day"],
  },
  {
    kind: "single",
    key: "cooking_level",
    title: "What's your cooking level?",
    options: ["Beginner", "I can cook a little", "Intermediate", "Advanced"],
  },
  {
    kind: "single",
    key: "cooking_time",
    title: "How much time do you normally have to cook?",
    options: ["Under 15 minutes", "15–30 minutes", "30–60 minutes", "I enjoy taking my time"],
  },
  {
    kind: "single",
    key: "food_budget",
    title: "What's your food budget?",
    options: ["Budget friendly", "Moderate", "Flexible"],
  },
  {
    kind: "multi",
    key: "preferred_features",
    title: "What should MealMate focus on for you?",
    hint: "Pick as many as you like.",
    options: [
      "Recipes",
      "Meal planning",
      "Restaurants",
      "Saving money",
      "Nutrition",
      "Grocery shopping",
    ],
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { preferences, save } = usePreferences();
  const [draft, setDraft] = useState<FoodPreferences>(() => ({
    ...EMPTY_PREFERENCES,
    ...preferences,
  }));
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const step = STEPS[index]!;
  const total = STEPS.length;
  const progress = useMemo(() => ((index + 1) / total) * 100, [index, total]);

  function next() {
    if (index + 1 < total) {
      setDirection("forward");
      setIndex(index + 1);
    } else {
      void finish();
    }
  }

  function back() {
    if (index === 0) return;
    setDirection("back");
    setIndex(index - 1);
  }

  async function finish() {
    if (busy) return;
    setBusy(true);
    await save({ ...draft, onboarding_completed: true });
    setBusy(false);
    setDone(true);
  }

  function skipSetup() {
    markOnboardingSeen();
    navigate({ to: "/auth", replace: true });
  }

  if (done) {
    return <ReadyScreen onRestart={() => { setDone(false); setIndex(0); }} />;
  }

  const canContinue =
    step.kind === "single"
      ? Boolean(draft[step.key])
      : step.kind === "multi"
        ? draft[step.key].length > 0
        : true;

  return (
    <main className="flex flex-1 flex-col px-4 pb-28 pt-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          disabled={index === 0}
          aria-label="Previous question"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-opacity disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          {index + 1} of {total}
        </span>
      </header>

      <div className="mt-6 flex items-center gap-3">
        <Mascot size={52} mood="happy" />
        <div>
          <h1 className="font-display text-2xl leading-tight">Let's get to know you 🍽️</h1>
          <p className="text-xs text-muted-foreground">
            A few quick taps and MealMate is yours.
          </p>
        </div>
      </div>

      <section
        key={index}
        className={cn(
          "mt-6 flex-1 rounded-3xl border border-border bg-card p-5 shadow-sm",
          direction === "forward" ? "step-in-right" : "step-in-left",
        )}
      >
        <h2 className="font-display text-xl">{step.title}</h2>
        {"hint" in step && step.hint && (
          <p className="mt-1 text-sm text-muted-foreground">{step.hint}</p>
        )}

        {step.kind === "single" && (
          <div className="mt-5 grid gap-2">
            {step.options.map((opt) => {
              const active = draft[step.key] === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDraft({ ...draft, [step.key]: active ? null : opt })}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-all active:scale-[0.98]",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background hover:border-primary/40",
                  )}
                >
                  {opt}
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step.kind === "multi" && (
          <div className="mt-5 flex flex-wrap gap-2">
            {step.options.map((opt) => {
              const list = draft[step.key];
              const active = list.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      [step.key]: active ? list.filter((x) => x !== opt) : [...list, opt],
                    })
                  }
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/40",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {step.kind === "tokens" && (
          <div className="mt-5 space-y-5">
            {step.groups.map((group) => (
              <TokenField
                key={group.key}
                label={group.label}
                suggestions={group.suggestions}
                values={draft[group.key]}
                onChange={(values) => setDraft({ ...draft, [group.key]: values })}
              />
            ))}
          </div>
        )}
      </section>

      <div className="mt-5 space-y-2">
        <Button
          className="h-12 w-full rounded-2xl text-base font-semibold"
          onClick={next}
          disabled={busy || !canContinue}
        >
          {index + 1 === total ? "Finish" : "Continue"}
        </Button>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={next}
            className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Skip question
          </button>
          <button
            type="button"
            onClick={skipSetup}
            className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Skip setup
          </button>
        </div>
      </div>
    </main>
  );
}

function TokenField({
  label,
  suggestions,
  values,
  onChange,
}: {
  label: string;
  suggestions: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [term, setTerm] = useState("");
  const matches = suggestions.filter(
    (s) => !values.includes(s) && s.toLowerCase().includes(term.trim().toLowerCase()),
  );

  function add(value: string) {
    const v = value.trim();
    if (!v || values.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...values, v]);
    setTerm("");
  }

  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-foreground"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(term);
            }
          }}
          placeholder={`Search or add ${label.toLowerCase()}`}
          className="h-11 rounded-2xl"
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-2xl"
          onClick={() => add(term)}
          disabled={!term.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {matches.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {matches.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReadyScreen({ onRestart }: { onRestart: () => void }) {
  const navigate = useNavigate();
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="step-in-right w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <Mascot size={88} mood="celebrate" className="mx-auto" />
        <h1 className="mt-4 font-display text-3xl">Your MealMate is ready 🍽️</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Based on your answers, we'll personalize your meals, recipes, restaurants and
          recommendations.
        </p>
        <div className="mt-6 space-y-2">
          <Button
            className="h-12 w-full rounded-2xl text-base font-semibold"
            onClick={() => navigate({ to: "/auth", replace: true })}
          >
            <Sparkles className="mr-2 h-4 w-4" /> Create my account
          </Button>
          <Button variant="outline" className="h-12 w-full rounded-2xl" onClick={onRestart}>
            Edit my preferences
          </Button>
        </div>
      </div>
    </main>
  );
}
