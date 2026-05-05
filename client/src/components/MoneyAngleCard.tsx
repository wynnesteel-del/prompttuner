import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "./CopyButton";

interface MoneyAngleCardProps {
  suggestion: string;
  prompt: string;
}

export function MoneyAngleCard({ suggestion, prompt }: MoneyAngleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <Card
      data-testid="money-angle-card"
      className="border-amber-400/30 bg-gradient-to-br from-amber-50/50 to-yellow-50/30 dark:from-amber-950/20 dark:to-yellow-950/10"
    >
      <CardContent className="pt-4 pb-4">
        <button
          data-testid="money-angle-toggle"
          className="flex items-center justify-between w-full text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <span className="font-semibold text-amber-700 dark:text-amber-400 text-sm">
              Money Angle Detected
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          )}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-foreground/80">{suggestion}</p>

            {!showPrompt ? (
              <Button
                data-testid="generate-side-hustle-btn"
                size="sm"
                onClick={() => setShowPrompt(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Generate Side Hustle Prompt
              </Button>
            ) : (
              <div className="space-y-2">
                <Card className="bg-background/50">
                  <CardContent className="pt-3 pb-3">
                    <p className="text-sm whitespace-pre-wrap">{prompt}</p>
                  </CardContent>
                </Card>
                <CopyButton text={prompt} size="sm" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
