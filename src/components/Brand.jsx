function Brand({ compact = false }) {
  return (
    <a className="brand" href="/" aria-label="M.S. Enterprises admin home">
      <img className={`brand-logo${compact ? ' brand-logo-compact' : ''}`} src="/favicon.svg" alt="" aria-hidden="true" />
    </a>
  )
}

export default Brand
