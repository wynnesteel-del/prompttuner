import { prompts, templates, type Prompt, type InsertPrompt, type Template, type InsertTemplate } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";

const sqlite = new Database("data.db");sqlite.exec(`
  CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_input TEXT NOT NULL,
    category TEXT NOT NULL,
    follow_up_answers TEXT,
    prompt_quick TEXT,
    prompt_detailed TEXT,
    prompt_expert TEXT,
    money_angle_suggestion TEXT,
    money_angle_prompt TEXT,
    ai_target TEXT DEFAULT 'perplexity',
    is_favorite INTEGER DEFAULT 0,
    created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    prompt_template TEXT NOT NULL,
    fields TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0
  );
`);

sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  getPrompts(): Promise<Prompt[]>;
  getPrompt(id: number): Promise<Prompt | undefined>;
  createPrompt(data: InsertPrompt): Promise<Prompt>;
  deletePrompt(id: number): Promise<void>;
  toggleFavorite(id: number): Promise<Prompt | undefined>;
  getTemplates(): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  seedTemplates(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getPrompts(): Promise<Prompt[]> {
    return db.select().from(prompts).orderBy(desc(prompts.id)).all();
  }

  async getPrompt(id: number): Promise<Prompt | undefined> {
    return db.select().from(prompts).where(eq(prompts.id, id)).get();
  }

  async createPrompt(data: InsertPrompt): Promise<Prompt> {
    return db.insert(prompts).values(data).returning().get();
  }

  async deletePrompt(id: number): Promise<void> {
    db.delete(prompts).where(eq(prompts.id, id)).run();
  }

  async toggleFavorite(id: number): Promise<Prompt | undefined> {
    const existing = db.select().from(prompts).where(eq(prompts.id, id)).get();
    if (!existing) return undefined;
    return db
      .update(prompts)
      .set({ isFavorite: !existing.isFavorite })
      .where(eq(prompts.id, id))
      .returning()
      .get();
  }

  async getTemplates(): Promise<Template[]> {
    return db.select().from(templates).orderBy(templates.sortOrder).all();
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    return db.select().from(templates).where(eq(templates.id, id)).get();
  }

  async seedTemplates(): Promise<void> {
    const existing = db.select().from(templates).all();
    if (existing.length > 0) return;

    const seedData: InsertTemplate[] = [
      {
        category: "shopping",
        title: "Product Comparison",
        description: "Compare top products in any category with pros, cons, and pricing",
        promptTemplate: "Compare the top [NUMBER] [PRODUCT_TYPE] in [PRICE_RANGE]. For each product, provide: brand and model name, key features, pros and cons, current price, and a final recommendation. Include a comparison table.",
        fields: JSON.stringify([
          { key: "NUMBER", label: "How many to compare?", placeholder: "e.g., 5" },
          { key: "PRODUCT_TYPE", label: "What product?", placeholder: "e.g., zero-turn mowers" },
          { key: "PRICE_RANGE", label: "Price range?", placeholder: "e.g., under $3,000" }
        ]),
        icon: "🛒",
        sortOrder: 1,
      },
      {
        category: "troubleshooting",
        title: "Troubleshooting Guide",
        description: "Get step-by-step diagnosis and repair instructions",
        promptTemplate: "You are a certified [SPECIALTY] technician. I'm experiencing [PROBLEM] with my [MAKE_MODEL]. Provide a systematic troubleshooting guide: possible causes ranked by likelihood, step-by-step diagnostic tests, repair instructions for each cause, parts needed with estimated costs, and when to call a professional.",
        fields: JSON.stringify([
          { key: "SPECIALTY", label: "What type of equipment?", placeholder: "e.g., small engine" },
          { key: "PROBLEM", label: "What's the problem?", placeholder: "e.g., won't start, clicks but doesn't crank" },
          { key: "MAKE_MODEL", label: "Make and model?", placeholder: "e.g., Bad Boy Elite ZT 54\"" }
        ]),
        icon: "🔧",
        sortOrder: 2,
      },
      {
        category: "business",
        title: "Business Marketing Post",
        description: "Create a marketing post for any platform",
        promptTemplate: "You are a small business marketing expert specializing in [PLATFORM] marketing. Create a high-converting post for [BUSINESS_NAME] in [CITY_STATE] promoting their [SERVICE]. Include a special offer: [OFFER]. The post should have an attention-grabbing hook, value proposition, social proof suggestion, clear call-to-action, and relevant hashtags.",
        fields: JSON.stringify([
          { key: "PLATFORM", label: "Platform?", placeholder: "e.g., Facebook" },
          { key: "BUSINESS_NAME", label: "Business name?", placeholder: "e.g., Joe's Lawn Care" },
          { key: "CITY_STATE", label: "City & State?", placeholder: "e.g., Austin, TX" },
          { key: "SERVICE", label: "Service to promote?", placeholder: "e.g., spring lawn treatment" },
          { key: "OFFER", label: "Special offer?", placeholder: "e.g., 20% off first service" }
        ]),
        icon: "💼",
        sortOrder: 3,
      },
      {
        category: "content",
        title: "YouTube Script",
        description: "Write a complete video script with hooks and structure",
        promptTemplate: "Write a [LENGTH]-minute script for a [VIDEO_TYPE] video about [TOPIC] targeting [AUDIENCE]. Include: an attention-grabbing hook (first 10 seconds), intro with channel branding, 3-5 main points with transitions, engagement prompts (like, subscribe, comment), and a strong outro with CTA.",
        fields: JSON.stringify([
          { key: "LENGTH", label: "Video length (minutes)?", placeholder: "e.g., 10" },
          { key: "VIDEO_TYPE", label: "Video type?", placeholder: "e.g., tutorial, review, vlog" },
          { key: "TOPIC", label: "Topic?", placeholder: "e.g., how to start a garden" },
          { key: "AUDIENCE", label: "Target audience?", placeholder: "e.g., beginners" }
        ]),
        icon: "🎬",
        sortOrder: 4,
      },
      {
        category: "research",
        title: "Research Deep Dive",
        description: "Get a comprehensive analysis of any topic",
        promptTemplate: "Provide a comprehensive analysis of [TOPIC] focusing on [FOCUS_AREA]. Depth level: [DEPTH_LEVEL]. Include: overview and background, current state of knowledge, key findings and data, different perspectives and debates, practical implications, and sources or further reading suggestions.",
        fields: JSON.stringify([
          { key: "TOPIC", label: "Topic?", placeholder: "e.g., intermittent fasting" },
          { key: "FOCUS_AREA", label: "Focus area?", placeholder: "e.g., health benefits and risks" },
          { key: "DEPTH_LEVEL", label: "Depth level?", placeholder: "e.g., detailed breakdown" }
        ]),
        icon: "🔍",
        sortOrder: 5,
      },
      {
        category: "finance",
        title: "Side Hustle Finder",
        description: "Discover money-making opportunities based on your skills",
        promptTemplate: "You are a gig economy and side hustle expert. Based on my situation: [CURRENT_SITUATION], available hours: [HOURS_AVAILABLE] per week, budget to invest: [BUDGET_TO_INVEST], and skills: [SKILLS]. Suggest 5 realistic side hustles. For each: expected monthly income range, startup costs, time to first dollar, difficulty level, and step-by-step getting started guide.",
        fields: JSON.stringify([
          { key: "CURRENT_SITUATION", label: "Current situation?", placeholder: "e.g., full-time office job" },
          { key: "HOURS_AVAILABLE", label: "Hours available per week?", placeholder: "e.g., 10-15" },
          { key: "BUDGET_TO_INVEST", label: "Budget to invest?", placeholder: "e.g., $200" },
          { key: "SKILLS", label: "Your skills?", placeholder: "e.g., writing, social media, photography" }
        ]),
        icon: "💰",
        sortOrder: 6,
      },
      {
        category: "writing",
        title: "Email Writer",
        description: "Craft the perfect email for any situation",
        promptTemplate: "Write a [TONE] email to [RECIPIENT] about [TOPIC]. Context: [CONTEXT]. The email should be clear, concise, and achieve the desired outcome. Include subject line, greeting, body with clear purpose, call-to-action, and professional closing.",
        fields: JSON.stringify([
          { key: "TONE", label: "Tone?", placeholder: "e.g., professional, casual, persuasive" },
          { key: "RECIPIENT", label: "Who's it to?", placeholder: "e.g., my boss, a client, a vendor" },
          { key: "TOPIC", label: "Topic?", placeholder: "e.g., requesting a raise" },
          { key: "CONTEXT", label: "Context?", placeholder: "e.g., been at company 2 years, exceed all targets" }
        ]),
        icon: "✉️",
        sortOrder: 7,
      },
      {
        category: "diy",
        title: "DIY Project Planner",
        description: "Get a complete project plan with materials and steps",
        promptTemplate: "You are an experienced contractor and DIY expert. Help me plan a [PROJECT_TYPE] project. My skill level: [SKILL_LEVEL]. Budget: [BUDGET]. Tools I have: [TOOLS_AVAILABLE]. Provide: complete materials list with quantities and estimated costs, tool requirements, step-by-step instructions with pro tips, common mistakes to avoid, time estimate, and safety considerations.",
        fields: JSON.stringify([
          { key: "PROJECT_TYPE", label: "Project type?", placeholder: "e.g., build floating shelves" },
          { key: "SKILL_LEVEL", label: "Skill level?", placeholder: "e.g., beginner, intermediate" },
          { key: "BUDGET", label: "Budget?", placeholder: "e.g., under $200" },
          { key: "TOOLS_AVAILABLE", label: "Tools you have?", placeholder: "e.g., drill, saw, level" }
        ]),
        icon: "🔨",
        sortOrder: 8,
      },
    ];

    for (const template of seedData) {
      db.insert(templates).values(template).run();
    }
  }
}

export const storage = new DatabaseStorage();
