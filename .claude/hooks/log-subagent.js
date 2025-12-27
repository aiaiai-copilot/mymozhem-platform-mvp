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

    // Try to find subagent_type by looking at recent Task tool calls in tools-debug.txt
    let subagentType = 'unknown';
    const toolsDebugFile = path.join(projectDir, '.claude', 'logs', 'tools-debug.txt');

    try {
      if (fs.existsSync(toolsDebugFile)) {
        const toolsLog = fs.readFileSync(toolsDebugFile, 'utf8');
        // Look for Task tool calls in the same session
        const taskCalls = toolsLog.split('\n===').filter(entry =>
          entry.includes(data.session_id) &&
          entry.includes('"tool_name":"Task"') &&
          entry.includes('subagent_type')
        );

        // Get the most recent Task call
        if (taskCalls.length > 0) {
          const lastCall = taskCalls[taskCalls.length - 1];
          const match = lastCall.match(/"subagent_type":"([^"]+)"/);
          if (match) {
            subagentType = match[1];
          }
        }
      }
    } catch (e) {
      // Silently fail - we'll use agent_id as fallback
    }

    // Extract subagent info from the event data
    const entry = {
      ts: new Date().toISOString(),
      agent: subagentType !== 'unknown' ? subagentType : data.agent_id,
      agent_id: data.agent_id,
      status: data.error ? 'error' : 'completed',
      error: data.error || null,
      session: data.session_id || null,
      transcript: data.agent_transcript_path || null
    };

    // Append to log file
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');

    // Log to stderr for visibility
    process.stderr.write(`[Subagent] ${entry.agent} (${entry.agent_id}) - ${entry.status}\n`);

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
