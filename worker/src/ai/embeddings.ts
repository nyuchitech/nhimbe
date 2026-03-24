/**
 * Embedding utilities for nhimbe events
 * Uses Cloudflare Workers AI for generating embeddings
 */

import type { Ai, Event, VectorizeIndex, VectorizeVector } from "../types";

// Model for text embeddings - bge-base-en-v1.5 is good for semantic search
const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";

/**
 * Generate text embedding using Workers AI
 */
export async function generateEmbedding(
  ai: Ai,
  text: string
): Promise<number[]> {
  const response = await ai.run(EMBEDDING_MODEL, {
    text: [text],
  });

  // The response contains embeddings in data array
  const embeddings = response as { data: number[][] };
  return embeddings.data[0];
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateEmbeddings(
  ai: Ai,
  texts: string[]
): Promise<number[][]> {
  const response = await ai.run(EMBEDDING_MODEL, {
    text: texts,
  });

  const embeddings = response as { data: number[][] };
  return embeddings.data;
}

/**
 * Create a searchable text representation of an event
 * This combines relevant fields for semantic search
 */
export function eventToSearchText(event: Event): string {
  const parts = [
    event.name,
    event.description,
    event.category,
    ...(event.keywords || []),
    event.location.name,
    event.location.addressLocality,
    event.location.addressCountry,
    event.organizer.name,
    event.date.full,
  ];

  return parts.filter(Boolean).join(" | ");
}

/**
 * Index an event in Vectorize
 */
export async function indexEvent(
  ai: Ai,
  vectorize: VectorizeIndex,
  event: Event
): Promise<void> {
  const searchText = eventToSearchText(event);
  const embedding = await generateEmbedding(ai, searchText);

  const vector: VectorizeVector = {
    id: event.id,
    values: embedding,
    metadata: {
      name: event.name,
      category: event.category,
      city: event.location.addressLocality,
      country: event.location.addressCountry,
      date: event.startDate,
      shortCode: event.shortCode,
    },
  };

  await vectorize.upsert([vector]);
}

/**
 * Index multiple events in batch
 */
export async function indexEvents(
  ai: Ai,
  vectorize: VectorizeIndex,
  events: Event[]
): Promise<{ indexed: number; errors: string[] }> {
  const errors: string[] = [];
  let indexed = 0;

  // Process in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    const searchTexts = batch.map(eventToSearchText);

    try {
      const embeddings = await generateEmbeddings(ai, searchTexts);

      const vectors: VectorizeVector[] = batch.map((event, idx) => ({
        id: event.id,
        values: embeddings[idx],
        metadata: {
          name: event.name,
          category: event.category,
          city: event.location.addressLocality,
          country: event.location.addressCountry,
          date: event.startDate,
          shortCode: event.shortCode,
        },
      }));

      await vectorize.upsert(vectors);
      indexed += batch.length;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Batch ${i / batchSize}: ${errorMsg}`);
    }
  }

  return { indexed, errors };
}

/**
 * Remove an event from the vector index
 */
export async function removeEventFromIndex(
  vectorize: VectorizeIndex,
  eventId: string
): Promise<void> {
  await vectorize.deleteByIds([eventId]);
}
