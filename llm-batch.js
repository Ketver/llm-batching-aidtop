import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

class LLMBatch {
  constructor(config = {}) {
    this.openai = new OpenAI({ apiKey: config.openaiKey });
    this.anthropic = new Anthropic({ apiKey: config.anthropicKey });
    this.batchSize = config.batchSize || 50;
    this.queue = new Map(); // Provider+model -> requests
    this.processing = new Map(); // Provider+model -> processing status
  }

  async chat(provider, messages, options = {}) {
    if (!options.async) {
      return this._singleRequest(provider, messages, options);
    }

    const model = options.model || (provider === 'openai' ? 'gpt-3.5-turbo' : 'claude-2');
    const key = `${provider}-${model}`;

    return new Promise((resolve) => {
      // Add to queue
      if (!this.queue.has(key)) {
        this.queue.set(key, []);
      }
      this.queue.get(key).push({ messages, options, resolve });

      // Process batch immediately if we hit batch size
      if (this.queue.get(key).length >= this.batchSize) {
        this._processBatch(key);
      } else if (!this.processing.get(key)) {
        // Start processing if not already in progress
        this._processBatch(key);
      }
    });
  }

  async _singleRequest(provider, messages, options) {
    if (provider === 'openai') {
      const response = await this.openai.chat.completions.create({
        messages,
        model: options.model || 'gpt-3.5-turbo',
        ...options
      });
      return response.choices[0].message;
    }

    if (provider === 'anthropic') {
      const response = await this.anthropic.messages.create({
        messages,
        model: options.model || 'claude-2',
        ...options
      });
      return response.content;
    }

    throw new Error('Unsupported provider');
  }

  async _processBatch(key) {
    if (this.processing.get(key)) return;
    this.processing.set(key, true);

    const [provider, model] = key.split('-');
    const requests = this.queue.get(key) || [];
    this.queue.set(key, []);

    if (requests.length === 0) {
      this.processing.set(key, false);
      return;
    }

    try {
      if (provider === 'openai') {
        const jsonl = requests.map(req => ({
          model,
          messages: req.messages,
          ...req.options
        }));

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openai.apiKey}`,
            'OpenAI-Beta': 'assistants=v1'
          },
          body: JSON.stringify({ requests: jsonl })
        });

        const results = await response.json();
        results.choices.forEach((choice, i) => {
          requests[i].resolve(choice.message);
        });

      } else if (provider === 'anthropic') {
        const jsonl = requests
          .map(req => JSON.stringify({
            model,
            messages: req.messages,
            ...req.options
          }))
          .join('\n');

        const response = await fetch('https://api.anthropic.com/v1/messages/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-jsonlines',
            'X-API-Key': this.anthropic.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: jsonl
        });

        const results = (await response.text())
          .split('\n')
          .map(line => JSON.parse(line));

        results.forEach((result, i) => {
          requests[i].resolve(result.content);
        });
      }
    } catch (error) {
      // On batch failure, fall back to individual requests
      await Promise.all(
        requests.map(async ({ messages, options, resolve }) => {
          try {
            const result = await this._singleRequest(provider, messages, options);
            resolve(result);
          } catch (err) {
            resolve({ error: err.message });
          }
        })
      );
    }

    this.processing.set(key, false);
    
    // Process any remaining requests
    if (this.queue.get(key)?.length > 0) {
      this._processBatch(key);
    }
  }
}

export default LLMBatch;