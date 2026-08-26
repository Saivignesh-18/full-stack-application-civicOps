export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function parsePaginationParams(
  query: { page?: string; limit?: string },
  defaults = { page: 1, limit: 20, maxLimit: 100 }
): PaginationParams {
  const page = Math.max(1, parseInt(query.page || String(defaults.page), 10));
  const limit = Math.min(
    defaults.maxLimit,
    Math.max(1, parseInt(query.limit || String(defaults.limit), 10))
  );

  return { page, limit };
}

export function getPaginationOffset(params: PaginationParams): number {
  return (params.page - 1) * params.limit;
}

export function createPaginatedResult<T>(
  items: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  return {
    items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}
