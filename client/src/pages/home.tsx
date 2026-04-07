import { useState, useEffect, useRef } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CategoryBadge } from "@/components/CategoryBadge";
import { PromptCard } from "@/components/PromptCard";
import { useCurrentPrompt } from "@/components/CurrentPromptContext";
import { apiRequest } from "@/lib/queryClient";
import type { Prompt } from "@shared/schema";

const AI_TARGETS = [
  { id: "perplexity", label: "Perplexity" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
];

export default function Home() {
  const [, setLocation] = useHashLocation();
  const {
    state,
    setRawInput,
    setCategory,
    setFollowUpQuestions,
    setAiTarget,
    setGeneratedPrompt,
  } = useCurrentPrompt();
  const [localInput, setLocalInput] = useState(state.rawInput);
  const [detectedCategory, setDetectedCategory] = useState(state.category);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: recentPrompts } = useQuery<Prompt[]>({
    queryKey: ["/api/prompts"],
  });

  const lastThree = recentPrompts?.slice(0, 3) || [];

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!localInput.trim() || localInput.trim().length < 3) {
      setDetectedCategory("");
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await apiRequest("POST", "/api/detect-category", { rawInput: localInput });
        const data = await res.json();
        setDetectedCategory(data.category);
        setCategory(data.category);
        setFollowUpQuestions(data.followUpQuestions);
      } catch {
        // Silently ignore detection errors
      }
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [localInput]);

  const handleGenerate = () => {
    if (!localInput.trim()) return;
    setRawInput(localInput);
    setLocation("/follow-up");
  };

  const handleRecentClick = (prompt: Prompt) => {
    setGeneratedPrompt(prompt);
    setRawInput(prompt.rawInput);
    setCategory(prompt.category);
    setLocation("/output");
  };

  return (
    <div className="space-y-6">
      <div className="text-center pt-4">
        <h2 className="text-lg font-semibold text-primary" data-testid="home-heading">
          What do you want to ask AI?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Type any question. I'll turn it into a better prompt.
        </p>
      </div>

      <div className="space-y-3">
        <Textarea
          data-testid="raw-input"
          placeholder="e.g., best mower for my yard..."
          className="min-h-[120px] text-sm resize-none"
          value={localInput}
          onChange={(e) => setLocalInput(e.target.value)}
        />

        {detectedCategory && (
          <div data-testid="detected-category" className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Category:</span>
            <CategoryBadge category={detectedCategory} />
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Optimize for:</p>
          <div className="flex gap-2 flex-wrap" data-testid="ai-target-selector">
            {AI_TARGETS.map((target) => (
              <button
                key={target.id}
                data-testid={`ai-target-${target.id}`}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  state.aiTarget === target.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                onClick={() => setAiTarget(target.id)}
              >
                {target.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          data-testid="generate-btn"
          className="w-full bg-primary hover:bg-primary/90"
          disabled={!localInput.trim()}
          onClick={handleGenerate}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Prompt
        </Button>
      </div>

      {lastThree.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Recent</h3>
          <div className="space-y-2">
            {lastThree.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                compact
                onClick={() => handleRecentClick(prompt)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
