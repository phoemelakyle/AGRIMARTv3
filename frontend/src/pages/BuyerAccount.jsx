import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { fetchBuyerAccount, logoutUser, updateBuyerAccount } from '../api/agrimartApi'
import logoImage from '../assets/logo.png'
import './BuyerAccount.css'

const fieldDefinitions = [
  { id: 'username', label: 'Username' },
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone Number' },
]

const BuyerAccount = () => {
  const [buyer, setBuyer] = useState(null)
  const [formValues, setFormValues] = useState({ username: '', name: '', email: '', phone: '' })
  const [editing, setEditing] = useState({})
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    const loadBuyer = async () => {
      const response = await fetchBuyerAccount()
      if (!mounted) return
      if (response.ok && response.body?.buyer) {
        const buyerData = response.body.buyer
        setBuyer(buyerData)
        setFormValues({
          username: buyerData.username || '',
          name: buyerData.name || '',
          email: buyerData.email || '',
          phone: buyerData.phone || '',
        })
        setFeedback({ type: '', message: '' })
      } else {
        setFeedback({
          type: 'error',
          message: response.body?.message || 'Unable to load account data.',
        })
      }
      setLoading(false)
    }
    loadBuyer()
    return () => {
      mounted = false
    }
  }, [])

  const handleEdit = (fieldId) => {
    setEditing((prev) => ({ ...prev, [fieldId]: true }))
  }

  const handleChange = (fieldId, value) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setFeedback({ type: '', message: '' })

    const response = await updateBuyerAccount(formValues)
    if (response.ok && response.body?.buyer) {
      const updatedBuyer = response.body.buyer
      setBuyer(updatedBuyer)
      setFormValues({
        username: updatedBuyer.username || '',
        name: updatedBuyer.name || '',
        email: updatedBuyer.email || '',
        phone: updatedBuyer.phone || '',
      })
      setFeedback({ type: 'success', message: 'Profile updated — well done!' })
      setEditing({})
    } else {
      setFeedback({ type: 'error', message: response.body?.message || 'Unable to save changes.' })
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
  }

  return (
    <>
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
            <span className="button">Account</span>
          </li>
        </ul>
        <div className="icons" />
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
                  Banks & Cards
                </Link>
              </li>
              <li>
                <Link to="/buyer_address" className="account-btn">
                  Addresses
                </Link>
              </li>
            </ul>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        <section className="column-right">
          <div className="profile-content">
            <h2>My Profile</h2>
            <p className="subtitle">Manage and protect your account</p>
            <form id="profile-form" onSubmit={handleSave}>
              {fieldDefinitions.map((field) => (
                <div key={field.id} className="form-group">
                  <label htmlFor={field.id}>{field.label}:</label>
                  {editing[field.id] ? (
                    <input
                      id={field.id}
                      value={formValues[field.id]}
                      onChange={(event) => handleChange(field.id, event.target.value)}
                    />
                  ) : (
                    <span id={field.id}>{formValues[field.id] || '—'}</span>
                  )}
                  <button type="button" className="edit-btn" onClick={() => handleEdit(field.id)}>
                    <i className="fas fa-edit" /> Edit
                  </button>
                </div>
              ))}
              <button type="submit" className="save-btn" disabled={saving || loading}>
                {saving ? 'Saving…' : 'Save All Changes'}
              </button>
              {feedback.message && (
                <p className={`feedback ${feedback.type}`}>{feedback.message}</p>
              )}
              {loading && <p className="feedback">Loading account details…</p>}
            </form>
          </div>
        </section>
      </div>

      <section className="newsletter" id="contacts">
        <div className="newsletter-content">
          <div className="newsletter-text">
            <h3>
              <i className="fas fa-envelope" /> Subscribe to our Newsletter
            </h3>
            <p>Stay connected with the latest updates and local farm offers.</p>
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

      <footer className="main-footer">
          <div className="footer-content">
            <div className="footer-about">
              <img src={logoImage} alt="AngkatAni Logo" className="logo-icon" />
            <div>AngkatAni</div>
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
    </>
  )
}

export default BuyerAccount
