const pageSizeOptions = [10, 25, 50, 100]

function TablePageSizeSelect({ value, onChange }) {
  return (
    <label className="table-page-size">
      {/* <span>Rows per page</span> */}
      <select aria-label="Rows per page" onChange={(event) => onChange(Number(event.target.value))} value={value}>
        {pageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

export default TablePageSizeSelect