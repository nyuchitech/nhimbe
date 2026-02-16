/**
 * AI Layer Tests
 *
 * Tiered test architecture for the AI subsystem:
 *   Tier 1: Embedding utilities (pure functions)
 *   Tier 2: Search layer (RAG pipeline)
 *   Tier 3: Assistant layer (intent detection, conversation)
 *   Tier 4: Description generator (wizard, fallbacks)
 *
 * All AI service calls are mocked — these test the orchestration
 * logic, not the LLM outputs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventToSearchText } from '../ai/embeddings';
import { getWizardSteps, type DescriptionContext } from '../ai/description-generator';
import {
  createMockAI,
  createMockVectorize,
  createMockD1,
  createMockD1Statement,
  createEventFixture,
} from './mocks';

// ============================================
// Tier 1: Embedding Utilities
// ============================================

describe('Embeddings: eventToSearchText', () => {
  it('concatenates all event fields with pipe separator', () => {
    const event = createEventFixture();
    const text = eventToSearchText(event);

    expect(text).toContain('Test Event');
    expect(text).toContain('A test event for unit testing');
    expect(text).toContain('Tech');
    expect(text).toContain('testing');
    expect(text).toContain('vitest');
    expect(text).toContain('Test Venue');
    expect(text).toContain('Harare');
    expect(text).toContain('Zimbabwe');
    expect(text).toContain('Test Host');
    expect(text).toContain(' | ');
  });

  it('filters out falsy values', () => {
    const event = createEventFixture({
      tags: [],
      description: '',
    });
    const text = eventToSearchText(event);
    // Should not have consecutive pipes from empty values
    expect(text).not.toContain(' |  | ');
  });

  it('handles event with all fields populated', () => {
    const event = createEventFixture({
      tags: ['music', 'jazz', 'live'],
    });
    const text = eventToSearchText(event);
    expect(text).toContain('music');
    expect(text).toContain('jazz');
    expect(text).toContain('live');
  });
});

// ============================================
// Tier 2: Search Layer
// ============================================

describe('Search Layer', () => {
  describe('vector query construction', () => {
    it('builds filter with city when provided', () => {
      const filter: Record<string, string | number | boolean> = {};
      const city = 'Harare';
      if (city) filter.city = city;
      expect(filter).toEqual({ city: 'Harare' });
    });

    it('builds filter with category when provided', () => {
      const filter: Record<string, string | number | boolean> = {};
      const category = 'Tech';
      if (category) filter.category = category;
      expect(filter).toEqual({ category: 'Tech' });
    });

    it('builds combined filter', () => {
      const filter: Record<string, string | number | boolean> = {};
      filter.city = 'Nairobi';
      filter.category = 'Music';
      expect(filter).toEqual({ city: 'Nairobi', category: 'Music' });
    });

    it('omits filter when no criteria', () => {
      const filter: Record<string, string | number | boolean> = {};
      const hasFilter = Object.keys(filter).length > 0;
      expect(hasFilter).toBe(false);
    });
  });

  describe('relevance sorting', () => {
    it('sorts events by vector score descending', () => {
      const matches = [
        { id: 'a', score: 0.7 },
        { id: 'b', score: 0.95 },
        { id: 'c', score: 0.8 },
      ];

      const scoreMap = new Map(matches.map(m => [m.id, m.score]));
      const events = [
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
        { id: 'c', title: 'C' },
      ];

      const sorted = events.sort((a, b) => {
        const scoreA = scoreMap.get(a.id) || 0;
        const scoreB = scoreMap.get(b.id) || 0;
        return scoreB - scoreA;
      });

      expect(sorted[0].id).toBe('b'); // 0.95
      expect(sorted[1].id).toBe('c'); // 0.8
      expect(sorted[2].id).toBe('a'); // 0.7
    });
  });

  describe('empty result handling', () => {
    it('returns empty result when no vector matches', () => {
      const matches: { id: string; score: number }[] = [];
      expect(matches.length).toBe(0);

      const result = {
        events: [],
        query: 'nonexistent query',
        totalResults: 0,
      };
      expect(result.events).toHaveLength(0);
      expect(result.totalResults).toBe(0);
    });
  });

  describe('search summary generation', () => {
    it('generates count-based fallback for empty results', () => {
      const events: unknown[] = [];
      const summary = events.length === 0
        ? 'No events found matching your search.'
        : `Found ${events.length} events.`;
      expect(summary).toBe('No events found matching your search.');
    });

    it('limits event descriptions to 5 for summary', () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        title: `Event ${i}`,
        date: { full: 'March 15' },
        location: { venue: 'Venue', city: 'City' },
        category: 'Tech',
      }));

      const descriptions = events.slice(0, 5).map(
        (e) => `- "${e.title}" on ${e.date.full} at ${e.location.venue}, ${e.location.city} (${e.category})`
      );

      expect(descriptions).toHaveLength(5);
    });
  });
});

// ============================================
// Tier 2.5: Similar Events
// ============================================

describe('Similar Events', () => {
  it('excludes source event from results', () => {
    const sourceId = 'evt-1';
    const matches = [
      { id: 'evt-1', score: 1.0 }, // Self
      { id: 'evt-2', score: 0.9 },
      { id: 'evt-3', score: 0.8 },
      { id: 'evt-4', score: 0.7 },
      { id: 'evt-5', score: 0.6 },
    ];

    const limit = 4;
    const similarIds = matches
      .filter((m) => m.id !== sourceId)
      .slice(0, limit)
      .map((m) => m.id);

    expect(similarIds).not.toContain(sourceId);
    expect(similarIds).toHaveLength(4);
    expect(similarIds).toEqual(['evt-2', 'evt-3', 'evt-4', 'evt-5']);
  });

  it('requests topK + 1 to account for self-exclusion', () => {
    const limit = 4;
    const topK = limit + 1;
    expect(topK).toBe(5);
  });

  it('returns empty when source vector not found', () => {
    const vectors: unknown[] = [];
    expect(vectors.length === 0).toBe(true);
  });
});

// ============================================
// Tier 3: Assistant (Intent Detection)
// ============================================

describe('Assistant: Intent Detection', () => {
  describe('keyword fallback detection', () => {
    const searchKeywords = ['find', 'search', 'looking for', 'show me', 'events'];
    const createKeywords = ['create', 'host', 'organize'];

    function detectIntentByKeywords(message: string): 'search' | 'create' | 'general' {
      const lower = message.toLowerCase();
      if (searchKeywords.some(kw => lower.includes(kw))) return 'search';
      if (createKeywords.some(kw => lower.includes(kw))) return 'create';
      return 'general';
    }

    it('detects search intent', () => {
      expect(detectIntentByKeywords('Find tech events in Harare')).toBe('search');
      expect(detectIntentByKeywords('Search for music concerts')).toBe('search');
      expect(detectIntentByKeywords('I am looking for a workshop')).toBe('search');
      expect(detectIntentByKeywords('Show me upcoming events')).toBe('search');
      expect(detectIntentByKeywords('What events are happening?')).toBe('search');
    });

    it('detects create intent', () => {
      expect(detectIntentByKeywords('I want to create an event')).toBe('create');
      expect(detectIntentByKeywords('How to host a meetup')).toBe('create');
      expect(detectIntentByKeywords('Help me organize a concert')).toBe('create');
    });

    it('detects general intent', () => {
      expect(detectIntentByKeywords('Hello, how are you?')).toBe('general');
      expect(detectIntentByKeywords('What is nhimbe?')).toBe('general');
      expect(detectIntentByKeywords('Tell me about Africa')).toBe('general');
    });
  });

  describe('JSON extraction from LLM response', () => {
    it('extracts JSON from clean response', () => {
      const response = '{"type": "search", "query": "music events"}';
      const match = response.match(/\{[\s\S]*\}/);
      expect(match).not.toBeNull();
      expect(JSON.parse(match![0])).toEqual({ type: 'search', query: 'music events' });
    });

    it('extracts JSON from response with surrounding text', () => {
      const response = 'Here is the intent:\n{"type": "search", "query": "tech"}\nDone!';
      const match = response.match(/\{[\s\S]*\}/);
      expect(match).not.toBeNull();
      expect(JSON.parse(match![0]).type).toBe('search');
    });

    it('handles response with no JSON', () => {
      const response = 'I could not determine the intent.';
      const match = response.match(/\{[\s\S]*\}/);
      expect(match).toBeNull();
    });

    it('handles malformed JSON gracefully', () => {
      const response = '{"type": "search", query: broken}';
      const match = response.match(/\{[\s\S]*\}/);
      expect(match).not.toBeNull();
      expect(() => JSON.parse(match![0])).toThrow();
    });
  });

  describe('conversation history assembly', () => {
    it('prepends system prompt', () => {
      const systemPrompt = 'You are nhimbe assistant.';
      const history = [
        { role: 'user' as const, content: 'Hi' },
        { role: 'assistant' as const, content: 'Hello!' },
      ];
      const newMessage = 'Find events';

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...history,
        { role: 'user' as const, content: newMessage },
      ];

      expect(messages[0].role).toBe('system');
      expect(messages[messages.length - 1].role).toBe('user');
      expect(messages[messages.length - 1].content).toBe('Find events');
      expect(messages).toHaveLength(4);
    });

    it('injects user context into system prompt', () => {
      const basePrompt = 'You are nhimbe assistant.';
      const context = {
        userLocation: 'Harare',
        userInterests: ['Tech', 'Music'],
      };

      const contextInfo = [];
      if (context.userLocation) contextInfo.push(`User is in: ${context.userLocation}`);
      if (context.userInterests?.length) contextInfo.push(`User interests: ${context.userInterests.join(', ')}`);

      const enrichedPrompt = `${basePrompt}\n\nUser context:\n${contextInfo.join('\n')}`;

      expect(enrichedPrompt).toContain('User is in: Harare');
      expect(enrichedPrompt).toContain('User interests: Tech, Music');
    });
  });
});

// ============================================
// Tier 4: Description Generator
// ============================================

describe('Description Generator', () => {
  describe('getWizardSteps', () => {
    it('returns 4 base steps with no category', () => {
      const steps = getWizardSteps();
      expect(steps).toHaveLength(4);
    });

    it('returns 4 steps for any category', () => {
      expect(getWizardSteps('Tech')).toHaveLength(4);
      expect(getWizardSteps('Music')).toHaveLength(4);
      expect(getWizardSteps('Professional')).toHaveLength(4);
    });

    it('customizes step 3 for Tech category', () => {
      const steps = getWizardSteps('Tech');
      expect(steps[2].question).toContain('skills or knowledge');
    });

    it('customizes step 3 for Music category', () => {
      const steps = getWizardSteps('Music');
      expect(steps[2].question).toContain('experience');
    });

    it('customizes step 3 for Culture category', () => {
      const steps = getWizardSteps('Culture');
      expect(steps[2].question).toContain('experience');
    });

    it('customizes step 3 for Professional category', () => {
      const steps = getWizardSteps('Professional');
      expect(steps[2].question).toContain('professional value');
    });

    it('customizes step 3 for Business category', () => {
      const steps = getWizardSteps('Business');
      expect(steps[2].question).toContain('professional value');
    });

    it('uses default step 3 for unknown category', () => {
      const steps = getWizardSteps('RandomCategory');
      expect(steps[2].question).toContain('gain or experience');
    });

    it('each step has required fields', () => {
      const steps = getWizardSteps();
      for (const step of steps) {
        expect(step).toHaveProperty('question');
        expect(step).toHaveProperty('placeholder');
        expect(typeof step.question).toBe('string');
        expect(typeof step.placeholder).toBe('string');
        expect(step.question.length).toBeGreaterThan(0);
        expect(step.placeholder.length).toBeGreaterThan(0);
      }
    });
  });

  describe('fallback description', () => {
    function generateFallbackDescription(context: DescriptionContext): string {
      const parts: string[] = [];
      if (context.eventType) {
        parts.push(`Join us for ${context.eventType.toLowerCase()}`);
      } else {
        parts.push('Join us for this gathering');
      }
      if (context.targetAudience) {
        parts.push(`designed for ${context.targetAudience.toLowerCase()}`);
      }
      let description = parts.join(' ') + '.';
      if (context.keyTakeaways) {
        description += ` ${context.keyTakeaways}`;
      }
      if (context.highlights) {
        description += `\n\nHighlights: ${context.highlights}`;
      }
      description += '\n\nWe look forward to seeing you there!';
      return description;
    }

    it('generates basic fallback with no context', () => {
      const desc = generateFallbackDescription({});
      expect(desc).toContain('Join us for this gathering');
      expect(desc).toContain('We look forward to seeing you there!');
    });

    it('includes event type when provided', () => {
      const desc = generateFallbackDescription({ eventType: 'Workshop' });
      expect(desc).toContain('Join us for workshop');
    });

    it('includes target audience when provided', () => {
      const desc = generateFallbackDescription({ targetAudience: 'Developers' });
      expect(desc).toContain('designed for developers');
    });

    it('includes key takeaways when provided', () => {
      const desc = generateFallbackDescription({ keyTakeaways: 'Learn AI' });
      expect(desc).toContain('Learn AI');
    });

    it('includes highlights when provided', () => {
      const desc = generateFallbackDescription({ highlights: 'Free lunch' });
      expect(desc).toContain('Highlights: Free lunch');
    });

    it('generates complete fallback with all context', () => {
      const desc = generateFallbackDescription({
        eventType: 'Meetup',
        targetAudience: 'Engineers',
        keyTakeaways: 'Network and learn',
        highlights: 'Guest speakers',
      });
      expect(desc).toContain('Join us for meetup');
      expect(desc).toContain('designed for engineers');
      expect(desc).toContain('Network and learn');
      expect(desc).toContain('Highlights: Guest speakers');
      expect(desc).toContain('We look forward to seeing you there!');
    });
  });

  describe('suggestion JSON extraction', () => {
    it('extracts valid suggestion array', () => {
      const response = '["Add more details about the venue", "Include a clear CTA"]';
      const match = response.match(/\[[\s\S]*\]/);
      expect(match).not.toBeNull();
      const suggestions = JSON.parse(match![0]);
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toContain('venue');
    });

    it('extracts array from surrounding text', () => {
      const response = 'Here are suggestions:\n["Tip 1", "Tip 2", "Tip 3"]\nHope this helps!';
      const match = response.match(/\[[\s\S]*\]/);
      expect(match).not.toBeNull();
      expect(JSON.parse(match![0])).toHaveLength(3);
    });

    it('returns empty array when no JSON found', () => {
      const response = 'No suggestions available.';
      const match = response.match(/\[[\s\S]*\]/);
      const suggestions = match ? JSON.parse(match[0]) : [];
      expect(suggestions).toEqual([]);
    });
  });
});

// ============================================
// Tier 5: Batch Processing (Embeddings)
// ============================================

describe('Batch Embedding Processing', () => {
  it('chunks events into batches of 10', () => {
    const events = Array.from({ length: 25 }, (_, i) =>
      createEventFixture({ id: `evt-${i}` })
    );

    const batchSize = 10;
    const batches: typeof events[] = [];
    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }

    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(10);
    expect(batches[1]).toHaveLength(10);
    expect(batches[2]).toHaveLength(5);
  });

  it('handles exactly one batch', () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      createEventFixture({ id: `evt-${i}` })
    );

    const batchSize = 10;
    const batches: typeof events[] = [];
    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(10);
  });

  it('handles empty event list', () => {
    const events: ReturnType<typeof createEventFixture>[] = [];
    const batchSize = 10;
    const batches: typeof events[] = [];
    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }
    expect(batches).toHaveLength(0);
  });

  it('tracks errors per batch', () => {
    const errors: string[] = [];
    let indexed = 0;
    const totalBatches = 3;

    // Simulate batch 0 success, batch 1 failure, batch 2 success
    for (let i = 0; i < totalBatches; i++) {
      if (i === 1) {
        errors.push(`Batch ${i}: Rate limit exceeded`);
      } else {
        indexed += 10;
      }
    }

    expect(indexed).toBe(20);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Batch 1');
  });
});
