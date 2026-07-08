import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { TextDecoder } from 'node:util';

const ROOT = process.cwd();
const INCLUDE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
]);
const SKIP_DIRS = new Set([
  '.git',
  '.next',
  '.vercel',
  'node_modules',
]);

const decoder = new TextDecoder('utf-8', { fatal: true });
const suspiciousPatterns = [
  { name: 'replacement character', regex: /\uFFFD/u },
  { name: 'UTF-8 read as Latin-1: A-tilde sequence', regex: /\u00C3[\u00A0-\u00BF]/u },
  { name: 'UTF-8 read as Latin-1: A-diaeresis sequence', regex: /\u00C4[\u00A0-\u00BF]/u },
  { name: 'UTF-8 read as Latin-1: AE sequence', regex: /\u00C6[\u00A0-\u00BF]/u },
  { name: 'UTF-8 read as Latin-1: Vietnamese tone sequence', regex: /\u00E1[\u00BA-\u00BB]/u },
  { name: 'UTF-8 read as Latin-1: punctuation sequence', regex: /\u00E2[\u0080-\u00BF]/u },
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.next-locked-')) continue;
      files.push(...await walk(path.join(dir, entry.name)));
      continue;
    }

    if (!entry.isFile()) continue;
    const fullPath = path.join(dir, entry.name);
    if (INCLUDE_EXTENSIONS.has(path.extname(entry.name))) files.push(fullPath);
  }

  return files;
}

function lineAndColumn(text, index) {
  const before = text.slice(0, index);
  const lines = before.split(/\r\n|\r|\n/);
  return {
    line: lines.length,
    column: lines.at(-1).length + 1,
  };
}

const files = await walk(ROOT);
const issues = [];

for (const file of files) {
  const bytes = await readFile(file);
  let text;
  try {
    text = decoder.decode(bytes);
  } catch {
    issues.push({
      file,
      line: 1,
      column: 1,
      message: 'File is not valid UTF-8',
    });
    continue;
  }

  for (const pattern of suspiciousPatterns) {
    const match = pattern.regex.exec(text);
    if (!match) continue;
    const position = lineAndColumn(text, match.index);
    issues.push({
      file,
      ...position,
      message: pattern.name,
    });
    break;
  }
}

if (issues.length > 0) {
  console.error('Encoding check failed:');
  for (const issue of issues) {
    console.error(
      `- ${path.relative(ROOT, issue.file)}:${issue.line}:${issue.column} ${issue.message}`,
    );
  }
  process.exit(1);
}

console.log(`Encoding check passed (${files.length} files).`);
