import type { EvaluationPayload } from '../types';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pingEvaluationEndpoint(
  evaluationUrl: string,
  payload: EvaluationPayload
): Promise<void> {
  const maxRetries = 5; // Attempt a total of 6 times (1 initial + 5 retries)
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1, 2, 4, 8, 16 seconds
        console.log(`[Evaluation] Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      }
      
      console.log(`[Evaluation] Attempt ${attempt + 1} to ping ${evaluationUrl}`);

      const response = await fetch(evaluationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`[Evaluation] Successfully pinged evaluation endpoint`);
        return; // Success, exit the function
      }

      // Check for server-side errors (5xx) to decide if we should retry
      if (response.status >= 500 && response.status < 600) {
        const errorText = await response.text();
        lastError = new Error(`Evaluation endpoint returned server error ${response.status}: ${errorText}`);
        console.warn(`[Evaluation] ${lastError.message}`);
        continue; // Go to the next iteration to retry
      }

      // For client-side errors (4xx) or other issues, fail immediately
      const errorText = await response.text();
      throw new Error(`Evaluation endpoint returned client error ${response.status}: ${errorText}`);

    } catch (error: any) {
      lastError = error;
      console.error(`[Evaluation] Error on attempt ${attempt + 1}: ${error.message}`);
      // If it's a network error, we might want to retry
      if (error.cause) { // Node.js fetch errors often have a 'cause'
        continue;
      }
      // For other errors (like JSON parsing, etc.), break the loop
      break;
    }
  }

  throw lastError || new Error('Failed to ping evaluation endpoint after multiple retries.');
}