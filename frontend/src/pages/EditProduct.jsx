import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../context/AuthContext'
import {
  addSellerProductVariation,
  assignProductAddress,
  deleteSellerProductVariation,
  fetchProductDetail,
  fetchSellerAddresses,
  updateSellerProduct,
  updateSellerProductVariation,
} from '../api/agrimartApi'
import './EditProduct.css'

const SHIPPING_FACTOR = 5000
const SHIPPING_RATE = 50

const formatCurrency = (value) => {
  if (value == null || Number.isNaN(Number(value))) {
    return '—'
  }
  return `₱${Number(value).toFixed(2)}`
}

const safeNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const EditProduct = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [product, setProduct] = useState(null)
  const [formState, setFormState] = useState({
    name: '',
    weight: '',
    packagingLength: '',
    packagingWidth: '',
    packagingHeight: '',
  })
  const [variations, setVariations] = useState([])
  const [draftVariations, setDraftVariations] = useState([])
  const [loadingProduct, setLoadingProduct] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [variationLoadingId, setVariationLoadingId] = useState('')
  const [addresses, setAddresses] = useState([])
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressError, setAddressError] = useState('')

  const hydrateProduct = (payload) => {
    if (!payload) {
      return
    }
    setProduct(payload)
    setFormState({
      name: payload.productName ?? '',
      weight: payload.weight ?? '',
      packagingLength: payload.packagingLength ?? '',
      packagingWidth: payload.packagingWidth ?? '',
      packagingHeight: payload.packagingHeight ?? '',
    })
    setVariations(
      (payload.variations ?? []).map((variation) => ({
        variationId: variation.variationId,
        unit: variation.unit ?? '',
        price: variation.price ?? '',
        quantity: variation.quantity ?? '',
      })),
    )
  }

  const loadProduct = async () => {
    const response = await fetchProductDetail(productId)
    if (response.ok && response.body?.product) {
      hydrateProduct(response.body.product)
      return response
    }
    return response
  }

  useEffect(() => {
    let mounted = true
    const run = async () => {
      setLoadingProduct(true)
      setStatusMessage('')
      setErrorMessage('')
      const response = await loadProduct()
      if (!mounted) {
        return
      }
      if (!response || !response.ok) {
        setErrorMessage(response?.body?.message || 'Unable to load product details.')
      }
      setLoadingProduct(false)
    }
    run()
    return () => {
      mounted = false
    }
  }, [productId])

  const shippingPreview = useMemo(() => {
    const weight = safeNumber(formState.weight)
    const length = safeNumber(formState.packagingLength)
    const width = safeNumber(formState.packagingWidth)
    const height = safeNumber(formState.packagingHeight)
    if ([weight, length, width, height].some((value) => value == null || value <= 0)) {
      return null
    }
    const volumetricWeight = (length * width * height) / SHIPPING_FACTOR
    return Math.max(weight, volumetricWeight) * SHIPPING_RATE
  }, [formState])

  const dispatchShipping = shippingPreview ?? safeNumber(product?.shippingFee)

  const handleProductChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const refreshProduct = async () => {
    const response = await loadProduct()
    if (!response.ok) {
      setErrorMessage(response.body?.message || 'Unable to reload product data.')
    }
  }

  const handleProductSubmit = async (event) => {
    event.preventDefault()
    setStatusMessage('')
    setErrorMessage('')
    setLoadingProduct(true)
    const response = await updateSellerProduct(productId, formState)
    setLoadingProduct(false)
    if (response.ok && response.body?.success) {
      setStatusMessage('Product metadata saved. Shipping fee recalculated automatically.')
      refreshProduct()
    } else {
      setErrorMessage(response.body?.message || 'Unable to save product information right now.')
    }
  }

  const handleVariationChange = (index, field, value) => {
    setVariations((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleVariationSave = async (variationId, variation) => {
    setVariationLoadingId(variationId)
    const response = await updateSellerProductVariation(productId, variationId, variation)
    setVariationLoadingId('')
    if (response.ok && response.body?.success) {
      setStatusMessage('Variation updated.')
      refreshProduct()
      return
    }
    setErrorMessage(response.body?.message || 'Unable to update variation.')
  }

  const handleVariationDelete = async (variationId) => {
    if (!window.confirm('Delete this variation for good?')) {
      return
    }
    setVariationLoadingId(variationId)
    const response = await deleteSellerProductVariation(productId, variationId)
    setVariationLoadingId('')
    if (response.ok && response.body?.success) {
      setStatusMessage('Variation removed.')
      refreshProduct()
      return
    }
    setErrorMessage(response.body?.message || 'Unable to delete variation.')
  }

  const handleAddDraftVariation = () => {
    setDraftVariations((prev) => [...prev, { id: Date.now(), unit: '', price: '', quantity: '' }])
  }

  const handleDraftChange = (id, field, value) => {
    setDraftVariations((prev) => prev.map((draft) => (draft.id === id ? { ...draft, [field]: value } : draft)))
  }

  const handleDraftSave = async (id) => {
    const draft = draftVariations.find((item) => item.id === id)
    if (!draft) {
      return
    }
    setVariationLoadingId(id)
    const response = await addSellerProductVariation(productId, draft)
    setVariationLoadingId('')
    if (response.ok && response.body?.success) {
      setDraftVariations((prev) => prev.filter((item) => item.id !== id))
      setStatusMessage('Variation added.')
      refreshProduct()
      return
    }
    setErrorMessage(response.body?.message || 'Unable to add variation.')
  }

  const handleDraftRemove = (id) => {
    setDraftVariations((prev) => prev.filter((item) => item.id !== id))
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const openAddressModal = async () => {
    if (addresses.length === 0) {
      setAddressLoading(true)
      setAddressError('')
      const response = await fetchSellerAddresses()
      setAddressLoading(false)
      if (response.ok) {
        setAddresses(response.body?.addresses ?? [])
      } else {
        setAddressError(response.body?.message || 'Unable to load addresses right now.')
        return
      }
    }
    setAddressModalOpen(true)
  }

  const closeAddressModal = () => {
    setAddressModalOpen(false)
  }

  const handleAddressSelect = async (addressId) => {
    setAddressLoading(true)
    const response = await assignProductAddress(productId, addressId)
    setAddressLoading(false)
    if (response.ok && response.body?.success) {
      setStatusMessage('Product address updated.')
      closeAddressModal()
      refreshProduct()
      return
    }
    setAddressError(response.body?.message || 'Unable to change address yet.')
  }

  const activeAddress = product?.address

  const shippingDisplay = dispatchShipping != null ? formatCurrency(dispatchShipping) : '—'

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
            <span className="button">Edit Product</span>
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
            <h3>SELLER MENU</h3>
            <ul className="status-list">
              <li>
                <Link className="status-item" to="/homepage_seller">
                  <i className="fas fa-home" /> Homepage
                </Link>
              </li>
              <li>
                <Link className="status-item" to="/seller_orders">
                  <i className="fas fa-receipt" /> Orders
                </Link>
              </li>
              <li>
                <button type="button" className="status-item" onClick={() => (window.location.href = '/add_product')}>
                  <i className="fas fa-plus-circle" /> Add Product
                </button>
              </li>
              <li>
                <Link className="status-item" to="/dashboard">
                  <i className="fas fa-tachometer-alt" /> Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </aside>
        <div className="column-right">
          <section className="product-info">
            <h1>Edit product</h1>
            {statusMessage && <p className="info-message">{statusMessage}</p>}
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {loadingProduct ? (
              <p className="info-message">Loading product data…</p>
            ) : (
              <form className="variation-table" onSubmit={handleProductSubmit}>
                <div className="form-grid">
                  <label>
                    Product name
                    <input
                      type="text"
                      name="name"
                      value={formState.name}
                      onChange={handleProductChange}
                      required
                    />
                  </label>
                  <label>
                    Weight (kg)
                    <input
                      type="number"
                      name="weight"
                      value={formState.weight}
                      onChange={handleProductChange}
                      min="0"
                      step="0.1"
                      required
                    />
                  </label>
                  <label>
                    Length (cm)
                    <input
                      type="number"
                      name="packagingLength"
                      value={formState.packagingLength}
                      onChange={handleProductChange}
                      min="0"
                      step="0.1"
                      required
                    />
                  </label>
                  <label>
                    Width (cm)
                    <input
                      type="number"
                      name="packagingWidth"
                      value={formState.packagingWidth}
                      onChange={handleProductChange}
                      min="0"
                      step="0.1"
                      required
                    />
                  </label>
                  <label>
                    Height (cm)
                    <input
                      type="number"
                      name="packagingHeight"
                      value={formState.packagingHeight}
                      onChange={handleProductChange}
                      min="0"
                      step="0.1"
                      required
                    />
                  </label>
                </div>
                <div className="shipping-preview">
                  <strong>Shipping fee preview:</strong> {shippingDisplay}
                </div>
                <div className="form-actions">
                  <button type="submit" className="button1" disabled={loadingProduct}>
                    {loadingProduct ? 'Saving…' : 'Save product metadata'}
                  </button>
                </div>
              </form>
            )}
            <div className="address-panel">
              <div>
                <h3>Assigned address</h3>
                {activeAddress ? (
                  <>
                    <p>{activeAddress.street}</p>
                    <p>
                      {activeAddress.municipality}, {activeAddress.province}
                    </p>
                    <p>
                      {activeAddress.region}, {activeAddress.zipCode}
                    </p>
                  </>
                ) : (
                  <p className="text-muted">No seller address selected yet.</p>
                )}
              </div>
              <button type="button" className="button1" onClick={openAddressModal}>
                Change address
              </button>
            </div>
          </section>

          <section className="product-info">
            <div className="flex-head">
              <h2>Variations</h2>
              <button type="button" className="button1" onClick={handleAddDraftVariation}>
                + Add variation
              </button>
            </div>
            {variations.map((variation, index) => (
              <div key={variation.variationId} className="variation-card">
                <div className="variation-fields">
                  <label>
                    Unit
                    <input
                      type="text"
                      value={variation.unit}
                      onChange={(event) => handleVariationChange(index, 'unit', event.target.value)}
                    />
                  </label>
                  <label>
                    Price
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={variation.price}
                      onChange={(event) => handleVariationChange(index, 'price', event.target.value)}
                    />
                  </label>
                  <label>
                    Quantity
                    <input
                      type="number"
                      min="0"
                      value={variation.quantity}
                      onChange={(event) => handleVariationChange(index, 'quantity', event.target.value)}
                    />
                  </label>
                </div>
                <div className="variation-actions">
                  <button
                    type="button"
                    className="button1"
                    disabled={variationLoadingId === variation.variationId}
                    onClick={() => handleVariationSave(variation.variationId, variation)}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="button1 delete-btn"
                    disabled={variationLoadingId === variation.variationId}
                    onClick={() => handleVariationDelete(variation.variationId)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {draftVariations.map((draft) => (
              <div key={draft.id} className="variation-card draft">
                <div className="variation-fields">
                  <label>
                    Unit
                    <input
                      type="text"
                      value={draft.unit}
                      onChange={(event) => handleDraftChange(draft.id, 'unit', event.target.value)}
                    />
                  </label>
                  <label>
                    Price
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.price}
                      onChange={(event) => handleDraftChange(draft.id, 'price', event.target.value)}
                    />
                  </label>
                  <label>
                    Quantity
                    <input
                      type="number"
                      min="0"
                      value={draft.quantity}
                      onChange={(event) => handleDraftChange(draft.id, 'quantity', event.target.value)}
                    />
                  </label>
                </div>
                <div className="variation-actions">
                  <button
                    type="button"
                    className="button1"
                    disabled={variationLoadingId === draft.id}
                    onClick={() => handleDraftSave(draft.id)}
                  >
                    Save
                  </button>
                  <button type="button" className="button1 delete-btn" onClick={() => handleDraftRemove(draft.id)}>
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>

      {addressModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Select a seller address</h3>
              <button type="button" className="close-btn" onClick={closeAddressModal}>
                &times;
              </button>
            </div>
            {addressError && <p className="error-message">{addressError}</p>}
            {addressLoading ? (
              <p className="info-message">Loading addresses…</p>
            ) : (
              <div className="address-list">
                {addresses.map((address) => (
                  <button
                    key={address.AddressID}
                    type="button"
                    className="address-option"
                    onClick={() => handleAddressSelect(address.AddressID)}
                  >
                    <strong>{address.Street}</strong>
                    <span>
                      {address.Municipality}, {address.Province}
                    </span>
                    <span>
                      {address.Region}, {address.Zip_Code}
                    </span>
                  </button>
                ))}
                {addresses.length === 0 && <p>No addresses on file yet.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      <section id="contacts" className="newsletter">
        <div className="newsletter-content">
          <div className="newsletter-text">
            <h3>
              <i className="fas fa-envelope" /> Stay in touch
            </h3>
            <p>Get seller updates, packaging reminders, and business tips from AngkatAni.</p>
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
    </>
  )
}

export default EditProduct
