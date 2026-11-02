import { ChevronLeft, ChevronRight } from 'lucide-react'

function TablePagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const firstRecord = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastRecord = Math.min(page * pageSize, total)

  return (
    <div className="table-pagination">
      <span className="table-page-range">{firstRecord}–{lastRecord} of {total}</span>
      <div className="table-page-controls">
        <button aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button">
          <ChevronLeft size={15} aria-hidden="true" />
        </button>
        <span>Page {page} of {totalPages}</span>
        <button aria-label="Next page" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} type="button">
          <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default TablePagination