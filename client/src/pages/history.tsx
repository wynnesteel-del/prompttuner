import { useState } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PromptCard } from "@/components/PromptCard";
import { useCurrentPrompt } from "@/components/CurrentPromptContext";
import { apiRequest } from "@/lib/queryClient";
import type { Prompt } from "@shared/schema";

const CATEGORIES = [
  "all",
  "shopping",
  "research",
  "troubleshooting",
  "writing",
  "business",
  "content",
  "finance",
  "diy",
  "health",
  "travel",
];

export default function History() {
  const [, setLocation] = useHashLocation();
  const queryClient = useQueryClient();
  const { setRawInput, setCategory, setGeneratedPrompt } = useCurrentPrompt();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: prompts = [] } = useQuery<Prompt[]>({
    queryKey: ["/api/prompts"],
  });

  const favoriteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/prompts/${id}/favorite`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
    },
  });

  const filtered = prompts.filter((p) => {
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      p.rawInput.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePromptClick = (prompt: Prompt) => {
    setRawInput(prompt.rawInput);
    setCategory(prompt.category);
    setGeneratedPrompt(prompt);
    setLocation("/output");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="history-heading">History</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="history-search"
          type="search"
          placeholder="Search prompts..."
          className="pl-9 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" data-testid="category-filters">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            data-testid={`filter-${cat}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12" data-testid="empty-state">
          <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {prompts.length === 0
              ? "No prompts yet. Ask your first question!"
              : "No prompts match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onClick={() => handlePromptClick(prompt)}
              onToggleFavorite={() => favoriteMutation.mutate(prompt.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
