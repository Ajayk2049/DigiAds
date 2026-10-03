'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable Pagination component for Admin Portal tables and lists.
 * Fixed page size (default 7 items/page).
 */
export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 7,
  onPageChange
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  if (totalItems <= pageSize) {
    return null;
  }

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between border-t border-border/40 px-4 py-3 bg-card/20 rounded-b-2xl mt-3 flex-wrap gap-3">
      <div className="text-xs text-muted-foreground font-semibold">
        Showing <span className="font-bold text-foreground">{startItem}</span> to{' '}
        <span className="font-bold text-foreground">{endItem}</span> of{' '}
        <span className="font-bold text-foreground">{totalItems}</span> entries ({pageSize} / page)
      </div>

      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg bg-card border border-border/40 hover:bg-muted text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Previous Page"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-xs font-bold text-foreground px-2">
          Page {currentPage} of {totalPages}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg bg-card border border-border/40 hover:bg-muted text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Next Page"
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
