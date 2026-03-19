import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigManager } from '../../src/config/index.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';

describe('Config Manager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  describe('getGlobalConfig', () => {
    it('should return default config initially', () => {
      const config = configManager.getGlobalConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should return a copy of config', () => {
      const config1 = configManager.getGlobalConfig();
      const config2 = configManager.getGlobalConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('getEvaluatorConfig', () => {
    it('should return evaluator config', () => {
      const config = configManager.getEvaluatorConfig();
      expect(config).toHaveProperty('min_signal_count');
      expect(config).toHaveProperty('min_source_sessions');
      expect(config).toHaveProperty('min_confidence');
    });
  });

  describe('getPatchConfig', () => {
    it('should return patch config', () => {
      const config = configManager.getPatchConfig();
      expect(config).toHaveProperty('allowed_types');
      expect(config).toHaveProperty('cooldown_hours');
      expect(config).toHaveProperty('max_patches_per_day');
    });
  });

  describe('getJournalConfig', () => {
    it('should return journal config', () => {
      const config = configManager.getJournalConfig();
      expect(config).toHaveProperty('snapshot_interval');
      expect(config).toHaveProperty('max_snapshots');
    });
  });

  describe('isSkillFrozen', () => {
    it('should return false when no project config', () => {
      const result = configManager.isSkillFrozen('test-skill');
      expect(result).toBe(false);
    });
  });

  describe('getAllowedPatchTypes', () => {
    it('should return default patch types when no project config', () => {
      const types = configManager.getAllowedPatchTypes('test-skill');
      expect(types).toEqual(DEFAULT_CONFIG.patch.allowed_types);
    });
  });
});