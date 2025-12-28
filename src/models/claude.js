import Anthropic from '@anthropic-ai/sdk';
import { BaseAdapter } from './base.js';

export class ClaudeAdapter extends BaseAdapter {
  constructor(config = {}) {
    super({
      name: config.name || 'Claude',
      model: config.model || 'claude-sonnet-4-20250514',
      ...config
    });

    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
    });

    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens || 50;
  }

  async callLLM(prompt) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return response.content[0].text;
  }
}

// Pre-configured variants
export function createClaudeOpus(config = {}) {
  return new ClaudeAdapter({
    name: 'Claude Opus',
    model: 'claude-opus-4-20250514',
    ...config
  });
}

export function createClaudeSonnet(config = {}) {
  return new ClaudeAdapter({
    name: 'Claude Sonnet',
    model: 'claude-sonnet-4-20250514',
    ...config
  });
}

export function createClaudeHaiku(config = {}) {
  return new ClaudeAdapter({
    name: 'Claude Haiku',
    model: 'claude-3-5-haiku-20241022',
    ...config
  });
}
