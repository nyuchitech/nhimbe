/**
 * Shamwari - AI Description Generator for nhimbe
 * Multi-step wizard that helps hosts create compelling event descriptions
 * "Shamwari" means "friend" in Shona - your AI friend for event creation
 */

import type { Ai } from "../types";
import { withTimeout } from "../utils/timeout";

const LLM_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";

export interface DescriptionWizardStep {
  question: string;
  placeholder: string;
  helpText?: string;
}

export interface DescriptionContext {
  eventType?: string;
  targetAudience?: string;
  keyTakeaways?: string;
  highlights?: string;
  eventName?: string;
  category?: string;
  isOnline?: boolean;
}

export interface GeneratedDescription {
  description: string;
  suggestions?: string[];
}

/**
 * Get the wizard questions based on category
 */
export function getWizardSteps(category?: string): DescriptionWizardStep[] {
  const baseSteps: DescriptionWizardStep[] = [
    {
      question: "What type of gathering is this?",
      placeholder: "e.g., workshop, networking mixer, concert, community cleanup, tech talk...",
      helpText: "This helps set the tone and format expectations",
    },
    {
      question: "Who should attend this event?",
      placeholder: "e.g., entrepreneurs, music lovers, families with kids, tech professionals...",
      helpText: "Describe your ideal attendees so the right people find your event",
    },
    {
      question: "What will attendees gain or experience?",
      placeholder: "e.g., learn new skills, meet like-minded people, enjoy live music, contribute to community...",
      helpText: "Focus on the value and benefits for attendees",
    },
    {
      question: "Any special highlights or unique aspects?",
      placeholder: "e.g., guest speaker, free food, networking session, live demo, cultural performance...",
      helpText: "What makes your event stand out?",
    },
  ];

  // Add category-specific questions
  if (category === "Tech") {
    baseSteps[2] = {
      question: "What skills or knowledge will attendees gain?",
      placeholder: "e.g., hands-on coding experience, industry insights, practical tools...",
      helpText: "Be specific about the learning outcomes",
    };
  } else if (category === "Music" || category === "Culture") {
    baseSteps[2] = {
      question: "What experience will attendees have?",
      placeholder: "e.g., live performances, cultural immersion, dance workshops...",
      helpText: "Describe the atmosphere and activities",
    };
  } else if (category === "Business" || category === "Professional") {
    baseSteps[2] = {
      question: "What professional value will attendees receive?",
      placeholder: "e.g., industry connections, career insights, business opportunities...",
      helpText: "Focus on career and business benefits",
    };
  }

  return baseSteps;
}

/**
 * Generate an event description using AI based on wizard responses
 */
export async function generateDescription(
  ai: Ai,
  context: DescriptionContext
): Promise<GeneratedDescription> {
  const systemPrompt = `You are Shamwari, the AI assistant for nhimbe - an African events platform.
"Shamwari" means "friend" in Shona, and you help hosts create compelling event descriptions.

Guidelines:
- Write in a warm, inviting tone that reflects Ubuntu philosophy: "Together we gather, together we grow"
- Keep descriptions concise but informative (2-3 short paragraphs, about 100-150 words)
- Start with a hook that captures attention
- Clearly communicate what attendees will experience or learn
- End with a call to action or reason to attend
- Use inclusive language that welcomes diverse attendees
- Avoid clichés and generic marketing speak
- Make it easy to scan with clear structure
- Do NOT use emojis unless the event is very casual/fun`;

  const userPrompt = `Generate an event description based on these details:

Event Name: ${context.eventName || "Not specified"}
Category: ${context.category || "Community"}
Format: ${context.isOnline ? "Online/Virtual" : "In-person"}
Event Type: ${context.eventType || "Not specified"}
Target Audience: ${context.targetAudience || "General public"}
What Attendees Will Gain: ${context.keyTakeaways || "Not specified"}
Special Highlights: ${context.highlights || "None specified"}

Write a compelling description that would make someone want to attend this event. Only output the description text, nothing else.`;

  try {
    const response = await withTimeout(
      ai.run(LLM_MODEL, {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
      15_000,
      null
    );

    const result = response as { response?: string } | null;
    const description = result?.response?.trim() || generateFallbackDescription(context);

    // Generate improvement suggestions
    const suggestions = await generateSuggestions(ai, description);

    return {
      description,
      suggestions,
    };
  } catch (error) {
    console.error("AI description generation failed:", error);
    return {
      description: generateFallbackDescription(context),
    };
  }
}

/**
 * Generate suggestions for improving an existing description
 */
async function generateSuggestions(ai: Ai, description: string): Promise<string[]> {
  try {
    const response = await withTimeout(
      ai.run(LLM_MODEL, {
        messages: [
          {
            role: "system",
            content: "You are an event marketing expert. Analyze descriptions and suggest specific improvements. Return only a JSON array of 2-3 short suggestions.",
          },
          {
            role: "user",
            content: `Analyze this event description and provide 2-3 brief suggestions for improvement:\n\n"${description}"\n\nRespond with JSON array only, like: ["suggestion 1", "suggestion 2"]`,
          },
        ],
        max_tokens: 150,
        temperature: 0.5,
      }),
      10_000,
      null
    );

    const result = response as { response?: string } | null;
    if (result?.response) {
      const match = result.response.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    }
  } catch {
    // Ignore suggestion generation errors
  }
  return [];
}

/**
 * Regenerate description with a specific focus
 */
export async function regenerateDescription(
  ai: Ai,
  context: DescriptionContext,
  feedback: string
): Promise<GeneratedDescription> {
  const systemPrompt = `You are a skilled event copywriter for nhimbe, an African events platform.
Rewrite the event description based on the user's feedback.

Guidelines:
- Write in a warm, inviting tone
- Keep descriptions concise (2-3 paragraphs, about 100-150 words)
- Address the specific feedback provided
- Do NOT use emojis unless requested`;

  const userPrompt = `Rewrite this event description with the following adjustment:

Event Name: ${context.eventName || "Not specified"}
Category: ${context.category || "Community"}
Event Type: ${context.eventType || "Not specified"}
Target Audience: ${context.targetAudience || "General public"}

User feedback: ${feedback}

Write an improved description that addresses this feedback. Only output the description text.`;

  try {
    const response = await withTimeout(
      ai.run(LLM_MODEL, {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
      15_000,
      null
    );

    const result = response as { response?: string } | null;
    return {
      description: result?.response?.trim() || generateFallbackDescription(context),
    };
  } catch {
    return {
      description: generateFallbackDescription(context),
    };
  }
}

/**
 * Fallback description when AI fails
 */
function generateFallbackDescription(context: DescriptionContext): string {
  const parts: string[] = [];

  if (context.eventType) {
    parts.push(`Join us for ${context.eventType.toLowerCase()}`);
  } else {
    parts.push("Join us for this gathering");
  }

  if (context.targetAudience) {
    parts.push(`designed for ${context.targetAudience.toLowerCase()}`);
  }

  let description = parts.join(" ") + ".";

  if (context.keyTakeaways) {
    description += ` ${context.keyTakeaways}`;
  }

  if (context.highlights) {
    description += `\n\nHighlights: ${context.highlights}`;
  }

  description += "\n\nWe look forward to seeing you there!";

  return description;
}
