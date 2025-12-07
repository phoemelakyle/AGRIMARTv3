import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../context/AuthContext'
import { fetchSellerProducts } from '../api/agrimartApi'

const formatCurrency = (value) => {
  if (value == null) {
    return '₱0.00'
  }
  return `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const Dashboard = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const pendingStats = [
    { label: 'Pending Orders', value: 0 },
    { label: 'To ship', value: 0 },
    { label: 'To pack', value: 0 },
  ]

  const weeklySales = [12, 18, 15, 22, 28, 19, 24]
  const monthlySales = [14, 16, 10, 22, 24, 28, 26, 20, 18, 15]
  const maxSalesValue = Math.max(...weeklySales, ...monthlySales)

  useEffect(() => {
    let mounted = true
    const load = async () => {
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
    load()
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
                  <p className="text-sm text-slate-500">No actions pending</p>
                </article>
              ))}
            </div>
            <div className="mt-6 space-y-4">
              {[{ title: 'Sales over last 7 days', dataset: weeklySales }, { title: 'Sales over last 30 days', dataset: monthlySales }].map(
                (chart) => (
                  <article key={chart.title} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">{chart.title}</h3>
                      <span className="text-xs text-slate-500">Peak {Math.max(...chart.dataset)}</span>
                    </div>
                    <div className="mt-4 flex items-end gap-2 h-32">
                      {chart.dataset.map((value, index) => (
                        <div key={`${chart.title}-${index}`} className="flex-1">
                          <div
                            className="mx-auto w-3 rounded-full bg-emerald-500"
                            style={{ height: `${(value / maxSalesValue) * 100}%` }}
                          />
                          <p className="text-[10px] text-center uppercase text-slate-400 mt-1">{index + 1}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                ),
              )}
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
