import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { BatchProcessor } from './batch.js';

class LLMBatch {
  constructor(config = {}) {
    this.providers = {
      openai: new OpenAIProvider(config.openaiKey),
      anthropic: new AnthropicProvider(config.anthropicKey)
    };
    this.batchProcessor = new BatchProcessor({
      batchSize: config.batchSize || 50,
      windowMs: config.windowMs || 100
    });
  }

  async chat(provider, messages, options = {}) {
    if (!this.providers[provider]) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!options.async) {
      return this.providers[provider].singleRequest(messages, options);
    }

    return this.batchProcessor.addRequest(
      this.providers[provider],
      messages,
      options
    );
  }
}

export default LLMBatch;