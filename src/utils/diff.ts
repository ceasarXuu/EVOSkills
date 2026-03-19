import { diffLines, createPatch } from 'diff';

/**
 * 计算两个字符串的差异
 */
export function computeDiff(oldContent: string, newContent: string): string {
  const differences = diffLines(oldContent, newContent);
  return differences
    .map((part) => {
      const prefix = part.added ? '+' : part.removed ? '-' : ' ';
      return part.value
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => `${prefix} ${line}`)
        .join('\n');
    })
    .join('\n');
}

/**
 * 生成 unified diff 格式的 patch
 */
export function createUnifiedDiff(
  fileName: string,
  oldContent: string,
  newContent: string,
  oldHeader?: string,
  newHeader?: string
): string {
  return createPatch(fileName, oldContent, newContent, oldHeader, newHeader);
}

/**
 * 检查内容是否有变化
 */
export function hasChanges(oldContent: string, newContent: string): boolean {
  return oldContent !== newContent;
}

/**
 * 统计差异行数
 */
export function countChanges(oldContent: string, newContent: string): {
  added: number;
  removed: number;
} {
  const differences = diffLines(oldContent, newContent);
  let added = 0;
  let removed = 0;

  for (const part of differences) {
    if (part.added) {
      added += part.count ?? 0;
    } else if (part.removed) {
      removed += part.count ?? 0;
    }
  }

  return { added, removed };
}