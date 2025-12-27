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

    // Try to find subagent_type from the mapping file
    let subagentType = 'unknown';
    const mapFile = path.join(projectDir, '.claude', 'logs', 'subagent-map.jsonl');
    const usedMapFile = path.join(projectDir, '.claude', 'logs', 'subagent-map-used.jsonl');

    try {
      if (fs.existsSync(mapFile)) {
        const mapData = fs.readFileSync(mapFile, 'utf8');
        const mappings = mapData.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));

        // Load used mappings
        const usedMappings = new Set();
        if (fs.existsSync(usedMapFile)) {
          const usedData = fs.readFileSync(usedMapFile, 'utf8');
          usedData.trim().split('\n').filter(Boolean).forEach(line => {
            usedMappings.add(line);
          });
        }

        if (mappings.length > 0) {
          let matched = false;
          let matchedMapping = null;
          let promptFromTranscript = null;

          // Read transcript to get session and prompt
          if (data.agent_transcript_path && fs.existsSync(data.agent_transcript_path)) {
            try {
              const transcriptContent = fs.readFileSync(data.agent_transcript_path, 'utf8');
              const lines = transcriptContent.split('\n').filter(Boolean);

              if (lines.length > 0) {
                const firstLine = JSON.parse(lines[0]);
                const sessionId = firstLine.sessionId;

                // Try to find the prompt in transcript (usually in first few lines)
                for (let i = 0; i < Math.min(lines.length, 5); i++) {
                  try {
                    const line = JSON.parse(lines[i]);
                    if (line.message?.role === 'user' && line.message?.content) {
                      promptFromTranscript = line.message.content;
                      break;
                    }
                  } catch (e) {
                    continue;
                  }
                }

                // Strategy 1: Match by prompt content (most reliable for parallel agents)
                if (promptFromTranscript) {
                  for (const mapping of mappings) {
                    const mapKey = `${mapping.tool_use_id}:${mapping.subagent_type}`;
                    if (!usedMappings.has(mapKey) &&
                        mapping.session_id === sessionId &&
                        promptFromTranscript.includes(mapping.description)) {
                      subagentType = mapping.subagent_type;
                      matchedMapping = mapKey;
                      matched = true;
                      break;
                    }
                  }
                }

                // Strategy 2: Match by session + first unused of each type
                if (!matched) {
                  for (const mapping of mappings) {
                    const mapKey = `${mapping.tool_use_id}:${mapping.subagent_type}`;
                    if (!usedMappings.has(mapKey) && mapping.session_id === sessionId) {
                      subagentType = mapping.subagent_type;
                      matchedMapping = mapKey;
                      matched = true;
                      break;
                    }
                  }
                }
              }
            } catch (e) {
              // Transcript parsing failed
            }
          }

          // Strategy 3: Fallback to first unused mapping
          if (!matched) {
            for (const mapping of mappings) {
              const mapKey = `${mapping.tool_use_id}:${mapping.subagent_type}`;
              if (!usedMappings.has(mapKey)) {
                subagentType = mapping.subagent_type;
                matchedMapping = mapKey;
                break;
              }
            }
          }

          // Mark this mapping as used
          if (matchedMapping) {
            fs.appendFileSync(usedMapFile, matchedMapping + '\n');
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
