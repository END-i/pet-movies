export type PaginationToken = number | '...';

/** Compact page list: first, last, current ±1, with ellipses for gaps. */
export function buildPaginationTokens(currentPage: number, pagesTotal: number): PaginationToken[] {
  if (pagesTotal <= 1) return [1];
  if (pagesTotal <= 7) {
    return Array.from({ length: pagesTotal }, (_, index) => index + 1);
  }

  const tokens: PaginationToken[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(pagesTotal - 1, currentPage + 1);

  if (start > 2) tokens.push('...');
  for (let value = start; value <= end; value += 1) {
    tokens.push(value);
  }
  if (end < pagesTotal - 1) tokens.push('...');

  tokens.push(pagesTotal);
  return tokens;
}

export function parsePositiveInteger(rawValue: string | null, fallback: number): number {
  if (!rawValue) return fallback;
  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsedValue) || parsedValue < 1 ? fallback : parsedValue;
}
