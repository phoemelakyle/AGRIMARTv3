import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../context/AuthContext'
import { fetchCategories, fetchDefaultAddress, fetchProducts } from '../api/agrimartApi'

const BuyerHomepage = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [defaultAddress, setDefaultAddress] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [rangeKm, setRangeKm] = useState(30)
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const normalizedSearch = searchTerm.toLowerCase().trim()

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
          setError('Unable to load categories right now.')
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
      category: selectedCategory === 'All' ? 'all' : selectedCategory,
      rangeKm,
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
  }, [selectedCategory, rangeKm])

  const filteredProducts = useMemo(() => {
    if (!normalizedSearch) {
      return products
    }
    return products.filter((product) => product.productName?.toLowerCase().includes(normalizedSearch))
  }, [normalizedSearch, products])

  const userLabel = user?.username || (user?.userType === 'seller' ? 'Seller' : 'Neighbor') || 'AngkatAni Buyer'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const categoriesForFilter = useMemo(() => {
    const rawNames = categories.map((category) => category.name ?? category.Category_Name ?? '').filter(Boolean)
    return ['All', ...Array.from(new Set(rawNames))]
  }, [categories])

  const heroCount = products.length
  const filteredCount = filteredProducts.length
  const addressMessage = defaultAddress
    ? `${defaultAddress.Municipality}, ${defaultAddress.Province}`
    : 'Add a default address to filter by distance.'

  return (
    <>
      <Navigation />
      <div className="page-shell space-y-10">
        <section className="mx-auto max-w-6xl space-y-6 rounded-3xl bg-white p-6 shadow-lg text-left">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Buyer Dashboard</p>
              <h1 className="text-3xl font-bold text-slate-900">Welcome back, {userLabel}</h1>
              <p className="text-sm text-slate-500">
                {addressMessage}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="shop-btn bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                style={{ color: '#ffffff' }}
              >
                Logout
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">Available offers</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{heroCount}</p>
              <p className="text-sm text-slate-500">Curated from regional farms</p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">Within {rangeKm} km</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-600">{heroCount}</p>
              <p className="text-sm text-slate-500">Matches your current delivery radius</p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">Filtered results</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{filteredCount}</p>
              <p className="text-sm text-slate-500">Refine filters to expand your choices</p>
            </article>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Location range</p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={rangeKm}
                    onChange={(event) => setRangeKm(Number(event.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <span className="w-12 text-right text-sm font-semibold text-slate-700">{rangeKm} km</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {categoriesForFilter.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedCategory(option)}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold transition ${
                        option === selectedCategory
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Buyer menu</h3>
                <div className="flex flex-col gap-2">
                  <Link to="/homepage_buyer" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600">
                    Homepage
                  </Link>
                  <Link to="/cart" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600">
                    Shopping cart
                  </Link>
                  <Link to="/checkout" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600">
                    Fresh checkout
                  </Link>
                  <Link to="/buyer_orders" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600">
                    Orders
                  </Link>
                  <Link to="/buyer_account" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600">
                    Settings
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="space-y-3 rounded-3xl bg-white p-6 shadow-lg">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Products</p>
                  <h2 className="text-2xl font-bold text-slate-900">Fresh picks near you</h2>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  placeholder="Search within results"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full max-w-sm rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              {status === 'loading' && <p className="text-sm text-slate-500">Loading products…</p>}
              {status === 'error' && <p className="text-sm text-red-600">{error}</p>}
              <p className="text-sm text-slate-500">
                Showing {filteredProducts.length} product{filteredProducts.length !== 1 && 's'} that match your filters.
              </p>
            </div>

            <div className="grid gap-5">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <article key={product.productId} className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row">
                    <div className="h-32 w-full overflow-hidden rounded-2xl bg-slate-100 sm:w-40">
                      <img
                        src={product.image}
                        alt={product.productName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-wider text-slate-400">
                          {product.municipality}, {product.province}
                        </p>
                        <span className="text-xs text-slate-500">
                          {product.distance != null ? `${product.distance} km away` : 'Distance not available'}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900">{product.productName}</h3>
                      <p className="text-lg font-bold text-emerald-600">
                        {product.minPrice === product.maxPrice
                          ? `₱${product.minPrice}`
                          : `₱${product.minPrice} - ₱${product.maxPrice}`}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          to={`/viewproduct/${product.productId}`}
                          className="text-sm font-semibold text-emerald-600"
                        >
                          View product
                        </Link>
                        <span className="text-sm text-slate-500">Ready for same-day packing</span>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <article className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
                  {status === 'loading'
                    ? 'Loading products…'
                    : 'No products match the current filters. Try widening your radius.'}
                </article>
              )}
            </div>
          </section>
        </div>

        <section className="newsletter rounded-3xl bg-slate-900 p-6 text-white">
          <div className="newsletter-content flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="newsletter-text max-w-xl">
              <h3 className="text-xl font-semibold">
                <i className="fas fa-envelope mr-2" /> Subscribe to our newsletter
              </h3>
              <p>Receive the latest farm drops, restock alerts, and AngkatAni stories before anyone else.</p>
            </div>
            <form className="newsletter-form mt-2 flex w-full max-w-md" onSubmit={(event) => event.preventDefault()}>
              <input type="email" placeholder="Your email address" required className="flex-1 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-white placeholder:text-white/70 focus:border-white focus:outline-none" />
              <button type="submit" className="ml-2 rounded-full bg-emerald-500 px-5 py-2 font-semibold text-white transition hover:bg-emerald-600">
                Subscribe
              </button>
            </form>
          </div>
        </section>
      </div>
    </>
  )
}

export default BuyerHomepage
