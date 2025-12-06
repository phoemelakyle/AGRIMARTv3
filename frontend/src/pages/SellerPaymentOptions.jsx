import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchSellerPaymentOptions, logoutUser, saveSellerPaymentOptions } from '../api/agrimartApi'
import './SellerPaymentOptions.css'

const ACCOUNT_METHODS = new Set(['GCash', 'Paymaya', 'BDO', 'BPI'])
const DEFAULT_METHOD_LOGOS = {
  GCash: '/images/GCash.png',
  Paymaya: '/images/Paymaya.png',
  BDO: '/images/BDO.png',
  BPI: '/images/BPI.png',
}

const SellerPaymentOptions = () => {
  const [methods, setMethods] = useState([])
  const [selectedOptions, setSelectedOptions] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState('')
  const [error, setError] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()

  const loadOptions = useCallback(async () => {
    setLoading(true)
    setError('')
    const response = await fetchSellerPaymentOptions()
    if (response.ok) {
      setMethods(response.body.methods || [])
      setSelectedOptions(response.body.active_options || {})
    } else {
      setError(response.body?.message || 'Unable to load payment methods.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  const handleCheckbox = (method, checked) => {
    setSelectedOptions((prev) => {
      const next = { ...prev }
      if (checked) {
        next[method] = next[method] ?? ''
      } else {
        delete next[method]
      }
      return next
    })
  }

  const handleAccountChange = (method, value) => {
    setSelectedOptions((prev) => ({ ...prev, [method]: value }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotification('')
    const response = await saveSellerPaymentOptions(selectedOptions)
    setSaving(false)
    if (response.ok) {
      setNotification(response.body?.message || 'Payment options saved successfully.')
      loadOptions()
    } else {
      setError(response.body?.message || 'Unable to save payment options.')
    }
  }

  const isMethodSelected = (method) => method in selectedOptions

  const statusMessage = useMemo(() => {
    if (notification) {
      return { type: 'info', text: notification }
    }
    if (error) {
      return { type: 'error', text: error }
    }
    return null
  }, [notification, error])

  return (
    <div className="seller-payment-options-page">
      <header className="top-bar">
        <div className="logo">
          <img src="/images/logo.png" alt="AngkatAni" className="logo-icon" />
          AngkatAni
        </div>
        <div className="tagline">Connecting you to Local Farmers</div>
      </header>

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
            <Link to="/seller_payment_options" className="button">
              Payment Options
            </Link>
          </li>
        </ul>
        <div className="icons">
          <div className="user-dropdown">
            <span className="user" onClick={() => setUserMenuOpen((prev) => !prev)}>
              <i className="fas fa-user" />
            </span>
            {userMenuOpen && (
              <div className="user-menu">
                <button
                  type="button"
                  className="logout-btn"
                  onClick={async () => {
                    await logoutUser()
                    navigate('/login')
                  }}
                >
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
            <h3>ACCOUNT</h3>
            <ul className="status-list">
              <li>
                <button className="account-btn" type="button" onClick={() => navigate('/seller_account')}>
                  My Account
                </button>
              </li>
              <li>
                <button className="account-btn" type="button" onClick={() => navigate('/seller_payment_options')}>
                  Banks &amp; Cards
                </button>
              </li>
              <li>
                <button className="account-btn" type="button" onClick={() => navigate('/seller_address')}>
                  Addresses
                </button>
              </li>
              <li>
                <button className="logout-btn" type="button" onClick={async () => { await logoutUser(); navigate('/login') }}>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </aside>

        <main className="main-container">
          <section className="payment-options-box">
            <h2>Select Your Payment Methods</h2>
            {statusMessage && (
              <p className={statusMessage.type === 'error' ? 'error-message' : 'info-message'}>
                {statusMessage.text}
              </p>
            )}
            <form onSubmit={handleSave}>
              <div className="payment-options">
                {loading ? (
                  <p className="info-message">Loading payment methods...</p>
                ) : (
                  methods.map((method) => (
                    <div className="payment-option" key={method.name}>
                      <label>
                        <input
                          type="checkbox"
                          checked={isMethodSelected(method.name)}
                          onChange={(event) => handleCheckbox(method.name, event.target.checked)}
                        />
                        <strong>{method.name}</strong>
                      </label>
                      {ACCOUNT_METHODS.has(method.name) && (
                        <div
                          className="payment-info"
                          style={{ display: isMethodSelected(method.name) ? 'block' : 'none' }}
                        >
                          <img src={DEFAULT_METHOD_LOGOS[method.name] ?? '/images/default-payment.png'} alt={method.name} className="payment-logo" />
                        </div>
                      )}
                      {ACCOUNT_METHODS.has(method.name) && isMethodSelected(method.name) && (
                        <div className="account-number">
                          <label htmlFor={`account_number_${method.name}`}>Account Number:</label>
                          <input
                            id={`account_number_${method.name}`}
                            type="text"
                            value={selectedOptions[method.name] || ''}
                            onChange={(event) => handleAccountChange(method.name, event.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <button type="submit" className="save" disabled={saving}>
                {saving ? 'Saving...' : 'SAVE PAYMENT OPTIONS'}
              </button>
            </form>
          </section>
        </main>
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
            <a href="#">
              <i className="fab fa-facebook-f" />
            </a>
            <a href="#">
              <i className="fab fa-twitter" />
            </a>
            <a href="#">
              <i className="fab fa-instagram" />
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}

export default SellerPaymentOptions
