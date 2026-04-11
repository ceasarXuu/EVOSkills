import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CodexObserver } from '../../src/core/observer/codex-observer.js';

describe('CodexObserver', () => {
  const testDir = join(tmpdir(), 'ornn-codex-observer-' + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should attach skill refs for exec_command reading a skill file', () => {
    const observer = new CodexObserver('/tmp/codex-sessions');

    const preprocessed = (observer as any).preprocessResponseItem('session-1', 'turn-1', {
      timestamp: '2026-04-08T10:00:00.000Z',
      type: 'response_item',
      payload: {
        type: 'function_call',
        name: 'functions.exec_command',
        arguments: JSON.stringify({
          cmd: 'cat /Users/xuzhang/.agents/skills/show-my-repo/SKILL.md',
        }),
      },
    });

    expect(preprocessed).toMatchObject({
      eventType: 'tool_call',
      skillRefs: ['show-my-repo'],
    });
  });

  it('bootstraps recently updated session files on startup', () => {
    const sessionsDir = join(testDir, 'sessions');
    mkdirSync(join(sessionsDir, '2026', '04', '12'), { recursive: true });
    const recentPath = join(sessionsDir, '2026', '04', '12', 'recent.jsonl');
    const olderPath = join(sessionsDir, '2026', '04', '12', 'older.jsonl');
    writeFileSync(recentPath, '{"timestamp":"2026-04-12T02:00:00.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"recent"}]}}\n', 'utf-8');
    writeFileSync(olderPath, '{"timestamp":"2026-04-11T02:00:00.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"older"}]}}\n', 'utf-8');
    utimesSync(olderPath, new Date('2026-04-11T02:00:00.000Z'), new Date('2026-04-11T02:00:00.000Z'));
    utimesSync(recentPath, new Date('2026-04-12T02:00:00.000Z'), new Date('2026-04-12T02:00:00.000Z'));

    const observer = new CodexObserver(sessionsDir);
    const processed: string[] = [];

    (observer as any).processSessionFileInternal = (filePath: string) => {
      processed.push(filePath);
    };

    (observer as any).bootstrapRecentSessionFiles(1);

    expect(processed).toEqual([recentPath]);
    expect((observer as any).processedFiles.has(recentPath)).toBe(true);
    expect((observer as any).processedFiles.has(olderPath)).toBe(false);
  });
});
