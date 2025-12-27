#!/usr/bin/env node

/**
 * SubagentStop hook: Logs subagent invocations for debugging.
 * Writes to: .claude/logs/subagents.jsonl
 */

const fs = require('fs');
const path = require('path');

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const logFile = path.join(projectDir, '.claude', 'logs', 'subagents.jsonl');
const debugFile = path.join(projectDir, '.claude', 'logs', 'subagents-debug.txt');

// Ensure logs directory exists
const logDir = path.dirname(logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  // Always log raw input for debugging
  fs.appendFileSync(debugFile, `\n=== ${new Date().toISOString()} ===\n${input}\n`);

  try {
    const data = JSON.parse(input);

    // Extract subagent info from the event data
    const entry = {
      ts: new Date().toISOString(),
      agent: data.agent_id || data.subagent_name || data.subagent_type || data.agent_name || data.tool_input?.subagent_type || 'unknown',
      status: data.error ? 'error' : 'completed',
      error: data.error || null,
      session: data.session_id || null,
      transcript: data.agent_transcript_path || null
    };

    // Append to log file
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');

    // Log to stderr for visibility
    process.stderr.write(`[Subagent] ${entry.agent} - ${entry.status}\n`);

  } catch (e) {
    // Log parsing errors separately
    const errorEntry = {
      ts: new Date().toISOString(),
      agent: 'parse_error',
      status: 'error',
      error: e.message,
      input: input.substring(0, 200)
    };
    fs.appendFileSync(logFile, JSON.stringify(errorEntry) + '\n');
    process.stderr.write(`[Subagent] Parse error: ${e.message}\n`);
  }

  process.exit(0);
});
