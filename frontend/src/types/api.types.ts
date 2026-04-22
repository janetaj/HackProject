export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalElements: number;
  };
}
