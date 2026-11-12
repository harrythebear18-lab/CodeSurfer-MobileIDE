import { TOOLS, toolByName, applyWrite, diffLines } from './agentTools';

export const MAX_TOOL_STEPS = 12;
const MAX_TOKENS_PER_TURN = 768;
// ~4 chars per token; leaves room for the reply inside the 8192-token native context.
const HISTORY_CHAR_BUDGET = 18000;

// planning=true: the model keeps an update_plan checklist (works well with 7B / Ollama).
// planning=false: simpler protocol for small models; the app still shows each tool step.
export function systemPrompt(planning) {
  const lines = [
    'You are Qwen Coder, a coding agent inside the CodeSurfer mobile IDE on an Android phone.',
    "You work directly on the user's files with tools. Paths are relative to the projects folder; each top-level folder is a project.",
    '',
    'Rules:',
    '- If the user mentions a file, folder, project or asks you to change code, you MUST use tools. Never guess what a file contains and never tell the user to make the change themselves: do it with edit_file, write_file or create_file.',
    "- Only answer without tools for general questions that are not about the user's files.",
  ];
  if (planning) {
    lines.push('- Start a multi-step task with update_plan (2-5 short steps). Every step must be an action done with a tool (read_file, edit_file, create_file, ...); no thinking-only steps. Call update_plan again only after finishing a step, to mark it done.');
  }
  lines.push(
    '- Make ONE tool call per reply, then wait for the result.',
    '- Read a file before editing it. For edit_file, copy old_text exactly from the file (without the line numbers).',
    '- If a tool returns an error, correct the call; do not repeat it unchanged.',
    '- The user approves every file change. If they reject one, do not retry it; ask what they want.',
    planning
      ? '- Finish by reading the changed file to check it, mark the plan done with update_plan, then reply with a one or two sentence summary.'
      : '- After changing a file, read it again to check it, then reply with a one or two sentence summary.',
    '- There is no terminal: you cannot run, build or install anything.',
    ''
  );
  if (planning) {
    lines.push(
      'Example of a correct first reply to "Rename the greet function in demo/app.js to hello":',
      '<tool_call>',
      '{"name": "update_plan", "arguments": {"steps": [{"step": "Read demo/app.js", "status": "in_progress"}, {"step": "Rename greet to hello with edit_file", "status": "pending"}, {"step": "Read the file again to check", "status": "pending"}]}}',
      '</tool_call>'
    );
  } else {
    lines.push(
      'Example of a correct first reply to "Rename the greet function in demo/app.js to hello":',
      '<tool_call>',
      '{"name": "read_file", "arguments": {"path": "demo/app.js"}}',
      '</tool_call>'
    );
  }
  return lines.join('\n');
}

const activeTools = (planning) => TOOLS.filter((t) => planning || t.name !== 'update_plan');

const toolSchemas = (planning) =>
  activeTools(planning).map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));

// ---------- Local Qwen (llama.cpp) using the Qwen2.5 ChatML tool-call format ----------

export function buildQwenPrompt(messages, planning = true) {
  const tools = toolSchemas(planning).map((t) => JSON.stringify(t)).join('\n');
  const system = `${systemPrompt(planning)}

# Tools

You may call one or more functions to assist with the user query.

You are provided with function signatures within <tools></tools> XML tags:
<tools>
${tools}
</tools>

For each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:
<tool_call>
{"name": <function-name>, "arguments": <args-json-object>}
</tool_call>`;
  let out = `<|im_start|>system\n${system}<|im_end|>\n`;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === 'user') {
      out += `<|im_start|>user\n${m.content}<|im_end|>\n`;
    } else if (m.role === 'assistant') {
      let body = m.content || '';
      for (const c of m.toolCalls || []) {
        body += `${body ? '\n' : ''}<tool_call>\n${JSON.stringify({ name: c.name, arguments: c.arguments })}\n</tool_call>`;
      }
      out += `<|im_start|>assistant\n${body}<|im_end|>\n`;
    } else if (m.role === 'tool') {
      const prevIsTool = i > 0 && messages[i - 1].role === 'tool';
      const nextIsTool = i + 1 < messages.length && messages[i + 1].role === 'tool';
      if (!prevIsTool) out += '<|im_start|>user';
      out += `\n<tool_response>\n${m.content}\n</tool_response>`;
      if (!nextIsTool) out += '<|im_end|>\n';
    }
  }
  return `${out}<|im_start|>assistant\n`;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Small models sometimes add a trailing brace or comment; retry on the outermost object.
    const s = text.indexOf('{');
    const e2 = text.lastIndexOf('}');
    if (s !== -1 && e2 > s) {
      try {
        return JSON.parse(text.slice(s, e2 + 1));
      } catch (e3) {
        return null;
      }
    }
    return null;
  }
}

// Finds the first balanced {...} in text, ignoring braces inside JSON strings.
export function firstJsonObject(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === '\\') i++;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return { start, text: text.slice(start, i + 1) };
  }
  return null;
}

const normaliseCall = (obj) => {
  if (!obj || typeof obj !== 'object') return null;
  const name = obj.name || obj.function?.name;
  let args = obj.arguments ?? obj.parameters ?? obj.function?.arguments ?? {};
  if (typeof args === 'string') args = tryParseJson(args) || {};
  return typeof name === 'string' && toolByName(name) ? { name, arguments: args } : null;
};

// Returns { content, toolCalls, malformed } from raw model text.
export function parseToolCalls(raw) {
  const toolCalls = [];
  let malformed = false;
  const re = /<tool_call>([\s\S]*?)(<\/tool_call>|$)/g;
  let content = raw;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const call = normaliseCall(tryParseJson(m[1].trim()));
    if (call) toolCalls.push(call);
    else malformed = true;
  }
  if (raw.includes('<tool_call>')) {
    content = raw.slice(0, raw.indexOf('<tool_call>')).trim();
  } else {
    // Fallback: small models often write a bare JSON call (or several), maybe in a ```json fence.
    const obj = firstJsonObject(raw);
    const call = obj ? normaliseCall(tryParseJson(obj.text)) : null;
    if (call) {
      toolCalls.push(call);
      content = raw.slice(0, obj.start).replace(/```(?:json)?\s*$/, '').trim();
    }
  }
  return { content: content.trim(), toolCalls, malformed };
}

export function localBackend(QwenCoderModule) {
  return {
    label: 'On-device Qwen',
    async complete(messages, planning) {
      const result = await QwenCoderModule.complete(buildQwenPrompt(messages, planning), ['</tool_call>'], MAX_TOKENS_PER_TURN, 0.2);
      return { ...parseToolCalls(result.response), durationMs: result.durationMs };
    },
    async cancel() {
      await QwenCoderModule.cancel().catch(() => {});
    },
  };
}

// ---------- Ollama /api/chat with native tool calling ----------

export function toOllamaMessages(messages, planning = true) {
  const out = [{ role: 'system', content: systemPrompt(planning) }];
  for (const m of messages) {
    if (m.role === 'assistant') {
      out.push({
        role: 'assistant',
        content: m.content || '',
        ...(m.toolCalls?.length ? { tool_calls: m.toolCalls.map((c) => ({ function: { name: c.name, arguments: c.arguments } })) } : {}),
      });
    } else if (m.role === 'tool') {
      out.push({ role: 'tool', content: m.content, tool_name: m.name });
    } else {
      out.push({ role: 'user', content: m.content });
    }
  }
  return out;
}

export function ollamaBackend({ url, model }) {
  let controller = null;
  const base = url.replace(/\/+$/, '');
  return {
    label: `Ollama ${model}`,
    async complete(messages, planning) {
      controller = new AbortController();
      const start = Date.now();
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: toOllamaMessages(messages, planning),
          tools: toolSchemas(planning),
          stream: false,
          options: { temperature: 0.2, num_ctx: 8192 },
        }),
      });
      if (!res.ok) throw new Error(`Ollama returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      const msg = data.message || {};
      let toolCalls = (msg.tool_calls || []).map(normaliseCall).filter(Boolean);
      let content = msg.content || '';
      let malformed = (msg.tool_calls || []).length > toolCalls.length;
      if (!toolCalls.length && content) ({ content, toolCalls, malformed } = parseToolCalls(content));
      return { content: content.trim(), toolCalls, malformed, durationMs: Date.now() - start };
    },
    async cancel() {
      if (controller) controller.abort();
    },
  };
}

export async function checkOllama({ url, model }) {
  const res = await fetch(`${url.replace(/\/+$/, '')}/api/tags`);
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
  const data = await res.json();
  const names = (data.models || []).map((m) => m.name);
  if (!names.some((n) => n === model || n === `${model}:latest`)) {
    throw new Error(`Model "${model}" is not on that Ollama server. It has: ${names.join(', ') || 'none'}`);
  }
  return names;
}

// ---------- Agent loop: plan -> tool call -> observe -> ... -> verify -> summary ----------

// Keeps the latest messages that fit the budget, never starting on a tool result.
export function trimHistory(messages, budget = HISTORY_CHAR_BUDGET) {
  let total = 0;
  let start = messages.length;
  while (start > 0) {
    const m = messages[start - 1];
    const size = (m.content || '').length + JSON.stringify(m.toolCalls || []).length;
    if (total + size > budget && start < messages.length) break;
    total += size;
    start--;
  }
  while (start < messages.length && messages[start].role === 'tool') start++;
  const kept = messages.slice(start);
  let lastUser = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUser = i;
      break;
    }
  }
  return lastUser !== -1 && lastUser < start ? [messages[lastUser], ...kept] : kept;
}

const describeCall = (c) => {
  const a = c.arguments || {};
  return a.path ? `${c.name} ${a.path}` : a.query ? `${c.name} "${a.query}"` : c.name;
};

/**
 * history: prior conversation messages ({role, content, toolCalls?, name?}).
 * onEvent(event): UI updates. requestApproval(change) -> Promise<boolean>.
 * Returns the updated history.
 */
export async function runAgent({ backend, history, userText, onEvent, requestApproval, isCancelled, requireApproval = true, planning = true }) {
  const messages = [...history, { role: 'user', content: userText }];
  let lastCallKey = null;
  let plan = null;
  let nudges = 0;
  const changed = new Set();
  for (let step = 0; step <= MAX_TOOL_STEPS; step++) {
    if (isCancelled()) {
      onEvent({ type: 'stopped' });
      return messages;
    }
    onEvent({ type: 'thinking', step });
    const reply = await backend.complete(trimHistory(messages), planning);
    if (isCancelled()) {
      onEvent({ type: 'stopped' });
      return messages;
    }
    const calls = reply.toolCalls.slice(0, 1); // one action per turn keeps small models on track
    messages.push({ role: 'assistant', content: reply.content, toolCalls: calls });
    if (reply.content) onEvent({ type: 'assistant', text: reply.content, durationMs: reply.durationMs, final: !calls.length });

    if (!calls.length) {
      const prev = messages[messages.length - 2];
      if (!reply.content && prev?.role === 'tool' && prev.content.startsWith('Error:') && nudges < 3 && step < MAX_TOOL_STEPS) {
        nudges++;
        messages.push({ role: 'user', content: `The last tool call failed (${prev.content}). Fix the arguments and try again with one tool call.` });
        onEvent({ type: 'note', text: 'Tool call failed; asking the model to correct it.' });
        continue;
      }
      const next = plan && plan.find((p) => p.status !== 'done');
      if (next && nudges < 3 && step < MAX_TOOL_STEPS) {
        nudges++;
        messages.push({ role: 'user', content: `The plan is not finished. Next step: "${next.step}". Do it now with one tool call (for a code change use edit_file with old_text copied from the file). If it is already done, call update_plan to mark it done.` });
        onEvent({ type: 'note', text: `Plan not finished; asking the model to continue with "${next.step}".` });
        continue;
      }
      if (reply.malformed && step < MAX_TOOL_STEPS) {
        messages.push({ role: 'user', content: 'Your tool call was not valid JSON. Reply with exactly one <tool_call>{"name": ..., "arguments": {...}}</tool_call>.' });
        onEvent({ type: 'note', text: 'Model sent an invalid tool call; asking it to retry.' });
        continue;
      }
      if (!reply.content) {
        const text = changed.size
          ? `Done. Changed: ${[...changed].join(', ')}. (Summary written by the app; the model did not reply.)`
          : 'The model did not reply. Try rephrasing, or use the 7B model for multi-step tasks.';
        messages[messages.length - 1].content = text;
        onEvent({ type: 'assistant', text, durationMs: reply.durationMs, final: true });
      }
      return messages;
    }
    if (step === MAX_TOOL_STEPS) {
      onEvent({ type: 'note', text: `Stopped after ${MAX_TOOL_STEPS} tool steps. Send "continue" to keep going.` });
      messages.pop();
      return messages;
    }

    const call = calls[0];
    const tool = toolByName(call.name);
    const key = JSON.stringify(call);
    const id = `${Date.now()}-${step}`;
    onEvent({ type: 'tool_start', id, name: call.name, label: describeCall(call), args: call.arguments });
    let result;
    let ok = true;
    try {
      if (key === lastCallKey && !tool.write) {
        throw new Error(call.name === 'update_plan'
          ? 'The plan is unchanged. Do not call update_plan again until a step is finished; call read_file, edit_file or another tool for the current step.'
          : 'You just made this exact call. Use its result, or do the next step.');
      }
      if (tool.write) {
        const change = await tool.prepare(call.arguments || {});
        if (change.before === change.after) {
          throw new Error(`That would not change ${change.relative}. If the task is complete, reply with a short summary.`);
        }
        let approved = true;
        if (requireApproval) {
          approved = await requestApproval({ id, tool: call.name, path: change.relative, isNew: change.before === null, diff: diffLines(change.before, change.after) });
        }
        if (isCancelled()) {
          onEvent({ type: 'tool_end', id, ok: false, text: 'Stopped' });
          onEvent({ type: 'stopped' });
          return messages;
        }
        if (approved) changed.add(change.relative);
        result = approved ? await applyWrite(change) : { text: `The user rejected this change to ${change.relative}. Do not retry it; ask what they would like instead.` };
        ok = approved;
      } else {
        result = await tool.run(call.arguments || {});
      }
    } catch (e) {
      ok = false;
      result = { text: `Error: ${e.message}` };
    }
    lastCallKey = key;
    if (result.plan) {
      plan = result.plan;
      onEvent({ type: 'plan', plan });
    } else if (ok && plan) {
      // One tool action per plan step: advance the checklist so the model always sees the right next step.
      const i = plan.findIndex((p) => p.status !== 'done');
      if (i !== -1) {
        plan = plan.map((p, j) => (j === i ? { ...p, status: 'done' } : j === i + 1 ? { ...p, status: 'in_progress' } : p));
        const next = plan.find((p) => p.status !== 'done');
        result = { text: `${result.text}\n[Plan: "${plan[i].step}" done. ${next ? `Next: "${next.step}".` : 'All steps done; reply with a short summary.'}]` };
        onEvent({ type: 'plan', plan });
      }
    }
    onEvent({ type: 'tool_end', id, ok, text: result.text });
    messages.push({ role: 'tool', name: call.name, content: result.text });
  }
  return messages;
}
