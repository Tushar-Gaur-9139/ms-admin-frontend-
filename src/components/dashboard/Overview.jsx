import { metrics } from '../../lib/adminConfig'

function MetricGrid() {
  return (
    <section className="metric-grid" aria-label="Store metrics">
      {metrics.map((metric) => (
        <article className="metric-card" key={metric.label}>
          <p>{metric.label}</p>
          <strong>{metric.value}</strong>
          <span>{metric.note}</span>
        </article>
      ))}
    </section>
  )
}

function RecentOrders() {
  return (
    <section className="panel orders-panel">
      <div className="panel-heading">
        <div>
          <h2>Recent orders</h2>
          <p>Orders from the shared storefront will appear here once connected.</p>
        </div>
        <button className="quiet-button" disabled type="button">View all orders</button>
      </div>
      <div className="empty-state">
        <span className="empty-icon" aria-hidden="true">↗</span>
        <strong>No orders to show yet</strong>
        <p>The storefront and admin workspace will use the same Laravel backend and database.</p>
      </div>
    </section>
  )
}

function SetupNotice() {
  return (
    <div className="setup-notice">
      <span className="notice-dot" aria-hidden="true" />
      <p><strong>Store data is not connected yet.</strong> Dashboard metrics and management actions will be added to the shared API.</p>
    </div>
  )
}

function Overview() {
  return (
    <>
      <MetricGrid />
      <RecentOrders />
      <SetupNotice />
    </>
  )
}

export default Overview
