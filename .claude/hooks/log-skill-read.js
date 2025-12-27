#!/usr/bin/env node

/**
 * PreToolUse[Read] hook: Logs when skill files are read.
 * Writes to: .claude/logs/skills.jsonl
 */

const fs = require('fs');
const path = require('path');

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const logFile = path.join(projectDir, '.claude', 'logs', 'skills.jsonl');
const debugFile = path.join(projectDir, '.claude', 'logs', 'skills-debug.txt');

// Ensure logs directory exists
const logDir = path.dirname(logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Check if this is a skill file being read
    const filePath = data.tool_input?.file_path || data.file_path || '';

    // Match skill files: .claude/skills/*/skill.md or .claude/commands/*.md
    const skillMatch = filePath.match(/\.claude[\\/](skills|commands)[\\/]([^\\/]+)/);

    if (skillMatch) {
      const entry = {
        ts: new Date().toISOString(),
        type: skillMatch[1], // 'skills' or 'commands'
        name: skillMatch[2].replace('.md', ''),
        path: filePath
      };

      // Append to log file
      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');

      // Log to stderr for visibility
      process.stderr.write(`[Skill Read] ${entry.type}/${entry.name}\n`);

      // Log to debug file
      fs.appendFileSync(debugFile, `\n=== ${new Date().toISOString()} ===\nSkill: ${entry.type}/${entry.name}\nPath: ${filePath}\n`);
    }

  } catch (e) {
    // Log errors to debug file
    fs.appendFileSync(debugFile, `\n=== ${new Date().toISOString()} ===\nError: ${e.message}\nInput: ${input.substring(0, 200)}\n`);
  }

  process.exit(0);
});
