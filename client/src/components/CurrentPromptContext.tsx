import { createContext, useContext, useState, type ReactNode } from "react";
import type { Prompt } from "@shared/schema";

interface FollowUpQuestion {
  id: string;
  question: string;
  type: "buttons" | "text";
  options?: string[];
}

interface CurrentPromptState {
  rawInput: string;
  category: string;
  followUpQuestions: FollowUpQuestion[];
  followUpAnswers: Record<string, string>;
  aiTarget: string;
  generatedPrompt: Prompt | null;
}

interface CurrentPromptContextType {
  state: CurrentPromptState;
  setRawInput: (input: string) => void;
  setCategory: (category: string) => void;
  setFollowUpQuestions: (questions: FollowUpQuestion[]) => void;
  setFollowUpAnswers: (answers: Record<string, string>) => void;
  setAiTarget: (target: string) => void;
  setGeneratedPrompt: (prompt: Prompt | null) => void;
  reset: () => void;
}

const defaultState: CurrentPromptState = {
  rawInput: "",
  category: "",
  followUpQuestions: [],
  followUpAnswers: {},
  aiTarget: "perplexity",
  generatedPrompt: null,
};

const CurrentPromptContext = createContext<CurrentPromptContextType>({
  state: defaultState,
  setRawInput: () => {},
  setCategory: () => {},
  setFollowUpQuestions: () => {},
  setFollowUpAnswers: () => {},
  setAiTarget: () => {},
  setGeneratedPrompt: () => {},
  reset: () => {},
});

export function CurrentPromptProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CurrentPromptState>(defaultState);

  const setRawInput = (rawInput: string) => setState((s) => ({ ...s, rawInput }));
  const setCategory = (category: string) => setState((s) => ({ ...s, category }));
  const setFollowUpQuestions = (followUpQuestions: FollowUpQuestion[]) => setState((s) => ({ ...s, followUpQuestions }));
  const setFollowUpAnswers = (followUpAnswers: Record<string, string>) => setState((s) => ({ ...s, followUpAnswers }));
  const setAiTarget = (aiTarget: string) => setState((s) => ({ ...s, aiTarget }));
  const setGeneratedPrompt = (generatedPrompt: Prompt | null) => setState((s) => ({ ...s, generatedPrompt }));
  const reset = () => setState(defaultState);

  return (
    <CurrentPromptContext.Provider
      value={{
        state,
        setRawInput,
        setCategory,
        setFollowUpQuestions,
        setFollowUpAnswers,
        setAiTarget,
        setGeneratedPrompt,
        reset,
      }}
    >
      {children}
    </CurrentPromptContext.Provider>
  );
}

export function useCurrentPrompt() {
  return useContext(CurrentPromptContext);
}
