import LLMBatch from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config();

const llm = new LLMBatch({
  openaiKey: process.env.OPENAI_API_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY
});

// Create multiple batch requests
const promises = [];
for (let i = 0; i < 10; i++) {
  promises.push(
    llm.chat('openai', [
      { role: 'user', content: `What is ${i} + ${i}?` }
    ], { async: true })
  );
}

// Wait for all responses
const responses = await Promise.all(promises);
console.log('All responses:', responses);