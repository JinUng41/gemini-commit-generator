const { spawn } = require('child_process');
const path = require('path');

const DEFAULT_GEMINI_MODEL = 'flash';
const TITLE_MAX_LENGTH = 50;
const META_PREFIX_PATTERNS = [
  /^here(?:'s| is) (?:your |the )?commit message:?/i,
  /^sure,? here(?:'s| is) (?:your |the )?commit message:?/i,
  /^commit message:?/i,
  /^다음은 커밋 메시지입니다[:.]?/i,
  /^커밋 메시지[:.]?/i,
];

function runGemini(prompt, cwd, model = DEFAULT_GEMINI_MODEL) {
  return new Promise((resolve, reject) => {
    const child = spawn('gemini', ['-p', '-', '-m', model, '-e', ''], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      const error = new Error(`gemini exited with code ${code}`);
      error.code = code;
      error.stderr = stderr;
      error.stdout = stdout;
      reject(error);
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function ensureGeminiInstalled(cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('gemini', ['--version'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`gemini --version failed with code ${code}`));
      }
    });
  });
}

function buildPromptFileList(files) {
  if (!files || files.length === 0) {
    return '- None';
  }

  const basenameCounts = new Map();
  for (const file of files) {
    const basename = path.basename(file);
    basenameCounts.set(basename, (basenameCounts.get(basename) || 0) + 1);
  }

  return files
    .map((file) => {
      const basename = path.basename(file);
      return basenameCounts.get(basename) > 1 ? file : basename;
    })
    .map((file) => `- ${file}`)
    .join('\n');
}

function buildPrompt({ t, history, userContext, diff, diffTruncated, branchContext, files }) {
  const branchName = branchContext.branch || 'None';
  const branchIssues = branchContext.issueHints.length > 0
    ? branchContext.issueHints.join(', ')
    : 'None';
  const fileList = buildPromptFileList(files);

  return `Generate a detailed git commit message in ${t.promptLang} based on the staged changes.
Match the project style from recent history if possible.

[STYLE HISTORY]
${history || 'None'}

[BRANCH CONTEXT]
branch: ${branchName}
issue hints: ${branchIssues}

[USER CONTEXT]
${userContext || 'None'}

[FILES]
${fileList}

[DIFF]
${diff || 'No textual diff available.'}

[NOTES]
- The branch name and issue hints are reference material only. Use them only when they clearly match the staged changes.
- ${diffTruncated ? 'The diff was truncated at a file boundary when possible for prompt safety.' : 'The diff includes all staged file patches.'}

[FORMAT]
1. TITLE: A concise summary (preferably within ${TITLE_MAX_LENGTH} chars).
2. BODY: Optional. If you include a body, use a blank line after the title.
   - When useful, describe changes by filename only (exclude directory paths).
   - Example: "${t.promptExample}"
3. Output ONLY the commit message without markdown backticks, quotes, or explanatory prefixes.`;
}

function normalizeCommitMessage(message) {
  let normalized = (message || '').trim();
  normalized = normalized.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
}

function validateCommitMessage(message) {
  const normalized = normalizeCommitMessage(message);
  const blockingIssues = [];
  const warnings = [];
  const lines = normalized ? normalized.split('\n') : [];
  const title = lines[0] ? lines[0].trim() : '';

  if (!normalized) {
    blockingIssues.push({ code: 'empty-message' });
  }

  if (!title) {
    blockingIssues.push({ code: 'missing-title' });
  }

  if (title && title.length > TITLE_MAX_LENGTH) {
    warnings.push({ code: 'title-too-long', max: TITLE_MAX_LENGTH });
  }

  if (normalized.includes('```')) {
    blockingIssues.push({ code: 'code-fence' });
  }

  if (title && META_PREFIX_PATTERNS.some((pattern) => pattern.test(title))) {
    blockingIssues.push({ code: 'meta-prefix' });
  }

  return {
    message: normalized,
    valid: blockingIssues.length === 0,
    blockingIssues,
    warnings,
  };
}

function buildRetryPrompt(prompt, issues) {
  const validationSummary = issues.map((issue) => issue.code).join(', ');
  return `${prompt}

[VALIDATION FEEDBACK]
The previous response was not usable as a commit message because of: ${validationSummary}.
Retry and return only the commit message itself.`;
}

async function generateCommitMessage({
  cwd,
  prompt,
  maxAttempts,
  model = DEFAULT_GEMINI_MODEL,
  runGeminiImpl = runGemini,
}) {
  let currentPrompt = prompt;
  let lastResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const rawMessage = await runGeminiImpl(currentPrompt, cwd, model);
    const validation = validateCommitMessage(rawMessage);
    lastResult = {
      message: validation.message,
      valid: validation.valid,
      blockingIssues: validation.blockingIssues,
      warnings: validation.warnings,
      attempts: attempt,
    };

    if (validation.valid) {
      return lastResult;
    }

    currentPrompt = buildRetryPrompt(prompt, validation.blockingIssues);
  }

  return lastResult;
}

function classifyGeminiError(error) {
  const combined = `${error.message || ''}\n${error.stderr || ''}`.toLowerCase();
  if (
    combined.includes('auth') ||
    combined.includes('login') ||
    combined.includes('unauthorized') ||
    combined.includes('permission')
  ) {
    return 'auth';
  }

  return 'generic';
}

module.exports = {
  DEFAULT_GEMINI_MODEL,
  TITLE_MAX_LENGTH,
  buildPrompt,
  buildPromptFileList,
  classifyGeminiError,
  ensureGeminiInstalled,
  generateCommitMessage,
  normalizeCommitMessage,
  validateCommitMessage,
};
