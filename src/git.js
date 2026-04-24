const { spawn } = require('child_process');

const MAX_PROMPT_DIFF_CHARS = 12000;

function splitDiffSections(diffText) {
  if (!diffText) {
    return [];
  }

  const sections = [];
  const boundaryPattern = /^diff --git .*$/gm;
  const matches = Array.from(diffText.matchAll(boundaryPattern));

  if (matches.length === 0) {
    return [diffText];
  }

  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index;
    const end = index + 1 < matches.length ? matches[index + 1].index : diffText.length;
    sections.push(diffText.slice(start, end));
  }

  return sections;
}

function truncateDiffAtBoundary(diffText, maxChars) {
  if (!diffText || diffText.length <= maxChars) {
    return { diff: (diffText || '').trim(), truncated: false };
  }

  const sections = splitDiffSections(diffText);
  let truncatedDiff = '';

  for (const section of sections) {
    if ((truncatedDiff + section).length <= maxChars) {
      truncatedDiff += section;
      continue;
    }

    if (!truncatedDiff) {
      truncatedDiff = section.slice(0, maxChars);
    }

    return {
      diff: truncatedDiff.trim(),
      truncated: true,
    };
  }

  return { diff: truncatedDiff.trim(), truncated: true };
}

function runGit(args, cwd, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
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
        resolve({ stdout, stderr, code });
        return;
      }

      const error = new Error(`git ${args.join(' ')} failed with code ${code}`);
      error.stdout = stdout;
      error.stderr = stderr;
      error.code = code;
      reject(error);
    });

    if (options.input) {
      child.stdin.write(options.input);
    }

    child.stdin.end();
  });
}

async function getGitRoot(cwd) {
  const result = await runGit(['rev-parse', '--show-toplevel'], cwd);
  return result.stdout.trim();
}

async function stageAllChanges(cwd) {
  await runGit(['add', '-A'], cwd);
}

async function getBranchPointerStatus(cwd, options = {}) {
  const branch = (await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)).stdout.trim();
  if (branch === 'HEAD') {
    return { status: 'detached', branch };
  }

  let upstream;
  try {
    upstream = (await runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], cwd)).stdout.trim();
  } catch (error) {
    return { status: 'no-upstream', branch };
  }

  let fetchError = null;
  if (options.fetchBeforeSyncCheck) {
    try {
      await runGit(['fetch', '--quiet'], cwd);
    } catch (error) {
      fetchError = error.stderr || error.message;
    }
  }

  const localHead = (await runGit(['rev-parse', 'HEAD'], cwd)).stdout.trim();
  const remoteHead = (await runGit(['rev-parse', '@{u}'], cwd)).stdout.trim();
  const countText = (await runGit(['rev-list', '--left-right', '--count', 'HEAD...@{u}'], cwd)).stdout.trim();
  const [aheadStr = '0', behindStr = '0'] = countText.split(/\s+/);
  const ahead = Number(aheadStr) || 0;
  const behind = Number(behindStr) || 0;

  let status = 'up-to-date';
  if (ahead > 0 && behind > 0) {
    status = 'diverged';
  } else if (behind > 0) {
    status = 'behind';
  } else if (ahead > 0) {
    status = 'ahead';
  }

  return {
    status,
    branch,
    upstream,
    localHead,
    remoteHead,
    ahead,
    behind,
    fetchError,
  };
}

function isSyncBlocked(status) {
  return status === 'behind' || status === 'diverged' || status === 'detached';
}

async function getStagedSummary(cwd) {
  const result = await runGit(['diff', '--cached', '--name-status'], cwd);
  const lines = result.stdout.split('\n').filter(Boolean);

  let added = 0;
  let modified = 0;
  let deleted = 0;

  for (const line of lines) {
    const status = line.trim().charAt(0);
    if (status === 'A') {
      added += 1;
    } else if (status === 'D') {
      deleted += 1;
    } else {
      modified += 1;
    }
  }

  return {
    added,
    modified,
    deleted,
    total: lines.length,
  };
}

async function getStagedSnapshot(cwd) {
  const result = await runGit(['diff', '--cached', '--raw', '--no-abbrev'], cwd);
  return result.stdout;
}

async function getRecentHistory(cwd, count) {
  try {
    const result = await runGit(['log', '-n', String(count), '--pretty=format:%s'], cwd);
    return result.stdout.trim();
  } catch (error) {
    return '';
  }
}

function extractIssueHints(branchName) {
  if (!branchName || branchName === 'HEAD') {
    return [];
  }

  const hints = [];
  const seen = new Set();
  const patterns = [
    /\b[A-Z][A-Z0-9]+-\d+\b/g,
    /#\d+\b/g,
    /\bissue-\d+\b/gi,
  ];

  for (const pattern of patterns) {
    const matches = branchName.match(pattern) || [];
    for (const match of matches) {
      const normalized = pattern.ignoreCase ? match.toLowerCase() : match;
      if (!seen.has(normalized)) {
        seen.add(normalized);
        hints.push(normalized);
      }
    }
  }

  const numericBranchPattern = /(?:^|\/)(?:feature|bugfix|fix|hotfix|chore|task)\/(\d+)(?:[-/][^/]+)?/i;
  const numericMatch = branchName.match(numericBranchPattern);
  if (numericMatch) {
    const normalized = `#${numericMatch[1]}`;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      hints.push(normalized);
    }
  }

  return hints;
}

async function getBranchContext(cwd) {
  try {
    const branch = (await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)).stdout.trim();
    if (branch === 'HEAD') {
      return { branch: null, issueHints: [] };
    }

    return {
      branch,
      issueHints: extractIssueHints(branch),
    };
  } catch (error) {
    return { branch: null, issueHints: [] };
  }
}

async function listStagedFiles(cwd) {
  const result = await runGit(['diff', '--cached', '--name-only', '-z'], cwd);
  return result.stdout.split('\u0000').filter(Boolean);
}

async function getStagedDiffForFiles(cwd, files) {
  if (!files || files.length === 0) {
    return '';
  }

  const result = await runGit(['diff', '--cached', '--', ...files], cwd);
  return result.stdout;
}

async function collectStagedDiffContext(cwd) {
  const files = await listStagedFiles(cwd);
  let diff = '';
  let truncated = false;

  for (const file of files) {
    const fileDiff = await getStagedDiffForFiles(cwd, [file]);
    if (!fileDiff) {
      continue;
    }

    if ((diff + fileDiff).length <= MAX_PROMPT_DIFF_CHARS) {
      diff += fileDiff;
      continue;
    }

    if (!diff) {
      diff = fileDiff.slice(0, MAX_PROMPT_DIFF_CHARS);
    }

    truncated = true;
    break;
  }

  return {
    files,
    diff: diff.trim(),
    truncated,
  };
}

module.exports = {
  MAX_PROMPT_DIFF_CHARS,
  collectStagedDiffContext,
  extractIssueHints,
  getBranchContext,
  getBranchPointerStatus,
  getGitRoot,
  getRecentHistory,
  getStagedSnapshot,
  getStagedSummary,
  isSyncBlocked,
  stageAllChanges,
  splitDiffSections,
  truncateDiffAtBoundary,
};
