import { Hono } from "hono";
import type { Env } from "../types";
import { generateId } from "../utils/ids";
import { logAudit } from "../utils/audit";
import { writeAuth } from "../middleware/auth";

export const categories = new Hono<{ Bindings: Env }>();

const HARDCODED_CATEGORIES = [
  { id: "tech", name: "Technology", group: "Technology & Innovation" },
  { id: "ai-ml", name: "AI & Machine Learning", group: "Technology & Innovation" },
  { id: "fintech", name: "Fintech", group: "Technology & Innovation" },
  { id: "crypto", name: "Crypto & Web3", group: "Technology & Innovation" },
  { id: "business", name: "Business", group: "Business & Economy" },
  { id: "economy", name: "Economy", group: "Business & Economy" },
  { id: "investment", name: "Investment", group: "Business & Economy" },
  { id: "real-estate", name: "Real Estate", group: "Business & Economy" },
  { id: "music", name: "Music", group: "Entertainment & Media" },
  { id: "film-tv", name: "Film & TV", group: "Entertainment & Media" },
  { id: "gaming", name: "Gaming", group: "Entertainment & Media" },
  { id: "celebrity", name: "Celebrity & Entertainment", group: "Entertainment & Media" },
  { id: "football", name: "Football", group: "Sports" },
  { id: "sports-other", name: "Other Sports", group: "Sports" },
  { id: "fitness", name: "Fitness & Wellness", group: "Sports" },
  { id: "culture", name: "Culture & Society", group: "Culture & Society" },
  { id: "fashion", name: "Fashion", group: "Culture & Society" },
  { id: "food", name: "Food & Drink", group: "Culture & Society" },
  { id: "travel", name: "Travel", group: "Culture & Society" },
  { id: "politics", name: "Politics", group: "News & Current Affairs" },
  { id: "world-news", name: "World News", group: "News & Current Affairs" },
  { id: "local-news", name: "Local News", group: "News & Current Affairs" },
  { id: "education", name: "Education", group: "Education & Knowledge" },
  { id: "science", name: "Science", group: "Education & Knowledge" },
  { id: "history", name: "History", group: "Education & Knowledge" },
  { id: "relationships", name: "Relationships", group: "Lifestyle" },
  { id: "parenting", name: "Parenting", group: "Lifestyle" },
  { id: "spirituality", name: "Spirituality", group: "Lifestyle" },
  { id: "art", name: "Art", group: "Creative Arts" },
  { id: "literature", name: "Literature", group: "Creative Arts" },
  { id: "comedy", name: "Comedy", group: "Creative Arts" },
  { id: "environment", name: "Environment", group: "Environment" },
];

// GET /api/categories
categories.get("/categories", async (c) => {
  try {
    // Try reading from database first
    const dbResult = await c.env.DB.prepare(
      "SELECT id, name, group_name as 'group', icon, sort_order FROM categories ORDER BY sort_order, name"
    ).all();

    if (dbResult.results && dbResult.results.length > 0) {
      return c.json({ categories: dbResult.results });
    }
  } catch {
    // Table may not exist yet — fall through to hardcoded
  }

  // Fall back to hardcoded categories
  return c.json({ categories: HARDCODED_CATEGORIES });
});

// POST /api/categories/seed — Admin endpoint to seed categories from hardcoded list to database
categories.post("/categories/seed", writeAuth, async (c) => {
  // Check how many already exist
  let existingCount = 0;
  try {
    const countResult = await c.env.DB.prepare("SELECT COUNT(*) as count FROM categories").first() as { count: number } | null;
    existingCount = countResult?.count || 0;
  } catch {
    // Table may not exist yet
    return c.json({ error: "Categories table does not exist. Run migration 005_backend_hardening.sql first." }, 500);
  }

  if (existingCount > 0) {
    return c.json({ error: "Categories table already has data. Clear it first if you want to re-seed.", count: existingCount }, 409);
  }

  // Insert all hardcoded categories
  const statements = HARDCODED_CATEGORIES.map((cat, index) =>
    c.env.DB.prepare(
      "INSERT INTO categories (id, name, group_name, sort_order) VALUES (?, ?, ?, ?)"
    ).bind(cat.id, cat.name, cat.group, index)
  );

  await c.env.DB.batch(statements);

  const ipAddress = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || null;

  await logAudit(c.env, {
    action: "admin.seed",
    resourceType: "categories",
    resourceId: "all",
    details: { count: HARDCODED_CATEGORIES.length },
    ipAddress: ipAddress || undefined,
  });

  return c.json({
    message: "Categories seeded successfully",
    count: HARDCODED_CATEGORIES.length,
  }, 201);
});

// GET /api/cities
categories.get("/cities", (c) => {
  const cities = [
    { city: "Harare", country: "Zimbabwe" },
    { city: "Bulawayo", country: "Zimbabwe" },
    { city: "Victoria Falls", country: "Zimbabwe" },
    { city: "Johannesburg", country: "South Africa" },
    { city: "Cape Town", country: "South Africa" },
    { city: "Nairobi", country: "Kenya" },
    { city: "Lagos", country: "Nigeria" },
    { city: "Accra", country: "Ghana" },
  ];
  return c.json({ cities });
});
