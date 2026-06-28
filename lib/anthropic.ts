import Anthropic from '@anthropic-ai/sdk';

const globalForAI = globalThis as unknown as { anthropic: Anthropic };

export const anthropic = globalForAI.anthropic ?? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

if (process.env.NODE_ENV !== 'production') globalForAI.anthropic = anthropic;

export async function callClaude(systemPrompt: string, userMessage: string, maxTokens = 1500): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text;
}

export async function callClaudeJSON<T>(systemPrompt: string, userMessage: string, maxTokens = 1500): Promise<T> {
  const text = await callClaude(systemPrompt, userMessage, maxTokens);

  // Try fenced block first, then raw JSON boundaries
  let clean: string;
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (fenced) {
    clean = fenced[1].trim();
  } else {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    clean = start !== -1 && end > start ? text.slice(start, end + 1) : text.trim();
  }

  try {
    return JSON.parse(clean) as T;
  } catch (parseErr) {
    console.error('[callClaudeJSON] JSON parse failed. Raw text length:', text.length);
    console.error('[callClaudeJSON] First 500 chars:', text.slice(0, 500));
    throw parseErr;
  }
}
