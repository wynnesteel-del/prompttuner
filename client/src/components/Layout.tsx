import { type ReactNode } from "react";
import { useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Home, LayoutGrid, Clock, Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { PerplexityAttribution } from "./PerplexityAttribution";

interface LayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/templates", icon: LayoutGrid, label: "Templates" },
  { path: "/history", icon: Clock, label: "History" },
];

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useHashLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 border-r border-border bg-sidebar p-4 fixed h-full">
        <div className="mb-8">
          <h1 className="text-lg font-bold text-primary">PromptTuner</h1>
          <p className="text-xs text-muted-foreground">Ask smarter. Get better answers.</p>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                onClick={() => setLocation(item.path)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <button
            data-testid="theme-toggle"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <PerplexityAttribution />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-60">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-4 md:hidden">
            <div>
              <h1 className="text-lg font-bold text-primary">PromptTuner</h1>
            </div>
            <button
              data-testid="theme-toggle-mobile"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>

          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        data-testid="mobile-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              data-testid={`mobile-nav-${item.label.toLowerCase()}`}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              onClick={() => setLocation(item.path)}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
