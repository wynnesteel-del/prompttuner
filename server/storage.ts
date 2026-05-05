import { prompts, templates, roles, type Prompt, type InsertPrompt, type Template, type InsertTemplate, type Role, type InsertRole } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";

const sqlite = new Database("data.db");

// Create tables if they don't exist
sqlite.exec(`
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
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    is_premium INTEGER DEFAULT 0,
    suggested_prompts TEXT NOT NULL,
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
  getRoles(): Promise<Role[]>;
  getRole(id: number): Promise<Role | undefined>;
  seedRoles(): Promise<void>;
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

  async getRoles(): Promise<Role[]> {
    return db.select().from(roles).orderBy(roles.sortOrder).all();
  }

  async getRole(id: number): Promise<Role | undefined> {
    return db.select().from(roles).where(eq(roles.id, id)).get();
  }

  async seedRoles(): Promise<void> {
    const existing = db.select().from(roles).all();
    if (existing.length > 0) return;

    const roleData: InsertRole[] = [
      {
        name: "Auto Mechanic",
        icon: "🔧",
        description: "Vehicle diagnostics, repair estimates, maintenance schedules",
        category: "technical",
        isPremium: false,
        suggestedPrompts: JSON.stringify([
          "Diagnose a knocking sound coming from my engine when I accelerate",
          "Build me a complete preventive maintenance schedule for a high-mileage vehicle",
          "Explain what these check engine codes mean and what I should do",
          "Compare the real cost difference between synthetic and conventional oil for my car",
          "What questions should I ask a mechanic before agreeing to a repair estimate?",
          "Walk me through how to safely do my own brake pad replacement",
          "What are the most common failures on a [year/make/model] I should watch for?",
          "Help me negotiate a fair price for a used car I'm about to buy"
        ]),
        sortOrder: 1,
      },
      {
        name: "Lawn Care Expert",
        icon: "🌿",
        description: "Lawn treatment plans, equipment advice, business pricing",
        category: "technical",
        isPremium: false,
        suggestedPrompts: JSON.stringify([
          "Build me a seasonal lawn care schedule for Mississippi's climate",
          "What's the best fertilization program for a thick, weed-free lawn in the South?",
          "How do I price lawn care services competitively in my local market?",
          "Diagnose why my lawn has yellow patches and how to fix it",
          "Compare the top zero-turn mowers under $5,000 for a 2-acre property",
          "Write me a professional quote template for new lawn care customers",
          "What equipment do I need to start a professional lawn care business from scratch?",
          "Create a Facebook ad for my lawn care business that generates leads"
        ]),
        sortOrder: 2,
      },
      {
        name: "Financial Advisor",
        icon: "💰",
        description: "Budgeting, debt payoff, investing basics, emergency funds",
        category: "finance",
        isPremium: false,
        suggestedPrompts: JSON.stringify([
          "Build me a zero-based budget based on my monthly take-home income",
          "Create a debt payoff plan using the avalanche method for my specific debts",
          "Explain index fund investing for a complete beginner in plain language",
          "How much should I have in an emergency fund and where should I keep it?",
          "Walk me through how to set up a Roth IRA step by step",
          "What's the smartest way to use a tax refund to improve my financial situation?",
          "Help me figure out how much house I can actually afford",
          "What financial moves should I make before the end of the tax year?"
        ]),
        sortOrder: 3,
      },
      {
        name: "Delivery Driver",
        icon: "🚗",
        description: "Route optimization, earnings maximization, tax deductions",
        category: "gig",
        isPremium: false,
        suggestedPrompts: JSON.stringify([
          "What are the best strategies to maximize earnings during peak DoorDash hours?",
          "Create a complete list of tax deductions available to gig delivery drivers",
          "How should I track mileage and expenses throughout the year for taxes?",
          "What's the most efficient way to decide which orders to accept or decline?",
          "Compare the earnings potential between DoorDash, UberEats, and Instacart in a mid-size city",
          "Help me calculate my real hourly rate after expenses on a recent delivery day",
          "What are the hottest delivery zones and times in a typical American suburb?",
          "Build me a daily pre-shift checklist to maximize my gig driving efficiency"
        ]),
        sortOrder: 4,
      },
      {
        name: "Business Coach",
        icon: "📈",
        description: "Marketing copy, pricing strategies, customer acquisition",
        category: "business",
        isPremium: false,
        suggestedPrompts: JSON.stringify([
          "Write a compelling elevator pitch for my service business that converts strangers into customers",
          "Help me raise my prices without losing my existing customers",
          "Create a 90-day customer acquisition plan for a local service business",
          "Write 5 Facebook post ideas that would generate leads for my business this week",
          "How do I turn one-time customers into loyal repeat clients?",
          "Create a referral program that motivates my existing customers to send me new ones",
          "Write a professional response to a negative online review",
          "Build a simple business growth plan I can actually execute with limited time"
        ]),
        sortOrder: 5,
      },
      {
        name: "Personal Chef",
        icon: "👨‍🍳",
        description: "Meal plans, recipes, grocery lists, nutrition",
        category: "health",
        isPremium: false,
        suggestedPrompts: JSON.stringify([
          "Build me a 7-day meal plan for a busy person that costs under $100 a week",
          "Create a meal prep guide I can execute in 2 hours on Sunday for the whole week",
          "Suggest 5 high-protein dinner recipes I can make in under 30 minutes",
          "Write me a grocery list for a week of healthy eating for a family of 4",
          "How do I make restaurant-quality meals at home on a tight budget?",
          "Create a list of meals I can make with just pantry staples when I haven't shopped",
          "What are the best foods to eat for sustained energy during a physical work day?",
          "Help me cut $200/month from my food budget without sacrificing nutrition"
        ]),
        sortOrder: 6,
      },
      {
        name: "Fitness Trainer",
        icon: "💪",
        description: "Workout plans, nutrition guidance, progress tracking",
        category: "health",
        isPremium: false,
        suggestedPrompts: JSON.stringify([
          "Build me a beginner strength training program I can do 3 days a week at home",
          "Create a workout plan for someone with a physically demanding job who needs active recovery",
          "What's the most effective way to lose 20 pounds without losing muscle?",
          "Design a 15-minute morning routine that boosts energy for the whole day",
          "What should I eat before and after a hard physical work day to recover faster?",
          "How do I build visible muscle without spending money on a gym membership?",
          "Create a stretching routine to prevent back pain from long days on my feet",
          "Help me track my fitness progress with a simple weekly check-in system"
        ]),
        sortOrder: 7,
      },
      {
        name: "Real Estate Agent",
        icon: "🏠",
        description: "Home buying, selling strategies, market analysis",
        category: "finance",
        isPremium: false,
        suggestedPrompts: JSON.stringify([
          "Walk me through every step of buying my first home in plain language",
          "What are the red flags I should look for when touring a house?",
          "Help me write a compelling offer letter that gets my bid accepted in a competitive market",
          "What renovations actually increase a home's resale value vs. waste money?",
          "Explain closing costs and which ones are negotiable",
          "How do I know if a neighborhood is worth investing in long-term?",
          "What's the true cost of homeownership beyond the mortgage payment?",
          "Should I buy or continue renting given my current financial situation?"
        ]),
        sortOrder: 8,
      },
      {
        name: "Electrician",
        icon: "⚡",
        description: "Electrical troubleshooting, safety, home wiring",
        category: "technical",
        isPremium: false,
        suggestedPrompts: JSON.stringify([
          "Why does my circuit breaker keep tripping and how do I fix it safely?",
          "Walk me through safely replacing a standard light switch",
          "What electrical problems in a home should I never try to DIY?",
          "How do I test an outlet to see if it's working properly?",
          "What are the signs that my home's electrical panel needs to be upgraded?",
          "Explain the difference between 15-amp and 20-amp circuits and when each is needed",
          "How much does it typically cost to have an electrician run a new circuit?",
          "What are the most common electrical code violations homeowners make?"
        ]),
        sortOrder: 9,
      },
      {
        name: "Plumber",
        icon: "🔩",
        description: "Pipe issues, water pressure, leak detection, repairs",
        category: "technical",
        isPremium: false,
        suggestedPrompts: JSON.stringify([
          "My water pressure suddenly dropped — what are the most likely causes and how do I diagnose them?",
          "Walk me through how to fix a running toilet step by step",
          "What plumbing repairs can I safely DIY vs. which ones need a professional?",
          "Why is my water heater making a rumbling noise and what should I do?",
          "How do I find a hidden water leak before it causes major damage?",
          "What should I do immediately if a pipe bursts in my home?",
          "How do I winterize my outdoor hose bibs to prevent pipes from freezing?",
          "What's a fair price for common plumbing repairs so I'm not overcharged?"
        ]),
        sortOrder: 10,
      },
      {
        name: "Tax Strategist",
        icon: "🧾",
        description: "Small business tax deductions, write-offs, quarterly taxes",
        category: "finance",
        isPremium: true,
        suggestedPrompts: JSON.stringify([
          "What are every tax deduction available to a self-employed small business owner?",
          "How should I handle quarterly estimated taxes as a freelancer or gig worker?",
          "What business expenses can I deduct if I work from home?",
          "Explain the difference between an LLC, S-Corp, and sole proprietorship for tax purposes",
          "How do I deduct vehicle expenses for my business — actual costs vs. mileage rate?",
          "What retirement account should a self-employed person use to minimize taxes?",
          "Create a year-end tax checklist for a small business owner",
          "How do I avoid an IRS audit and what triggers one for self-employed people?"
        ]),
        sortOrder: 11,
      },
      {
        name: "YouTube Strategist",
        icon: "🎬",
        description: "Channel growth, scripts, thumbnails, monetization",
        category: "content",
        isPremium: true,
        suggestedPrompts: JSON.stringify([
          "Write a compelling 10-minute YouTube script for a product review video that keeps viewers watching",
          "What are the best YouTube niches that are growing but not yet oversaturated?",
          "Create a 30-day content calendar for a new YouTube channel in my niche",
          "Write 10 YouTube video title ideas optimized for search and high click-through rate",
          "How do I grow from 0 to 1,000 subscribers as fast as possible?",
          "What makes a YouTube thumbnail get clicked vs. ignored?",
          "Build a monetization roadmap from 0 subscribers to full-time income",
          "Write an engaging channel trailer script that makes people subscribe immediately"
        ]),
        sortOrder: 12,
      },
      {
        name: "Marketing Copywriter",
        icon: "✍️",
        description: "Sales pages, email sequences, ad copy that converts",
        category: "business",
        isPremium: true,
        suggestedPrompts: JSON.stringify([
          "Write a sales page for my service that converts cold visitors into paying customers",
          "Create a 5-email welcome sequence for new subscribers that builds trust and drives sales",
          "Write Facebook ad copy for my local service business targeting homeowners",
          "Help me write a landing page headline that immediately communicates my value",
          "Create an email subject line and preview text that gets opened in a crowded inbox",
          "Write a follow-up sequence for leads who didn't respond to my first outreach",
          "Rewrite my 'About Us' page so it actually makes people want to hire me",
          "Create a limited-time offer promotion that creates urgency without feeling pushy"
        ]),
        sortOrder: 13,
      },
      {
        name: "Social Media Manager",
        icon: "📱",
        description: "Content strategy, captions, growth tactics, engagement",
        category: "content",
        isPremium: true,
        suggestedPrompts: JSON.stringify([
          "Create a 30-day social media content calendar for my small business",
          "Write 10 Instagram caption templates I can reuse for my service business",
          "What posting schedule and frequency actually drives growth on Instagram in 2026?",
          "Create a TikTok content strategy for a local business with no video experience",
          "Write a viral-style hook for a before/after post about my services",
          "How do I repurpose one piece of content across 5 different social platforms?",
          "What types of posts get the most engagement for local service businesses?",
          "Help me respond to comments and DMs in a way that builds community and loyalty"
        ]),
        sortOrder: 14,
      },
      {
        name: "SEO Specialist",
        icon: "🔍",
        description: "Keyword research, local SEO, ranking strategies",
        category: "business",
        isPremium: true,
        suggestedPrompts: JSON.stringify([
          "Find the best low-competition keywords for a local lawn care business website",
          "Write an SEO-optimized homepage for my service business",
          "How do I get my Google Business Profile to rank #1 in my city?",
          "What are the most important local SEO factors for a service-area business?",
          "Create a blog content strategy that drives organic traffic for my business niche",
          "How do I build backlinks for a small local business without spending money?",
          "Write a meta title and description for my most important service page",
          "What SEO mistakes are costing small business websites the most traffic?"
        ]),
        sortOrder: 15,
      },
      {
        name: "Life Coach",
        icon: "🧠",
        description: "Goal setting, productivity systems, mindset shifts",
        category: "personal",
        isPremium: true,
        suggestedPrompts: JSON.stringify([
          "Help me design a realistic 90-day plan to achieve my most important goal",
          "What morning routine would give me the most energy and focus for a demanding day?",
          "I keep procrastinating on important tasks — help me build a system to stop",
          "How do I balance running a small business with family responsibilities without burning out?",
          "Create a weekly review system that keeps me accountable to my goals",
          "What habits separate successful small business owners from those who struggle?",
          "Help me identify and eliminate the time wasters costing me 2+ hours a day",
          "Write me a personal vision statement that motivates me to keep pushing forward"
        ]),
        sortOrder: 16,
      },
      {
        name: "Investment Analyst",
        icon: "📊",
        description: "Stock screening, portfolio building, risk analysis",
        category: "finance",
        isPremium: true,
        suggestedPrompts: JSON.stringify([
          "Explain a simple, proven investment strategy for someone starting with $500",
          "What's the difference between stocks, ETFs, and index funds — which should I start with?",
          "How do I evaluate whether a stock is overvalued or undervalued?",
          "Build me a diversified beginner portfolio with $1,000 to invest today",
          "What are the biggest investing mistakes beginners make and how do I avoid them?",
          "Explain dollar-cost averaging and whether it's right for someone with irregular income",
          "What should I do with my investments when the market drops significantly?",
          "How do I invest in real estate with limited capital — REITs vs. physical property?"
        ]),
        sortOrder: 17,
      },
      {
        name: "Small Business Attorney",
        icon: "⚖️",
        description: "Contracts, LLC formation, business disputes, legal basics",
        category: "business",
        isPremium: true,
        suggestedPrompts: JSON.stringify([
          "What legal structure should I use for my small service business — LLC or sole proprietor?",
          "Walk me through the key clauses I need in a service agreement with clients",
          "What should I do if a customer refuses to pay for work I've completed?",
          "How do I protect my business name and brand from competitors copying it?",
          "What are the most important legal steps to take when starting a business?",
          "Create a simple client contract template for a service-based small business",
          "What insurance does a small business owner absolutely need?",
          "How do I handle a negative review that contains false statements about my business?"
        ]),
        sortOrder: 18,
      },
      {
        name: "Travel Planner",
        icon: "✈️",
        description: "Itineraries, travel hacks, budgets, packing lists",
        category: "personal",
        isPremium: false,
        suggestedPrompts: JSON.stringify([
          "Build me a complete 7-day itinerary for a first-time visit to [destination]",
          "What are the best travel hacks to cut costs on flights and hotels?",
          "Create a packing list for a 10-day trip that fits in a carry-on only",
          "What travel credit cards give the best rewards for someone who flies a few times a year?",
          "Find the cheapest time of year to visit popular destinations",
          "Create a detailed budget for a family of 4 to travel for a week on $2,000",
          "What travel insurance do I actually need and what can I skip?",
          "What are the most underrated travel destinations that feel like Europe without the price?"
        ]),
        sortOrder: 19,
      },
      {
        name: "Startup Advisor",
        icon: "🚀",
        description: "Business plans, pitch decks, funding, product-market fit",
        category: "business",
        isPremium: true,
        suggestedPrompts: JSON.stringify([
          "Help me validate my business idea before I invest time and money into it",
          "Write a one-page business plan for my service or product concept",
          "What are the most common reasons startups fail in the first year?",
          "How do I find my first 10 paying customers from scratch?",
          "Create a competitive analysis for my business idea",
          "What financial projections should I build for a new service business?",
          "How do I price a new product or service when I have no market data?",
          "Write an elevator pitch for my business idea that gets people excited"
        ]),
        sortOrder: 20,
      },
    ];

    for (const role of roleData) {
      db.insert(roles).values(role).run();
    }
  }
}

export const storage = new DatabaseStorage();
