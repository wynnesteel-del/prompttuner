import type { Template } from "@shared/schema";

export interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
  /** Defaults to true. Set `"required": false` in the seed JSON to make a field optional. */
  required?: boolean;
}

/** Safely parse the JSON `fields` column. Never throws. */
export function parseFields(fieldsJson: string | null | undefined): TemplateField[] {
  if (!fieldsJson) return [];
  try {
    const parsed = JSON.parse(fieldsJson);
    return Array.isArray(parsed)
      ? parsed.filter((f) => f && typeof f.key === "string" && typeof f.label === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * Replace [KEY] tokens with user values.
 * Uses a replacer FUNCTION so values like "$50" or "$&" are inserted literally
 * (String.replace treats `$` sequences in a replacement STRING as special).
 */
export function fillTemplate(promptTemplate: string, values: Record<string, string>): string {
  return promptTemplate.replace(/\[([A-Z0-9_]+)\]/g, (match, key: string) => {
    const v = values[key]?.trim();
    return v ? v : match;
  });
}

/** Keys of required fields the user has not filled in yet. */
export function getMissingFields(fields: TemplateField[], values: Record<string, string>): string[] {
  return fields
    .filter((f) => f.required !== false && !values[f.key]?.trim())
    .map((f) => f.key);
}

/** Case-insensitive search across title, description, category, and the prompt body. */
export function matchesSearch(t: Template, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [t.title, t.description ?? "", t.category, t.promptTemplate]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

/** Build the category filter list from real data, so new categories show up automatically. */
export function getCategories(templates: Template[]): Array<{ id: string; count: number }> {
  const counts = new Map<string, number>();
  for (const t of templates) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  return [
    { id: "all", count: templates.length },
    ...Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([id, count]) => ({ id, count })),
  ];
}

const LABEL_OVERRIDES: Record<string, string> = { diy: "DIY" };
export const capitalize = (s: string) => LABEL_OVERRIDES[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
