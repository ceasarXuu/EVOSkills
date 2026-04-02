import { describe, it, expect } from 'vitest';
import {
  parseAnalysisOutput,
  hasHighConfidence,
  getHighPrioritySuggestions,
  formatAnalysisResult,
  extractChangesSummary,
} from '../../src/core/analyzer/output-parser.js';

describe('Output Parser', () => {
  describe('parseAnalysisOutput', () => {
    it('should parse valid JSON response', () => {
      const response = JSON.stringify({
        analysis: { summary: 'Good skill', strengths: ['clear'], weaknesses: ['missing examples'], missingScenarios: [], userPainPoints: [] },
        suggestions: [],
        improvedSkill: '# Improved Skill',
        confidence: 0.8,
      });
      const result = parseAnalysisOutput(response);
      if ('error' in result) throw new Error('Expected success, got error: ' + result.error);
      expect(result.analysis.summary).toBe('Good skill');
      expect(result.confidence).toBe(0.8);
    });

    it('should parse JSON in code blocks', () => {
      const response = '```json\n{"analysis":{"summary":"test","strengths":[],"weaknesses":[],"missingScenarios":[],"userPainPoints":[]},"suggestions":[],"improvedSkill":"# Skill","confidence":0.5}\n```';
      const result = parseAnalysisOutput(response);
      if ('error' in result) throw new Error('Expected success, got error: ' + result.error);
      expect(result.analysis.summary).toBe('test');
    });

    it('should return error for non-JSON response', () => {
      const result = parseAnalysisOutput('This is not JSON');
      if (!('error' in result)) throw new Error('Expected error');
      expect(result.error).toContain('No JSON found');
    });

    it('should return error for missing analysis field', () => {
      const response = JSON.stringify({ improvedSkill: '# Skill', suggestions: [] });
      const result = parseAnalysisOutput(response);
      if (!('error' in result)) throw new Error('Expected error');
      expect(result.error).toContain('analysis');
    });

    it('should return error for missing improvedSkill field', () => {
      const response = JSON.stringify({
        analysis: { summary: 'test', strengths: [], weaknesses: [], missingScenarios: [], userPainPoints: [] },
        suggestions: [],
      });
      const result = parseAnalysisOutput(response);
      if (!('error' in result)) throw new Error('Expected error');
      expect(result.error).toContain('improvedSkill');
    });

    it('should default confidence to 0.5 when not provided', () => {
      const response = JSON.stringify({
        analysis: { summary: 'test', strengths: [], weaknesses: [], missingScenarios: [], userPainPoints: [] },
        suggestions: [],
        improvedSkill: '# Skill',
      });
      const result = parseAnalysisOutput(response);
      if ('error' in result) throw new Error('Expected success, got error: ' + result.error);
      expect(result.confidence).toBe(0.5);
    });

    it('should handle empty suggestions array', () => {
      const response = JSON.stringify({
        analysis: { summary: 'test', strengths: [], weaknesses: [], missingScenarios: [], userPainPoints: [] },
        suggestions: [],
        improvedSkill: '# Skill',
        confidence: 0.9,
      });
      const result = parseAnalysisOutput(response);
      if ('error' in result) throw new Error('Expected success, got error: ' + result.error);
      expect(result.suggestions).toEqual([]);
    });

    it('should handle suggestions with all fields', () => {
      const response = JSON.stringify({
        analysis: { summary: 'test', strengths: [], weaknesses: [], missingScenarios: [], userPainPoints: [] },
        suggestions: [{ type: 'add', section: 'Steps', description: 'Add step', rationale: 'Why', priority: 'high' }],
        improvedSkill: '# Skill',
        confidence: 0.7,
      });
      const result = parseAnalysisOutput(response);
      if ('error' in result) throw new Error('Expected success, got error: ' + result.error);
      expect(result.suggestions.length).toBe(1);
      expect(result.suggestions[0].type).toBe('add');
    });

    it('should return error for invalid suggestion type', () => {
      const response = JSON.stringify({
        analysis: { summary: 'test', strengths: [], weaknesses: [], missingScenarios: [], userPainPoints: [] },
        suggestions: [{ type: 'invalid', section: 'Steps', description: 'Add step', rationale: 'Why', priority: 'high' }],
        improvedSkill: '# Skill',
        confidence: 0.7,
      });
      const result = parseAnalysisOutput(response);
      if (!('error' in result)) throw new Error('Expected error');
      expect(result.error).toContain('type');
    });

    it('should return error for invalid suggestion priority', () => {
      const response = JSON.stringify({
        analysis: { summary: 'test', strengths: [], weaknesses: [], missingScenarios: [], userPainPoints: [] },
        suggestions: [{ type: 'add', section: 'Steps', description: 'Add step', rationale: 'Why', priority: 'urgent' }],
        improvedSkill: '# Skill',
        confidence: 0.7,
      });
      const result = parseAnalysisOutput(response);
      if (!('error' in result)) throw new Error('Expected error');
      expect(result.error).toContain('priority');
    });

    it('should include rawResponse in error result', () => {
      const response = 'invalid';
      const result = parseAnalysisOutput(response);
      if (!('error' in result)) throw new Error('Expected error');
      expect(result.rawResponse).toBe(response);
    });

    it('should include rawResponse in success result', () => {
      const response = JSON.stringify({
        analysis: { summary: 'test', strengths: [], weaknesses: [], missingScenarios: [], userPainPoints: [] },
        suggestions: [],
        improvedSkill: '# Skill',
        confidence: 0.5,
      });
      const result = parseAnalysisOutput(response);
      if ('error' in result) throw new Error('Expected success, got error: ' + result.error);
      expect(result.rawResponse).toBe(response);
    });
  });

  describe('hasHighConfidence', () => {
    it('should return true for high confidence', () => {
      const response = JSON.stringify({
        analysis: { summary: 'test', strengths: [], weaknesses: [], missingScenarios: [], userPainPoints: [] },
        suggestions: [],
        improvedSkill: '# Skill',
        confidence: 0.8,
      });
      const result = parseAnalysisOutput(response);
      if ('error' in result) throw new Error('Expected success');
      expect(hasHighConfidence(result)).toBe(true);
    });

    it('should return false for low confidence', () => {
      const response = JSON.stringify({
        analysis: { summary: 'test', strengths: [], weaknesses: [], missingScenarios: [], userPainPoints: [] },
        suggestions: [],
        improvedSkill: '# Skill',
        confidence: 0.3,
      });
      const result = parseAnalysisOutput(response);
      if ('error' in result) throw new Error('Expected success');
      expect(hasHighConfidence(result)).toBe(false);
    });

    it('should respect custom threshold', () => {
      const response = JSON.stringify({
        analysis: { summary: 'test', strengths: [], weaknesses: [], missingScenarios: [], userPainPoints: [] },
        suggestions: [],
        improvedSkill: '# Skill',
        confidence: 0.6,
      });
      const result = parseAnalysisOutput(response);
      if ('error' in result) throw new Error('Expected success');
      expect(hasHighConfidence(result, 0.5)).toBe(true);
      expect(hasHighConfidence(result, 0.7)).toBe(false);
    });
  });

  describe('getHighPrioritySuggestions', () => {
    it('should return only high priority suggestions', () => {
      const response = JSON.stringify({
        analysis: { summary: 'test', strengths: [], weaknesses: [], missingScenarios: [], userPainPoints: [] },
        suggestions: [
          { type: 'add', section: 'Steps', description: 'd1', rationale: 'r1', priority: 'high' },
          { type: 'add', section: 'Steps', description: 'd2', rationale: 'r2', priority: 'low' },
        ],
        improvedSkill: '# Skill',
        confidence: 0.5,
      });
      const result = parseAnalysisOutput(response);
      if ('error' in result) throw new Error('Expected success');
      const high = getHighPrioritySuggestions(result);
      expect(high.length).toBe(1);
      expect(high[0].priority).toBe('high');
    });
  });

  describe('formatAnalysisResult', () => {
    it('should format result as string', () => {
      const response = JSON.stringify({
        analysis: { summary: 'test summary', strengths: ['s1'], weaknesses: ['w1'], missingScenarios: [], userPainPoints: [] },
        suggestions: [{ type: 'add', section: 'Steps', description: 'desc', rationale: 'rat', priority: 'high' }],
        improvedSkill: '# Skill',
        confidence: 0.8,
      });
      const result = parseAnalysisOutput(response);
      if ('error' in result) throw new Error('Expected success');
      const formatted = formatAnalysisResult(result);
      expect(formatted).toContain('test summary');
      expect(formatted).toContain('s1');
      expect(formatted).toContain('w1');
      expect(formatted).toContain('80%');
    });
  });

  describe('extractChangesSummary', () => {
    it('should extract changes summary', () => {
      const response = JSON.stringify({
        analysis: { summary: 'test', strengths: [], weaknesses: [], missingScenarios: [], userPainPoints: [] },
        suggestions: [
          { type: 'add', section: 'Steps', description: 'desc1', rationale: 'rat1', priority: 'high' },
          { type: 'modify', section: 'Trigger', description: 'desc2', rationale: 'rat2', priority: 'medium' },
        ],
        improvedSkill: '# Skill',
        confidence: 0.5,
      });
      const result = parseAnalysisOutput(response);
      if ('error' in result) throw new Error('Expected success');
      const summary = extractChangesSummary(result);
      expect(summary).toContain('add Steps');
      expect(summary).toContain('modify Trigger');
    });

    it('should return empty string for no suggestions', () => {
      const response = JSON.stringify({
        analysis: { summary: 'test', strengths: [], weaknesses: [], missingScenarios: [], userPainPoints: [] },
        suggestions: [],
        improvedSkill: '# Skill',
        confidence: 0.5,
      });
      const result = parseAnalysisOutput(response);
      if ('error' in result) throw new Error('Expected success');
      expect(extractChangesSummary(result)).toBe('');
    });
  });
});
