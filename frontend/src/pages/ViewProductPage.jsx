import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  API_URL,
  addProductVariationToCart,
  fetchCategories,
  fetchProductDetail,
} from '../api/agrimartApi'
import logoImage from '../assets/images/logo.png'
import headerImage from '../assets/images/header4.png'
import './ViewProductPage.css'

const ViewProductPage = () => {
  const { user, logout } = useAuth()
  const { productId } = useParams()
  const [product, setProduct] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [selectedPrice, setSelectedPrice] = useState(null)
  const [selectedVariation, setSelectedVariation] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [cartMessage, setCartMessage] = useState('')
  const [showCartToast, setShowCartToast] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true)
      setError('')
      try {
        const [productResponse, categoriesResponse] = await Promise.all([
          fetchProductDetail(productId),
          fetchCategories(),
        ])
        if (!productResponse.ok) {
          throw new Error(productResponse.body?.message || 'Unable to load product details.')
        }
        if (!categoriesResponse.ok) {
          throw new Error(categoriesResponse.body?.message || 'Unable to load categories.')
        }
        const detail = productResponse.body.product
        const categoryList = categoriesResponse.body.categories ?? []
        setProduct(detail)
        setCategories(categoryList)
        if (detail?.variations?.length) {
          const primary = detail.variations[0]
          setSelectedVariation(primary)
          setSelectedUnit(primary.unit)
          setSelectedPrice(primary.price)
          setQuantity(1)
        } else {
          setSelectedVariation(null)
        }
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [productId])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    if (selectedVariation) {
      setSelectedPrice(selectedVariation.price)
      setQuantity(1)
    }
  }, [selectedVariation])

  const units = useMemo(() => {
    if (!product) return []
    return Array.from(new Set(product.variations.map((variation) => variation.unit)))
  }, [product])

  const prices = useMemo(() => {
    if (!product) return []
    return Array.from(new Set(product.variations.map((variation) => variation.price)))
  }, [product])

  const handleUnitClick = (unit) => {
    if (!product) return
    const matchedVariation = product.variations.find((variation) => variation.unit === unit)
    setSelectedUnit(unit)
    if (matchedVariation) {
      setSelectedVariation(matchedVariation)
    }
  }

  const handlePriceClick = (price) => {
    setSelectedPrice(price)
    if (!product) return
    const matchedVariation = product.variations.find((variation) => variation.price === price)
    if (matchedVariation) {
      setSelectedVariation(matchedVariation)
    }
  }

  const adjustQuantity = (amount) => {
    if (!selectedVariation) {
      return
    }
    setQuantity((current) => {
      const next = current + amount
      const maxQuantity = selectedVariation.quantity ?? current
      if (next < 1) {
        return 1
      }
      if (maxQuantity != null && next > maxQuantity) {
        return maxQuantity
      }
      return next
    })
  }

  const handleAddToCart = async () => {
    if (!selectedVariation || !product) {
      setError('Please select a unit before adding to cart.')
      return
    }
    setIsSubmitting(true)
    setError('')
    const response = await addProductVariationToCart({
      productId: product.productId,
      variationId: selectedVariation.variationId,
      quantity,
    })
    setIsSubmitting(false)
    if (response.ok && response.body?.status === 'success') {
      setCartMessage('Item added to cart!')
      setShowCartToast(true)
      setTimeout(() => setShowCartToast(false), 2500)
    } else {
      setError(response.body?.message || 'Unable to add item to cart right now.')
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const buyerDisplayName = user?.username || 'AngkatAni Buyer'

  return (
    <div className="view-product-page">
      <header className="top-bar">
        <div className="logo">
          <img src={logoImage} alt="AngkatAni logo" className="logo-icon" />
          <span>AngkatAni</span>
        </div>
        <span className="tagline">Empowering farmers and connecting communities.</span>
        <div className="icons">
          <Link to="/cart" className="cart-link">
            <i className="fas fa-shopping-cart" />
          </Link>
          <div className="user-dropdown">
            <button type="button" className="user" onClick={() => setMenuOpen((prev) => !prev)}>
              <i className="fas fa-user" />
            </button>
            <div className={`user-menu ${menuOpen ? 'show' : ''}`} ref={menuRef}>
              <Link className="account-btn" to="/account">
                My Account
              </Link>
              <button type="button" className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="nav-menu">
        <ul>
          <li>
            <Link className="category-item" to="/homepage_buyer">
              All Products
            </Link>
          </li>
          <li>
            <Link className="category-item" to="/buyer_orders">
              Orders
            </Link>
          </li>
          <li>
            <Link className="category-item" to="/buyer_payment_options">
              Payment Options
            </Link>
          </li>
          <li>
            <Link className="category-item" to="/account">
              Account
            </Link>
          </li>
        </ul>
      </nav>

      <section
        className="main-nav"
        style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${headerImage})` }}
      >
        <div>
          <p className="breadcrumb">
            <span>
              <Link className="button" to="/homepage_buyer">
                Homepage
              </Link>
            </span>
            <span>/</span>
            <span>View Product</span>
            <span>/</span>
            <span>{product?.productName ?? 'Product Details'}</span>
          </p>
          <h2>{product?.productName || 'Product Details'}</h2>
          <p className="tagline">Welcome back, {buyerDisplayName}.</p>
        </div>
        <div className="icons">
          <div className="cart">
            <Link className="cart-link" to="/cart">
              <i className="fas fa-shopping-basket" />
            </Link>
          </div>
          <div>
            <strong>{categories.length}</strong>
            <span>categories</span>
          </div>
        </div>
      </section>

      <div className="container">
        <aside className="sidebar">
          <div className="category-filter">
            <h3>CATEGORIES</h3>
            <ul className="category-list">
              {categories.map((category) => (
                <li key={category.categoryId ?? category.CategoryID}>
                  <Link
                    to="/homepage_buyer"
                    className={`category-item ${
                      product?.categoryId === category.categoryId ? 'active' : ''
                    }`}
                  >
                    {category.name ?? category.Category_Name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="status">
            <h3>BUYER MENU</h3>
            <ul className="status-list">
              <li>
                <Link className="status-item" to="/homepage_buyer">
                  <i className="fas fa-home" /> Homepage
                </Link>
              </li>
              <li>
                <Link className="status-item" to="/buyer_orders">
                  <i className="fas fa-receipt" /> Orders
                </Link>
              </li>
              <li>
                <Link className="status-item" to="/buyer_payment_options">
                  <i className="fas fa-credit-card" /> Payment Options
                </Link>
              </li>
            </ul>
          </div>
        </aside>

        <div className="column column-right">
          {loading && <p className="status-message">Loading product details…</p>}
          {error && !loading && <p className="status-message">{error}</p>}
          {!loading && product && (
            <div className="product-view-wrapper">
              <div className="product-container">
                <h3 className="name">
                  {product.categoryName || 'Product'} / {product.productName}
                </h3>
                <div className="image-container">
                  <img className="product-img" src={product.image} alt={product.productName} />
                </div>
                <div id="product-var">
                  {selectedVariation && (
                    <div id="quan-disp">
                      <p>Stock: {selectedVariation.quantity ?? '—'}</p>
                    </div>
                  )}
                  {selectedVariation && (
                    <div id="plusminuscart" className="quantity-container">
                      <button type="button" className="adjust-quantity" onClick={() => adjustQuantity(-1)}>
                        -
                      </button>
                      <span className="quantity-display">{quantity}</span>
                      <button type="button" className="adjust-quantity" onClick={() => adjustQuantity(1)}>
                        +
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    className="btn-addtocart"
                    onClick={handleAddToCart}
                    disabled={isSubmitting || !selectedVariation}
                  >
                    {isSubmitting ? 'Adding…' : 'ADD TO CART'}
                  </button>
                </div>
              </div>

              <div className="viewproduct-container">
                <p className="product-name">{product.productName}</p>
                <p className="variation">Units:</p>
                <div className="button-row">
                  {units.map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      className={`unit-button ${unit === selectedUnit ? 'clicked' : ''}`}
                      onClick={() => handleUnitClick(unit)}
                    >
                      {unit}
                    </button>
                  ))}
                </div>

                <p className="variation">Prices:</p>
                <div className="button-row">
                  {prices.map((price) => (
                    <button
                      key={price}
                      type="button"
                      className={`price-button ${price === selectedPrice ? 'clicked' : 'unclickable'}`}
                      onClick={() => handlePriceClick(price)}
                    >
                      ₱{price}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <section id="contacts" className="newsletter">
        <div className="newsletter-content">
          <div className="newsletter-text">
            <h3>
              <i className="fas fa-envelope" /> Subscribe to our Newsletter
            </h3>
            <p>Stay connected with the latest updates and local farm offers.</p>
          </div>
          <form className="newsletter-form">
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

      <div className={`cart-toast ${showCartToast ? 'show' : ''}`}>
        {cartMessage}
      </div>
    </div>
  )
}

export default ViewProductPage
