import { useState } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { ArrowLeft, RefreshCw, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/CopyButton";
import { MoneyAngleCard } from "@/components/MoneyAngleCard";
import { CategoryBadge } from "@/components/CategoryBadge";
import { useCurrentPrompt } from "@/components/CurrentPromptContext";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const AI_TARGET_LABELS: Record<string, string> = {
  perplexity: "Perplexity",
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
};

type PromptTab = "quick" | "detailed" | "expert";

export default function Output() {
  const [, setLocation] = useHashLocation();
  const { state, setGeneratedPrompt } = useCurrentPrompt();
  const [activeTab, setActiveTab] = useState<PromptTab>("quick");
  const queryClient = useQueryClient();
  const prompt = state.generatedPrompt;

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/generate-prompt", {
        rawInput: state.rawInput,
        category: state.category,
        followUpAnswers: state.followUpAnswers,
        aiTarget: state.aiTarget,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedPrompt(data);
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (!prompt) return;
      const res = await apiRequest("PATCH", `/api/prompts/${prompt.id}/favorite`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data) setGeneratedPrompt(data);
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
    },
  });

  if (!prompt) {
    setLocation("/");
    return null;
  }

  const promptText: Record<PromptTab, string | null> = {
    quick: prompt.promptQuick,
    detailed: prompt.promptDetailed,
    expert: prompt.promptExpert,
  };

  const currentPromptText = promptText[activeTab] || "";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            data-testid="back-btn"
            className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold">Your Prompt</h2>
        </div>
        <button
          data-testid="favorite-btn"
          className="p-2 rounded-lg hover:bg-muted/50"
          onClick={() => favoriteMutation.mutate()}
        >
          <Star
            className={`h-5 w-5 ${
              prompt.isFavorite
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <CategoryBadge category={prompt.category} />
        {prompt.aiTarget && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {AI_TARGET_LABELS[prompt.aiTarget] || prompt.aiTarget}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{prompt.rawInput}</p>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PromptTab)}>
        <TabsList className="w-full" data-testid="prompt-tabs">
          <TabsTrigger value="quick" data-testid="tab-quick" className="flex-1">Quick</TabsTrigger>
          <TabsTrigger value="detailed" data-testid="tab-detailed" className="flex-1">Detailed</TabsTrigger>
          <TabsTrigger value="expert" data-testid="tab-expert" className="flex-1">Expert</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card data-testid="prompt-output-card">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{currentPromptText}</p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <CopyButton text={currentPromptText || ""} />
        <Button
          data-testid="regenerate-btn"
          variant="outline"
          size="default"
          disabled={regenerateMutation.isPending}
          onClick={() => regenerateMutation.mutate()}
        >
          {regenerateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Regenerate
        </Button>
      </div>

      {prompt.moneyAngleSuggestion && prompt.moneyAnglePrompt && (
        <MoneyAngleCard
          suggestion={prompt.moneyAngleSuggestion}
          prompt={prompt.moneyAnglePrompt}
        />
      )}
    </div>
  );
}
