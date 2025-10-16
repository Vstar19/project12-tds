import { useState } from 'react';
import { Send, AlertCircle, CheckCircle, Github, ExternalLink } from 'lucide-react';

interface DeploymentResult {
  repoUrl?: string;
  pagesUrl?: string;
  commitSha?: string;
  error?: string;
}

function App() {
  const [formData, setFormData] = useState({
    email: 'test@example.com',
    secret: '',
    task: 'demo-app',
    round: 1,
    nonce: crypto.randomUUID(),
    brief: 'Create a simple calculator with basic arithmetic operations',
    checks: '["typeof add === \'function\'", "typeof subtract === \'function\'"]',
    evaluation_url: 'https://example.com/evaluate',
    attachments: '[]',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DeploymentResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitted' | 'processing' | 'complete' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('submitted');
    setResult(null);

    try {
      const payload = {
        email: formData.email,
        secret: formData.secret,
        task: formData.task,
        round: parseInt(formData.round.toString()),
        nonce: formData.nonce,
        brief: formData.brief,
        checks: JSON.parse(formData.checks),
        evaluation_url: formData.evaluation_url,
        attachments: JSON.parse(formData.attachments),
      };

      const response = await fetch('http://localhost:3001/api-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.status === 'received') {
        setStatus('processing');
        setResult({ repoUrl: 'Processing...', pagesUrl: 'Processing...' });
      } else {
        setStatus('error');
        setResult({ error: data.error || 'Unknown error' });
      }
    } catch (error: any) {
      setStatus('error');
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Github className="w-10 h-10 text-slate-700" />
            <h1 className="text-4xl font-bold text-slate-800">LLM Code Deployment</h1>
          </div>
          <p className="text-slate-600 text-lg">
            Automated code generation and GitHub Pages deployment
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4 text-slate-800">Deployment Request</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Secret
                </label>
                <input
                  type="password"
                  name="secret"
                  value={formData.secret}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Task ID
                  </label>
                  <input
                    type="text"
                    name="task"
                    value={formData.task}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Round
                  </label>
                  <input
                    type="number"
                    name="round"
                    value={formData.round}
                    onChange={handleChange}
                    min="1"
                    max="3"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Brief
                </label>
                <textarea
                  name="brief"
                  value={formData.brief}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Checks (JSON array)
                </label>
                <textarea
                  name="checks"
                  value={formData.checks}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-transparent font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Evaluation URL
                </label>
                <input
                  type="url"
                  name="evaluation_url"
                  value={formData.evaluation_url}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Attachments (JSON array)
                </label>
                <textarea
                  name="attachments"
                  value={formData.attachments}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-700 hover:bg-slate-800 text-white font-semibold py-3 px-6 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
                {loading ? 'Submitting...' : 'Deploy Application'}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4 text-slate-800">Deployment Status</h2>

              {status === 'idle' && (
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No deployment in progress</p>
                </div>
              )}

              {status === 'submitted' && (
                <div className="text-center py-8 text-slate-600">
                  <div className="animate-spin w-12 h-12 border-4 border-slate-300 border-t-slate-700 rounded-full mx-auto mb-3"></div>
                  <p className="font-medium">Request submitted...</p>
                </div>
              )}

              {status === 'processing' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-md">
                    <div className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full mt-0.5"></div>
                    <div>
                      <p className="font-medium text-slate-800">Processing deployment...</p>
                      <p className="text-sm text-slate-600">
                        Generating code, creating repository, and deploying to GitHub Pages.
                        This may take several minutes.
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-md">
                    <p className="font-medium mb-1">Check your server console for real-time progress:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>LLM code generation</li>
                      <li>Security scanning</li>
                      <li>GitHub repository creation</li>
                      <li>Pages deployment</li>
                      <li>Evaluation endpoint notification</li>
                    </ul>
                  </div>
                </div>
              )}

              {status === 'error' && result?.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Deployment Error</p>
                      <p className="text-sm text-red-700 mt-1">{result.error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4 text-slate-800">Preview</h2>

              {result?.pagesUrl && result.pagesUrl !== 'Processing...' ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <a
                      href={result.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-slate-700 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Github className="w-4 h-4" />
                      View Repository
                    </a>
                    <a
                      href={result.pagesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Pages
                    </a>
                  </div>
                  <iframe
                    src={result.pagesUrl}
                    className="w-full h-96 border border-slate-300 rounded-md"
                    title="Deployed Application Preview"
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <ExternalLink className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Preview will appear after deployment</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-8 text-center text-sm text-slate-600">
          <p>Powered by OpenAI GPT-4o-mini, GitHub API, and Express.js</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
