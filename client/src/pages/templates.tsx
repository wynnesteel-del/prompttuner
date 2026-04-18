import { useState } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, X, Camera, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryBadge } from "@/components/CategoryBadge";
import { useCurrentPrompt } from "@/components/CurrentPromptContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Template } from "@shared/schema";

interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
}

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
];

export default function Templates() {
  const [, setLocation] = useHashLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { setGeneratedPrompt, setRawInput, setCategory } = useCurrentPrompt();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageBase64(result.split(",")[1]);
      setImageMimeType(file.type || "image/jpeg");
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageBase64(null);
    setImagePreview(null);
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error("No template selected");
      const res = await apiRequest("POST", "/api/generate-from-template", {
        templateId: selectedTemplate.id,
        fieldValues,
        aiTarget: "perplexity",
        imageBase64: imageBase64 || undefined,
        imageMimeType: imageBase64 ? imageMimeType : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedPrompt(data);
      setRawInput(data.rawInput);
      setCategory(data.category);
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      setSelectedTemplate(null);
      setFieldValues({});
      setLocation("/output");
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message.includes("ANTHROPIC") || error.message.includes("500")
          ? "Server error — check that your ANTHROPIC_API_KEY is set in Render environment variables."
          : error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filtered = templates.filter(
    (t) => selectedCategory === "all" || t.category === selectedCategory
  );

  const openTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setFieldValues({});
  };

  const closeTemplate = () => {
    setSelectedTemplate(null);
    setFieldValues({});
    setImageBase64(null);
    setImagePreview(null);
  };

  const parseFields = (fieldsJson: string): TemplateField[] => {
    try {
      return JSON.parse(fieldsJson);
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="templates-heading">Templates</h2>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" data-testid="template-category-filters">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            data-testid={`template-filter-${cat}`}
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

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((template) => (
          <Card
            key={template.id}
            data-testid={`template-card-${template.id}`}
            className="cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => openTemplate(template)}
          >
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl mb-2">{template.icon}</div>
              <h3 className="text-sm font-medium mb-1">{template.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {template.description}
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-primary font-medium">
                Use <ArrowRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Form Modal */}
      {selectedTemplate && (
        <div
          data-testid="template-modal"
          className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeTemplate();
          }}
        >
          <div className="bg-card w-full max-w-lg rounded-t-xl md:rounded-xl flex flex-col" style={{maxHeight: '80svh'}}>
            {/* Header — always visible, contains close + generate so keyboard can't hide them */}
            <div className="sticky top-0 bg-card p-4 border-b border-border z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedTemplate.icon}</span>
                  <h3 className="text-sm font-semibold">{selectedTemplate.title}</h3>
                </div>
                <button
                  data-testid="close-template-modal"
                  className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground"
                  onClick={closeTemplate}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Button
                data-testid="generate-from-template-btn"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate from Template"
                )}
              </Button>
            </div>

            {/* Scrollable fields — scroll DOWN to fill in, button always above */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{WebkitOverflowScrolling: 'touch'}}>
              <CategoryBadge category={selectedTemplate.category} />
              <p className="text-xs text-muted-foreground">
                {selectedTemplate.description}
              </p>
              <div className="space-y-3">
                {parseFields(selectedTemplate.fields).map((field) => (
                  <div key={field.key}>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      {field.label}
                    </label>
                    <Input
                      data-testid={`template-field-${field.key}`}
                      placeholder={field.placeholder}
                      className="text-sm"
                      value={fieldValues[field.key] || ""}
                      onChange={(e) =>
                        setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>

              {/* Image upload */}
              <div className="pt-1">
                <p className="text-xs font-medium text-foreground mb-2">
                  Add a photo <span className="text-muted-foreground font-normal">(optional)</span>
                </p>
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Uploaded"
                      className="w-full max-h-40 object-cover rounded-lg border border-border"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 w-full cursor-pointer border border-dashed border-border rounded-lg p-3 hover:border-primary/50 hover:bg-muted/30 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Take a photo or upload from gallery</span>
                    <ImagePlus className="h-4 w-4 text-muted-foreground ml-auto" />
                  </label>
                )}
                {imagePreview && (
                  <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
                    <Camera className="h-3 w-3" /> Claude will analyze your photo
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
