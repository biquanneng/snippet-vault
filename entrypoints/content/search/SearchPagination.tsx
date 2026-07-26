// SPDX-License-Identifier: MPL-2.0

import type { MouseEvent } from 'react';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../../components/ui/pagination';
import type { SearchPanelPagination as PaginationData } from '../../../lib/browser/message-contract';

interface SearchPaginationProps {
  pagination: PaginationData;
  onPageChange: (page: number) => void;
}

type PageToken = number | `ellipsis-${number}`;

export function SearchPagination({
  pagination,
  onPageChange,
}: SearchPaginationProps) {
  if (pagination.total === 0) {
    return null;
  }

  const firstPage = pagination.page <= 0;
  const lastPage = pagination.page + 1 >= pagination.totalPages;
  const pageTokens = createPageTokens(
    pagination.page,
    pagination.totalPages,
  );

  function changePage(
    event: MouseEvent<HTMLAnchorElement>,
    page: number,
  ) {
    event.preventDefault();
    if (
      page < 0 ||
      page >= pagination.totalPages ||
      page === pagination.page
    ) {
      return;
    }
    onPageChange(page);
  }

  return (
    <footer className="flex items-center justify-between gap-3 border-t bg-background px-3 py-2">
      <p className="text-xs tabular-nums text-muted-foreground">
        {pagination.total} 条记录
      </p>
      <Pagination
        className="mx-0 w-auto justify-end"
        aria-label="检索结果分页"
      >
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="上一页"
              size="sm"
              aria-label="上一页"
              aria-disabled={firstPage}
              tabIndex={firstPage ? -1 : undefined}
              className={
                firstPage ? 'pointer-events-none opacity-50' : undefined
              }
              onClick={(event) =>
                changePage(event, pagination.page - 1)
              }
            />
          </PaginationItem>

          {pageTokens.map((token) =>
            typeof token === 'number' ? (
              <PaginationItem key={token}>
                <PaginationLink
                  href="#"
                  size="icon-sm"
                  isActive={token === pagination.page}
                  aria-label={`第 ${token + 1} 页`}
                  onClick={(event) => changePage(event, token)}
                >
                  {token + 1}
                </PaginationLink>
              </PaginationItem>
            ) : (
              <PaginationItem key={token}>
                <PaginationEllipsis className="size-7" />
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              text="下一页"
              size="sm"
              aria-label="下一页"
              aria-disabled={lastPage}
              tabIndex={lastPage ? -1 : undefined}
              className={
                lastPage ? 'pointer-events-none opacity-50' : undefined
              }
              onClick={(event) =>
                changePage(event, pagination.page + 1)
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </footer>
  );
}

function createPageTokens(
  currentPage: number,
  totalPages: number,
): PageToken[] {
  const pages = [
    ...new Set([
      0,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      totalPages - 1,
    ]),
  ]
    .filter((page) => page >= 0 && page < totalPages)
    .sort((left, right) => left - right);
  const tokens: PageToken[] = [];

  for (const page of pages) {
    const previous = tokens.at(-1);
    if (
      typeof previous === 'number' &&
      page - previous > 1
    ) {
      tokens.push(`ellipsis-${previous}`);
    }
    tokens.push(page);
  }

  return tokens;
}
