import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CurrentPromptProvider } from "@/components/CurrentPromptContext";
import { Layout } from "@/components/Layout";
import Home from "@/pages/home";
import FollowUp from "@/pages/follow-up";
import Output from "@/pages/output";
import History from "@/pages/history";
import Templates from "@/pages/templates";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/follow-up" component={FollowUp} />
        <Route path="/output" component={Output} />
        <Route path="/history" component={History} />
        <Route path="/templates" component={Templates} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CurrentPromptProvider>
          <TooltipProvider>
            <Toaster />
            <Router hook={useHashLocation}>
              <AppRouter />
            </Router>
          </TooltipProvider>
        </CurrentPromptProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
