import OpenAI from 'openai';

export class OpenAIProvider {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
    this.name = 'openai';
    this.defaultModel = 'gpt-3.5-turbo';
  }

  async singleRequest(messages, options) {
    const response = await this.client.chat.completions.create({
      messages,
      model: options.model || this.defaultModel,
      ...options
    });
    return response.choices[0].message;
  }

  async batchRequest(requests) {
    const jsonl = requests.map(req => ({
      model: req.options.model || this.defaultModel,
      messages: req.messages,
      ...req.options
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.client.apiKey}`,
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({ requests: jsonl })
    });

    const results = await response.json();
    return results.choices.map(choice => choice.message);
  }
}