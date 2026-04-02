/**
 * CLI Commands Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { createShadowRegistry } from '../../../src/core/shadow-registry/index.js';
import { createJournalManager } from '../../../src/core/journal/index.js';

describe('CLI Commands', () => {
  const testProjectPath = join(tmpdir(), 'ornn-cli-test-' + Date.now());

  beforeEach(() => {
    mkdirSync(testProjectPath, { recursive: true });
    mkdirSync(join(testProjectPath, '.ornn', 'skills'), { recursive: true });
    mkdirSync(join(testProjectPath, '.ornn', 'state'), { recursive: true });
    mkdirSync(join(testProjectPath, '.ornn', 'shadows'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  describe('Shadow Registry CLI Operations', () => {
    it('should create and list shadows', () => {
      const registry = createShadowRegistry(testProjectPath);
      registry.init();

      const content = '# Test Skill\n\nThis is a test skill.';
      registry.create('test-skill', content, 'codex');

      const shadows = registry.list();
      expect(shadows.length).toBe(1);
      expect(shadows[0].skillId).toBe('test-skill');
    });

    it('should get shadow by skill ID', () => {
      const registry = createShadowRegistry(testProjectPath);
      registry.init();

      const content = '# Test Skill\n\nContent';
      registry.create('my-skill', content, 'codex');

      const shadow = registry.get('my-skill');
      expect(shadow).toBeDefined();
      expect(shadow?.skillId).toBe('my-skill');
    });

    it('should update shadow status', () => {
      const registry = createShadowRegistry(testProjectPath);
      registry.init();

      registry.create('test-skill', '# Test', 'codex');
      registry.updateStatus('test-skill', 'frozen');

      const shadow = registry.get('test-skill');
      expect(shadow?.status).toBe('frozen');
    });

    it('should delete shadow', () => {
      const registry = createShadowRegistry(testProjectPath);
      registry.init();

      registry.create('test-skill', '# Test', 'codex');
      expect(registry.list().length).toBe(1);

      registry.delete('test-skill');
      expect(registry.list().length).toBe(0);
    });

    it('should read shadow content', () => {
      const registry = createShadowRegistry(testProjectPath);
      registry.init();

      const content = '# Original Content';
      registry.create('test-skill', content, 'codex');

      const readContent = registry.readContent('test-skill');
      expect(readContent).toBe(content);
    });

    it('should handle non-existent skill gracefully', () => {
      const registry = createShadowRegistry(testProjectPath);
      registry.init();

      expect(registry.get('non-existent')).toBeUndefined();
      expect(registry.readContent('non-existent')).toBeUndefined();
    });
  });

  describe('Journal Manager CLI Operations', () => {
    it('should initialize without errors', () => {
      const journal = createJournalManager(testProjectPath);
      expect(() => journal.init()).not.toThrow();
    });

    it('should return 0 revision for new shadow', () => {
      const journal = createJournalManager(testProjectPath);
      journal.init();

      const shadowId = 'test-skill@' + testProjectPath;
      const revision = journal.getLatestRevision(shadowId);
      expect(revision).toBe(0);
    });

    it('should return empty snapshots for new shadow', () => {
      const journal = createJournalManager(testProjectPath);
      journal.init();

      const shadowId = 'test-skill@' + testProjectPath;
      const snapshots = journal.getSnapshots(shadowId);
      expect(snapshots).toEqual([]);
    });
  });

  describe('Status Command Logic', () => {
    it('should format shadow status correctly', () => {
      const registry = createShadowRegistry(testProjectPath);
      registry.init();

      registry.create('code-review', '# Code Review Skill', 'codex');
      registry.updateStatus('code-review', 'active');

      const shadow = registry.get('code-review');
      expect(shadow?.status).toBe('active');
      expect(shadow?.skillId).toBe('code-review');
    });

    it('should handle empty project', () => {
      const registry = createShadowRegistry(testProjectPath);
      registry.init();

      const shadows = registry.list();
      expect(shadows.length).toBe(0);
    });
  });

  describe('Diff Command Logic', () => {
    it('should detect content differences', () => {
      const registry = createShadowRegistry(testProjectPath);
      registry.init();

      const original = '# Skill\n\n## Section 1\nContent 1';
      const modified = '# Skill\n\n## Section 1\nModified Content';

      registry.create('test-skill', original, 'codex');
      registry.updateContent('test-skill', modified);

      const current = registry.readContent('test-skill');
      expect(current).toBe(modified);
      expect(current).not.toBe(original);
    });
  });

  describe('Sync Command Logic', () => {
    it('should sync shadow to origin path', () => {
      const registry = createShadowRegistry(testProjectPath);
      registry.init();

      const content = '# Synced Skill';
      registry.create('test-skill', content, 'codex');

      const originDir = join(testProjectPath, '.ornn', 'origin-skills');
      mkdirSync(originDir, { recursive: true });
      const originPath = join(originDir, 'test-skill.md');
      writeFileSync(originPath, '# Original');

      // Simulate sync: copy shadow content to origin
      const shadowContent = registry.readContent('test-skill');
      writeFileSync(originPath, shadowContent || '');

      const syncedContent = readFileSync(originPath, 'utf-8');
      expect(syncedContent).toBe(content);
    });
  });
});
