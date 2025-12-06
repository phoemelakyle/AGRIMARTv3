import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  deleteBuyerAddress,
  fetchBuyerAddresses,
  fetchCategories,
  logoutUser,
  createBuyerAddress,
  setDefaultBuyerAddress,
  updateBuyerAddress,
} from '../api/agrimartApi'
import './BuyerAddress.css'

const DEFAULT_FORM_STATE = {
  fullName: '',
  phoneNumber: '',
  street: '',
  municipality: '',
  province: '',
  region: '',
  zipCode: '',
  latitude: '',
  longitude: '',
}

const BuyerAddress = () => {
  const [addresses, setAddresses] = useState([])
  const [categories, setCategories] = useState([])
  const [formState, setFormState] = useState(DEFAULT_FORM_STATE)
  const [formOpen, setFormOpen] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState('')
  const [error, setError] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()

  const loadAddresses = async () => {
    setLoading(true)
    setError('')
    const response = await fetchBuyerAddresses()
    if (response.ok) {
      setAddresses(response.body.addresses || [])
    } else {
      setError(response.body?.message || 'Unable to load addresses right now.')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAddresses()
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadCategories = async () => {
      const response = await fetchCategories()
      if (cancelled) return
      if (response.ok) {
        setCategories(response.body.categories || [])
      }
    }
    loadCategories()
    return () => {
      cancelled = true
    }
  }, [])

  const openForm = () => {
    setFormState(DEFAULT_FORM_STATE)
    setEditingAddressId(null)
    setFormOpen(true)
    setNotification('')
    setError('')
  }

  const openEditForm = (address) => {
    setFormState({
      fullName: address.fullName || '',
      phoneNumber: address.phoneNumber || '',
      street: address.street || '',
      municipality: address.municipality || '',
      province: address.province || '',
      region: address.region || '',
      zipCode: address.zipCode || '',
      latitude: address.latitude?.toString() ?? '',
      longitude: address.longitude?.toString() ?? '',
    })
    setEditingAddressId(address.addressId)
    setFormOpen(true)
    setNotification('')
    setError('')
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingAddressId(null)
  }

  const handleChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotification('')
    const payload = {
      ...formState,
      latitude: formState.latitude || 0,
      longitude: formState.longitude || 0,
    }
    const action = editingAddressId
      ? updateBuyerAddress(editingAddressId, payload)
      : createBuyerAddress(payload)
    const response = await action
    setSaving(false)
    if (response.ok) {
      setNotification(editingAddressId ? 'Address updated.' : 'Address saved.')
      closeForm()
      loadAddresses()
    } else {
      setError(response.body?.message || 'Unable to save address right now.')
    }
  }

  const handleDelete = async (addressId) => {
    if (!window.confirm('Delete this address?')) {
      return
    }
    setError('')
    setNotification('')
    const response = await deleteBuyerAddress(addressId)
    if (response.ok) {
      setNotification('Address deleted.')
      loadAddresses()
    } else {
      setError(response.body?.message || 'Unable to delete address.')
    }
  }

  const handleSetDefault = async (addressId) => {
    setError('')
    setNotification('')
    const response = await setDefaultBuyerAddress(addressId)
    if (response.ok) {
      setNotification('Default address updated.')
      loadAddresses()
    } else {
      setError(response.body?.message || 'Unable to update default address.')
    }
  }

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
  }

  const addressLine = (address) =>
    [address.street, address.municipality, address.province, address.region, address.zipCode]
      .filter(Boolean)
      .join(', ')

  return (
    <div className="buyer-address-page">
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
            <Link to="/buyer_address" className="button">
              Address
            </Link>
          </li>
        </ul>
        <div className="icons">
          <span className="cart">
            <Link to="/cart" className="cart-link">
              <i className="fas fa-shopping-cart" />
            </Link>
          </span>
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
          <div className="category-filter">
            <h3>CATEGORIES</h3>
            <ul className="category-list">
              <li>
                <button type="button" className="category-item" onClick={() => navigate('/homepage_buyer')}>
                  All Products
                </button>
              </li>
              {categories.map((category) => (
                <li key={category.categoryId ?? category.CategoryID}>
                  <button type="button" className="category-item" onClick={() => navigate('/homepage_buyer')}>
                    {category.name ?? category.Category_Name}
                  </button>
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
                <Link className="status-item" to="/cart">
                  <i className="fas fa-shopping-cart" /> Cart
                </Link>
              </li>
              <li>
                <Link className="status-item" to="/buyer_payment_options">
                  <i className="fas fa-wallet" /> Payment Methods
                </Link>
              </li>
              <li>
                <Link className="status-item" to="/buyer_address">
                  <i className="fas fa-map-marker-alt" /> Addresses
                </Link>
              </li>
            </ul>
          </div>
        </aside>

        <div className="column-right">
          <div className="profile-header">
            <h2>My Addresses</h2>
            <button className="add-btn" type="button" onClick={openForm}>
              + Add New Address
            </button>
          </div>

          {notification && <p className="info-message">{notification}</p>}
          {error && <p className="error-message">{error}</p>}

          {loading ? (
            <p className="status-message">Loading addresses…</p>
          ) : addresses.length === 0 ? (
            <p className="status-message">No saved addresses yet.</p>
          ) : (
            <div className="saved-addresses">
              {addresses.map((address) => (
                <article key={address.addressId} className={`address-card ${address.isDefault ? 'default' : ''}`}>
                  <div className="address-title">
                    <div>
                      <strong>{address.fullName}</strong>
                      <p>{address.phoneNumber}</p>
                    </div>
                    {address.isDefault && <span className="default-chip">Default</span>}
                  </div>
                  <p>{addressLine(address)}</p>
                  <div className="address-actions">
                    <button type="button" className="button1" onClick={() => openEditForm(address)}>
                      Edit
                    </button>
                    <button type="button" className="button1 cancel-btn" onClick={() => handleDelete(address.addressId)}>
                      Delete
                    </button>
                    {!address.isDefault && (
                      <button type="button" className="button1" onClick={() => handleSetDefault(address.addressId)}>
                        Set default
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <div className="modal">
          <div className="modal-content">
            <button type="button" className="close" onClick={closeForm}>
              &times;
            </button>
            <h3>{editingAddressId ? 'Edit Address' : 'Add New Address'}</h3>
            <form onSubmit={handleSubmit} className="address-form">
              <input
                type="text"
                placeholder="Full Name"
                value={formState.fullName}
                onChange={(event) => handleChange('fullName', event.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={formState.phoneNumber}
                onChange={(event) => handleChange('phoneNumber', event.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Street"
                value={formState.street}
                onChange={(event) => handleChange('street', event.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Municipality"
                value={formState.municipality}
                onChange={(event) => handleChange('municipality', event.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Province"
                value={formState.province}
                onChange={(event) => handleChange('province', event.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Region"
                value={formState.region}
                onChange={(event) => handleChange('region', event.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Zip Code"
                value={formState.zipCode}
                onChange={(event) => handleChange('zipCode', event.target.value)}
                required
              />
              <div className="latlng-row">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={formState.latitude}
                  onChange={(event) => handleChange('latitude', event.target.value)}
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={formState.longitude}
                  onChange={(event) => handleChange('longitude', event.target.value)}
                />
              </div>
              <button type="submit" className="button1" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </form>
          </div>
        </div>
      )}

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

export default BuyerAddress
