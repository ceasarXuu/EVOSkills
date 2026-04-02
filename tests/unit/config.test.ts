import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { ConfigManager } from '../../src/config/index.js';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  describe('getGlobalConfig', () => {
    it('should return default config initially', () => {
      const config = configManager.getGlobalConfig();
      expect(config).toHaveProperty('evaluator');
      expect(config).toHaveProperty('patch');
      expect(config).toHaveProperty('journal');
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
      expect(configManager.isSkillFrozen('test-skill')).toBe(false);
    });
  });

  describe('getAllowedPatchTypes', () => {
    it('should return default patch types when no project config', () => {
      const types = configManager.getAllowedPatchTypes('test-skill');
      expect(types).toBeDefined();
      expect(Array.isArray(types)).toBe(true);
    });
  });
});

describe('Config File Operations', () => {
  const testProjectPath = join(tmpdir(), 'ornn-config-file-test-' + Date.now());

  beforeEach(() => {
    mkdirSync(testProjectPath, { recursive: true });
    mkdirSync(join(testProjectPath, '.ornn', 'config'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  it('should write and list providers', async () => {
    const { writeConfig, listConfiguredProviders } = await import('../../src/config/manager.js');
    const config = {
      provider: 'deepseek',
      modelName: 'deepseek-chat',
      apiKeyEnvVar: 'ORNN_DEEPSEEK_API_KEY',
    };
    await writeConfig(testProjectPath, config, true);

    const providers = await listConfiguredProviders(testProjectPath);
    expect(providers.length).toBe(1);
    expect(providers[0].provider).toBe('deepseek');
  });

  it('should return empty list when no config', async () => {
    const { listConfiguredProviders } = await import('../../src/config/manager.js');
    const providers = await listConfiguredProviders(testProjectPath);
    expect(providers).toEqual([]);
  });

  it('should get and set default provider', async () => {
    const { writeConfig, getDefaultProvider, setDefaultProvider, listConfiguredProviders } =
      await import('../../src/config/manager.js');
    const config1 = { provider: 'openai', modelName: 'gpt-4', apiKeyEnvVar: 'ORNN_OPENAI_API_KEY' };
    const config2 = {
      provider: 'deepseek',
      modelName: 'deepseek-chat',
      apiKeyEnvVar: 'ORNN_DEEPSEEK_API_KEY',
    };
    await writeConfig(testProjectPath, config1, true);
    await writeConfig(testProjectPath, config2, false);

    const defaultProvider = await getDefaultProvider(testProjectPath);
    expect(defaultProvider).toBe('openai');

    await setDefaultProvider(testProjectPath, 'deepseek');
    const newDefault = await getDefaultProvider(testProjectPath);
    expect(newDefault).toBe('deepseek');

    const providers = await listConfiguredProviders(testProjectPath);
    expect(providers.length).toBe(2);
  });

  it('should write env file', async () => {
    const { writeEnvFile } = await import('../../src/config/manager.js');
    await writeEnvFile(testProjectPath, 'deepseek', 'sk-test-key-123');
    const envPath = join(testProjectPath, '.env.local');
    const content = readFileSync(envPath, 'utf-8');
    expect(content).toContain('ORNN_DEEPSEEK_API_KEY=sk-test-key-123');
  });

  it('should append to existing env file', async () => {
    const { writeEnvFile } = await import('../../src/config/manager.js');
    await writeEnvFile(testProjectPath, 'deepseek', 'sk-key-1');
    await writeEnvFile(testProjectPath, 'openai', 'sk-key-2');
    const envPath = join(testProjectPath, '.env.local');
    const content = readFileSync(envPath, 'utf-8');
    expect(content).toContain('ORNN_DEEPSEEK_API_KEY=sk-key-1');
    expect(content).toContain('ORNN_OPENAI_API_KEY=sk-key-2');
  });
});
