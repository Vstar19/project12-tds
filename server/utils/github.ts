import { Octokit } from '@octokit/rest';
import type { GeneratedCode } from '../types';

async function pollPagesUrl(url: string, maxWait: number): Promise<boolean> {
  const startTime = Date.now();
  const interval = 10000;

  while (Date.now() - startTime < maxWait) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`[GitHub] Pages URL is live!`);
        return true;
      }
    } catch (error) {
      console.log(`[GitHub] Polling... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return false;
}

export async function deployToGitHub(
  task: string,
  round: number,
  code: GeneratedCode,
  attachments: Array<{ name: string; content: Buffer }>
): Promise<{ repoUrl: string; commitSha: string; pagesUrl: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GitHub token is not set in the environment variables.');
  }
  const octokit = new Octokit({ auth: token });

  const user = await octokit.users.getAuthenticated();
  const owner = user.data.login;
  const repoName = `${task}-round${round}`;

  console.log(`[GitHub] Creating repository: ${owner}/${repoName}`);

  try {
    await octokit.repos.delete({ owner, repo: repoName });
    console.log(`[GitHub] Deleted existing repository: ${repoName}`);
  } catch (error) {
    console.log(`[GitHub] No existing repository to delete`);
  }

  const { data: repo } = await octokit.repos.createForAuthenticatedUser({
    name: repoName,
    description: `Generated application for ${task} - Round ${round}`,
    auto_init: true,
    public: true,
  });

  console.log(`[GitHub] Repository created: ${repo.html_url}`);
  
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo: repoName,
    ref: 'heads/main',
  });
  const latestCommitSha = refData.object.sha;

  const fileData = [
    { path: 'index.html', content: code.html, encoding: 'utf-8' as const },
    { path: 'README.md', content: code.readme, encoding: 'utf-8' as const },
    { path: 'LICENSE', content: code.license, encoding: 'utf-8' as const },
    ...attachments.map((att) => ({
      path: att.name,
      content: att.content.toString('base64'),
      encoding: 'base64' as const,
    })),
  ];

  const tree = await Promise.all(
    fileData.map(async (file) => {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo: repoName,
        content: file.content,
        encoding: file.encoding,
      });
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      };
    })
  );
  
  const { data: treeData } = await octokit.git.createTree({
    owner,
    repo: repoName,
    tree,
    base_tree: latestCommitSha,
  });
  
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo: repoName,
    message: `Deploy ${task} round ${round}`,
    tree: treeData.sha,
    parents: [latestCommitSha],
  });
  
  const commitSha = newCommit.sha;
  console.log(`[GitHub] New commit created with SHA: ${commitSha}`);
  
  await octokit.git.updateRef({
    owner,
    repo: repoName,
    ref: 'heads/main',
    sha: commitSha,
  });

  console.log(`[GitHub] Pushed commit to main branch.`);
  
  console.log(`[GitHub] Enabling GitHub Pages...`);
  try {
    await octokit.repos.createPagesSite({
      owner,
      repo: repoName,
      source: {
        branch: 'main',
        path: '/',
      },
    });
  } catch (error: any) {
    if (error.status === 409) {
      console.log(`[GitHub] Pages already enabled.`);
    } else {
      console.error(`[GitHub] Error enabling Pages: ${error.message}`);
    }
  }

  const pagesUrl = `https://${owner}.github.io/${repoName}/`;
  console.log(`[GitHub] Pages URL will be: ${pagesUrl}`);

  console.log(`[GitHub] Polling pages URL for availability...`);
  const isLive = await pollPagesUrl(pagesUrl, 120000);

  if (!isLive) {
    console.warn(`[GitHub] Pages URL did not become available within the timeout.`);
  }

  return {
    repoUrl: repo.html_url,
    commitSha,
    pagesUrl,
  };
}

export async function getExistingRepoCode(
  owner: string,
  repo: string
): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GitHub token is not set in the environment variables.');
  }
  const octokit = new Octokit({ auth: token });

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: 'index.html',
    });

    if ('content' in data && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
  } catch (error) {
    console.log(`[GitHub] Could not fetch existing code: ${error}`);
  }

  return '';
}