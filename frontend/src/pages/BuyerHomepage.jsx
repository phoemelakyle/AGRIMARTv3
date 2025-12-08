import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../context/AuthContext'
import { fetchCategories, fetchDefaultAddress, fetchProducts } from '../api/agrimartApi'
import './HomepageBuyer.css'

const BuyerHomepage = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [defaultAddress, setDefaultAddress] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [rangeKm, setRangeKm] = useState(30)
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const dropdownRef = useRef(null)

  const normalizedSearch = searchTerm.trim()

  useEffect(() => {
    let cancelled = false
    fetchCategories()
      .then((response) => {
        if (cancelled) return
        if (response.ok) {
          setCategories(response.body.categories ?? [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchDefaultAddress()
      .then((response) => {
        if (cancelled) return
        if (response.ok) {
          setDefaultAddress(response.body.address)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDefaultAddress(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError('')
    fetchProducts({
      category: selectedCategory === 'all' ? 'all' : selectedCategory,
      rangeKm,
      search: normalizedSearch,
    })
      .then((response) => {
        if (cancelled) return
        if (response.ok) {
          setProducts(response.body.products ?? [])
          setStatus('loaded')
        } else {
          setError(response.body.message || 'Unable to load products.')
          setStatus('error')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Network error while fetching products.')
          setStatus('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedCategory, rangeKm, normalizedSearch])

  useEffect(() => {
    const handleBodyClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('click', handleBodyClick)
    return () => {
      document.removeEventListener('click', handleBodyClick)
    }
  }, [])

  const filteredProducts = useMemo(() => {
    if (!normalizedSearch) {
      return products
    }
    return products.filter((product) => product.productName?.toLowerCase().includes(normalizedSearch))
  }, [normalizedSearch, products])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const categoriesForFilter = useMemo(() => {
    const rawNames = categories.map((category) => category.name ?? category.Category_Name ?? '').filter(Boolean)
    return ['all', ...Array.from(new Set(rawNames))]
  }, [categories])

  const filteredCount = filteredProducts.length
  const breadcrumbLabel = selectedCategory === 'all' ? 'All Products' : selectedCategory

  return (
    <div className="buyer-homepage">
      <Navigation />

      <nav className="nav-menu">
        <ul>
          <li>
            <Link to="/homepage_buyer">Home</Link>
          </li>
          <li>
            <a href="#contacts">Contacts</a>
          </li>
        </ul>
      </nav>

      <nav className="main-nav">
        <ul className="breadcrumb">
          <li>
            <Link to="/homepage_buyer" aria-label="Home">
              ⛤
            </Link>
          </li>
          <li>›</li>
          <li>
            <Link to="/homepage_buyer" className="category-link">
              {breadcrumbLabel}
            </Link>
          </li>
        </ul>
        <div className="icons">
          <Link to="/cart" className="cart-link" aria-label="View shopping cart">
            🛒
          </Link>
          <div className="user-dropdown" ref={dropdownRef}>
            <button type="button" className="user" onClick={() => setUserMenuOpen((prev) => !prev)}>
              👤
            </button>
            <div className={`user-menu ${userMenuOpen ? 'show' : ''}`}>
              <Link to="/buyer_account" className="account-btn">
                My Account
              </Link>
              <button type="button" className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="buyer-shell">
        <div className="container">
          <aside className="sidebar">
            <div className="category-filter">
              <button type="button" className="filter-btn">
                Filter
              </button>
              <div className="location-range">
                <label htmlFor="locationRange">Range: {rangeKm} km</label>
                <input
                  id="locationRange"
                  type="range"
                  min="0"
                  max="50"
                  value={rangeKm}
                  onChange={(event) => setRangeKm(Number(event.target.value))}
                />
              </div>
              <h3>Categories</h3>
              <div className="category-buttons">
                {categoriesForFilter.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`category-item ${category === selectedCategory ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === 'all' ? 'All Products' : category}
                  </button>
                ))}
              </div>
            </div>

            <div className="status">
              <h3>Buyer Menu</h3>
              <ul className="status-list">
                <li>
                  <Link to="/homepage_buyer" className="status-item">
                    <span>🏡</span>
                    Homepage
                  </Link>
                </li>
                <li>
                  <Link to="/cart" className="status-item">
                    <span>🛒</span>
                    Shopping cart
                  </Link>
                </li>
                <li>
                  <Link to="/checkout" className="status-item">
                    <span>💳</span>
                    Fresh checkout
                  </Link>
                </li>
                <li>
                  <Link to="/buyer_orders" className="status-item">
                    <span>📦</span>
                    Orders
                  </Link>
                </li>
                <li>
                  <Link to="/buyer_account" className="status-item">
                    <span>⚙️</span>
                    Settings
                  </Link>
                </li>
              </ul>
            </div>
          </aside>

          <section className="column column-right">
            <div className="column-header">
              <div>
                <p className="eyebrow">Products</p>
                <h2>Fresh picks near you</h2>
                <p className="status-text">Showing {filteredCount} product{filteredCount !== 1 && 's'} that match your filters.</p>
              </div>
              <input
                type="text"
                value={searchTerm}
                placeholder="Search within results"
                onChange={(event) => setSearchTerm(event.target.value)}
                className="product-search"
              />
            </div>
            <div className="address-banner">
              <p>
                Your default address: <strong>{defaultAddress ? `${defaultAddress.Municipality}, ${defaultAddress.Province}` : 'Not set'}</strong>
              </p>
              <small>{!defaultAddress && 'Add an address to unlock accurate range filtering.'}</small>
            </div>
            {status === 'loading' && <p className="status-text">Loading products…</p>}
            {status === 'error' && <p className="status-text error">{error}</p>}

            <div className="product-container">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <article key={product.productId} className="product-box">
                    <div className="image-container">
                      <img src={product.image || '/placeholder.png'} alt={product.productName} />
                    </div>
                    <div className="product-details">
                      <div className="product-meta">
                        <p>
                          {product.municipality}, {product.province}
                        </p>
                        <span>{product.distance != null ? `${product.distance} km away` : 'Distance unknown'}</span>
                      </div>
                      <h3 className="product-name">{product.productName}</h3>
                      <p className="product-price">
                        {product.minPrice === product.maxPrice
                          ? `₱${product.minPrice}`
                          : `₱${product.minPrice} - ₱${product.maxPrice}`}
                      </p>
                      <div className="product-actions">
                        <Link to={`/viewproduct/${product.productId}`}>
                          View product
                        </Link>
                        <span>Ready for same-day packing</span>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <article className="product-box empty">
                  {status === 'loading'
                    ? 'Loading products…'
                    : 'No products match the current filters. Try widening your radius.'}
                </article>
              )}
            </div>
          </section>
        </div>

        <section className="newsletter" id="contacts">
          <div className="newsletter-content">
            <div className="newsletter-text">
              <h3>
                <span className="newsletter-icon">✉️</span>
                Subscribe to our Newsletter
              </h3>
              <p>Stay connected with the latest updates and local farm offers.</p>
            </div>
            <form className="newsletter-form" onSubmit={(event) => event.preventDefault()}>
              <input type="email" placeholder="Your email address" required />
              <button type="submit">Subscribe</button>
            </form>
            <div className="social-icons">
              <a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noreferrer">
                fb
              </a>
              <a href="https://twitter.com" aria-label="Twitter" target="_blank" rel="noreferrer">
                tw
              </a>
              <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noreferrer">
                ig
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default BuyerHomepage
