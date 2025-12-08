import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { fetchPaymentOptions, logoutUser, savePaymentOptions } from '../api/agrimartApi'
import './BuyerPaymentOptions.css'

const CASH_ONLY_METHOD = 'Cash on Delivery'

const BuyerPaymentOptions = () => {
  const [methods, setMethods] = useState([])
  const [formState, setFormState] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()
  const dropdownRef = useRef(null)

  const hydrateState = (methodList, options) => {
    const next = {}
    methodList.forEach((method) => {
      const accountValue = options?.[method.name]
      next[method.name] = {
        enabled: Boolean(accountValue),
        account: accountValue && accountValue !== 'None' ? accountValue : '',
      }
    })
    return next
  }

  const loadPaymentOptions = async () => {
    setLoading(true)
    setMessage('')
    setError('')
    const response = await fetchPaymentOptions()
    setLoading(false)
    if (response.ok) {
      const methodsFromApi = response.body?.paymentMethods ?? []
      const existingOptions = response.body?.options ?? {}
      setMethods(methodsFromApi)
      setFormState(hydrateState(methodsFromApi, existingOptions))
    } else {
      setError(response.body?.message || 'Unable to load payment options.')
    }
  }

  useEffect(() => {
    loadPaymentOptions()
  }, [])

  useEffect(() => {
    const handleBodyClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('click', handleBodyClick)
    return () => document.removeEventListener('click', handleBodyClick)
  }, [])

  const handleToggleMethod = (methodName) => {
    setFormState((prev) => {
      const current = prev[methodName] ?? { enabled: false, account: '' }
      return {
        ...prev,
        [methodName]: { ...current, enabled: !current.enabled },
      }
    })
  }

  const handleAccountChange = (methodName, value) => {
    setFormState((prev) => ({
      ...prev,
      [methodName]: { ...prev[methodName], account: value },
    }))
  }

  const activeMethods = useMemo(
    () =>
      Object.entries(formState)
        .filter(([, value]) => value?.enabled)
        .map(([name]) => name),
    [formState],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    const payloadOptions = {}
    let missingMethod = ''

    Object.entries(formState).forEach(([methodName, state]) => {
      if (!state?.enabled) {
        return
      }
      if (methodName === CASH_ONLY_METHOD) {
        payloadOptions[methodName] = 'None'
        return
      }
      if (!state.account?.trim()) {
        missingMethod = methodName
        return
      }
      payloadOptions[methodName] = state.account.trim()
    })

    if (missingMethod) {
      setError(`Please add an account number for ${missingMethod}.`)
      return
    }

    setSaving(true)
    const response = await savePaymentOptions(payloadOptions)
    setSaving(false)
    if (response.ok) {
      setMessage('Payment options saved.')
      loadPaymentOptions()
    } else {
      setError(response.body?.message || 'Unable to save payment options right now.')
    }
  }

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
  }

  const makeId = (label) =>
    (label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return (
    <div className="buyer-payment-page">
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
            <Link to="/homepage_buyer">
              <i className="fas fa-home" />
            </Link>
          </li>
          <li>›</li>
          <li>
            <Link to="/buyer_payment_options" className="button">
              Payment Options
            </Link>
          </li>
        </ul>
      </nav>

      <div className="container">
        <aside className="sidebar">
          <div className="status">
            <h3>ACCOUNT</h3>
            <ul className="status-list">
              <li>
                <Link to="/buyer_account" className="account-btn">
                  My Account
                </Link>
              </li>
              <li>
                <Link to="/buyer_payment_options" className="account-btn">
                  Banks &amp; Cards
                </Link>
              </li>
              <li>
                <Link to="/buyer_address" className="account-btn">
                  Addresses
                </Link>
              </li>
            </ul>
            <button type="button" className="logout-btn sidebar-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        <main className="main-container">
          <section className="payment-options-box">
            <h2>Select Your Payment Methods</h2>
            <form className="payment-form" onSubmit={handleSubmit}>
              {message && <p className="info-message">{message}</p>}
              {error && <p className="error-message">{error}</p>}
              <div className="payment-options">
                {loading ? (
                  <p className="loading-text">Loading payment methods…</p>
                ) : (
                  methods.map((method) => {
                    const state = formState[method.name] ?? { enabled: false, account: '' }
                    const methodId = makeId(method.name)
                    return (
                      <article key={method.name} className={`payment-option ${state.enabled ? 'active' : ''}`}>
                        <label className="payment-row" htmlFor={`method-${methodId}`}>
                          <input
                            type="checkbox"
                            id={`method-${methodId}`}
                            checked={state.enabled}
                            onChange={() => handleToggleMethod(method.name)}
                            className="custom-checkbox"
                          />
                          <span className="payment-label">{method.name}</span>
                        </label>
                        {method.name !== CASH_ONLY_METHOD ? (
                          <div className="account-number" style={{ display: state.enabled ? 'block' : 'none' }}>
                            <label htmlFor={`account-${methodId}`}>Account Number</label>
                            <input
                              id={`account-${methodId}`}
                              type="text"
                              placeholder="Account number"
                              value={state.account}
                              onChange={(event) => handleAccountChange(method.name, event.target.value)}
                              disabled={!state.enabled}
                            />
                          </div>
                        ) : (
                          <p className="account-hint">No account number needed for cash payments.</p>
                        )}
                      </article>
                    )
                  })
                )}
              </div>
              <button
                type="submit"
                className="save"
                disabled={saving || loading || activeMethods.length === 0}
              >
                {saving ? 'Saving…' : 'SAVE PAYMENT OPTIONS'}
              </button>
            </form>
          </section>
        </main>
      </div>

      <section className="newsletter" id="contacts">
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

      <footer className="main-footer">
        <div className="footer-content">
          <div className="footer-about">
            <img src="/images/logo.png" alt="AngkatAni Logo" className="logo-icon" />
            AngkatAni
            <p>Empowering farmers and connecting communities through sustainable commerce.</p>
            <p>
              <strong>09271674524</strong>
              <br /> angkatani@.com
            </p>
          </div>
          <div className="footer-columns">
            <div>
              <h5>My Account</h5>
              <ul>
                <li>My Account</li>
                <li>Order History</li>
                <li>Shopping Cart</li>
                <li>Wishlist</li>
              </ul>
            </div>
            <div>
              <h5>Help</h5>
              <ul>
                <li>Contact</li>
                <li>FAQs</li>
                <li>Terms &amp; Conditions</li>
                <li>Privacy Policy</li>
              </ul>
            </div>
            <div>
              <h5>Proxy</h5>
              <ul>
                <li>About</li>
                <li>Shop</li>
                <li>Product</li>
                <li>Track Order</li>
              </ul>
            </div>
            <div>
              <h5>Categories</h5>
              <ul>
                <li>Order History</li>
                <li>Shopping Cart</li>
                <li>Wishlist</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default BuyerPaymentOptions
