import { Hono } from "hono";
import type { Env } from "../types";

export const categories = new Hono<{ Bindings: Env }>();

// GET /api/categories
categories.get("/categories", (c) => {
  const categoriesList = [
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
  return c.json({ categories: categoriesList });
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
