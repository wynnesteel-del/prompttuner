import { useState } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CategoryBadge } from "@/components/CategoryBadge";
import { useCurrentPrompt } from "@/components/CurrentPromptContext";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function FollowUp() {
  const [, setLocation] = useHashLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { state, setFollowUpAnswers, setGeneratedPrompt } = useCurrentPrompt();
  const [answers, setAnswers] = useState<Record<string, string>>(state.followUpAnswers);
  const [isGenerating, setIsGenerating] = useState(false);

  const questions = state.followUpQuestions;
  const answeredCount = Object.values(answers).filter((v) => v.trim()).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  const updateAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setFollowUpAnswers(answers);

    try {
      const res = await apiRequest("POST", "/api/generate-prompt", {
        rawInput: state.rawInput,
        category: state.category,
        followUpAnswers: answers,
        aiTarget: state.aiTarget,
      });
      const prompt = await res.json();
      setGeneratedPrompt(prompt);
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      setLocation("/output");
    } catch (error: any) {
      console.error("Generation failed:", error);
      setIsGenerating(false);
      toast({
        title: "Generation failed",
        description: error?.message?.includes("500")
          ? "Server error — make sure your ANTHROPIC_API_KEY is set in Render environment variables."
          : error?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!state.rawInput) {
    setLocation("/");
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          data-testid="back-btn"
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Tell me more</h2>
          <CategoryBadge category={state.category} />
        </div>
      </div>

      <Progress value={progress} className="h-1" data-testid="progress-bar" />

      <Card className="bg-muted/30">
        <CardContent className="pt-3 pb-3">
          <p className="text-sm text-muted-foreground">{state.rawInput}</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {questions.map((q) => (
          <Card key={q.id} data-testid={`question-card-${q.id}`}>
            <CardContent className="pt-4 pb-4 space-y-3">
              <p className="text-sm font-medium">{q.question}</p>

              {q.type === "buttons" && q.options ? (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((option) => (
                    <button
                      key={option}
                      data-testid={`option-${q.id}-${option}`}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        answers[q.id] === option
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      onClick={() => updateAnswer(q.id, option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <Input
                  data-testid={`input-${q.id}`}
                  placeholder="Type your answer..."
                  className="text-sm"
                  value={answers[q.id] || ""}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        data-testid="generate-prompt-btn"
        className="w-full bg-primary hover:bg-primary/90"
        disabled={isGenerating}
        onClick={handleGenerate}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          "Generate Prompt →"
        )}
      </Button>
    </div>
  );
}
