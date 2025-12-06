import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSellerAccount, logoutUser, updateSellerAccount } from '../api/agrimartApi'
import logoImage from '../assets/images/logo.png'
import './SellerAccount.css'

const SellerAccountPage = () => {
  const [formData, setFormData] = useState({ username: '', name: '', email: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState('')
  const [error, setError] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const loadAccount = async () => {
      setLoading(true)
      setError('')
      const response = await fetchSellerAccount()
      if (response.ok) {
        const seller = response.body?.seller
        if (seller) {
          setFormData({
            username: seller.Username || '',
            name: seller.Name || '',
            email: seller.Email || '',
            phone: seller.Phone_Number || '',
          })
        }
      } else {
        setError(response.body?.message || 'Unable to load profile right now.')
      }
      setLoading(false)
    }
    loadAccount()
  }, [])

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotification('')
    setSaving(true)
    const response = await updateSellerAccount({
      username: formData.username.trim(),
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
    })
    setSaving(false)
    if (response.ok) {
      setNotification('Profile updated successfully.')
      const updated = response.body?.seller
      if (updated) {
        setFormData({
          username: updated.Username || '',
          name: updated.Name || '',
          email: updated.Email || '',
          phone: updated.Phone_Number || '',
        })
      }
    } else {
      setError(response.body?.message || 'Unable to save changes right now.')
    }
  }

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
  }

  return (
    <div className="seller-account-page">
      <header className="top-bar">
        <div className="logo">
          <img src={logoImage} alt="AngkatAni" className="logo-icon" />
          AngkatAni
        </div>
        <div className="tagline">Connecting you to Local Farmers</div>
      </header>

      <nav className="nav-menu">
        <ul>
          <li>
            <button type="button" onClick={() => navigate('/homepage_seller')}>
              Home
            </button>
          </li>
          <li>
            <a href="#contacts">Contacts</a>
          </li>
        </ul>
      </nav>

      <nav className="main-nav">
        <ul className="breadcrumb">
          <li>
            <button type="button" onClick={() => navigate('/homepage_seller')}>
              <i className="fas fa-home" />
            </button>
          </li>
          <li>›</li>
          <li>
            <button type="button" className="button">
              Account
            </button>
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
            <h3>ACCOUNT</h3>
            <ul className="status-list">
              <li>
                <button type="button" className="account-btn active">
                  My Account
                </button>
              </li>
              <li>
                <button type="button" className="account-btn" onClick={() => navigate('/seller_payment_options')}>
                  Banks &amp; Cards
                </button>
              </li>
              <li>
                <button type="button" className="account-btn" onClick={() => navigate('/seller_address')}>
                  Addresses
                </button>
              </li>
              <li>
                <button type="button" className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </aside>

        <section className="profile-content">
          <div className="profile-header">
            <h2>My Profile</h2>
            <p className="subtitle">Manage and protect your account</p>
          </div>
          {notification && <p className="info-message">{notification}</p>}
          {error && <p className="error-message">{error}</p>}
          {loading ? (
            <p className="info-message">Loading profile…</p>
          ) : (
            <form className="profile-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(event) => handleInputChange('username', event.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => handleInputChange('name', event.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => handleInputChange('email', event.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(event) => handleInputChange('phone', event.target.value)}
                  required
                />
              </div>
              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? 'Saving...' : 'Save All Changes'}
              </button>
            </form>
          )}
        </section>
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

export default SellerAccountPage
