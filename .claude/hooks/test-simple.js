#!/usr/bin/env node

/**
 * Simple test hook - just writes a timestamp to a file
 */

const fs = require('fs');
const path = require('path');

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const logFile = path.join(projectDir, '.claude', 'logs', 'hook-test.txt');

// Ensure logs directory exists
const logDir = path.dirname(logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Write a simple timestamp
const entry = `Hook executed at ${new Date().toISOString()}\n`;
fs.appendFileSync(logFile, entry);

// Also write to stderr so we can see it
process.stderr.write(`[HOOK TEST] ${entry}`);

process.exit(0);
