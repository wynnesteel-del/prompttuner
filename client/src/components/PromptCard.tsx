import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryBadge } from "./CategoryBadge";
import { formatDistanceToNow } from "date-fns";
import type { Prompt } from "@shared/schema";

interface PromptCardProps {
  prompt: Prompt;
  onClick?: () => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  compact?: boolean;
}

const AI_TARGET_LABELS: Record<string, string> = {
  perplexity: "Perplexity",
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
};

export function PromptCard({ prompt, onClick, onToggleFavorite, compact = false }: PromptCardProps) {
  const timeAgo = prompt.createdAt
    ? formatDistanceToNow(new Date(prompt.createdAt), { addSuffix: true })
    : "";

  return (
    <Card
      data-testid={`prompt-card-${prompt.id}`}
      className={`cursor-pointer hover:border-primary/30 transition-colors ${compact ? "" : ""}`}
      onClick={onClick}
    >
      <CardContent className={compact ? "pt-3 pb-3" : "pt-4 pb-4"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <CategoryBadge category={prompt.category} showIcon={!compact} />
              {prompt.aiTarget && (
                <span className="text-xs text-muted-foreground">
                  {AI_TARGET_LABELS[prompt.aiTarget] || prompt.aiTarget}
                </span>
              )}
            </div>
            <p className={`text-sm text-foreground truncate ${compact ? "max-w-[250px]" : ""}`}>
              {prompt.rawInput}
            </p>
            {!compact && timeAgo && (
              <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
            )}
          </div>
          {onToggleFavorite && (
            <button
              data-testid={`favorite-btn-${prompt.id}`}
              className="p-1 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(e);
              }}
            >
              <Star
                className={`h-4 w-4 ${
                  prompt.isFavorite
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
