import type { GeneratedCode } from './types';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function callLLM(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key is not set in the environment variables.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert web developer who creates single-file, production-ready web applications.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ] as OpenAIMessage[],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  return data.choices[0].message.content;
}

export async function generateNewApp(
  brief: string,
  checks: string[],
  attachmentNames: string[]
): Promise<GeneratedCode> {
  // --- THIS IS THE FINAL, UPDATED PROMPT ---
  const prompt = `You are an expert web developer who creates single-file, production-ready web applications. Your task is to generate an index.html file based on a user's brief. The file must contain both HTML structure and all necessary JavaScript logic within a <script> tag.

### CONTEXT ###
- You will be given a user's brief, a list of required attachments, and a list of automated checks the final code must pass.
- You must use the attachments and ensure the code is functional enough to pass the checks.

### EXAMPLE ###
Here is an example of a good response for a simple task. This example demonstrates the correct pattern of embedding data directly into the script to avoid 'fetch' errors.

**User's Brief:** Create a page that counts the words in the attached 'sample.txt' file and displays the count in an element with id '#word-count'.
**Attachments:** ['sample.txt']
**Checks:** ["document.getElementById('word-count').textContent > 0"]

**Correct Response:**
===INDEX.HTML===
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Word Counter</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
  <div class="container mt-5">
    <h1>Word Count</h1>
    <p>The number of words in sample.txt is: <strong id="word-count">0</strong></p>
  </div>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      // Data is embedded directly to avoid fetch/CORS issues.
      const fileContent = "This is a sample file with five words.";
      
      try {
        const words = fileContent.trim().split(/\\s+/);
        const wordCount = words.length;
        document.getElementById('word-count').textContent = wordCount;
      } catch (error) {
        console.error('An error occurred:', error);
        const errorTarget = document.getElementById('word-count');
        errorTarget.textContent = 'Error: ' + error.message;
        errorTarget.style.color = 'red';
      }
    });
  </script>
</body>
</html>
===README.MD===
# Word Counter
This application uses embedded data to count the words in a string and display the result.
## Setup
No setup required. Open the index.html file in a browser.
## Usage
The word count is calculated and displayed automatically on page load.
===LICENSE===
MIT License... (full text)

---

### YOUR TASK ###
Now, generate a response for the following request. Follow the example pattern perfectly.
**IMPORTANT:** For attachments like CSV or JSON, embed the data directly into a JavaScript variable, just like the example. **DO NOT use \`fetch\`**. The JavaScript MUST be functional and perform all required calculations.
**DESIGN and UX:** Create a professional and clean user interface. Use Bootstrap 5 components effectively. For example, wrap the main content in a Bootstrap "Card" with padding (\`<div class="card"><div class="card-body">\`). Center the main container on the page. Use appropriate margins and typography.
**User's Brief:** ${brief}
**Attachments:** ${attachmentNames.join(', ')}
**Checks:** ${checks.join(', ')}

Return your response in the exact format:
===INDEX.HTML===
[Your generated HTML and functional JavaScript here]
===README.MD===
[Your generated README.md here]
===LICENSE===
[The full text of the MIT LICENSE here]`;

  const response = await callLLM(prompt);
  return parseGeneratedCode(response);
}

// In server/utils/llm.ts

// In server/utils/llm.ts

// In server/utils/llm.ts

// In server/utils/llm.ts

export async function updateExistingApp(
  existingCode: string,
  newBrief: string,
  checks: string[]
): Promise<GeneratedCode> {
  const prompt = `You are an expert web developer specializing in surgical code modifications. Your task is to update an existing application by adding a new feature while strictly preserving its core functionality and user experience.

### CORE INSTRUCTIONS ###
1.  **Analyze Existing Code:** First, fully understand the provided \`existingCode\`. Identify its core purpose and user interaction model (e.g., "it automatically loads and displays data," "it is an interactive form").
2.  **Integrate New Features:** Read the \`newBrief\` and identify the single new feature to add.
3.  **PRESERVE ALL ORIGINAL LOGIC:** When adding new code, you MUST ensure the original logic is still present and functional.
4.  **DO NOT CHANGE THE CORE INTERACTION MODEL:** If the original page was a static display that loaded automatically, the updated page must also be a static display that loads automatically.
5.  **CRITICAL FORBIDDEN ACTIONS:** Unless the brief explicitly asks for it, **DO NOT add \`<textarea>\` elements. DO NOT add \`<button>\` elements.** Only add the specific feature requested in the brief.

### YOUR TASK ###

**Existing Code (to understand its features):**
\`\`\`html
${existingCode}
\`\`\`

**New Brief (the new feature to add):**
\`\`\`
${newBrief}
\`\`\`

**Checks the Final, Combined Code Must Pass:**
${checks.join(', ')}

Return your response in this exact format:
===INDEX.HTML===
[The full, updated index.html code with the new feature correctly integrated]
===README.MD===
[An updated README.md that includes the new feature]
===LICENSE===
[The full text of the MIT LICENSE]`;

  const response = await callLLM(prompt);
  return parseGeneratedCode(response);
}

function parseGeneratedCode(response: string): GeneratedCode {
  const htmlMatch = response.match(/===INDEX\.HTML===\s*([\s\S]*?)(?====|$)/i);
  const readmeMatch = response.match(/===README\.MD===\s*([\s\S]*?)(?====|$)/i);
  const licenseMatch = response.match(/===LICENSE===\s*([\s\S]*?)(?====|$)/i);

  const html = htmlMatch ? htmlMatch[1].trim() : generateFallbackHTML();
  const readme = readmeMatch ? readmeMatch[1].trim() : generateFallbackREADME();
  const license = licenseMatch ? licenseMatch[1].trim() : generateMITLicense();

  return { html, readme, license };
}

function generateFallbackHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated App</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
  <div class="container mt-5">
    <h1>Generated Application</h1>
    <p>This is a generated application.</p>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
}

function generateFallbackREADME(): string {
  return `# Generated Application

## Summary
This is an automatically generated web application.

## Setup
No setup required. Open index.html in a web browser.

## Usage
Open the application in your browser and follow the on-screen instructions.

## Code Explanation
This application uses HTML, JavaScript, and Bootstrap for styling.`;
}

function generateMITLicense(): string {
  return `MIT License

Copyright (c) ${new Date().getFullYear()}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
}
