import { Link } from 'react-router-dom'

function Brand({ compact = false }) {
  return (
    <Link className="brand" to="/" aria-label="M.S. Enterprises admin home">
      <img className={`brand-logo${compact ? ' brand-logo-compact' : ''}`} src="/favicon.svg" alt="" aria-hidden="true" />
    </Link>
  )
}

export default Brand
