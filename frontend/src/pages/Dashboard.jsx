import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../context/AuthContext'
import { fetchSellerOrders, fetchSellerProducts, fetchSellerSales } from '../api/agrimartApi'

const formatCurrency = (value) => {
  if (value == null) {
    return '₱0.00'
  }
  return `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const pendingStatusConfig = [
  { label: 'Pending Orders', status: 'unpaid', helper: 'Awaiting payment confirmation' },
  { label: 'To ship', status: 'to_ship', helper: 'Ready for dispatch' },
  { label: 'To pack', status: 'shipping', helper: 'Currently shipping to buyer' },
]

const createEmptySeries = (days) => Array.from({ length: days }, () => 0)
const initialSalesSeries = () => ({
  weekly: createEmptySeries(7),
  monthly: createEmptySeries(30),
})
const sampleSalesSeries = {
  weekly: [5, 12, 7, 14, 19, 16, 23],
  monthly: [8, 10, 9, 14, 18, 16, 22, 24, 20, 15, 12, 14, 19, 21, 18, 17, 20, 22, 25, 26, 23, 19, 18, 16, 12, 15, 14, 13, 11, 10],
}

const Dashboard = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [pendingStats, setPendingStats] = useState(
    pendingStatusConfig.map((config) => ({ ...config, value: 0 })),
  )
  const [statsError, setStatsError] = useState('')
  const [salesSeries, setSalesSeries] = useState(initialSalesSeries)
  const [salesError, setSalesError] = useState('')
  const [salesUsingSample, setSalesUsingSample] = useState(false)
  const chartConfigs = useMemo(() => {
    const weeklyMax = Math.max(1, ...salesSeries.weekly)
    const monthlyMax = Math.max(1, ...salesSeries.monthly)
    return [
      { title: 'Sales over last 7 days', dataset: salesSeries.weekly, max: weeklyMax },
      { title: 'Sales over last 30 days', dataset: salesSeries.monthly, max: monthlyMax },
    ]
  }, [salesSeries])

  useEffect(() => {
    let mounted = true
    const loadStats = async () => {
      setStatsError('')
      const responses = await Promise.all(
        pendingStatusConfig.map((statConfig) => fetchSellerOrders({ status: statConfig.status })),
      )
      if (!mounted) return
      setPendingStats(
        pendingStatusConfig.map((statConfig, index) => ({
          ...statConfig,
          value: responses[index].ok ? responses[index].body?.orders?.length || 0 : 0,
        })),
      )
      const failedResponse = responses.find((response) => !response.ok)
      if (failedResponse) {
        setStatsError(failedResponse.body?.message || 'Unable to load pending order counts.')
      } else {
        setStatsError('')
      }
    }
    loadStats()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const loadSales = async () => {
      const [weeklyResponse, monthlyResponse] = await Promise.all([
        fetchSellerSales(7),
        fetchSellerSales(30),
      ])
      if (!mounted) return
      const weeklyTotals = weeklyResponse.ok
        ? weeklyResponse.body?.data?.map((entry) => Number(entry.total) || 0) ?? createEmptySeries(7)
        : createEmptySeries(7)
      const monthlyTotals = monthlyResponse.ok
        ? monthlyResponse.body?.data?.map((entry) => Number(entry.total) || 0) ?? createEmptySeries(30)
        : createEmptySeries(30)
      const hasWeeklyData = weeklyTotals.some((value) => value > 0)
      const hasMonthlyData = monthlyTotals.some((value) => value > 0)
      const finalWeekly = hasWeeklyData ? weeklyTotals : sampleSalesSeries.weekly
      const finalMonthly = hasMonthlyData ? monthlyTotals : sampleSalesSeries.monthly
      setSalesSeries({
        weekly: finalWeekly,
        monthly: finalMonthly,
      })
      if (!weeklyResponse.ok || !monthlyResponse.ok) {
        const weeklyError = !weeklyResponse.ok
          ? weeklyResponse.body?.message || 'Unable to load weekly sales.'
          : ''
        const monthlyError = !monthlyResponse.ok
          ? monthlyResponse.body?.message || 'Unable to load 30-day sales.'
          : ''
        setSalesError(weeklyError || monthlyError)
      } else {
        setSalesError('')
      }
      setSalesUsingSample(!hasWeeklyData || !hasMonthlyData)
    }
    loadSales()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const loadProducts = async () => {
      setLoading(true)
      setError('')
      const response = await fetchSellerProducts()
      if (!mounted) return
      if (response.ok && response.body?.products) {
        setProducts(response.body.products)
      } else {
        setError(response.body?.message || 'Unable to load seller products.')
      }
      setLoading(false)
    }
    loadProducts()
    return () => {
      mounted = false
    }
  }, [])

  const totalRevenue = useMemo(
    () => products.reduce((sum, product) => sum + (Number(product.revenue) || 0), 0),
    [products],
  )
  const liveListings = useMemo(
    () => products.filter((product) => product.status === 'Live').length,
    [products],
  )
  const highestProducts = useMemo(
    () => [...products].sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0)).slice(0, 3),
    [products],
  )

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      <Navigation />
      <nav className="nav-menu">
        <ul>
          <li>
            <Link to="/homepage_seller">Home</Link>
          </li>
          <li>
            <a href="#contacts">Contacts</a>
          </li>
        </ul>
      </nav>
      <nav className="main-nav">
        <ul className="breadcrumb">
          <li>
            <Link to="/homepage_seller">
              <i className="fas fa-home" />
            </Link>
          </li>
          <li>›</li>
          <li>
            <span className="button">Dashboard</span>
          </li>
        </ul>
        <div className="icons">
          <div className="user-dropdown">
            <span className="user" onClick={() => setUserMenuOpen((prev) => !prev)}>
              <i className="fas fa-user" />
            </span>
            {userMenuOpen && (
              <div className="user-menu">
                <button type="button" className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="container">
        <aside className="sidebar">
          <div className="status">
            <h3>SELLER MENU</h3>
            <ul className="status-list">
              <li>
                <Link className="status-item" to="/homepage_seller">
                  <i className="fas fa-home" /> Homepage
                </Link>
              </li>
              <li>
                <Link className="status-item" to="/seller_orders">
                  <i className="fas fa-receipt" /> Orders
                </Link>
              </li>
              <li>
                <Link className="status-item" to="/add_product">
                  <i className="fas fa-plus-circle" /> Add Product
                </Link>
              </li>
              <li>
                <Link className="status-item" to="/dashboard">
                  <i className="fas fa-tachometer-alt" /> Dashboard
                </Link>
              </li>
              <li>
                <Link to="/seller_account" className="status-item">
                  <i className="fas fa-cog"/> Settings
                </Link>
              </li>
            </ul>
          </div>
        </aside>
        <div className="column-right">
          <section className="product-info">
            <h1>Business snapshot</h1>
            {error && <p className="error-message">{error}</p>}
            <p className="info-message">
              Use the seller homepage to manage catalog items and go to the edit view for each product.
            </p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-widest text-slate-500">Total revenue</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(totalRevenue)}</p>
                <p className="text-sm text-slate-500">Across {products.length} catalog items</p>
              </article>
              <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-widest text-slate-500">Live listings</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-600">{liveListings}</p>
                <p className="text-sm text-slate-500">Visible to buyers today</p>
              </article>
              <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-widest text-slate-500">High-earners</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{highestProducts.length}</p>
                <p className="text-sm text-slate-500">Top {highestProducts.length} products</p>
              </article>
            </div>
          </section>

          <section className="product-info">
            <div className="flex-head">
              <h2>Pending orders</h2>
              <p className="text-sm text-slate-500">Up to date counts of current work items</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {pendingStats.map((stat) => (
                <article key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-widest text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.helper}</p>
                </article>
              ))}
            </div>
            {statsError && <p className="error-message">{statsError}</p>}
            {salesError && <p className="error-message">{salesError}</p>}
            {salesUsingSample && (
              <p className="info-message">
                No recent orders for one or more windows, so placeholder values are shown so the charts stay visible.
              </p>
            )}
            <div className="mt-6 space-y-4">
              {chartConfigs.map((chart) => (
                <article key={chart.title} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">{chart.title}</h3>
                    <span className="text-xs text-slate-500">Peak {chart.max}</span>
                  </div>
                  <div className="mt-4 flex items-end gap-3 h-44 px-2">
                    {chart.dataset.map((value, index) => {
                      const barHeight = Math.max((value / chart.max) * 100, 4)
                      return (
                        <div key={`${chart.title}-${index}`} className="flex-1 text-center">
                          <div className="relative mx-auto mb-1 h-full min-h-[120px] w-6">
                            <div className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-slate-200" />
                            <div
                              className="absolute inset-x-0 bottom-0 w-6 rounded-full bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500"
                              style={{ height: `${barHeight}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 uppercase">{index + 1}</p>
                          <p className="text-[10px] font-semibold text-slate-500">{value}</p>
                        </div>
                      )
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="product-info">
            <div className="flex-head">
              <h2>Top performing products</h2>
              <Link className="button1" to={products[0] ? `/edit_product/${products[0].productId}` : '/homepage_seller'}>
                Open catalog
              </Link>
            </div>
            {loading ? (
              <p className="info-message">Loading catalog details…</p>
            ) : highestProducts.length === 0 ? (
              <p className="info-message">Add products to see performance highlights.</p>
            ) : (
              <div className="grid gap-4">
                {highestProducts.map((item) => (
                  <article key={item.productId} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-sm uppercase tracking-widest text-slate-500">{item.status}</p>
                    <h3 className="text-xl font-bold text-slate-900">{item.productName}</h3>
                    <p className="text-sm text-slate-500">Stock: {item.stock}</p>
                    <p className="text-lg font-semibold text-emerald-600">{formatCurrency(item.revenue)}</p>
                    <Link className="text-sm font-semibold text-emerald-600" to={`/edit_product/${item.productId}`}>
                      Edit product →
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <section id="contacts" className="newsletter">
        <div className="newsletter-content">
          <div className="newsletter-text">
            <h3>
              <i className="fas fa-envelope" /> Subscribe to our Newsletter
            </h3>
            <p>Stay connected with the latest updates and farm stories.</p>
          </div>
          <form className="newsletter-form" onSubmit={(event) => event.preventDefault()}>
            <input type="email" placeholder="Your email address" required />
            <button type="submit">Subscribe</button>
          </form>
          <div className="social-icons">
            <a href="#" aria-label="Facebook">
              <i className="fab fa-facebook-f" />
            </a>
            <a href="#" aria-label="Twitter">
              <i className="fab fa-twitter" />
            </a>
            <a href="#" aria-label="Instagram">
              <i className="fab fa-instagram" />
            </a>
          </div>
        </div>
      </section>
    </>
  )
}

export default Dashboard
