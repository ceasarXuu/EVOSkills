export interface PaginationResult<T> {
  currentPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  pageItems: T[]
  pageSize: number
  totalItems: number
  totalPages: number
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number,
): PaginationResult<T> {
  const normalizedPageSize = Math.max(1, Math.trunc(pageSize) || 1)
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / normalizedPageSize))
  const currentPage = Math.min(totalPages, Math.max(1, Math.trunc(page) || 1))
  const startIndex = (currentPage - 1) * normalizedPageSize
  const endIndex = startIndex + normalizedPageSize

  return {
    currentPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    pageItems: items.slice(startIndex, endIndex),
    pageSize: normalizedPageSize,
    totalItems,
    totalPages,
  }
}

export function getVisiblePaginationPages(currentPage: number, totalPages: number) {
  const visiblePages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1])

  return [...visiblePages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right)
}
