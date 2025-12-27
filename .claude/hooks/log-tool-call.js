#!/usr/bin/env node

/**
 * PreToolUse hook: Logs all tool calls for debugging.
 * Writes to: .claude/logs/tools.jsonl
 */

const fs = require('fs');
const path = require('path');

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const logFile = path.join(projectDir, '.claude', 'logs', 'tools.jsonl');
const debugFile = path.join(projectDir, '.claude', 'logs', 'tools-debug.txt');

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

    const entry = {
      ts: new Date().toISOString(),
      tool: data.tool_name || data.name || 'unknown',
      input: data.tool_input ? Object.keys(data.tool_input) : [],
      session: data.session_id || null
    };

    // Append to log file
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');

    // Log to stderr for visibility
    process.stderr.write(`[Tool] ${entry.tool}\n`);

  } catch (e) {
    // Log parsing errors
    const errorEntry = {
      ts: new Date().toISOString(),
      tool: 'parse_error',
      error: e.message,
      input: input.substring(0, 100)
    };
    fs.appendFileSync(logFile, JSON.stringify(errorEntry) + '\n');
    process.stderr.write(`[Tool] Parse error: ${e.message}\n`);
  }

  process.exit(0);
});
