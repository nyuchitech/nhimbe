/**
 * Static data routes — categories and cities
 */

import { Hono } from "hono";

const categories = new Hono();

// GET /api/categories
categories.get("/", (c) => {
  const cats = [
    // Technology & Innovation
    { id: "tech", name: "Technology", group: "Technology & Innovation" },
    { id: "ai-ml", name: "AI & Machine Learning", group: "Technology & Innovation" },
    { id: "fintech", name: "Fintech", group: "Technology & Innovation" },
    { id: "crypto", name: "Crypto & Web3", group: "Technology & Innovation" },
    // Business & Economy
    { id: "business", name: "Business", group: "Business & Economy" },
    { id: "economy", name: "Economy", group: "Business & Economy" },
    { id: "investment", name: "Investment", group: "Business & Economy" },
    { id: "real-estate", name: "Real Estate", group: "Business & Economy" },
    // Entertainment & Media
    { id: "music", name: "Music", group: "Entertainment & Media" },
    { id: "film-tv", name: "Film & TV", group: "Entertainment & Media" },
    { id: "gaming", name: "Gaming", group: "Entertainment & Media" },
    { id: "celebrity", name: "Celebrity & Entertainment", group: "Entertainment & Media" },
    // Sports
    { id: "football", name: "Football", group: "Sports" },
    { id: "sports-other", name: "Other Sports", group: "Sports" },
    { id: "fitness", name: "Fitness & Wellness", group: "Sports" },
    // Culture & Society
    { id: "culture", name: "Culture & Society", group: "Culture & Society" },
    { id: "fashion", name: "Fashion", group: "Culture & Society" },
    { id: "food", name: "Food & Drink", group: "Culture & Society" },
    { id: "travel", name: "Travel", group: "Culture & Society" },
    // News & Current Affairs
    { id: "politics", name: "Politics", group: "News & Current Affairs" },
    { id: "world-news", name: "World News", group: "News & Current Affairs" },
    { id: "local-news", name: "Local News", group: "News & Current Affairs" },
    // Education & Knowledge
    { id: "education", name: "Education", group: "Education & Knowledge" },
    { id: "science", name: "Science", group: "Education & Knowledge" },
    { id: "history", name: "History", group: "Education & Knowledge" },
    // Lifestyle
    { id: "relationships", name: "Relationships", group: "Lifestyle" },
    { id: "parenting", name: "Parenting", group: "Lifestyle" },
    { id: "spirituality", name: "Spirituality", group: "Lifestyle" },
    // Creative Arts
    { id: "art", name: "Art", group: "Creative Arts" },
    { id: "literature", name: "Literature", group: "Creative Arts" },
    { id: "comedy", name: "Comedy", group: "Creative Arts" },
    // Environment
    { id: "environment", name: "Environment", group: "Environment" },
  ];

  return c.json({ categories: cats });
});

export default categories;
