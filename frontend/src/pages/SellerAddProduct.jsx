import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  checkSellerPaymentOptions,
  createSellerProduct,
  fetchCategories,
  fetchSellerAddresses,
  logoutUser,
} from '../api/agrimartApi'
import logoImage from '../assets/images/logo.png'
import './SellerAddProduct.css'

const SHIPPING_FACTOR = 5000
const SHIPPING_RATE = 50
const BASE_VARIATION = { unit: '', price: '', quantity: '' }
const INITIAL_FORM = {
  productName: '',
  weight: '',
  packagingLength: '',
  packagingWidth: '',
  packagingHeight: '',
  category: '',
}

const calculateShippingFee = (weight, length, width, height) => {
  const w = Number(weight) || 0
  const l = Number(length) || 0
  const wi = Number(width) || 0
  const h = Number(height) || 0
  const volumetric = (l * wi * h) / SHIPPING_FACTOR
  return Math.max(w, volumetric) * SHIPPING_RATE
}

const formatCurrency = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? `P${number.toFixed(2)}` : 'P0.00'
}

const SellerAddProduct = () => {
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [variations, setVariations] = useState([{ ...BASE_VARIATION }])
  const [categories, setCategories] = useState([])
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState('')
  const [error, setError] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [paymentReady, setPaymentReady] = useState(true)
  const navigate = useNavigate()

  const shippingFee = useMemo(
    () => calculateShippingFee(formData.weight, formData.packagingLength, formData.packagingWidth, formData.packagingHeight),
    [formData.weight, formData.packagingLength, formData.packagingWidth, formData.packagingHeight],
  )

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const categoriesResponse = await fetchCategories()
      if (categoriesResponse.ok) {
        setCategories(categoriesResponse.body.categories || [])
      }
      const addressesResponse = await fetchSellerAddresses()
      if (addressesResponse.ok) {
        const fetched = addressesResponse.body.addresses || []
        setAddresses(fetched)
        const defaultAddress = fetched.find((addr) => addr.IsDefaultInt === 1) || fetched[0] || null
        setSelectedAddress(defaultAddress)
      }
      const paymentResponse = await checkSellerPaymentOptions()
      const hasPayment = paymentResponse.ok && paymentResponse.body?.hasPayment
      setPaymentReady(hasPayment)
      if (!hasPayment) {
        setError('Set up payment options before adding a product.')
      }
    } catch (err) {
      setError('Unable to load seller data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleVariationChange = (index, field, value) => {
    setVariations((prev) => prev.map((variation, idx) => (idx === index ? { ...variation, [field]: value } : variation)))
  }

  const handleAddVariation = () => {
    setVariations((prev) => [...prev, { ...BASE_VARIATION }])
  }

  const handleRemoveVariation = (index) => {
    setVariations((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    setImageFile(file || null)
    if (!file) {
      setImagePreview(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotification('')
    if (!paymentReady) {
      setError('Configure payment options first.')
      return
    }
    if (!formData.category) {
      setError('Please select a category.')
      return
    }
    if (!selectedAddress) {
      setError('Please select an address before submitting.')
      return
    }
    const hasValidVariation = variations.some((variation) => {
      const price = Number(variation.price)
      const quantity = Number(variation.quantity)
      return Number.isFinite(price) && Number.isFinite(quantity) && price >= 0 && quantity >= 0
    })
    if (!hasValidVariation) {
      setError('Add at least one variation with valid price and quantity.')
      return
    }

    const formPayload = new FormData()
    formPayload.append('Product_Name', formData.productName.trim())
    formPayload.append('Weight', formData.weight)
    formPayload.append('Packaging_Length', formData.packagingLength)
    formPayload.append('Packaging_Width', formData.packagingWidth)
    formPayload.append('Packaging_Height', formData.packagingHeight)
    formPayload.append('Category', formData.category)
    formPayload.append('AddressID', selectedAddress.AddressID)
    formPayload.append('variations', JSON.stringify(variations))
    if (imageFile) {
      formPayload.append('Image', imageFile)
    }

    setSubmitting(true)
    const response = await createSellerProduct(formPayload)
    setSubmitting(false)
    if (response.ok) {
      setNotification('Product created successfully.')
      setFormData(INITIAL_FORM)
      setVariations([{ ...BASE_VARIATION }])
      setImageFile(null)
      setImagePreview(null)
      loadData()
    } else {
      setError(response.body?.message || 'Unable to create product right now.')
    }
  }

  const handleSelectAddress = (address) => {
    setSelectedAddress(address)
    setAddressModalOpen(false)
  }

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
  }

  return (
    <div className="seller-add-product-page">
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
            <Link to="/homepage_seller" className="home-link">
              <i className="fas fa-home" />
            </Link>
          </li>
          <li>›</li>
          <li>
            <button type="button" className="button">
              Add Product
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
            <h3>SELLER MENU</h3>
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
                <span className="status-item active">
                  <i className="fas fa-plus-circle" /> Add Product
                </span>
              </li>
              <li>
                <Link to="/dashboard" className="status-item">
                  <i className="fas fa-tachometer-alt" /> Dashboard
                </Link>
              </li>
              <li>
                <Link to="/seller_account" className="status-item">
                  <i className="fas fa-cog"/> Settings
                </Link>
              </li>
            </ul>
          </div>
        </aside>

        <div className="product-card">
          <h1>ADD PRODUCT</h1>
          {notification && <p className="info-message">{notification}</p>}
          {error && <p className="error-message">{error}</p>}
          {loading ? (
            <p className="info-message">Preparing the form...</p>
          ) : (
            <form className="add-product-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <label>
                  Product Name
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(event) => handleInputChange('productName', event.target.value)}
                    required
                  />
                </label>
                <label>
                  Category
                  <select
                    value={formData.category}
                    onChange={(event) => handleInputChange('category', event.target.value)}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.categoryId} value={category.categoryId}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Weight (kg)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.weight}
                    onChange={(event) => handleInputChange('weight', event.target.value)}
                    required
                  />
                </label>
                <label>
                  Packaging Length (cm)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.packagingLength}
                    onChange={(event) => handleInputChange('packagingLength', event.target.value)}
                    required
                  />
                </label>
                <label>
                  Packaging Width (cm)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.packagingWidth}
                    onChange={(event) => handleInputChange('packagingWidth', event.target.value)}
                    required
                  />
                </label>
                <label>
                  Packaging Height (cm)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.packagingHeight}
                    onChange={(event) => handleInputChange('packagingHeight', event.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="variation-section">
                <div className="variation-header">
                  <h3>Product Variations</h3>
                  <button type="button" className="button1" onClick={handleAddVariation}>
                    ADD VARIATION
                  </button>
                </div>
                {variations.map((variation, index) => (
                  <div className="variation-row" key={`variation-${index}`}>
                    <input
                      type="text"
                      placeholder="Unit (e.g. 1kg)"
                      value={variation.unit}
                      onChange={(event) => handleVariationChange(index, 'unit', event.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      min="0"
                      step="0.01"
                      value={variation.price}
                      onChange={(event) => handleVariationChange(index, 'price', event.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Quantity"
                      min="0"
                      step="1"
                      value={variation.quantity}
                      onChange={(event) => handleVariationChange(index, 'quantity', event.target.value)}
                    />
                    {variations.length > 1 && (
                      <button type="button" className="remove-btn" onClick={() => handleRemoveVariation(index)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="address-section">
                <div className="section-header">
                  <h3>Address</h3>
                  <div>
                    <button type="button" className="button2" onClick={() => setAddressModalOpen(true)}>
                      Change Address
                    </button>
                    <button type="button" className="button2" onClick={() => navigate('/seller_address')}>
                      Manage Addresses
                    </button>
                  </div>
                </div>
                <div className="default-address">
                  <p>{selectedAddress ? selectedAddress.Full_Name : 'No address selected.'}</p>
                  <p>{selectedAddress ? `${selectedAddress.Phone_Number}` : 'Add an address to continue.'}</p>
                  <p>
                    {selectedAddress
                      ? `${selectedAddress.Street}, ${selectedAddress.Municipality}, ${selectedAddress.Province}`
                      : ''}
                  </p>
                </div>
              </div>

              <div className="image-section">
                <label>
                  Product Image
                  <input type="file" accept="image/*" onChange={handleImageChange} />
                </label>
                {imagePreview && <img src={imagePreview} alt="Preview" className="image-preview" />}
              </div>

              <div className="shipping-row">
                <span>Shipping Fee</span>
                <span>{formatCurrency(shippingFee)}</span>
              </div>

              <div className="form-actions">
                <button type="submit" className="button1" disabled={submitting || !paymentReady}>
                  {submitting ? 'Saving...' : 'SUBMIT'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {addressModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <button type="button" className="close-btn" onClick={() => setAddressModalOpen(false)}>
              &times;
            </button>
            <h3>Select Address</h3>
            <div className="address-list">
              {addresses.length === 0 ? (
                <p>No addresses saved yet.</p>
              ) : (
                addresses.map((address) => (
                  <div
                    key={address.AddressID}
                    className={`address-item ${selectedAddress?.AddressID === address.AddressID ? 'selected' : ''}`}
                  >
                    <p>
                      <strong>{address.Full_Name}</strong>
                      <br />
                      {address.Phone_Number}
                    </p>
                    <p>
                      {address.Street}, {address.Municipality}, {address.Province}
                      {address.Region ? `, ${address.Region}` : ''} {address.Zip_Code}
                    </p>
                    <button type="button" className="button2" onClick={() => handleSelectAddress(address)}>
                      Use Address
                    </button>
                  </div>
                ))
              )}
            </div>
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

export default SellerAddProduct
