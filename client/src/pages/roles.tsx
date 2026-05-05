import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useHashLocation } from "wouter/use-hash-location";
import { Sparkles, ChevronRight, X, Loader2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCurrentPrompt } from "@/components/CurrentPromptContext";
import { apiRequest } from "@/lib/queryClient";

const POPULAR_ROLES = [
  { label: "Doctor / MD", icon: "🩺" },
  { label: "Auto Mechanic", icon: "🔧" },
  { label: "Lawyer", icon: "⚖️" },
  { label: "Financial Advisor", icon: "💰" },
  { label: "Nutritionist", icon: "🥗" },
  { label: "Veterinarian", icon: "🐾" },
  { label: "Personal Trainer", icon: "💪" },
  { label: "Real Estate Agent", icon: "🏠" },
  { label: "Chef", icon: "👨‍🍳" },
  { label: "Therapist", icon: "🧠" },
  { label: "Private Investigator", icon: "🔍" },
  { label: "Tax Advisor", icon: "🧾" },
  { label: "Electrician", icon: "⚡" },
  { label: "Plumber", icon: "🔩" },
  { label: "Life Coach", icon: "🌟" },
  { label: "Relationship Counselor", icon: "💑" },
  { label: "Career Coach", icon: "📈" },
  { label: "Business Coach", icon: "🚀" },
  { label: "Lawn Care Expert", icon: "🌿" },
  { label: "Babysitter / Nanny", icon: "👶" },
  { label: "Pharmacist", icon: "💊" },
  { label: "Dentist", icon: "🦷" },
  { label: "Physical Therapist", icon: "🏃" },
  { label: "Investment Analyst", icon: "📊" },
  { label: "Marketing Expert", icon: "📣" },
  { label: "SEO Specialist", icon: "🔎" },
  { label: "Social Media Manager", icon: "📱" },
  { label: "YouTube Strategist", icon: "🎬" },
  { label: "Copywriter", icon: "✍️" },
  { label: "Home Inspector", icon: "🏡" },
  { label: "Insurance Agent", icon: "🛡️" },
  { label: "Delivery Driver Coach", icon: "🚗" },
];

interface RolePromptsResult {
  role: string;
  prompts: string[];
}

export default function Roles() {
  const [, setLocation] = useHashLocation();
  const [roleInput, setRoleInput] = useState("");
  const [result, setResult] = useState<RolePromptsResult | null>(null);
  const { setRawInput } = useCurrentPrompt();

  const generateMutation = useMutation({
    mutationFn: async (role: string) => {
      const response = await apiRequest("POST", "/api/generate-role-prompts", { role });
      return response.json() as Promise<RolePromptsResult>;
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  function handleExplore(role: string) {
    if (!role.trim()) return;
    setResult(null);
    generateMutation.mutate(role.trim());
  }

  function handleSelectPrompt(prompt: string) {
    setRawInput(prompt);
    setLocation("/follow-up");
  }

  function handleReset() {
    setResult(null);
    setRoleInput("");
    generateMutation.reset();
  }

  if (result) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
            data-testid="back-to-roles"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              AI as: <span className="text-primary">{result.role}</span>
            </h2>
            <p className="text-xs text-muted-foreground">Tap a prompt to use it</p>
          </div>
        </div>

        <div className="space-y-2">
          {result.prompts.map((prompt, idx) => (
            <button
              key={idx}
              data-testid={`role-prompt-${idx}`}
              onClick={() => handleSelectPrompt(prompt)}
              className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground leading-relaxed flex-1">{prompt}</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleReset}
          className="w-full mt-4 py-3 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Try a different role
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Role Explorer</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Tell AI who to be. Any expert, any profession — unlimited.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 mb-6">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
          What role should AI play?
        </label>
        <Input
          data-testid="role-input"
          placeholder="e.g., Veterinarian, Private Investigator, Nutritionist..."
          value={roleInput}
          onChange={(e) => setRoleInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && roleInput.trim()) {
              handleExplore(roleInput);
            }
          }}
          className="mb-3 text-base"
          autoComplete="off"
        />
        <Button
          data-testid="explore-role-btn"
          onClick={() => handleExplore(roleInput)}
          disabled={!roleInput.trim() || generateMutation.isPending}
          className="w-full"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating prompts...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Explore This Role
            </>
          )}
        </Button>
        {generateMutation.isError && (
          <p className="text-xs text-destructive mt-2 text-center">
            Something went wrong. Try again.
          </p>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Popular roles — tap to explore instantly
        </p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_ROLES.map((role) => (
            <button
              key={role.label}
              data-testid={`popular-role-${role.label.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => {
                setRoleInput(role.label);
                handleExplore(role.label);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-sm text-foreground transition-all"
            >
              <span>{role.icon}</span>
              <span>{role.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Don't see your role? Just type it above — any role works.
        </p>
      </div>
    </div>
  );
}
