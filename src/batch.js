export class BatchProcessor {
  constructor(config) {
    this.batchSize = config.batchSize;
    this.windowMs = config.windowMs;
    this.queues = new Map();
    this.processing = new Map();
  }

  async addRequest(provider, messages, options) {
    const key = `${provider.name}-${options.model || provider.defaultModel}`;
    
    return new Promise((resolve) => {
      if (!this.queues.has(key)) {
        this.queues.set(key, []);
      }
      
      this.queues.get(key).push({ messages, options, resolve });

      if (this.queues.get(key).length >= this.batchSize) {
        this.processBatch(key, provider);
      } else if (!this.processing.get(key)) {
        this.processBatch(key, provider);
      }
    });
  }

  async processBatch(key, provider) {
    if (this.processing.get(key)) return;
    this.processing.set(key, true);

    const requests = this.queues.get(key) || [];
    this.queues.set(key, []);

    if (requests.length === 0) {
      this.processing.set(key, false);
      return;
    }

    try {
      const responses = await provider.batchRequest(requests);
      responses.forEach((response, i) => {
        requests[i].resolve(response);
      });
    } catch (error) {
      // Fall back to individual requests on batch failure
      await Promise.all(
        requests.map(async ({ messages, options, resolve }) => {
          try {
            const result = await provider.singleRequest(messages, options);
            resolve(result);
          } catch (err) {
            resolve({ error: err.message });
          }
        })
      );
    }

    this.processing.set(key, false);
    
    if (this.queues.get(key)?.length > 0) {
      this.processBatch(key, provider);
    }
  }
}