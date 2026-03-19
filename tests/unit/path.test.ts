import { describe, it, expect } from 'vitest';
import {
  expandHome,
  getSeaDir,
  getSkillsDir,
  getStateDir,
  getConfigDir,
  getShadowSkillPath,
  getShadowMetaPath,
  getShadowJournalPath,
  getSnapshotsDir,
  join,
} from '../../src/utils/path.js';
import { homedir } from 'node:os';

describe('Path Utils', () => {
  describe('expandHome', () => {
    it('should expand ~ to home directory', () => {
      const result = expandHome('~/test');
      expect(result).toBe(join(homedir(), 'test'));
    });

    it('should handle ~ alone', () => {
      const result = expandHome('~');
      expect(result).toBe(homedir());
    });

    it('should not modify paths without ~', () => {
      const result = expandHome('/absolute/path');
      expect(result).toBe('/absolute/path');
    });
  });

  describe('getSeaDir', () => {
    it('should return .sea directory path', () => {
      const result = getSeaDir('/project');
      expect(result).toBe('/project/.sea');
    });
  });

  describe('getSkillsDir', () => {
    it('should return .sea/skills directory path', () => {
      const result = getSkillsDir('/project');
      expect(result).toBe('/project/.sea/skills');
    });
  });

  describe('getStateDir', () => {
    it('should return .sea/state directory path', () => {
      const result = getStateDir('/project');
      expect(result).toBe('/project/.sea/state');
    });
  });

  describe('getConfigDir', () => {
    it('should return .sea/config directory path', () => {
      const result = getConfigDir('/project');
      expect(result).toBe('/project/.sea/config');
    });
  });

  describe('getShadowSkillPath', () => {
    it('should return shadow skill path', () => {
      const result = getShadowSkillPath('/project', 'my-skill');
      expect(result).toBe('/project/.sea/skills/my-skill/current.md');
    });
  });

  describe('getShadowMetaPath', () => {
    it('should return shadow meta path', () => {
      const result = getShadowMetaPath('/project', 'my-skill');
      expect(result).toBe('/project/.sea/skills/my-skill/meta.json');
    });
  });

  describe('getShadowJournalPath', () => {
    it('should return shadow journal path', () => {
      const result = getShadowJournalPath('/project', 'my-skill');
      expect(result).toBe('/project/.sea/skills/my-skill/journal.ndjson');
    });
  });

  describe('getSnapshotsDir', () => {
    it('should return snapshots directory path', () => {
      const result = getSnapshotsDir('/project', 'my-skill');
      expect(result).toBe('/project/.sea/skills/my-skill/snapshots');
    });
  });
});