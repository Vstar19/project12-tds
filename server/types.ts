export interface DeploymentRequest {
  email: string;
  secret: string;
  task: string;
  round: number;
  nonce: string;
  brief: string;
  checks: string[];
  evaluation_url: string;
  attachments: Array<{
    name: string;
    url: string;
  }>;
}

export interface DeploymentResponse {
  status: string;
  error?: string;
}

export interface EvaluationPayload {
  email: string;
  task: string;
  round: number;
  nonce: string;
  repo_url: string;
  commit_sha: string;
  pages_url: string;
}

export interface GeneratedCode {
  html: string;
  readme: string;
  license: string;
}
