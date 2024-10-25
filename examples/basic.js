import LLMBatch from '../src/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const llm = new LLMBatch({
  openaiKey: process.env.OPENAI_API_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY
});

// Simple sync request
const syncResponse = await llm.chat('openai', [
  { role: 'user', content: 'What is 2+2?' }
]);
console.log('Sync response:', syncResponse);

// Simple async batch request
const batchResponse = await llm.chat('openai', [
  { role: 'user', content: 'What is 3+3?' }
], { async: true });
console.log('Batch response:', batchResponse);