import LLMBatch from './llm-batch.js';
import assert from 'assert';

// Load environment variables
if (!process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY) {
  console.error('Please set OPENAI_API_KEY and ANTHROPIC_API_KEY environment variables');
  process.exit(1);
}

const llm = new LLMBatch({
  openaiKey: process.env.OPENAI_API_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  batchSize: 2 // Smaller batch size for testing
});

async function runTests() {
  console.log('Running tests...\n');

  // Test 1: Sync OpenAI request
  console.log('Test 1: Sync OpenAI request');
  const syncResponse = await llm.chat('openai', [
    { role: 'user', content: 'Say "test passed" if you receive this.' }
  ]);
  assert(syncResponse.content.toLowerCase().includes('test passed'), 'Sync test failed');
  console.log('✓ Sync test passed\n');

  // Test 2: Async batch requests with JSONL
  console.log('Test 2: Async batch requests with JSONL');
  const startTime = Date.now();
  const promises = [];
  for (let i = 0; i < 4; i++) {
    promises.push(
      llm.chat('openai', [
        { role: 'user', content: `Return the number ${i}` }
      ], { async: true })
    );
  }

  const responses = await Promise.all(promises);
  const endTime = Date.now();
  
  assert(responses.length === 4, 'Wrong number of responses');
  console.log(`✓ Batch test passed (${endTime - startTime}ms)\n`);

  // Test 3: Error handling
  console.log('Test 3: Error handling');
  try {
    await llm.chat('invalid_provider', []);
    assert(false, 'Should have thrown an error');
  } catch (error) {
    assert(error.message === 'Unsupported provider', 'Wrong error message');
    console.log('✓ Error handling test passed\n');
  }

  // Test 4: Anthropic batch request
  console.log('Test 4: Anthropic batch request');
  const anthropicPromises = [];
  for (let i = 0; i < 2; i++) {
    anthropicPromises.push(
      llm.chat('anthropic', [
        { role: 'user', content: `Return the number ${i}` }
      ], { async: true })
    );
  }

  const anthropicResponses = await Promise.all(anthropicPromises);
  assert(anthropicResponses.length === 2, 'Wrong number of Anthropic responses');
  console.log('✓ Anthropic batch test passed\n');

  console.log('All tests passed! 🎉');
}

runTests().catch(console.error);