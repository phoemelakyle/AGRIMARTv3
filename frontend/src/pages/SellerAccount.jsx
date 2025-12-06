import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSellerAccount, logoutUser, updateSellerAccount } from '../api/agrimartApi'
import './SellerAccount.css'

const SellerAccount = () => {
  const { user, logout, initializing } = useAuth()
  const navigate = useNavigate()
  const [seller, setSeller] = useState(null)
  const [formState, setFormState] = useState({ username: '', name: '', email: '', phone: '' })
  const [editableFields, setEditableFields] = useState({})
  const [status, setStatus] = useState({ loading: true, error: '', success: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const loadSellerProfile = useCallback(async () => {
    setStatus({ loading: true, error: '', success: '' })
    const response = await fetchSellerAccount()
    if (response.ok) {
      setSeller(response.body.seller)
      setStatus((prev) => ({ ...prev, loading: false }))
      setEditableFields({})
    } else {
      setStatus({ loading: false, error: response.body?.message || 'Unable to load profile.', success: '' })
    }
  }, [])

  useEffect(() => {
    if (!initializing && !user) {
      navigate('/login')
      return
    }

    if (user) {
      loadSellerProfile()
    }
  }, [user, initializing, navigate, loadSellerProfile])

  useEffect(() => {
    if (seller) {
      setFormState({
        username: seller.Username || '',
        name: seller.Name || '',
        email: seller.Email || '',
        phone: seller.Phone_Number || '',
      })
    }
  }, [seller])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleToggleField = (field) => {
    setEditableFields((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const handleInputChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setStatus((prev) => ({ ...prev, error: '', success: '' }))
    const response = await updateSellerAccount(formState)
    setIsSaving(false)
    if (response.ok) {
      setSeller(response.body.seller)
      setStatus({ loading: false, error: '', success: 'Profile updated successfully!' })
      setEditableFields({})
    } else {
      setStatus({ loading: false, error: response.body?.message || 'Unable to save changes.', success: '' })
    }
  }

  return (
    <div className="seller-account-page">
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
            <Link to="/seller_account" className="button">
              Account
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
                <button type="button" onClick={handleLogout} className="logout-btn">
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
                <Link to="/seller_account" className="account-btn">
                  My Account
                </Link>
              </li>
              <li>
                <Link to="/payment_options" className="account-btn">
                  Banks &amp; Cards
                </Link>
              </li>
              <li>
                <Link to="/seller_address" className="account-btn">
                  Addresses
                </Link>
              </li>
              <li>
                <button type="button" className="logout-btn-link" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </aside>

        <section className="profile-content">
          <h2>My Profile</h2>
          <p className="subtitle">Manage and protect your account</p>
          {status.loading && <p className="info-message">Loading profile...</p>}
          {status.error && <p className="error-message">{status.error}</p>}
          {status.success && <p className="success-message">{status.success}</p>}
          <form className="profile-form" onSubmit={handleSaveProfile}>
            {PROFILE_FIELDS.map((field) => (
              <div className="form-group" key={field.id}>
                <label htmlFor={field.id}>{field.label}</label>
                <div className="field-row">
                  {editableFields[field.id] ? (
                    <input
                      id={field.id}
                      type={field.id === 'phone' ? 'tel' : field.id === 'email' ? 'email' : 'text'}
                      value={formState[field.id]}
                      onChange={(event) => handleInputChange(field.id, event.target.value)}
                    />
                  ) : (
                    <span className="field-value">{formState[field.id] || '—'}</span>
                  )}
                  <button
                    type="button"
                    className="edit-btn"
                    onClick={() => handleToggleField(field.id)}
                  >
                    <i className="fas fa-edit" />
                    {editableFields[field.id] ? ' Done' : ' Edit'}
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" className="save-btn" disabled={isSaving || status.loading}>
              {isSaving ? 'Saving...' : 'Save All Changes'}
            </button>
          </form>
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
          <form className="newsletter-form">
            <input type="email" placeholder="Your email address" required />
            <button type="submit">Subscribe</button>
          </form>
          <div className="social-icons">
            <a href="#"><i className="fab fa-facebook-f" /></a>
            <a href="#"><i className="fab fa-twitter" /></a>
            <a href="#"><i className="fab fa-instagram" /></a>
          </div>
        </div>
      </section>

    </div>
  )
}

export default SellerAccount
