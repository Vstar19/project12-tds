import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import type { DeploymentRequest, DeploymentResponse, EvaluationPayload } from './types';
import { generateNewApp, updateExistingApp } from './utils/llm';
import { deployToGitHub, getExistingRepoCode } from './utils/github';
import { pingEvaluationEndpoint } from './utils/evaluation';
import { processAttachments } from './utils/attachments';
import { scanForSecrets } from './utils/secretScan';

// =================== DIAGNOSTIC BLOCK START ===================
// This will tell us if the .env file is being loaded correctly.
const dotEnvResult = dotenv.config();

if (dotEnvResult.error) {
  console.error('\x1b[31m%s\x1b[0m', '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error('\x1b[31m%s\x1b[0m', '[FATAL ERROR] FAILED TO LOAD THE .env FILE!');
  console.error(dotEnvResult.error);
  console.error('\x1b[31m%s\x1b[0m', 'Please check the following:');
  console.error('\x1b[31m%s\x1b[0m', '1. Is the .env file in the project ROOT folder (next to package.json)?');
  console.error('\x1b[31m%s\x1b[0m', '2. Is the file named exactly ".env" (not ".env.txt" or "env")?');
  console.error('\x1b[31m%s\x1b[0m', '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
} else {
  console.log('\x1b[32m%s\x1b[0m', '[SUCCESS] .env file was found and loaded.');
  // Optional: Uncomment below to see the loaded keys.
  // console.log(dotEnvResult.parsed);
}
// =================== DIAGNOSTIC BLOCK END =====================

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/api-endpoint', async (req, res) => {
  const request: DeploymentRequest = req.body;

  console.log(`\n[API] Received request for task: ${request.task}, round: ${request.round}`);

  if (request.secret !== process.env.MY_SECRET) {
    console.error(`[API] Invalid secret provided`);
    return res.status(400).json({ error: 'Invalid secret' } as DeploymentResponse);
  }

  res.status(200).json({ status: 'received' } as DeploymentResponse);

  processDeployment(request).catch((error) => {
    console.error(`[API] Fatal error during deployment: ${error.message}`);
  });
});

async function processDeployment(request: DeploymentRequest): Promise<void> {
  try {
    console.log(`[Process] Starting deployment for ${request.task}`);

    const processedAttachments = processAttachments(request.attachments || []);
    const attachmentNames = processedAttachments.map((att) => att.name);

    let generatedCode;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      if (request.round === 1) {
        console.log(`[Process] Generating new app...`);
        generatedCode = await generateNewApp(
          request.brief,
          request.checks || [],
          attachmentNames
        );
      } else {
        console.log(`[Process] Updating existing app for round ${request.round}...`);
        const repoName = `${request.task}-round${request.round - 1}`;
        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const user = await octokit.users.getAuthenticated();
        const owner = user.data.login;

        const existingCode = await getExistingRepoCode(owner, repoName);

        generatedCode = await updateExistingApp(
          existingCode || 'No existing code found',
          request.brief,
          request.checks || []
        );
      }

      const isSecure = await scanForSecrets(generatedCode.html);

      if (isSecure) {
        console.log(`[Process] Code passed security scan`);
        break;
      }

      retries++;
      console.warn(`[Process] Security scan failed, retry ${retries}/${maxRetries}`);

      if (retries >= maxRetries) {
        console.error(`[Process] Max retries reached, proceeding anyway`);
        break;
      }
    }

    if (!generatedCode) {
      throw new Error('Failed to generate code');
    }

    console.log(`[Process] Deploying to GitHub...`);
    const { repoUrl, commitSha, pagesUrl } = await deployToGitHub(
      request.task,
      request.round,
      generatedCode,
      processedAttachments
    );

    console.log(`[Process] Deployment complete:`);
    console.log(`  - Repository: ${repoUrl}`);
    console.log(`  - Commit SHA: ${commitSha}`);
    console.log(`  - Pages URL: ${pagesUrl}`);

    const evaluationPayload: EvaluationPayload = {
      email: request.email,
      task: request.task,
      round: request.round,
      nonce: request.nonce,
      repo_url: repoUrl,
      commit_sha: commitSha,
      pages_url: pagesUrl,
    };

    console.log(`[Process] Pinging evaluation endpoint...`);
    await pingEvaluationEndpoint(request.evaluation_url, evaluationPayload);

    console.log(`[Process] ✓ Deployment pipeline complete for ${request.task} round ${request.round}\n`);
  } catch (error: any) {
    console.error(`[Process] Deployment failed: ${error.message}`);
    console.error(error.stack);
  }
}

app.listen(PORT, () => {
  console.log(`\n🚀 LLM Code Deployment Server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   API endpoint: http://localhost:${PORT}/api-endpoint\n`);
});

export default app;