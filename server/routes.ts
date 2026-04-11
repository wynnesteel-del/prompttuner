import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import Anthropic from "@anthropic-ai/sdk";

function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set. Add it to your Render environment variables.");
  }
  return new Anthropic();
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  shopping: ["buy", "purchase", "price", "cost", "deal", "compare", "best", "cheapest", "review", "vs", "under $", "amazon", "walmart", "recommend"],
  research: ["what is", "how does", "history of", "explain", "why does", "learn", "understand", "study", "difference between"],
  troubleshooting: ["won't start", "broken", "fix", "repair", "error", "problem", "issue", "not working", "diagnose", "troubleshoot", "help with"],
  writing: ["write", "email", "letter", "post", "caption", "script", "draft", "compose", "blog", "article", "resume"],
  business: ["marketing", "advertise", "promote", "invoice", "proposal", "strategy", "customers", "clients", "leads", "sales", "pricing"],
  content: ["youtube", "tiktok", "video", "thumbnail", "script", "channel", "content", "podcast", "hook", "reel", "instagram"],
  finance: ["budget", "invest", "save", "tax", "income", "profit", "side hustle", "credit", "debt", "money", "stocks"],
  diy: ["build", "install", "paint", "measure", "tool", "project", "renovate", "shelf", "deck", "drywall", "woodwork"],
  health: ["symptom", "diet", "exercise", "weight", "sleep", "pain", "doctor", "vitamin", "calories", "fitness"],
  travel: ["flight", "hotel", "trip", "vacation", "itinerary", "pack", "airport", "destination", "road trip"],
};

const FOLLOW_UP_QUESTIONS: Record<string, Array<{ id: string; question: string; type: "buttons" | "text"; options?: string[] }>> = {
  shopping: [
    { id: "budget", question: "What's your budget?", type: "buttons", options: ["Under $50", "$50-200", "$200-500", "$500+", "No limit"] },
    { id: "brand", question: "Any brand preference?", type: "text" },
    { id: "purpose", question: "Buying for yourself or a gift?", type: "buttons", options: ["Myself", "Gift"] },
  ],
  research: [
    { id: "depth", question: "How deep should this go?", type: "buttons", options: ["Quick overview", "Detailed breakdown", "Academic-level"] },
    { id: "purpose", question: "What's this for?", type: "buttons", options: ["Personal learning", "School", "Work", "Just curious"] },
    { id: "focus", question: "Any specific angle?", type: "text" },
  ],
  troubleshooting: [
    { id: "model", question: "What exact make/model?", type: "text" },
    { id: "symptom", question: "What's happening exactly?", type: "text" },
    { id: "tried", question: "Already tried anything?", type: "text" },
  ],
  writing: [
    { id: "tone", question: "What tone?", type: "buttons", options: ["Professional", "Casual", "Persuasive", "Friendly"] },
    { id: "length", question: "How long?", type: "buttons", options: ["Short (1-2 paragraphs)", "Medium (3-5)", "Long (full page)"] },
    { id: "audience", question: "Who's the audience?", type: "text" },
  ],
  business: [
    { id: "platform", question: "What platform?", type: "buttons", options: ["Facebook", "Instagram", "Google", "Email", "Website"] },
    { id: "goal", question: "What's the goal?", type: "buttons", options: ["Get leads", "Build awareness", "Drive sales", "Announce something"] },
    { id: "offer", question: "Any special offer or promo?", type: "text" },
  ],
  content: [
    { id: "platform", question: "What platform?", type: "buttons", options: ["YouTube", "TikTok", "Instagram", "Blog", "Podcast"] },
    { id: "duration", question: "How long?", type: "buttons", options: ["Under 1 min", "1-5 min", "5-15 min", "15+ min"] },
    { id: "angle", question: "What's your unique angle or hook?", type: "text" },
  ],
  finance: [
    { id: "situation", question: "What's your current situation?", type: "text" },
    { id: "goal", question: "What's your goal?", type: "buttons", options: ["Save more", "Invest", "Earn extra", "Cut expenses", "Tax optimization"] },
    { id: "risk", question: "Risk tolerance?", type: "buttons", options: ["Low", "Medium", "High"] },
  ],
  diy: [
    { id: "tools", question: "What tools do you have?", type: "text" },
    { id: "skill", question: "Skill level?", type: "buttons", options: ["Beginner", "Intermediate", "Advanced"] },
    { id: "budget", question: "Budget for this project?", type: "buttons", options: ["Under $50", "$50-200", "$200-500", "$500+"] },
  ],
  health: [
    { id: "who", question: "Is this for you or someone else?", type: "buttons", options: ["Me", "Someone else"] },
    { id: "doctor", question: "Seen a doctor about this?", type: "buttons", options: ["Yes", "No", "Planning to"] },
    { id: "duration", question: "How long has this been going on?", type: "text" },
  ],
  travel: [
    { id: "when", question: "When are you traveling?", type: "text" },
    { id: "group", question: "How many people?", type: "buttons", options: ["Solo", "Couple", "Family", "Group"] },
    { id: "budget", question: "Budget level?", type: "buttons", options: ["Budget", "Mid-range", "Luxury", "No limit"] },
  ],
};

function detectCategory(rawInput: string): string {
  const lower = rawInput.toLowerCase();
  let bestCategory = "research";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

function parseJsonFromResponse(text: string): any {
  // Strip markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return JSON.parse(cleaned.trim());
}

const SYSTEM_PROMPT = `You are PromptTuner, an expert prompt engineer. Transform the user's rough question and follow-up answers into 3 polished prompt versions. Also detect a financial opportunity ("money angle") related to their topic.

INPUT: raw_question, category, follow_up_answers (key-value pairs), ai_target (perplexity/chatgpt/claude/gemini)

OUTPUT as JSON:
{
  "prompt_quick": "Concise 1-2 sentence refined question. No role assignment.",
  "prompt_detailed": "Paragraph with context from follow-ups, specific requirements, clear formatting request.",
  "prompt_expert": "Starts with role assignment ('You are a...'), full context, clear task, constraints, exact output format specified.",
  "money_angle_suggestion": "1-2 sentence suggestion of how they could monetize this knowledge/topic. Be specific and realistic. Example: 'You research products like a pro. People earn $500-2,000/month reviewing products with affiliate links.' If no angle applies, return null.",
  "money_angle_prompt": "A copy-paste prompt they can use to explore the money angle. Should ask an AI to help them monetize the skill/knowledge. If no angle, return null."
}

RULES:
1. Use follow-up answers naturally in the prompts
2. Quick version is standalone and usable
3. Expert version uses: Role + Context + Task + Constraints + Output Format
4. If ai_target is perplexity, optimize for search (use "find current", "compare", "search for")
5. Never invent information the user didn't provide
6. Money angle must be realistic and directly related to the question topic
7. Each prompt must be copy-paste ready
8. Return ONLY valid JSON, no markdown code blocks or extra text`;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Seed templates on startup
  await storage.seedTemplates();

  // Detect category from raw input
  app.post("/api/detect-category", async (req, res) => {
    try {
      const { rawInput } = req.body;
      if (!rawInput || typeof rawInput !== "string") {
        return res.status(400).json({ message: "rawInput is required" });
      }
      const category = detectCategory(rawInput);
      const followUpQuestions = FOLLOW_UP_QUESTIONS[category] || FOLLOW_UP_QUESTIONS.research;
      res.json({ category, followUpQuestions });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generate prompts using Claude
  app.post("/api/generate-prompt", async (req, res) => {
    try {
      const { rawInput, category, followUpAnswers, aiTarget } = req.body;
      if (!rawInput || !category) {
        return res.status(400).json({ message: "rawInput and category are required" });
      }

      const userMessage = `Raw question: ${rawInput}
Category: ${category}
Follow-up answers: ${JSON.stringify(followUpAnswers || {})}
AI target: ${aiTarget || "perplexity"}`;

      const response = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text response from Claude");
      }

      const parsed = parseJsonFromResponse(textContent.text);

      const prompt = await storage.createPrompt({
        rawInput,
        category,
        followUpAnswers: followUpAnswers ? JSON.stringify(followUpAnswers) : null,
        promptQuick: parsed.prompt_quick,
        promptDetailed: parsed.prompt_detailed,
        promptExpert: parsed.prompt_expert,
        moneyAngleSuggestion: parsed.money_angle_suggestion || null,
        moneyAnglePrompt: parsed.money_angle_prompt || null,
        aiTarget: aiTarget || "perplexity",
        isFavorite: false,
      });

      res.json(prompt);
    } catch (error: any) {
      console.error("Generate error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // List all prompts
  app.get("/api/prompts", async (_req, res) => {
    try {
      const allPrompts = await storage.getPrompts();
      res.json(allPrompts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a prompt
  app.delete("/api/prompts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await storage.deletePrompt(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Toggle favorite
  app.patch("/api/prompts/:id/favorite", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await storage.toggleFavorite(id);
      if (!updated) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // List all templates
  app.get("/api/templates", async (_req, res) => {
    try {
      const allTemplates = await storage.getTemplates();
      res.json(allTemplates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generate from template
  app.post("/api/generate-from-template", async (req, res) => {
    try {
      const { templateId, fieldValues, aiTarget } = req.body;
      if (!templateId || !fieldValues) {
        return res.status(400).json({ message: "templateId and fieldValues are required" });
      }

      const template = await storage.getTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Fill in template
      let filledPrompt = template.promptTemplate;
      for (const [key, value] of Object.entries(fieldValues)) {
        filledPrompt = filledPrompt.replace(new RegExp(`\\[${key}\\]`, "g"), value as string);
      }

      const userMessage = `Raw question: ${filledPrompt}
Category: ${template.category}
Follow-up answers: ${JSON.stringify(fieldValues)}
AI target: ${aiTarget || "perplexity"}`;

      const response = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text response from Claude");
      }

      const parsed = parseJsonFromResponse(textContent.text);

      const prompt = await storage.createPrompt({
        rawInput: filledPrompt,
        category: template.category,
        followUpAnswers: JSON.stringify(fieldValues),
        promptQuick: parsed.prompt_quick,
        promptDetailed: parsed.prompt_detailed,
        promptExpert: parsed.prompt_expert,
        moneyAngleSuggestion: parsed.money_angle_suggestion || null,
        moneyAnglePrompt: parsed.money_angle_prompt || null,
        aiTarget: aiTarget || "perplexity",
        isFavorite: false,
      });

      res.json(prompt);
    } catch (error: any) {
      console.error("Generate from template error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
