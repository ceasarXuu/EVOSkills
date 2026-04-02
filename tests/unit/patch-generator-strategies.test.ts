import { describe, it, expect } from 'vitest';
import { AddFallbackStrategy } from '../../src/core/patch-generator/strategies/add-fallback.js';
import { AppendContextStrategy } from '../../src/core/patch-generator/strategies/append-context.js';
import { PruneNoiseStrategy } from '../../src/core/patch-generator/strategies/prune-noise.js';
import { RewriteSectionStrategy } from '../../src/core/patch-generator/strategies/rewrite-section.js';
import { TightenTriggerStrategy } from '../../src/core/patch-generator/strategies/tighten-trigger.js';

describe('Patch Generator Strategies', () => {
  describe('AddFallbackStrategy', () => {
    const strategy = new AddFallbackStrategy();

    it('should generate patch with fallback content', () => {
      const content = '# Skill\n\n## Steps\n- Step 1\n- Step 2';
      const result = strategy.generate(content, { pattern: 'error', reason: 'handle errors' });
      expect(result.success).toBe(true);
      expect(result.newContent).toContain('Additional Fallback');
      expect(result.newContent).toContain('error');
    });

    it('should insert after existing fallback section', () => {
      const content = '# Skill\n\n## Fallback\n- existing fallback';
      const result = strategy.generate(content, { pattern: 'test', reason: 'test reason' });
      expect(result.success).toBe(true);
      expect(result.newContent).toContain('Additional Fallback');
    });

    it('should fail with empty pattern', () => {
      const result = strategy.generate('# Skill', { reason: 'test' });
      expect(result.success).toBe(false);
    });

    it('should fail with empty reason', () => {
      const result = strategy.generate('# Skill', { pattern: 'test' });
      expect(result.success).toBe(false);
    });

    it('should fail with empty content', () => {
      const result = strategy.generate('', { pattern: 'test', reason: 'test' });
      expect(result.success).toBe(false);
    });

    it('should escape special characters', () => {
      const content = '# Skill';
      const result = strategy.generate(content, { pattern: 'line\nwith"quotes', reason: 'test' });
      expect(result.success).toBe(true);
      expect(result.newContent).not.toContain('line\nwith');
    });
  });

  describe('AppendContextStrategy', () => {
    const strategy = new AppendContextStrategy();

    it('should append context at end of file', () => {
      const content = '# Skill\n\n## Steps\n- Step 1';
      const result = strategy.generate(content, { pattern: 'error', reason: 'handle errors' });
      expect(result.success).toBe(true);
      expect(result.newContent).toContain('## Context');
      expect(result.newContent).toContain('error');
    });

    it('should insert into existing Context section', () => {
      const content = '# Skill\n\n## Context\n- existing';
      const result = strategy.generate(content, { pattern: 'test', reason: 'test' });
      expect(result.success).toBe(true);
      expect(result.newContent).toContain('test');
    });

    it('should insert after Examples section', () => {
      const content = '# Skill\n\n## Examples\n- example 1\n\n## Other';
      const result = strategy.generate(content, { pattern: 'test', reason: 'test' });
      expect(result.success).toBe(true);
    });

    it('should fail without pattern', () => {
      const result = strategy.generate('# Skill', { reason: 'test' });
      expect(result.success).toBe(false);
    });
  });

  describe('PruneNoiseStrategy', () => {
    const strategy = new PruneNoiseStrategy();

    it('should remove noisy lines', () => {
      const content = '# Skill\n\n## Steps\n- Step 1\n- TODO: fix this\n- Step 2';
      const result = strategy.generate(content, { section: 'Steps', reason: 'remove noise' });
      expect(result.success).toBe(true);
    });

    it('should fail without section', () => {
      const result = strategy.generate('# Skill', { reason: 'test' });
      expect(result.success).toBe(false);
    });

    it('should fail with empty content', () => {
      const result = strategy.generate('', { section: 'Steps', reason: 'test' });
      expect(result.success).toBe(false);
    });
  });

  describe('RewriteSectionStrategy', () => {
    const strategy = new RewriteSectionStrategy();

    it('should rewrite a section', () => {
      const content = '# Skill\n\n## Steps\n- old step\n\n## Other\n- other';
      const result = strategy.generate(content, {
        section: 'Steps',
        pattern: 'old',
        reason: 'update',
      });
      expect(result.success).toBe(true);
    });

    it('should fail without pattern', () => {
      const result = strategy.generate('# Skill', { reason: 'test' });
      expect(result.success).toBe(false);
    });

    it('should fail with empty content', () => {
      const result = strategy.generate('', { section: 'Steps', pattern: 'test', reason: 'test' });
      expect(result.success).toBe(false);
    });
  });

  describe('TightenTriggerStrategy', () => {
    const strategy = new TightenTriggerStrategy();

    it('should tighten trigger section', () => {
      const content = '# Skill\n\n## Trigger\n- when user asks for help\n\n## Steps\n- step 1';
      const result = strategy.generate(content, { pattern: 'help', reason: 'tighten' });
      expect(result.success).toBe(true);
    });

    it('should fail without pattern', () => {
      const result = strategy.generate('# Skill', { reason: 'test' });
      expect(result.success).toBe(false);
    });

    it('should fail with empty content', () => {
      const result = strategy.generate('', { pattern: 'help', reason: 'test' });
      expect(result.success).toBe(false);
    });
  });
});
