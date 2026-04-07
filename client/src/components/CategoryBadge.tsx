const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  shopping: { bg: "bg-orange-500/12", text: "text-orange-600 dark:text-orange-400" },
  research: { bg: "bg-blue-500/12", text: "text-blue-600 dark:text-blue-400" },
  troubleshooting: { bg: "bg-red-500/12", text: "text-red-600 dark:text-red-400" },
  writing: { bg: "bg-purple-500/12", text: "text-purple-600 dark:text-purple-400" },
  business: { bg: "bg-primary/12", text: "text-primary" },
  content: { bg: "bg-amber-500/12", text: "text-amber-600 dark:text-amber-400" },
  finance: { bg: "bg-green-500/12", text: "text-green-600 dark:text-green-400" },
  diy: { bg: "bg-yellow-600/12", text: "text-yellow-700 dark:text-yellow-500" },
  health: { bg: "bg-pink-500/12", text: "text-pink-600 dark:text-pink-400" },
  travel: { bg: "bg-sky-500/12", text: "text-sky-600 dark:text-sky-400" },
};

const CATEGORY_ICONS: Record<string, string> = {
  shopping: "🛒",
  research: "🔍",
  troubleshooting: "🔧",
  writing: "✍️",
  business: "💼",
  content: "🎬",
  finance: "💰",
  diy: "🔨",
  health: "🏥",
  travel: "✈️",
};

interface CategoryBadgeProps {
  category: string;
  showIcon?: boolean;
}

export function CategoryBadge({ category, showIcon = true }: CategoryBadgeProps) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.research;
  const icon = CATEGORY_ICONS[category] || "📋";

  return (
    <span
      data-testid={`category-badge-${category}`}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {showIcon && <span>{icon}</span>}
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </span>
  );
}
