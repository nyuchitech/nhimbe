/**
 * RAG Search for nhimbe events
 * Combines vector similarity search with LLM-powered summaries
 */

import type {
  Ai,
  D1Database,
  Event,
  SearchQuery,
  SearchResult,
  VectorizeIndex,
} from "../types";
import { generateEmbedding } from "./embeddings";

// LLM model for generating summaries
const LLM_MODEL = "@cf/meta/llama-3.1-8b-instruct";

/**
 * Perform semantic search using RAG
 */
export async function searchEvents(
  ai: Ai,
  vectorize: VectorizeIndex,
  db: D1Database,
  query: SearchQuery
): Promise<SearchResult> {
  // Generate embedding for the search query
  const queryEmbedding = await generateEmbedding(ai, query.query);

  // Build filter for Vectorize query
  const filter: Record<string, string | number | boolean> = {};
  if (query.filters?.city) {
    filter.city = query.filters.city;
  }
  if (query.filters?.category) {
    filter.category = query.filters.category;
  }

  // Search Vectorize for similar events
  const vectorResults = await vectorize.query(queryEmbedding, {
    topK: query.limit || 10,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    returnMetadata: true,
  });

  if (vectorResults.matches.length === 0) {
    return {
      events: [],
      query: query.query,
      totalResults: 0,
    };
  }

  // Get full event details from D1
  const eventIds = vectorResults.matches.map((m) => m.id);
  const placeholders = eventIds.map(() => "?").join(",");

  const events = await db
    .prepare(`SELECT * FROM events WHERE id IN (${placeholders})`)
    .bind(...eventIds)
    .all<Event>();

  // Sort by relevance score
  const scoreMap = new Map(vectorResults.matches.map((m) => [m.id, m.score]));
  const sortedEvents = events.results.sort((a, b) => {
    const scoreA = scoreMap.get(a.id) || 0;
    const scoreB = scoreMap.get(b.id) || 0;
    return scoreB - scoreA;
  });

  // Generate AI summary of results
  const aiSummary = await generateSearchSummary(ai, query.query, sortedEvents);

  return {
    events: sortedEvents,
    query: query.query,
    aiSummary,
    totalResults: sortedEvents.length,
  };
}

/**
 * Generate a natural language summary of search results
 */
async function generateSearchSummary(
  ai: Ai,
  query: string,
  events: Event[]
): Promise<string> {
  if (events.length === 0) {
    return "No events found matching your search.";
  }

  const eventDescriptions = events
    .slice(0, 5)
    .map(
      (e) =>
        `- "${e.title}" on ${e.date.full} at ${e.location.venue}, ${e.location.city} (${e.category})`
    )
    .join("\n");

  const prompt = `You are a helpful assistant for nhimbe, an African events platform.
Based on the user's search for "${query}", summarize these matching events in 2-3 sentences:

${eventDescriptions}

Be friendly, concise, and highlight what makes these events relevant to the search. Use the nhimbe tagline spirit: "Together we gather, together we grow".`;

  try {
    const response = await ai.run(LLM_MODEL, {
      messages: [
        {
          role: "system",
          content:
            "You are a helpful events assistant. Keep responses brief and friendly.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const result = response as { response?: string };
    return result.response || "Found some great events for you!";
  } catch {
    return `Found ${events.length} events matching your search.`;
  }
}

/**
 * Get AI-powered event recommendations based on user preferences
 */
export async function getRecommendations(
  ai: Ai,
  vectorize: VectorizeIndex,
  db: D1Database,
  userInterests: string[],
  userCity?: string
): Promise<Event[]> {
  // Create a combined query from interests
  const interestQuery = userInterests.join(" ");
  const queryEmbedding = await generateEmbedding(ai, interestQuery);

  const filter: Record<string, string | number | boolean> = {};
  if (userCity) {
    filter.city = userCity;
  }

  const vectorResults = await vectorize.query(queryEmbedding, {
    topK: 6,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    returnMetadata: true,
  });

  if (vectorResults.matches.length === 0) {
    return [];
  }

  const eventIds = vectorResults.matches.map((m) => m.id);
  const placeholders = eventIds.map(() => "?").join(",");

  const events = await db
    .prepare(`SELECT * FROM events WHERE id IN (${placeholders})`)
    .bind(...eventIds)
    .all<Event>();

  return events.results;
}

/**
 * Find similar events to a given event
 */
export async function findSimilarEvents(
  ai: Ai,
  vectorize: VectorizeIndex,
  db: D1Database,
  eventId: string,
  limit = 4
): Promise<Event[]> {
  // Get the event's vector
  const vectors = await vectorize.getByIds([eventId]);
  if (vectors.length === 0) {
    return [];
  }

  // Query for similar events, excluding the original
  const vectorResults = await vectorize.query(vectors[0].values, {
    topK: limit + 1, // Get extra to exclude self
    returnMetadata: true,
  });

  // Filter out the original event
  const similarIds = vectorResults.matches
    .filter((m) => m.id !== eventId)
    .slice(0, limit)
    .map((m) => m.id);

  if (similarIds.length === 0) {
    return [];
  }

  const placeholders = similarIds.map(() => "?").join(",");
  const events = await db
    .prepare(`SELECT * FROM events WHERE id IN (${placeholders})`)
    .bind(...similarIds)
    .all<Event>();

  return events.results;
}
