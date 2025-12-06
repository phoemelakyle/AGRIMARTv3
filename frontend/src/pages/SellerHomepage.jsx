import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../context/AuthContext'
import { deleteSellerProduct, fetchSellerProducts, updateSellerProduct } from '../api/agrimartApi'
import './SellerHomepage.css'

const SellerHomepage = () => {
  const { user, logout } = useAuth()
  const sellerLabel = user?.username || 'AngkatAni Seller'
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const [sellerProducts, setSellerProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState(null)

  const totalRevenue = useMemo(
    () => sellerProducts.reduce((sum, product) => sum + (product.revenue || 0), 0),
    [sellerProducts],
  )
  const liveProducts = useMemo(
    () => sellerProducts.filter((product) => product.status === 'Live').length,
    [sellerProducts],
  )

  useEffect(() => {
    let isMounted = true

    const loadProducts = async () => {
      setLoadingProducts(true)
      setProductsError(null)
      try {
        const response = await fetchSellerProducts()
        if (!isMounted) return
        if (!response.ok) {
          throw new Error(response.body?.message || 'Unable to load products yet.')
        }
        setSellerProducts(response.body?.products ?? [])
      } catch (error) {
        if (!isMounted) return
        setProductsError(error.message || 'Unable to load products yet.')
      } finally {
        if (isMounted) {
          setLoadingProducts(false)
        }
      }
    }

    loadProducts()

    return () => {
      isMounted = false
    }
  }, [])

  const handleDelete = async (productId) => {
    if (!window.confirm('Remove this product from your catalog?')) {
      return
    }
    const response = await deleteSellerProduct(productId)
    if (!response.ok) {
      setProductsError(response.body?.message || 'Unable to delete the product right now.')
      return
    }
    setSellerProducts((prev) => prev.filter((product) => product.productId !== productId))
  }

  const handleEdit = async (product) => {
    const updatedName = window.prompt('Update product name', product.productName)
    if (!updatedName) {
      return
    }
    const trimmedName = updatedName.trim()
    if (!trimmedName || trimmedName === product.productName) {
      return
    }
    const response = await updateSellerProduct(product.productId, { name: trimmedName })
    if (!response.ok) {
      setProductsError(response.body?.message || 'Unable to update product name.')
      return
    }
    setSellerProducts((prev) =>
      prev.map((item) => (item.productId === product.productId ? { ...item, productName: trimmedName } : item)),
    )
  }

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
            <span className="button">Seller dashboard</span>
          </li>
        </ul>
        <div className="icons">
          <button type="button" className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt" /> Logout
          </button>
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
      <div className="page-shell space-y-10">
        <section className="mx-auto max-w-6xl space-y-4 rounded-3xl bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-emerald-600">Seller dashboard</p>
              <h1 className="text-3xl font-bold text-slate-900">Welcome back, {sellerLabel}</h1>
              <p className="text-sm text-slate-500">Manage listings, monitor revenue, and keep your AngkatAni storefront fresh.</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="rounded-full border border-emerald-200 px-3 py-1 text-emerald-600">Live & verified</span>
              <span className="rounded-full border border-slate-200 px-3 py-1">New metrics updated hourly</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">Total revenue</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">₱{totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Across {sellerProducts.length} active products</p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">Live listings</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-600">{liveProducts}</p>
              <p className="text-sm text-slate-500">Ready for buyers on AngkatAni</p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">Pending orders</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{sellerProducts.length || 4}</p>
              <p className="text-sm text-slate-500">Awaiting confirmation</p>
            </article>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[250px_1fr]">
          <aside className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Seller menu</h3>
              <div className="status">
                <ul className="status-list">
                  <li>
                    <Link to="/homepage_seller" className="status-item">
                      <i className="fas fa-home" /> Homepage
                    </Link>
                  </li>
                  <li>
                    <Link to="/seller_orders" className="status-item">
                      <i className="fas fa-receipt" /> Orders
                    </Link>
                  </li>
                  <li>
                    <Link to="/add_product" className="status-item">
                      <i className="fas fa-plus-circle" /> Add Product
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard" className="status-item">
                      <i className="fas fa-tachometer-alt" /> Dashboard
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </aside>

          <section className="space-y-5">
            <div className="rounded-3xl bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-widest text-slate-500">Catalog</p>
                  <h2 className="text-2xl font-bold text-slate-900">Products you are selling today</h2>
                </div>
                <Link to="/add_product" className="shop-btn text-sm">+ Add new product</Link>
              </div>
              <div className="mt-6 grid gap-4">
                {loadingProducts && (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Loading catalog...</div>
                )}
                {!loadingProducts && sellerProducts.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No products found. Use the Add product button to list your first item.
                  </div>
                )}
                {!loadingProducts && sellerProducts.map((product) => (
                  <article key={product.productId} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-200">
                        <img src={product.image} alt={product.productName} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-600">{product.productId}</p>
                        <h3 className="text-lg font-semibold text-slate-900">{product.productName}</h3>
                        <p className="text-sm text-slate-500">₱{product.revenue?.toLocaleString()} revenue</p>
                        <p className="text-xs uppercase tracking-widest text-slate-500">Stock: {product.stock ?? 0}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <button onClick={() => handleEdit(product)} className="rounded-full border border-slate-200 px-4 py-1 text-emerald-600">Edit</button>
                      <button onClick={() => handleDelete(product.productId)} className="rounded-full border border-red-200 px-4 py-1 text-red-600">Delete</button>
                    </div>
                  </article>
                ))}
                {productsError && (
                  <p className="text-sm text-red-600">{productsError}</p>
                )}
              </div>
            </div>
          </section>
        </div>
        <section className="newsletter rounded-3xl bg-slate-900 p-6 text-white">
          <div className="newsletter-content flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold">
                <i className="fas fa-envelope mr-2" />Subscribe to seller tips
              </h3>
              <p>Get best practices for packaging, promos, and staying competitive on AngkatAni.</p>
            </div>
            <form className="newsletter-form mt-2 flex w-full max-w-md" onSubmit={(event) => event.preventDefault()}>
              <input type="email" placeholder="Your email address" required className="flex-1 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-white placeholder:text-white/70 focus:border-white focus:outline-none" />
              <button type="submit" className="ml-2 rounded-full bg-emerald-500 px-5 py-2 font-semibold text-white hover:bg-emerald-600">Subscribe</button>
            </form>
          </div>
        </section>
      </div>
    </>
  )
}

export default SellerHomepage
