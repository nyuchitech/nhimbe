/**
 * AI Assistant for nhimbe
 * Natural language interface for event discovery and planning
 */

import type {
  Ai,
  D1Database,
  AssistantRequest,
  AssistantResponse,
  AssistantMessage,
  Event,
  VectorizeIndex,
} from "../types";
import { searchEvents } from "./search";

const LLM_MODEL = "@cf/meta/llama-3.1-8b-instruct";

const SYSTEM_PROMPT = `You are nhimbe's AI assistant, helping users discover and plan community gatherings across Africa.

About nhimbe:
- nhimbe (pronounced /ˈnhimbɛ/) is the traditional Shona practice of communal work
- It embodies Ubuntu philosophy: "I am because we are"
- Tagline: "Together we gather, together we grow"
- Part of the Mukoko ecosystem

Your capabilities:
1. Help users find events by interest, location, date, or category
2. Provide event recommendations based on preferences
3. Answer questions about events, venues, and communities
4. Assist with event planning and creation
5. Share information about African cities and cultures

Guidelines:
- Be warm, welcoming, and community-focused
- Celebrate African culture and diversity
- Keep responses concise but helpful
- When suggesting events, explain why they match the user's interests
- If you don't know something, say so honestly
- Use inclusive language that brings people together

Categories available: Tech, Culture, Wellness, Social, Professional, Music, Food & Drink, Sports, Community, Education

Cities covered: Harare, Bulawayo, Victoria Falls (Zimbabwe), Johannesburg, Cape Town (South Africa), Nairobi (Kenya), Lagos (Nigeria), Accra (Ghana)`;

/**
 * Process a message from the user and generate a response
 */
export async function chat(
  ai: Ai,
  vectorize: VectorizeIndex,
  db: D1Database,
  request: AssistantRequest
): Promise<AssistantResponse> {
  // Build conversation history
  const messages: AssistantMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(request.conversationHistory || []),
    { role: "user", content: request.message },
  ];

  // Add context if provided
  if (request.context) {
    const contextInfo = [];
    if (request.context.userLocation) {
      contextInfo.push(`User is in: ${request.context.userLocation}`);
    }
    if (request.context.userInterests?.length) {
      contextInfo.push(
        `User interests: ${request.context.userInterests.join(", ")}`
      );
    }
    if (contextInfo.length > 0) {
      messages[0] = {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\nUser context:\n${contextInfo.join("\n")}`,
      };
    }
  }

  // Detect intent and gather relevant events
  const intent = await detectIntent(ai, request.message);
  let suggestedEvents: Event[] = [];

  if (intent.type === "search" && intent.query) {
    const searchResult = await searchEvents(ai, vectorize, db, {
      query: intent.query,
      filters: intent.filters,
      limit: 5,
    });
    suggestedEvents = searchResult.events;

    // Add event context to the conversation
    if (suggestedEvents.length > 0) {
      const eventContext = suggestedEvents
        .map((e) => {
          const isPlace = e.location["@type"] === "Place";
          const venue = isPlace ? (e.location as { name: string }).name : "";
          const city = isPlace
            ? (e.location as { address: { addressLocality: string } }).address.addressLocality
            : "";
          return `- "${e.name}" on ${e.dateDisplay.full} at ${venue}, ${city}`;
        })
        .join("\n");

      messages.push({
        role: "system",
        content: `Relevant events found:\n${eventContext}\n\nIncorporate these events naturally in your response.`,
      });
    }
  }

  // Generate response
  const response = await ai.run(LLM_MODEL, {
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  const result = response as { response?: string };
  const messageText =
    result.response ||
    "I'd be happy to help you find events! What are you looking for?";

  return {
    message: messageText,
    suggestedEvents: suggestedEvents.length > 0 ? suggestedEvents : undefined,
    actions: intent.type !== "general" ? [{ type: intent.type, payload: intent }] : undefined,
  };
}

/**
 * Detect the user's intent from their message
 */
async function detectIntent(
  ai: Ai,
  message: string
): Promise<{
  type: "search" | "navigate" | "create" | "general";
  query?: string;
  filters?: { city?: string; category?: string };
}> {
  const intentPrompt = `Analyze this user message and determine their intent.
Message: "${message}"

Respond with JSON only, no other text:
{
  "type": "search" | "navigate" | "create" | "general",
  "query": "search query if type is search",
  "filters": { "city": "city name if mentioned", "category": "category if mentioned" }
}

Intent types:
- search: User wants to find events
- navigate: User wants to go to a specific page/event
- create: User wants to create an event
- general: General conversation or question`;

  try {
    const response = await ai.run(LLM_MODEL, {
      messages: [
        {
          role: "system",
          content: "You are a JSON parser. Only output valid JSON, nothing else.",
        },
        { role: "user", content: intentPrompt },
      ],
      max_tokens: 150,
      temperature: 0.1,
    });

    const result = response as { response?: string };
    if (result.response) {
      // Extract JSON from response
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch {
    // Fall back to keyword detection
  }

  // Fallback: Simple keyword detection
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("find") ||
    lowerMessage.includes("search") ||
    lowerMessage.includes("looking for") ||
    lowerMessage.includes("show me") ||
    lowerMessage.includes("events")
  ) {
    return { type: "search", query: message };
  }

  if (
    lowerMessage.includes("create") ||
    lowerMessage.includes("host") ||
    lowerMessage.includes("organize")
  ) {
    return { type: "create" };
  }

  return { type: "general" };
}

/**
 * Generate event suggestions based on context
 */
export async function generateSuggestions(
  ai: Ai,
  vectorize: VectorizeIndex,
  db: D1Database,
  context: { city?: string; interests?: string[] }
): Promise<{ message: string; events: Event[] }> {
  const query = context.interests?.length
    ? context.interests.join(" ")
    : "popular community events";

  const searchResult = await searchEvents(ai, vectorize, db, {
    query,
    filters: context.city ? { city: context.city } : undefined,
    limit: 6,
  });

  const intro = context.city
    ? `Here are some gatherings happening in ${context.city}:`
    : "Here are some gatherings you might enjoy:";

  return {
    message: searchResult.aiSummary || intro,
    events: searchResult.events,
  };
}
