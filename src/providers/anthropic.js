import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey });
    this.name = 'anthropic';
    this.defaultModel = 'claude-2';
  }

  async singleRequest(messages, options) {
    const response = await this.client.messages.create({
      messages,
      model: options.model || this.defaultModel,
      ...options
    });
    return response.content;
  }

  async batchRequest(requests) {
    const jsonl = requests
      .map(req => JSON.stringify({
        model: req.options.model || this.defaultModel,
        messages: req.messages,
        ...req.options
      }))
      .join('\n');

    const response = await fetch('https://api.anthropic.com/v1/messages/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-jsonlines',
        'X-API-Key': this.client.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: jsonl
    });

    return (await response.text())
      .split('\n')
      .map(line => JSON.parse(line).content);
  }
}