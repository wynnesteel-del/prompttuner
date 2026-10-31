import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  PencilLine,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryBadge } from "@/components/CategoryBadge";
import { useCurrentPrompt } from "@/components/CurrentPromptContext";
import { useToast } from "@/hooks/use-toast";
import { useTemplatePrefs } from "@/hooks/use-template-prefs";
import { apiRequest } from "@/lib/queryClient";
import {
  capitalize,
  fillTemplate,
  getCategories,
  getMissingFields,
  matchesSearch,
  parseFields,
} from "@/lib/templateUtils";
import type { Prompt, Template } from "@shared/schema";

const AI_TARGETS = [
  { id: "perplexity", label: "Perplexity" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
];

type Step = "fill" | "review";

/** apiRequest throws `"<status>: <body>"`; pull out the server's JSON `message` when present. */
function readableError(err: Error): string {
  const body = err.message.replace(/^\d+:\s*/, "");
  try {
    return (JSON.parse(body).message as string) || body;
  } catch {
    return body.slice(0, 200) || "Something went wrong. Please try again.";
  }
}

/** Renders the template body with filled values highlighted and unfilled [TOKENS] flagged. */
function TemplatePreview({ text, values }: { text: string; values: Record<string, string> }) {
  const parts = text.split(/(\[[A-Z0-9_]+\])/g);
  return (
    <p className="text-xs leading-relaxed whitespace-pre-wrap" data-testid="template-live-preview">
      {parts.map((part, i) => {
        const m = part.match(/^\[([A-Z0-9_]+)\]$/);
        if (!m) return <span key={i}>{part}</span>;
        const v = values[m[1]]?.trim();
        return v ? (
          <mark key={i} className="bg-primary/15 text-primary rounded px-0.5 font-medium">
            {v}
          </mark>
        ) : (
          <span key={i} className="bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded px-0.5 font-mono">
            {part}
          </span>
        );
      })}
    </p>
  );
}

export default function Templates() {
  const [, setLocation] = useHashLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { state, loadFromTemplate } = useCurrentPrompt();
  const { favorites, recent, isFavorite, toggleFavorite, markUsed, clearRecent } = useTemplatePrefs();

  // Browse state
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Dialog state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [step, setStep] = useState<Step>("fill");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [aiTarget, setAiTarget] = useState(state.aiTarget || "perplexity");

  const {
    data: templates = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Template[]>({ queryKey: ["/api/templates"] });

  const fields = useMemo(() => parseFields(selectedTemplate?.fields), [selectedTemplate]);
  const missing = getMissingFields(fields, fieldValues);
  const filledPrompt = selectedTemplate ? fillTemplate(selectedTemplate.promptTemplate, fieldValues) : "";

  const generateMutation = useMutation({
    mutationFn: async (): Promise<Prompt> => {
      if (!selectedTemplate) throw new Error("No template selected");
      const res = await apiRequest("POST", "/api/generate-from-template", {
        templateId: selectedTemplate.id,
        fieldValues,
        aiTarget,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (!selectedTemplate) return;
      // ROOT-CAUSE FIX: commit the shared state BEFORE navigating.
      // wouter's hash navigation re-renders synchronously, so without flushSync the Output
      // page mounted with generatedPrompt === null and immediately bounced back to Home.
      flushSync(() =>
        loadFromTemplate({
          templateId: selectedTemplate.id,
          templateTitle: selectedTemplate.title,
          rawInput: data.rawInput,
          category: data.category,
          fieldValues,
          aiTarget,
          generatedPrompt: data,
        })
      );
      markUsed(selectedTemplate.id);
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      toast({ title: "Prompt ready", description: `Built from "${selectedTemplate.title}". Saved to History.` });
      closeTemplate();
      setLocation("/output");
    },
    // FIX: failures used to be silent - the spinner just stopped. Error now renders inline
    // in the review step (see template-generate-error) with a Try Again button.
  });

  // ---------- derived lists ----------
  const categories = useMemo(() => getCategories(templates), [templates]);

  const filtered = useMemo(() => {
    const list = templates.filter(
      (t) =>
        (selectedCategory === "all" || t.category === selectedCategory) &&
        (!showFavoritesOnly || favorites.includes(t.id)) &&
        matchesSearch(t, search)
    );
    // Pinned (favorites) float to the top; otherwise keep server sortOrder.
    return [...list].sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));
  }, [templates, selectedCategory, showFavoritesOnly, favorites, search]);

  const recentTemplates = useMemo(
    () => recent.map((id) => templates.find((t) => t.id === id)).filter(Boolean) as Template[],
    [recent, templates]
  );

  // ---------- actions ----------
  function openTemplate(template: Template, startStep: Step = "fill") {
    setSelectedTemplate(template);
    setFieldValues({});
    setTouched(false);
    setStep(startStep);
    setAiTarget(state.aiTarget || "perplexity");
    generateMutation.reset();
  }

  function closeTemplate() {
    setSelectedTemplate(null);
    setFieldValues({});
    setTouched(false);
    setStep("fill");
  }

  function goToReview() {
    setTouched(true);
    if (missing.length === 0) setStep("review");
  }

  /** Secondary handoff: drop the filled template into Home so the user can edit + run the normal flow. */
  function editInHome() {
    if (!selectedTemplate) return;
    flushSync(() =>
      loadFromTemplate({
        templateId: selectedTemplate.id,
        templateTitle: selectedTemplate.title,
        rawInput: filledPrompt,
        category: selectedTemplate.category,
        fieldValues,
        aiTarget,
      })
    );
    markUsed(selectedTemplate.id);
    toast({ title: "Template loaded", description: "Edit it on Home, then tap Generate Prompt." });
    closeTemplate();
    setLocation("/");
  }

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setShowFavoritesOnly(false);
  };

  const hasFilters = search || selectedCategory !== "all" || showFavoritesOnly;

  // ---------- render ----------
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold" data-testid="templates-heading">Templates</h2>
        {!isLoading && !isError && (
          <span className="text-xs text-muted-foreground" data-testid="templates-count">
            {filtered.length} of {templates.length}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="template-search"
          aria-label="Search templates"
          placeholder="Search templates..."
          className="pl-9 pr-9 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            aria-label="Clear search"
            data-testid="template-search-clear"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
            onClick={() => setSearch("")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category + favorites filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" data-testid="template-category-filters">
        <button
          data-testid="template-filter-favorites"
          aria-pressed={showFavoritesOnly}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
            showFavoritesOnly
              ? "bg-amber-400 text-amber-950"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          onClick={() => setShowFavoritesOnly((v) => !v)}
        >
          <Star className={`h-3 w-3 ${showFavoritesOnly ? "fill-current" : ""}`} />
          Favorites{favorites.length > 0 ? ` (${favorites.length})` : ""}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            data-testid={`template-filter-${cat.id}`}
            aria-pressed={selectedCategory === cat.id}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {capitalize(cat.id)} <span className="opacity-60">{cat.count}</span>
          </button>
        ))}
      </div>

      {/* Recently used */}
      {!hasFilters && recentTemplates.length > 0 && (
        <div className="space-y-2" data-testid="recent-templates">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Recently used
            </h3>
            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={clearRecent}>
              Clear
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recentTemplates.map((t) => (
              <button
                key={t.id}
                data-testid={`recent-template-${t.id}`}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:border-primary/40"
                onClick={() => openTemplate(t)}
              >
                <span>{t.icon}</span>
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading / error / empty states */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <Card data-testid="templates-error">
          <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Couldn't load templates.
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center py-10 space-y-2" data-testid="templates-empty">
          <p className="text-sm text-muted-foreground">
            {showFavoritesOnly && favorites.length === 0
              ? "No favorites yet. Tap the star on any template to pin it here."
              : "No templates match your filters."}
          </p>
          {hasFilters && (
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((template) => {
          const fav = isFavorite(template.id);
          const fieldCount = parseFields(template.fields).length;
          return (
            <Card
              key={template.id}
              data-testid={`template-card-${template.id}`}
              className={`flex flex-col transition-colors hover:border-primary/30 ${fav ? "border-amber-400/50" : ""}`}
            >
              <CardContent className="pt-4 pb-4 flex flex-col flex-1">
                <div className="flex items-start justify-between">
                  <div className="text-2xl mb-2" aria-hidden>{template.icon}</div>
                  <button
                    data-testid={`template-favorite-${template.id}`}
                    aria-label={fav ? `Unpin ${template.title}` : `Pin ${template.title}`}
                    aria-pressed={fav}
                    className="p-1.5 -mr-1.5 -mt-1.5 rounded-lg hover:bg-muted/60"
                    onClick={() => toggleFavorite(template.id)}
                  >
                    <Star className={`h-4 w-4 ${fav ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                  </button>
                </div>
                <h3 className="text-sm font-medium mb-1">{template.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{template.description}</p>
                <div className="flex items-center gap-2 mb-3 mt-auto">
                  <CategoryBadge category={template.category} showIcon={false} />
                  <span className="text-[11px] text-muted-foreground">{fieldCount} fields</span>
                </div>
                {expandedId === template.id && (
                  <div
                    className="rounded-lg border border-border bg-muted/30 p-2.5 mb-3"
                    data-testid={`template-inline-preview-${template.id}`}
                  >
                    <TemplatePreview text={template.promptTemplate} values={{}} />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    data-testid={`template-preview-${template.id}`}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    aria-expanded={expandedId === template.id}
                    onClick={() => setExpandedId((id) => (id === template.id ? null : template.id))}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> {expandedId === template.id ? "Hide" : "Preview"}
                  </Button>
                  <Button
                    data-testid={`template-use-${template.id}`}
                    size="sm"
                    className="flex-1"
                    onClick={() => openTemplate(template)}
                  >
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Template dialog: Fill -> Review/Confirm -> Generate */}
      <Dialog
        open={!!selectedTemplate}
        onOpenChange={(open) => {
          // Don't let a stray tap close the dialog mid-generation.
          if (!open && !generateMutation.isPending) closeTemplate();
        }}
      >
        <DialogContent
          data-testid="template-modal"
          className="w-[calc(100%-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-xl p-0 gap-0 [&>button:last-child]:hidden"
        >
          {selectedTemplate && (
            <>
              <DialogHeader className="sticky top-0 z-10 bg-background p-4 pr-12 border-b border-border text-left">
                <DialogTitle className="flex items-center gap-2 text-sm pr-6">
                  <span className="text-xl">{selectedTemplate.icon}</span>
                  {selectedTemplate.title}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {step === "fill" ? "Step 1 of 2 - Fill in the details" : "Step 2 of 2 - Review and confirm"}
                </DialogDescription>
                <button
                  data-testid="close-template-modal"
                  aria-label="Close"
                  disabled={generateMutation.isPending}
                  className="absolute right-3 top-3 p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground disabled:opacity-40"
                  onClick={closeTemplate}
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogHeader>

              {step === "fill" && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={selectedTemplate.category} />
                    <button
                      className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => toggleFavorite(selectedTemplate.id)}
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${
                          isFavorite(selectedTemplate.id) ? "fill-amber-400 text-amber-400" : ""
                        }`}
                      />
                      {isFavorite(selectedTemplate.id) ? "Pinned" : "Pin"}
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>

                  {/* Live preview */}
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Live preview</p>
                    <TemplatePreview text={selectedTemplate.promptTemplate} values={fieldValues} />
                  </div>

                  {/* Fields */}
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      goToReview();
                    }}
                  >
                    {fields.map((field, idx) => {
                      const showError = touched && missing.includes(field.key);
                      return (
                        <div key={field.key}>
                          <label
                            htmlFor={`tf-${field.key}`}
                            className="text-xs font-medium text-foreground mb-1 block"
                          >
                            {field.label}
                            {field.required !== false && <span className="text-destructive"> *</span>}
                          </label>
                          <Input
                            id={`tf-${field.key}`}
                            data-testid={`template-field-${field.key}`}
                            autoFocus={idx === 0}
                            placeholder={field.placeholder}
                            aria-invalid={showError}
                            className={`text-sm ${showError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            value={fieldValues[field.key] || ""}
                            onChange={(e) =>
                              setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                          />
                          {showError && <p className="text-[11px] text-destructive mt-1">Required</p>}
                        </div>
                      );
                    })}

                    {/* AI target - previously hard-coded to "perplexity" */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Optimize for:</p>
                      <div className="flex gap-2 flex-wrap" data-testid="template-ai-target">
                        {AI_TARGETS.map((t) => (
                          <button
                            type="button"
                            key={t.id}
                            data-testid={`template-ai-target-${t.id}`}
                            aria-pressed={aiTarget === t.id}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                              aiTarget === t.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            onClick={() => setAiTarget(t.id)}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="sm:flex-1"
                        data-testid="template-edit-in-home-btn"
                        onClick={editInHome}
                      >
                        <PencilLine className="h-4 w-4 mr-2" /> Edit in Home
                      </Button>
                      <Button type="submit" className="sm:flex-1" data-testid="template-review-btn">
                        Review & Generate
                      </Button>
                    </div>
                    {touched && missing.length > 0 && (
                      <p className="text-[11px] text-destructive text-center" data-testid="template-missing-msg">
                        Fill in {missing.length} more required field{missing.length > 1 ? "s" : ""}.
                      </p>
                    )}
                  </form>
                </div>
              )}

              {step === "review" && (
                <div className="p-4 space-y-4" data-testid="template-review-step">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Your filled-in prompt
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" data-testid="template-final-prompt">
                      {filledPrompt}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <CategoryBadge category={selectedTemplate.category} />
                    <span className="bg-muted text-muted-foreground px-2 py-1 rounded-full">
                      {AI_TARGETS.find((t) => t.id === aiTarget)?.label}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    PromptTuner will create Quick, Detailed, and Expert versions and save them to History.
                  </p>

                  {generateMutation.isError && (
                    <div
                      className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs"
                      data-testid="template-generate-error"
                    >
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                      <span>
                        Couldn't generate the prompt: {readableError(generateMutation.error as Error)}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      className="sm:flex-1"
                      disabled={generateMutation.isPending}
                      onClick={() => setStep("fill")}
                      data-testid="template-back-btn"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <Button
                      data-testid="generate-from-template-btn"
                      className="sm:flex-1"
                      disabled={generateMutation.isPending}
                      onClick={() => generateMutation.mutate()}
                    >
                      {generateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          {generateMutation.isError ? "Try Again" : "Confirm & Generate"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
