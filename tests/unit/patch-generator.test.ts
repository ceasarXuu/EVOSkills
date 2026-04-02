import { describe, it, expect } from 'vitest';
import { PatchGenerator } from '../../src/core/patch-generator/index.js';

describe('PatchGenerator', () => {
  describe('constructor', () => {
    it('should initialize with default strategies', () => {
      const generator = new PatchGenerator();
      const strategies = generator.getStrategies();
      expect(strategies.length).toBeGreaterThan(0);
    });
  });

  describe('getStrategies', () => {
    it('should return strategy instances', () => {
      const generator = new PatchGenerator();
      const strategies = generator.getStrategies();
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBe(5);
    });
  });

  describe('getAllStrategyConfigs', () => {
    it('should return strategy configurations', () => {
      const generator = new PatchGenerator();
      const configs = generator.getAllStrategyConfigs();
      expect(configs.size).toBe(5);
    });
  });

  describe('getStrategyConfig', () => {
    it('should return config for known strategy', () => {
      const generator = new PatchGenerator();
      const config = generator.getStrategyConfig('add-fallback');
      expect(config).toBeDefined();
      expect(config?.enabled).toBe(true);
    });

    it('should return undefined for unknown strategy', () => {
      const generator = new PatchGenerator();
      const config = generator.getStrategyConfig('unknown');
      expect(config).toBeUndefined();
    });
  });

  describe('updateStrategyConfig', () => {
    it('should update existing strategy config', () => {
      const generator = new PatchGenerator();
      generator.updateStrategyConfig('add-fallback', { enabled: false });
      const config = generator.getStrategyConfig('add-fallback');
      expect(config?.enabled).toBe(false);
    });

    it('should not create config for unknown strategy', () => {
      const generator = new PatchGenerator();
      generator.updateStrategyConfig('unknown', { enabled: false });
      const config = generator.getStrategyConfig('unknown');
      expect(config).toBeUndefined();
    });
  });

  describe('supportsChangeType', () => {
    it('should return true for supported change types', () => {
      const generator = new PatchGenerator();
      expect(generator.supportsChangeType('add_fallback')).toBe(true);
      expect(generator.supportsChangeType('prune_noise')).toBe(true);
      expect(generator.supportsChangeType('append_context')).toBe(true);
    });

    it('should return false for unsupported change types', () => {
      const generator = new PatchGenerator();
      expect(generator.supportsChangeType('unknown' as any)).toBe(false);
    });
  });

  describe('generate', () => {
    it('should return failure for unknown change type', async () => {
      const generator = new PatchGenerator();
      const result = await generator.generate('unknown' as any, '# Skill', {});
      expect(result.success).toBe(false);
    });

    it('should generate patch with add-fallback strategy', async () => {
      const generator = new PatchGenerator();
      const result = await generator.generate('add_fallback', '# Skill\n\n## Steps\n- Step 1', {
        pattern: 'error',
        reason: 'handle errors',
      });
      expect(result.success).toBe(true);
    });

    it('should generate patch with prune-noise strategy', async () => {
      const generator = new PatchGenerator();
      const result = await generator.generate('prune_noise', '# Skill\n\n## TODO\n- Remove this', {
        section: 'TODO',
      });
      expect(result.success).toBe(true);
    });

    it('should generate patch with append-context strategy', async () => {
      const generator = new PatchGenerator();
      const result = await generator.generate('append_context', '# Skill\n\n## Steps\n- Step 1', {
        pattern: 'error',
        reason: 'context',
      });
      expect(result.success).toBe(true);
    });

    it('should generate patch with tighten-trigger strategy', async () => {
      const generator = new PatchGenerator();
      const result = await generator.generate(
        'tighten_trigger',
        '# Skill\n\n## Trigger\n- when user asks',
        {
          pattern: 'user',
          reason: 'tighten',
        }
      );
      expect(result.success).toBe(true);
    });

    it('should generate patch with rewrite-section strategy', async () => {
      const generator = new PatchGenerator();
      const result = await generator.generate(
        'rewrite_section',
        '# Skill\n\n## Steps\n- old step',
        {
          pattern: 'old',
          section: 'Steps',
          reason: 'rewrite',
        }
      );
      expect(result.success).toBe(false);
    });
  });
});
