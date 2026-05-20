#!/usr/bin/env node

const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const REPO_OWNER = 'Eikanya';
const REPO_NAME = 'Live2d-model';
const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}.git`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}`;
const DEFAULT_OUTPUT_PATH = path.resolve(process.cwd(), 'packages/webpaper/lib/live2d/models.json');
const DEFAULT_LOCAL_REPO_PATH = path.resolve(process.cwd(), 'temp', REPO_NAME);
const LOCAL_REPO_CANDIDATES = [
  process.env.LIVE2D_REPO_DIR,
  '/workspace/temp/Live2d-model',
  '/workspaces/webtools/temp/Live2d-model',
  DEFAULT_LOCAL_REPO_PATH,
].filter(Boolean);

const MODEL_FILE_PATTERN = /(?:^|\/)(?:[^/]+\.)?model(?:3|4)?\.json$/i;
const ARCHIVE_PATTERN = /\.(zip|tar|tgz|tar\.gz|tar\.bz2|tar\.xz)$/i;
const MODEL_JSON_CACHE_ROOT = path.resolve(process.cwd(), 'temp', 'model-json-cache');

function toPosixPath(value) {
  return value.split(path.sep).join(path.posix.sep);
}

function normalizeRelativePath(relativePath) {
  return toPosixPath(path.posix.normalize(relativePath.replace(/^\/+/, '')));
}

function encodePathSegments(posixPath) {
  return posixPath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function toRawUrl(commitHash, relativePath) {
  return `${RAW_BASE}/${commitHash}/${encodePathSegments(normalizeRelativePath(relativePath))}`;
}

function isArchiveFile(filePath) {
  return ARCHIVE_PATTERN.test(filePath);
}

function isModelFile(filePath) {
  return MODEL_FILE_PATTERN.test(filePath);
}

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

// Simple terminal progress bar helper. Uses single-line redraws and cooperates with
// console.log/warn/error by clearing before printing and redrawing after.
class Progress {
  constructor() {
    this.active = false;
    this.label = '';
    this.total = 0;
    this.current = 0;
    this.width = 28;
    this.supportsTTY = process.stdout.isTTY;
  }

  start(label, total) {
    this.label = label || '';
    this.total = Number.isFinite(total) ? total : 0;
    this.current = 0;
    this.active = true;
    if (this.supportsTTY) {
      process.stdout.write(`[progress] Starting: ${label}\n`);
    }
    this.render();
  }

  setTotal(total) {
    this.total = Number.isFinite(total) ? total : this.total;
    this.render();
  }

  tick(n = 1) {
    this.current += n;
    if (this.current > this.total) this.current = this.total;
    this.render();
  }

  done() {
    this.current = this.total;
    this.render();
    this.clearLine();
    this.active = false;
  }

  clearLine() {
    try {
      if (process.stdout.isTTY) {
        process.stdout.write('\x1b[2K\r');
      }
    } catch (e) {
      // ignore
    }
  }

  render() {
    if (!process.stdout.isTTY) return;

    if (!Number.isFinite(this.total) || this.total <= 0) {
      const text = `${this.label}: ?`;
      this.clearLine();
      process.stdout.write(text);
      return;
    }

    const pct = this.current / this.total;
    const filled = Math.round(this.width * pct);
    const empty = this.width - filled;
    const bar = `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
    const text = `${this.label}: ${this.current}/${this.total} ${bar}`;
    this.clearLine();
    process.stdout.write(text);
  }
}

const _progress = new Progress();

// Patch console methods to cooperate with progress bar.
const _origConsole = { log: console.log, warn: console.warn, error: console.error };
function _wrapConsoleMethod(fn) {
  return function (...args) {
    try {
      if (_progress.active) _progress.clearLine();
    } catch (e) {
      // ignore
    }

    fn.apply(console, args);

    try {
      if (_progress.active) _progress.render();
    } catch (e) {
      // ignore
    }
  };
}

console.log = _wrapConsoleMethod(_origConsole.log.bind(console));
console.warn = _wrapConsoleMethod(_origConsole.warn.bind(console));
console.error = _wrapConsoleMethod(_origConsole.error.bind(console));

function collectStringLeaves(value, output) {
  if (typeof value === 'string') {
    output.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringLeaves(item, output);
    }
    return;
  }

  if (value && typeof value === 'object') {
    for (const nestedValue of Object.values(value)) {
      collectStringLeaves(nestedValue, output);
    }
  }
}

function resolveCandidatePath(modelFilePath, fileReference) {
  if (typeof fileReference !== 'string') {
    return '';
  }

  const trimmed = fileReference.trim();
  if (!trimmed || /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return '';
  }

  const modelDir = path.posix.dirname(normalizeRelativePath(modelFilePath));
  return normalizeRelativePath(path.posix.join(modelDir, trimmed));
}

async function runCommand(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, {
      maxBuffer: 1024 * 1024 * 50,
      ...options,
    });
    return result.stdout;
  } catch (error) {
    const stderr = error?.stderr ? `\n${error.stderr}` : '';
    throw new Error(`${command} ${args.join(' ')} failed${stderr}`);
  }
}

async function runCommandBuffer(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, {
      maxBuffer: 1024 * 1024 * 50,
      encoding: 'buffer',
      ...options,
    });
    return Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout);
  } catch (error) {
    const stderr = error?.stderr ? `\n${error.stderr}` : '';
    throw new Error(`${command} ${args.join(' ')} failed${stderr}`);
  }
}

function toAbsoluteRepoFilePath(repoRoot, relativePath) {
  const posixPath = normalizeRelativePath(relativePath);
  return path.join(repoRoot, ...posixPath.split('/'));
}

function toModelCacheFilePath(relativePath) {
  const posixPath = normalizeRelativePath(relativePath);
  return path.join(MODEL_JSON_CACHE_ROOT, ...posixPath.split('/'));
}

async function readJsonSafe(filePath) {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readModelBlob(repoRoot, commitHash, relativePath) {
  const localPath = toAbsoluteRepoFilePath(repoRoot, relativePath);

  try {
    const stat = await fsp.stat(localPath);
    if (stat.isFile()) {
      return await fsp.readFile(localPath);
    }
  } catch {
    // ignore and fallback to git blob read
  }

  const cachePath = toModelCacheFilePath(relativePath);
  const cacheMetaPath = `${cachePath}.meta.json`;
  const cacheMeta = await readJsonSafe(cacheMetaPath);

  try {
    const cacheStat = await fsp.stat(cachePath);
    const isLatest = Boolean(cacheMeta && cacheMeta.commitHash === commitHash && cacheStat.isFile());
    if (isLatest) {
      return await fsp.readFile(cachePath);
    }
  } catch {
    // cache miss or unreadable cache file -> refetch below
  }

  const blob = await runCommandBuffer('git', ['show', `${commitHash}:${relativePath}`], { cwd: repoRoot });

  try {
    await fsp.mkdir(path.dirname(cachePath), { recursive: true });
    await fsp.writeFile(cachePath, blob);
    await fsp.writeFile(cacheMetaPath, JSON.stringify({
      commitHash,
      relativePath: normalizeRelativePath(relativePath),
      updatedAt: new Date().toISOString(),
    }, null, 2));
  } catch {
    // cache write failure should not break generation
  }

  return blob;
}

async function resolveLatestCommitHash() {
  try {
    const output = await runCommand('git', ['ls-remote', REPO_URL, 'HEAD'], { cwd: process.cwd() });
    const lines = output.trim().split(/\r?\n/).filter(Boolean);

    for (const line of lines) {
      const match = line.match(/^([0-9a-f]{40})\s+HEAD$/i);
      if (match) {
        return match[1];
      }
    }

    const symrefOutput = await runCommand('git', ['ls-remote', '--symref', REPO_URL, 'HEAD'], {
      cwd: process.cwd(),
    });
    const symrefLines = symrefOutput.trim().split(/\r?\n/).filter(Boolean);

    for (const line of symrefLines) {
      const match = line.match(/^([0-9a-f]{40})\s+HEAD$/i);
      if (match) {
        return match[1];
      }
    }
  } catch (gitErr) {
    console.warn('[warn] git ls-remote failed, falling back to GitHub API for latest commit:', gitErr.message || String(gitErr));
  }

  // Fallback to GitHub API: fetch latest commit of default branch (master)
  try {
    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/master`;
    const headers = { 'User-Agent': 'webtools-live2d-model-generator' };
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (token) headers.Authorization = `token ${token}`;

    const res = await fetch(apiUrl, { headers });
    if (!res.ok) throw new Error(`GitHub commits API returned ${res.status} ${res.statusText}`);
    const json = await res.json();
    if (json && json.sha) return json.sha;
  } catch (apiErr) {
    throw new Error(`Unable to resolve HEAD for ${REPO_URL}: ${apiErr.message || String(apiErr)}`);
  }
}

async function readCurrentVersion(outputPath) {
  if (!fs.existsSync(outputPath)) {
    return '';
  }

  try {
    const raw = await fsp.readFile(outputPath, 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed?.version === 'string' ? parsed.version : '';
  } catch {
    return '';
  }
}

async function promptForHash(latestHash, currentHash) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const suffix = currentHash ? `, 当前版本 ${currentHash}` : '';
    const answer = await rl.question(`输入 commit hash，直接回车使用最新版本 ${latestHash}${suffix}: `);
    return answer.trim() || latestHash;
  } finally {
    rl.close();
  }
}

function parseArgs(argv) {
  const options = {
    outputPath: DEFAULT_OUTPUT_PATH,
    commitHash: '',
    interactive: false,
    dryRun: false,
    help: false,
    treeDepth: 1,
    treeLimit: 3,
    printTree: false,
    printModels: false,
    noDownload: false,
  };

  const rest = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '-o' || arg === '--output') {
      options.outputPath = path.resolve(argv[++index] || DEFAULT_OUTPUT_PATH);
      continue;
    }

    if (arg === '--hash') {
      options.commitHash = argv[++index] || '';
      continue;
    }

    if (arg === '-i' || arg === '--interactive') {
      options.interactive = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--tree-depth' || arg === '--treeDepth') {
      const nextValue = Number.parseInt(argv[++index] || '', 10);
      if (Number.isFinite(nextValue) && nextValue >= 0) {
        options.treeDepth = nextValue;
      }
      continue;
    }

    if (arg === '--tree-limit' || arg === '--treeLimit') {
      const nextValue = Number.parseInt(argv[++index] || '', 10);
      if (Number.isFinite(nextValue) && nextValue >= 0) {
        options.treeLimit = nextValue;
      }
      continue;
    }

    if (arg === '--print-tree') {
      options.printTree = true;
      continue;
    }

    if (arg === '--print-models') {
      options.printModels = true;
      continue;
    }

    if (arg === '--no-download') {
      options.noDownload = true;
      continue;
    }

    if (arg === '-h' || arg === '--help') {
      options.help = true;
      continue;
    }

    rest.push(arg);
  }

  if (!options.commitHash && rest.length > 0) {
    options.commitHash = rest[0];
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/generate-models-list.cjs [options] [commitHash]

Options:
  -o, --output <path>       Output JSON path
  --hash <commit>           Generate from a specific commit hash
  -i, --interactive         Prompt for a commit hash
  --print-tree              Print repository tree output
  --print-models            Print all scanned model.json paths
  --tree-depth <n>          Print repository tree up to n levels, default 1
  --tree-limit <n>          Max items shown per folder, default 3
  --dry-run                 Resolve the version and scan, but do not write the output file
  --no-download             Only read git tree and emit model paths; skip model json validation
  -h, --help                Show this message
`);
}

async function isGitRepo(dirPath) {
  try {
    await fsp.access(path.join(dirPath, '.git'));
    return true;
  } catch {
    return false;
  }
}

async function resolveRepoRoot() {
  for (const candidate of LOCAL_REPO_CANDIDATES) {
    if (!candidate) continue;
    if (await isGitRepo(candidate)) {
      return path.resolve(candidate);
    }
  }

  return DEFAULT_LOCAL_REPO_PATH;
}

async function ensureRepoForCommit(repoRoot, commitHash) {
  const exists = await isGitRepo(repoRoot);
  if (!exists) {
    await fsp.mkdir(path.dirname(repoRoot), { recursive: true });
    console.log(`[info] Cloning repository to ${repoRoot} ...`);
    await runCommand('git', ['clone', '--filter=blob:none', '--no-checkout', '--single-branch', '--branch', 'master', REPO_URL, repoRoot], {
      cwd: process.cwd(),
    });
    console.log('[info] Repository cloned successfully.');
  } else {
    console.log(`[info] Reusing existing local repository: ${repoRoot}`);
  }

  try {
    await runCommand('git', ['cat-file', '-e', `${commitHash}^{commit}`], { cwd: repoRoot });
  } catch {
    console.log(`[info] Fetching target commit ${commitHash.substring(0, 12)}...`);
    await runCommand('git', ['fetch', '--depth', '1', 'origin', commitHash], { cwd: repoRoot });
  }
}

async function collectRepoIndex(commitHash, treeDepth, treeLimit) {
  const opts = arguments[3] || {};
  const repoRoot = await resolveRepoRoot();
  await ensureRepoForCommit(repoRoot, commitHash);

  const allFiles = new Set();
  const modelEntries = [];

  console.log('[info] Reading repository file tree...');
  const treeOutput = await runCommand('git', ['-c', 'core.quotepath=false', 'ls-tree', '-r', '-z', '--name-only', commitHash], { cwd: repoRoot });
  const repoFiles = treeOutput.split('\0').map((line) => line.trim()).filter(Boolean).map(normalizeRelativePath);
  console.log(`[info] Found ${repoFiles.length} files in repository.`);

  if (treeDepth >= 0) {
    printRepositoryTree(repoFiles, treeDepth, treeLimit);
  }

  _progress.start('Scanning files', repoFiles.length);
  for (const filePath of repoFiles) {
    // Skip archives entirely (no extraction / no archive-based model discovery).
    if (isArchiveFile(filePath)) {
      _progress.tick();
      continue;
    }

    allFiles.add(filePath);
    if (isModelFile(filePath)) {
      modelEntries.push({ displayPath: filePath, rawPath: filePath });
    }

    _progress.tick();
  }
  _progress.done();

  if (opts.noDownload) {
    return { repoRoot, allFiles, modelEntries };
  }

  return { repoRoot, allFiles, modelEntries };
}

function printRepositoryTree(repoFiles, maxDepth = 1, maxItems = 3) {
  console.log('[info] Repository directory tree:');

  const root = { children: new Map(), files: [] };

  for (const filePath of repoFiles) {
    const segments = filePath.split('/').filter(Boolean);
    let current = root;

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const isLeaf = index === segments.length - 1;

      if (isLeaf) {
        current.files.push(segment);
        continue;
      }

      if (!current.children.has(segment)) {
        current.children.set(segment, { children: new Map(), files: [] });
      }

      current = current.children.get(segment);
    }
  }

  function walkNode(node, prefix = '', depth = 0) {
    const childDirectories = Array.from(node.children.entries()).sort(([leftName], [rightName]) => leftName.localeCompare(rightName));
    const childFiles = Array.from(node.files).sort((left, right) => left.localeCompare(right));

    const entries = [
      ...childDirectories.map(([name, child]) => ({ name, child, kind: 'dir' })),
      ...childFiles.map((name) => ({ name, kind: 'file' })),
    ];

    const effectiveMaxItems = depth === 0 ? Infinity : maxItems;
    const limitedEntries = Number.isFinite(effectiveMaxItems) && effectiveMaxItems >= 0
      ? entries.slice(0, effectiveMaxItems)
      : entries;

    if (Number.isFinite(effectiveMaxItems) && effectiveMaxItems >= 0 && entries.length > effectiveMaxItems) {
      limitedEntries.push({ name: '...', kind: 'ellipsis' });
    }

    limitedEntries.forEach((entry, index) => {
      const isLast = index === limitedEntries.length - 1;
      const branch = isLast ? '└── ' : '├── ';
      const nextPrefix = `${prefix}${isLast ? '    ' : '│   '}`;
      console.log(`${prefix}${branch}${entry.name}${entry.kind === 'dir' ? '/' : ''}`);

      if (entry.kind === 'dir' && depth < maxDepth) {
        walkNode(entry.child, nextPrefix, depth + 1);
      }
    });
  }

  walkNode(root);
  if (repoFiles.length === 0) {
    console.log('└── (empty)');
  }
}

function buildModelTree(modelEntries, commitHash) {
  const root = { label: 'Live2D Models', children: [] };

  const insertNode = (parent, segments, url) => {
    if (segments.length === 0) {
      return;
    }

    const [segment, ...rest] = segments;
    let child = parent.children.find((node) => node.label === segment);

    if (!child) {
      child = { label: segment };
      parent.children.push(child);
    }

    if (rest.length === 0) {
      child.url = url;
      return;
    }

    child.children = child.children || [];
    insertNode(child, rest, url);
  };

  for (const entry of modelEntries) {
    const rawPath = normalizeRelativePath(entry.displayPath);
    let segments = rawPath.split('/').filter(Boolean);
    const url = entry.rawPath.startsWith('http') ? entry.rawPath : toRawUrl(commitHash, entry.rawPath);

    // If the entry is a model file, use its containing folder as the leaf label.
    const lastName = segments[segments.length - 1] || '';
    if (isModelFile(lastName)) {
      // Remove the filename; target the parent folder as the leaf.
      segments = segments.slice(0, -1);
      if (segments.length === 0) {
        // model file at repository root -> use filename (without extension) as label
        const base = lastName.replace(/\.[^/.]+$/, '');
        segments = [base];
      }
    }

    insertNode(root, segments, url);
  }

  function compress(node, isRoot = false) {
    if (!node.children || node.children.length === 0) {
      delete node.children;
      return node;
    }

    node.children = node.children.map((child) => compress(child, false));
    return node;
  }

  // Flatten single-child chains by concatenating labels with ' / '.
  // Do not merge the absolute root label.
  function flatten(node, isRootNode = false) {
    if (!node || !node.children) return node;

    node.children = node.children.map((child) => flatten(child, false)).filter(Boolean);

    // For each child, if it has a single child and no url, merge labels downward.
    node.children = node.children.map((child) => {
      let current = child;
      while (current && current.children && current.children.length === 1 && !current.url) {
        const only = current.children[0];
        // merge labels
        current.label = `${current.label} / ${only.label}`;
        // inherit url if present on the only child
        if (only.url && !current.url) current.url = only.url;
        // adopt grandchildren
        current.children = only.children || [];
      }

      // if after merging there are no children, remove empty children property in output
      if (current && current.children && current.children.length === 0) delete current.children;
      return current;
    });

    if (!isRootNode && node.children.length === 0) delete node.children;
    return node;
  }

  return flatten(root, true);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  console.log('[info] Generating Live2D models list...');
  console.log('[info] Fetching latest commit hash...');
  const latestHash = await resolveLatestCommitHash();
  console.log(`[info] Latest commit hash: ${latestHash}`);

  const currentVersion = await readCurrentVersion(options.outputPath);
  let targetHash = options.commitHash;

  if (!targetHash && options.interactive) {
    targetHash = await promptForHash(latestHash, currentVersion);
  }

  if (!targetHash) {
    targetHash = currentVersion && currentVersion === latestHash ? currentVersion : latestHash;
  }

  if (currentVersion && currentVersion !== targetHash) {
    console.log(`[info] Current models.json version ${currentVersion} differs from target ${targetHash}`);
  }

  if (options.dryRun) {
    console.log(`[info] Dry run only, target commit: ${targetHash}`);
    return;
  }

  console.log('[info] Loading repository tree...');
  // Show a placeholder progress so terminal indicates activity during clone/ls-tree
  const { repoRoot, allFiles, modelEntries } = await collectRepoIndex(targetHash, options.printTree ? options.treeDepth : -1, options.treeLimit, { noDownload: options.noDownload });

  // In no-download mode, still validate model format by checking FileReferences.
  if (options.noDownload) {
    const sortedModelEntries = Array.from(modelEntries).sort((a, b) => a.displayPath.localeCompare(b.displayPath));
    const keptEntries = [];
    let skippedByFormat = 0;

    _progress.start('Filtering model formats', sortedModelEntries.length);
    for (const entry of sortedModelEntries) {
      try {
        const modelBlob = await readModelBlob(repoRoot, targetHash, entry.displayPath);
        const settingsJson = JSON.parse(modelBlob.toString('utf8'));
        if (isRecord(settingsJson?.FileReferences)) {
          keptEntries.push(entry);
        } else {
          skippedByFormat += 1;
        }
      } catch {
        skippedByFormat += 1;
      } finally {
        _progress.tick();
      }
    }
    _progress.done();

    if (options.printModels) {
      console.log('[info] Scanned model.json files (no-download, filtered):');
      for (const entry of keptEntries) {
        console.log(entry.displayPath);
      }
    }

    const output = {
      version: targetHash,
      generatedAt: new Date().toISOString(),
      total: keptEntries.length,
      tree: buildModelTree(keptEntries, targetHash),
    };

    if (!options.dryRun) {
      await fsp.mkdir(path.dirname(options.outputPath), { recursive: true });
      await fsp.writeFile(options.outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
      console.log(`[info] Wrote ${options.outputPath}`);
      console.log(`[info] Total models: ${keptEntries.length}`);
      console.log(`[info] Skipped invalid model format (missing FileReferences): ${skippedByFormat}`);
    } else {
      console.log(`[info] Dry run: found ${keptEntries.length} models, skipped ${skippedByFormat}`);
    }

    return;
  }

  try {
    const sortedModelEntries = Array.from(modelEntries).sort((a, b) => a.displayPath.localeCompare(b.displayPath));

    if (options.printModels) {
      console.log('[info] Scanned model.json files:');
      for (const entry of sortedModelEntries) {
        console.log(entry.displayPath);
      }
    }

    const keptEntries = [];

    _progress.start('Validating models', sortedModelEntries.length);

    for (const entry of sortedModelEntries) {
      try {
        const modelBlob = await readModelBlob(repoRoot, targetHash, entry.displayPath);
        const settingsJson = JSON.parse(modelBlob.toString('utf8'));

        const fileReferences = settingsJson?.FileReferences;
        // If FileReferences is missing or malformed, silently skip this model (hide MissField logs)
        if (!isRecord(fileReferences)) {
          continue;
        }

        const missingFields = [];

        for (const [fieldName, fieldValue] of Object.entries(fileReferences)) {
          const referencedValues = [];
          collectStringLeaves(fieldValue, referencedValues);

          if (referencedValues.length === 0) {
            continue;
          }

          const missing = referencedValues.some((referenceValue) => {
            const candidate = resolveCandidatePath(entry.displayPath, referenceValue);
            return !candidate || !allFiles.has(candidate);
          });

          if (missing) {
            missingFields.push(fieldName);
          }
        }

        if (missingFields.length > 0) {
          const onlyTexturesOrMoc = missingFields.every((f) => f === 'Textures' || f === 'Moc');

          if (onlyTexturesOrMoc) {
            console.warn(`[warn] MissFile <${missingFields.join(',')}>: /${entry.displayPath}`);
            // Discard this model (do not include in output)
            continue;
          }

          // Other missing-file cases: keep the model but log info
          console.log(`[info] MissFile <${missingFields.join(',')}>: /${entry.displayPath}`);
          keptEntries.push(entry);
          continue;
        }

        // No missing fields -> keep
        keptEntries.push(entry);
      } catch {
        // ignore individual model errors
      } finally {
        _progress.tick();
      }
    }
    _progress.done();

    const output = {
      version: targetHash,
      generatedAt: new Date().toISOString(),
      total: keptEntries.length,
      tree: buildModelTree(keptEntries, targetHash),
    };

    await fsp.mkdir(path.dirname(options.outputPath), { recursive: true });
    await fsp.writeFile(options.outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    console.log(`[info] Wrote ${options.outputPath}`);
    console.log(`[info] Total models: ${keptEntries.length}`);
  } finally {
    // Keep local repo cache for next run.
  }
}

main().catch((error) => {
  console.error('[error] Failed to generate Live2D models list');
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});