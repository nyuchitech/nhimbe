import { Hono } from "hono";
import type { Env, AssistantRequest } from "../types";
import { chat } from "../ai/assistant";
import { generateDescription, regenerateDescription, getWizardSteps, type DescriptionContext } from "../ai/description-generator";

export const ai = new Hono<{ Bindings: Env }>();

// POST /api/assistant
ai.post("/assistant", async (c) => {
  const body = await c.req.json() as AssistantRequest;

  if (!body.message) {
    return c.json({ error: "Message is required" }, 400);
  }

  const response = await chat(c.env.AI, c.env.VECTORIZE, c.env.DB, body);

  return c.json(response);
});

// GET /api/ai/description/wizard-steps
ai.get("/ai/description/wizard-steps", (c) => {
  const steps = getWizardSteps();
  return c.json({ steps });
});

// POST /api/ai/description/wizard-steps
ai.post("/ai/description/wizard-steps", async (c) => {
  const body = await c.req.json() as { category?: string };
  const steps = getWizardSteps(body.category);
  return c.json({ steps });
});

// POST /api/ai/description/generate
ai.post("/ai/description/generate", async (c) => {
  const body = await c.req.json() as DescriptionContext;

  if (!body.eventType && !body.targetAudience && !body.keyTakeaways) {
    return c.json({ error: "Please provide at least one detail about your event" }, 400);
  }

  const result = await generateDescription(c.env.AI, body);
  return c.json(result);
});

// POST /api/ai/description/regenerate
ai.post("/ai/description/regenerate", async (c) => {
  const body = await c.req.json() as DescriptionContext & { feedback: string };

  if (!body.feedback) {
    return c.json({ error: "Feedback is required for regeneration" }, 400);
  }

  const result = await regenerateDescription(c.env.AI, body, body.feedback);
  return c.json(result);
});
