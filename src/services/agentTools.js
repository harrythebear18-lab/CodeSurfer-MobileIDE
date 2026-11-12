import * as FileSystem from 'expo-file-system';
import { FilePermissionService } from './filePermissionService';

const MAX_READ_CHARS = 6000;
const MAX_LIST_ENTRIES = 150;
const MAX_SEARCH_MATCHES = 40;
const MAX_SEARCH_FILES = 200;
const MAX_FILE_BYTES = 512 * 1024;

export const workspaceRoot = () => FilePermissionService.getUserAccessibleDirectory();

// Resolves a model-supplied path inside the workspace; throws on anything that escapes it.
export function resolvePath(rel = '.', root = workspaceRoot()) {
  if (typeof rel !== 'string') throw new Error('path must be a string');
  let p = rel.trim().replace(/\\/g, '/');
  if (p.startsWith(root)) p = p.slice(root.length);
  if (p.startsWith('/') || /^[a-z]+:/i.test(p)) {
    throw new Error(`Path must be relative to the projects folder, got "${rel}"`);
  }
  const parts = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (!parts.length) throw new Error(`Path "${rel}" is outside the projects folder`);
      parts.pop();
    } else {
      parts.push(seg);
    }
  }
  const relative = parts.join('/');
  return { relative: relative || '.', uri: root + relative };
}

const info = (uri) => FileSystem.getInfoAsync(uri);

async function readText(uri, relative) {
  const i = await info(uri);
  if (!i.exists) throw new Error(`File not found: ${relative}`);
  if (i.isDirectory) throw new Error(`${relative} is a folder, not a file`);
  if (i.size > MAX_FILE_BYTES) throw new Error(`${relative} is too large (${i.size} bytes)`);
  return FileSystem.readAsStringAsync(uri);
}

async function ensureParent(uri) {
  const dir = uri.slice(0, uri.lastIndexOf('/') + 1);
  const i = await info(dir);
  if (!i.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
}

async function assertWritable(relative) {
  const name = relative.split('/').pop();
  if (!FilePermissionService.isAllowedFile(name)) {
    throw new Error(`File type not allowed: ${name}. Use a code or text extension like .js, .py, .md`);
  }
}

const numberLines = (text, start = 1) =>
  text.split('\n').map((l, i) => `${String(i + start).padStart(4)}| ${l}`).join('\n');

const countOccurrences = (hay, needle) => {
  let n = 0;
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
};

// Finds needle in hay ignoring differences in whitespace; returns [{start, end}] spans in hay.
export function findLoose(hay, needle) {
  const cleaned = needle.replace(/^ *\d+\| ?/gm, '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return [];
  const map = [];
  let norm = '';
  for (let i = 0; i < hay.length; i++) {
    if (/\s/.test(hay[i])) {
      if (norm.length && norm[norm.length - 1] !== ' ') {
        norm += ' ';
        map.push(i);
      }
    } else {
      norm += hay[i];
      map.push(i);
    }
  }
  const spans = [];
  for (let i = norm.indexOf(cleaned); i !== -1; i = norm.indexOf(cleaned, i + 1)) {
    spans.push({ start: map[i], end: map[i + cleaned.length - 1] + 1, normStart: i, map, cleaned });
  }
  return spans;
}

const looseText = (t) => t.replace(/^ *\d+\| ?/gm, '').trim().replace(/\s+/g, ' ');

// Applies a whitespace-insensitive match while keeping the file's own formatting:
// only the part that actually differs between old and new text is replaced.
function replaceLoose(hay, span, newText) {
  const a = span.cleaned;
  const b = looseText(newText);
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let q = 0;
  while (q < a.length - p && q < b.length - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
  const from = p < a.length - q ? span.map[span.normStart + p] : null;
  if (from === null) {
    // pure insertion: insert after the last kept character
    const at = p > 0 ? span.map[span.normStart + p - 1] + 1 : span.start;
    return hay.slice(0, at) + b.slice(p, b.length - q) + hay.slice(at);
  }
  const to = span.map[span.normStart + a.length - q - 1] + 1;
  return hay.slice(0, from) + b.slice(p, b.length - q) + hay.slice(to);
}

async function walk(uri, relative, out, depth) {
  const names = (await FileSystem.readDirectoryAsync(uri)).sort();
  for (const name of names) {
    if (out.length >= MAX_SEARCH_FILES) return;
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const childUri = `${uri}${name}`;
    const childRel = relative === '.' ? name : `${relative}/${name}`;
    const i = await info(childUri);
    if (i.isDirectory) {
      if (depth < 6) await walk(`${childUri}/`, childRel, out, depth + 1);
    } else if (FilePermissionService.isAllowedFile(name) && i.size <= MAX_FILE_BYTES) {
      out.push({ uri: childUri, relative: childRel });
    }
  }
}

const str = { type: 'string' };

export const TOOLS = [
  {
    name: 'update_plan',
    description:
      'Record or update your step-by-step plan. Call this first for any task with more than one step, and again as steps are completed.',
    parameters: {
      type: 'object',
      properties: {
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: { step: str, status: { type: 'string', enum: ['pending', 'in_progress', 'done'] } },
            required: ['step', 'status'],
          },
        },
      },
      required: ['steps'],
    },
    async run({ steps }) {
      if (!Array.isArray(steps) || !steps.length) throw new Error('steps must be a non-empty array');
      const clean = steps.map((s) => ({
        step: String(typeof s === 'string' ? s : s.step || ''),
        status: ['pending', 'in_progress', 'done'].includes(s.status) ? s.status : 'pending',
      }));
      const next = clean.find((s) => s.status !== 'done');
      const text = next
        ? `Plan saved. Now do this step with the right tool (not update_plan): ${next.step}`
        : 'All steps done. Now reply to the user with a short summary of what you changed.';
      return { text, plan: clean };
    },
  },
  {
    name: 'list_files',
    description: 'List files and folders in a folder of the projects workspace. Use "." for the top level.',
    parameters: { type: 'object', properties: { path: str }, required: [] },
    async run({ path = '.' }) {
      const { uri, relative } = resolvePath(path);
      const i = await info(uri.endsWith('/') || relative === '.' ? uri : `${uri}/`);
      if (!i.exists || !i.isDirectory) throw new Error(`Folder not found: ${relative}`);
      const dirUri = relative === '.' ? uri : `${uri}/`;
      const names = (await FileSystem.readDirectoryAsync(dirUri)).sort();
      const lines = [];
      for (const name of names.slice(0, MAX_LIST_ENTRIES)) {
        const ci = await info(`${dirUri}${name}`);
        lines.push(ci.isDirectory ? `${name}/` : `${name} (${ci.size} bytes)`);
      }
      if (names.length > MAX_LIST_ENTRIES) lines.push(`... ${names.length - MAX_LIST_ENTRIES} more`);
      return { text: lines.length ? `${relative}:\n${lines.join('\n')}` : `${relative} is empty.` };
    },
  },
  {
    name: 'read_file',
    description: 'Read a text file with line numbers. Optionally pass start_line/end_line for part of a long file.',
    parameters: {
      type: 'object',
      properties: { path: str, start_line: { type: 'integer' }, end_line: { type: 'integer' } },
      required: ['path'],
    },
    async run({ path, start_line, end_line }) {
      const { uri, relative } = resolvePath(path);
      const text = await readText(uri, relative);
      const lines = text.split('\n');
      const start = Math.max(1, parseInt(start_line, 10) || 1);
      const end = Math.min(lines.length, parseInt(end_line, 10) || lines.length);
      let body = numberLines(lines.slice(start - 1, end).join('\n'), start);
      let note = '';
      if (body.length > MAX_READ_CHARS) {
        body = body.slice(0, MAX_READ_CHARS);
        note = `\n[truncated: file has ${lines.length} lines; use start_line/end_line to read more]`;
      }
      return { text: `${relative} (${lines.length} lines):\n${body}${note}` };
    },
  },
  {
    name: 'search_files',
    description: 'Search for text (case-insensitive) in all files under a folder. Returns matching lines.',
    parameters: { type: 'object', properties: { query: str, path: str }, required: ['query'] },
    async run({ query, path = '.' }) {
      if (!query || typeof query !== 'string') throw new Error('query is required');
      const { uri, relative } = resolvePath(path);
      const files = [];
      await walk(relative === '.' ? uri : `${uri}/`, relative, files, 0);
      const q = query.toLowerCase();
      const matches = [];
      for (const f of files) {
        const lines = (await FileSystem.readAsStringAsync(f.uri)).split('\n');
        lines.forEach((l, i) => {
          if (matches.length < MAX_SEARCH_MATCHES && l.toLowerCase().includes(q)) {
            matches.push(`${f.relative}:${i + 1}: ${l.trim().slice(0, 160)}`);
          }
        });
        if (matches.length >= MAX_SEARCH_MATCHES) break;
      }
      return { text: matches.length ? matches.join('\n') : `No matches for "${query}" in ${files.length} files.` };
    },
  },
  {
    name: 'create_file',
    description: 'Create a new file with the given content. Fails if the file already exists. Folders are created as needed.',
    parameters: { type: 'object', properties: { path: str, content: str }, required: ['path', 'content'] },
    write: true,
    async prepare({ path, content }) {
      const { uri, relative } = resolvePath(path);
      if (relative === '.') throw new Error('path must name a file');
      await assertWritable(relative);
      if ((await info(uri)).exists) throw new Error(`${relative} already exists. Use edit_file or write_file instead.`);
      return { uri, relative, before: null, after: String(content ?? '') };
    },
  },
  {
    name: 'edit_file',
    description:
      'Replace old_text with new_text in an existing file. old_text must match the file exactly (including indentation) and appear exactly once. Read the file first.',
    parameters: {
      type: 'object',
      properties: { path: str, old_text: str, new_text: str },
      required: ['path', 'old_text', 'new_text'],
    },
    write: true,
    async prepare({ path, old_text, new_text }) {
      const { uri, relative } = resolvePath(path);
      await assertWritable(relative);
      if (!old_text) throw new Error('old_text must not be empty');
      const before = await readText(uri, relative);
      const replacement = String(new_text ?? '');
      const n = countOccurrences(before, old_text);
      if (n === 1) return { uri, relative, before, after: before.replace(old_text, () => replacement) };
      if (n > 1) {
        const at = before.split('\n').map((l, i) => (l.includes(old_text.split('\n')[0]) ? i + 1 : 0)).filter(Boolean);
        throw new Error(`old_text appears ${n} times in ${relative} (lines ${at.join(', ')}). Include the line above it (e.g. the function name) so it is unique.`);
      }
      const spans = findLoose(before, old_text);
      if (spans.length === 1) return { uri, relative, before, after: replaceLoose(before, spans[0], replacement) };
      if (spans.length > 1) throw new Error(`old_text appears ${spans.length} times in ${relative}. Include more surrounding lines so it is unique.`);
      if (replacement.trim() && findLoose(before, replacement).length) {
        throw new Error(`new_text is already in ${relative}, so this change is already done. If the task is complete, reply with a short summary.`);
      }
      throw new Error(`old_text was not found in ${relative}. Read the file and copy the text exactly.`);
    },
  },
  {
    name: 'write_file',
    description: 'Overwrite a whole file (or create it) with new content. Prefer edit_file for small changes.',
    parameters: { type: 'object', properties: { path: str, content: str }, required: ['path', 'content'] },
    write: true,
    async prepare({ path, content }) {
      const { uri, relative } = resolvePath(path);
      if (relative === '.') throw new Error('path must name a file');
      await assertWritable(relative);
      const i = await info(uri);
      if (i.isDirectory) throw new Error(`${relative} is a folder`);
      const before = i.exists ? await readText(uri, relative) : null;
      return { uri, relative, before, after: String(content ?? '') };
    },
  },
];

export const toolByName = (name) => TOOLS.find((t) => t.name === name);

// Writes a prepared change, then reads it back so the model gets a verified result.
export async function applyWrite(change) {
  await ensureParent(change.uri);
  await FileSystem.writeAsStringAsync(change.uri, change.after);
  const check = await FileSystem.readAsStringAsync(change.uri);
  if (check !== change.after) throw new Error(`Wrote ${change.relative} but read-back did not match`);
  const lines = check.split('\n').length;
  return { text: `${change.before === null ? 'Created' : 'Updated'} ${change.relative} (${lines} lines). Read back and verified.` };
}

// Small line diff for the approval card: trims the common prefix/suffix and shows what changed.
export function diffLines(before, after, maxLines = 60) {
  const a = before === null ? [] : before.split('\n');
  const b = after.split('\n');
  let s = 0;
  while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let ea = a.length;
  let eb = b.length;
  while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) {
    ea--;
    eb--;
  }
  const out = [];
  if (s > 0) out.push({ type: 'ctx', text: `@@ line ${s + 1}` });
  a.slice(s, ea).forEach((t) => out.push({ type: 'del', text: t }));
  b.slice(s, eb).forEach((t) => out.push({ type: 'add', text: t }));
  if (out.length > maxLines) {
    const hidden = out.length - maxLines;
    return [...out.slice(0, maxLines), { type: 'ctx', text: `... ${hidden} more lines` }];
  }
  return out;
}
