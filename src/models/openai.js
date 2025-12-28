import OpenAI from 'openai';
import { BaseAdapter } from './base.js';

export class OpenAIAdapter extends BaseAdapter {
  constructor(config = {}) {
    super({
      name: config.name || 'GPT-4',
      model: config.model || 'gpt-4o',
      ...config
    });

    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY
    });

    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens || 50;
  }

  async callLLM(prompt) {
    const response = await this.client.chat.completions.create({
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

    return response.choices[0].message.content;
  }
}

// Pre-configured variants
export function createGPT4o(config = {}) {
  return new OpenAIAdapter({
    name: 'GPT-4o',
    model: 'gpt-4o',
    ...config
  });
}

export function createGPT4oMini(config = {}) {
  return new OpenAIAdapter({
    name: 'GPT-4o Mini',
    model: 'gpt-4o-mini',
    ...config
  });
}

export function createO1(config = {}) {
  return new OpenAIAdapter({
    name: 'o1',
    model: 'o1',
    temperature: 1, // o1 requires temperature 1
    ...config
  });
}

export function createO1Mini(config = {}) {
  return new OpenAIAdapter({
    name: 'o1-mini',
    model: 'o1-mini',
    temperature: 1,
    ...config
  });
}
