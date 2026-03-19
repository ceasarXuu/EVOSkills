import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createChildLogger } from '../utils/logger.js';
import { hashString } from '../utils/hash.js';
import { createUnifiedDiff } from '../utils/diff.js';

const logger = createChildLogger('markdown');

/**
 * Markdown Skill 文件操作器
 */
export class MarkdownSkill {
  private filePath: string;
  private content: string = '';

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * 读取文件内容
   */
  read(): string {
    if (!existsSync(this.filePath)) {
      throw new Error(`Skill file not found: ${this.filePath}`);
    }
    this.content = readFileSync(this.filePath, 'utf-8');
    return this.content;
  }

  /**
   * 写入文件内容
   */
  write(content: string): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.filePath, content, 'utf-8');
    this.content = content;
    logger.debug('Skill file written', { path: this.filePath });
  }

  /**
   * 获取当前内容
   */
  getContent(): string {
    return this.content;
  }

  /**
   * 获取内容哈希
   */
  getContentHash(): string {
    return hashString(this.content);
  }

  /**
   * 检查文件是否存在
   */
  exists(): boolean {
    return existsSync(this.filePath);
  }

  /**
   * 获取文件路径
   */
  getPath(): string {
    return this.filePath;
  }

  /**
   * 解析 frontmatter
   */
  parseFrontmatter(): Record<string, unknown> {
    const frontmatter: Record<string, unknown> = {};
    const lines = this.content.split('\n');

    if (lines[0]?.trim() !== '---') {
      return frontmatter;
    }

    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) {
      return frontmatter;
    }

    for (let i = 1; i < endIndex; i++) {
      const line = lines[i];
      const colonIndex = line?.indexOf(':') ?? -1;
      if (colonIndex > 0) {
        const key = line?.substring(0, colonIndex).trim();
        const value = line?.substring(colonIndex + 1).trim();
        if (key) {
          frontmatter[key] = value;
        }
      }
    }

    return frontmatter;
  }

  /**
   * 更新 frontmatter
   */
  updateFrontmatter(updates: Record<string, unknown>): string {
    const lines = this.content.split('\n');

    if (lines[0]?.trim() !== '---') {
      // 没有 frontmatter，添加一个
      const newFrontmatter = Object.entries(updates)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      const newContent = `---\n${newFrontmatter}\n---\n\n${this.content}`;
      this.write(newContent);
      return newContent;
    }

    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) {
      return this.content;
    }

    // 解析现有 frontmatter
    const existingFrontmatter = this.parseFrontmatter();
    const mergedFrontmatter = { ...existingFrontmatter, ...updates };

    // 重建 frontmatter
    const newFrontmatterLines = Object.entries(mergedFrontmatter).map(
      ([k, v]) => `${k}: ${v}`
    );

    const newContent = [
      '---',
      ...newFrontmatterLines,
      '---',
      ...lines.slice(endIndex + 1),
    ].join('\n');

    this.write(newContent);
    return newContent;
  }

  /**
   * 查找 section
   */
  findSection(heading: string): { start: number; end: number; content: string } | null {
    const lines = this.content.split('\n');
    const headingPattern = new RegExp(`^#{1,6}\\s+${heading}`, 'i');

    let start = -1;
    let headingLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      if (headingPattern.test(lines[i] ?? '')) {
        start = i;
        headingLevel = (lines[i]?.match(/^(#{1,6})/) ?? ['', ''])[1].length;
        break;
      }
    }

    if (start === -1) {
      return null;
    }

    // 找到下一个同级或更高级的 heading
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      const match = lines[i]?.match(/^(#{1,6})\s/);
      if (match && match[1].length <= headingLevel) {
        end = i;
        break;
      }
    }

    return {
      start,
      end,
      content: lines.slice(start, end).join('\n'),
    };
  }

  /**
   * 替换 section 内容
   */
  replaceSection(heading: string, newContent: string): string {
    const section = this.findSection(heading);
    if (!section) {
      logger.warn(`Section not found: ${heading}`);
      return this.content;
    }

    const lines = this.content.split('\n');
    const newLines = [
      ...lines.slice(0, section.start + 1),
      ...newContent.split('\n'),
      ...lines.slice(section.end),
    ];

    const result = newLines.join('\n');
    this.write(result);
    return result;
  }

  /**
   * 在指定 section 后追加内容
   */
  appendAfterSection(heading: string, content: string): string {
    const section = this.findSection(heading);
    if (!section) {
      logger.warn(`Section not found: ${heading}`);
      return this.content;
    }

    const lines = this.content.split('\n');
    const newLines = [
      ...lines.slice(0, section.end),
      '',
      content,
      '',
      ...lines.slice(section.end),
    ];

    const result = newLines.join('\n');
    this.write(result);
    return result;
  }

  /**
   * 生成 diff
   */
  generateDiff(oldContent: string, newContent: string): string {
    return createUnifiedDiff(this.filePath, oldContent, newContent);
  }

  /**
   * 从 origin 复制
   */
  copyFromOrigin(originPath: string): void {
    if (!existsSync(originPath)) {
      throw new Error(`Origin skill not found: ${originPath}`);
    }

    const originContent = readFileSync(originPath, 'utf-8');
    this.write(originContent);
    logger.info('Skill copied from origin', { from: originPath, to: this.filePath });
  }
}

// 导出工厂函数
export function createMarkdownSkill(filePath: string): MarkdownSkill {
  return new MarkdownSkill(filePath);
}