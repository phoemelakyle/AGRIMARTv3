import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  deleteSellerAddress,
  fetchSellerAddresses,
  logoutUser,
  saveSellerAddress,
  setDefaultSellerAddress,
} from '../api/agrimartApi'
import './SellerAddress.css'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const DEFAULT_LOCATION = { lat: 14.5995, lng: 120.9842 }
let googleMapsScriptPromise = null

const loadGoogleMapsScript = (apiKey) => {
  if (!apiKey) {
    return Promise.reject(new Error('Missing Google Maps key'))
  }
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is undefined'))
  }
  if (window.google && window.google.maps) {
    return Promise.resolve()
  }
  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise
  }
  googleMapsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Unable to load Google Maps script'))
    document.body.appendChild(script)
  })
  return googleMapsScriptPromise
}

const initialForm = {
  address_id: '',
  full_name: '',
  phone_number: '',
  street: '',
  municipality: '',
  province: '',
  region: '',
  zip_code: '',
  latitude: DEFAULT_LOCATION.lat,
  longitude: DEFAULT_LOCATION.lng,
}

const SellerAddress = () => {
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState(initialForm)
  const [notification, setNotification] = useState('')
  const [error, setError] = useState('')
  const [mapsError, setMapsError] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const mapContainerRef = useRef(null)
  const navigate = useNavigate()

  const loadAddresses = async () => {
    setLoading(true)
    setError('')
    const response = await fetchSellerAddresses()
    if (response.ok) {
      setAddresses(response.body.addresses || [])
    } else {
      setError(response.body?.message || 'Unable to load addresses.')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAddresses()
  }, [])

  useEffect(() => {
    if (!modalOpen) {
      setMapsError('')
      if (markerRef.current) {
        markerRef.current = null
      }
      if (mapRef.current) {
        mapRef.current = null
      }
      return
    }
    if (!GOOGLE_MAPS_KEY) {
      setMapsError('Google Maps key missing. Please set VITE_GOOGLE_MAPS_API_KEY.')
      return
    }
    setModalLoading(true)
    loadGoogleMapsScript(GOOGLE_MAPS_KEY)
      .then(() => {
        setMapsError('')
        initMap()
      })
      .catch(() => setMapsError('Unable to load Google Maps.'))
      .finally(() => setModalLoading(false))
  }, [modalOpen])

  const initMap = () => {
    if (!mapContainerRef.current || !(window.google && window.google.maps)) {
      return
    }
    const lat = Number(formData.latitude) || DEFAULT_LOCATION.lat
    const lng = Number(formData.longitude) || DEFAULT_LOCATION.lng
    const center = { lat, lng }
    mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
      center,
      zoom: 14,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    })
    markerRef.current = new window.google.maps.Marker({
      map: mapRef.current,
      position: center,
      draggable: true,
    })
    markerRef.current.addListener('dragend', () => {
      const position = markerRef.current.getPosition()
      setFormData((prev) => ({
        ...prev,
        latitude: position.lat(),
        longitude: position.lng(),
      }))
    })
  }

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setMapsError('Geolocation is not supported by your browser.')
      return
    }
    setMapsError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setFormData((prev) => ({
          ...prev,
          latitude: coords.lat,
          longitude: coords.lng,
        }))
        if (mapRef.current) {
          mapRef.current.setCenter(coords)
        }
        if (markerRef.current) {
          markerRef.current.setPosition(coords)
        }
      },
      () => setMapsError('Unable to access your location.'),
    )
  }

  const handleDefaultChange = async (addressId) => {
    setError('')
    setNotification('')
    const response = await setDefaultSellerAddress(addressId)
    if (response.ok) {
      setNotification('Default address updated.')
      loadAddresses()
    } else {
      setError(response.body?.message || 'Unable to set default address.')
    }
  }

  const handleDelete = async (addressId) => {
    if (!window.confirm('Delete this address?')) {
      return
    }
    setError('')
    setNotification('')
    const response = await deleteSellerAddress(addressId)
    if (response.ok) {
      setNotification('Address removed successfully.')
      loadAddresses()
    } else {
      setError(response.body?.message || 'Unable to delete address.')
    }
  }

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const openAddAddress = () => {
    setFormData(initialForm)
    setModalOpen(true)
  }

  const openEditAddress = (address) => {
    setFormData({
      address_id: address.AddressID,
      full_name: address.Full_Name,
      phone_number: address.Phone_Number,
      street: address.Street,
      municipality: address.Municipality,
      province: address.Province,
      region: address.Region,
      zip_code: address.Zip_Code,
      latitude: address.Latitude || DEFAULT_LOCATION.lat,
      longitude: address.Longitude || DEFAULT_LOCATION.lng,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotification('')
    const payload = { ...formData }
    if (!payload.address_id) {
      delete payload.address_id
    }
    const response = await saveSellerAddress(payload)
    if (response.ok) {
      setNotification('Address saved successfully.')
      setModalOpen(false)
      loadAddresses()
    } else {
      setError(response.body?.message || 'Unable to save address.')
    }
  }

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
  }

  return (
    <div className="seller-address-page">
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
            <Link to="/seller_address" className="button">
              Address
            </Link>
          </li>
        </ul>
        <div className="icons">
          <div className="user-dropdown">
            <span className="user" onClick={handleLogout}>
              <i className="fas fa-user" />
            </span>
          </div>
        </div>
      </nav>

      <div className="container">
        <aside className="sidebar">
          <div className="status">
            <h3>ACCOUNT</h3>
            <ul className="status-list">
              <li>
                <button type="button" className="account-btn" onClick={() => navigate('/seller_account')}>
                  My Account
                </button>
              </li>
              <li>
                <button type="button" className="account-btn" onClick={() => navigate('/seller_payment_options')}>
                  Banks &amp; Cards
                </button>
              </li>
              <li>
                <button type="button" className="account-btn active">Addresses</button>
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
            <h2>My Addresses</h2>
            <span className="add-btn" onClick={openAddAddress}>
              + Add New Address
            </span>
          </div>
          {notification && <p className="info-message">{notification}</p>}
          {error && <p className="error-message">{error}</p>}
          {loading ? (
            <p className="info-message">Loading addresses...</p>
          ) : addresses.length === 0 ? (
            <p>No saved addresses yet.</p>
          ) : (
            <ul className="saved-addresses">
              {addresses.map((address) => (
                <li key={address.AddressID}>
                  <div className="address-top">
                    <label className="radio-wrapper">
                      <input
                        type="radio"
                        name="default_address"
                        checked={address.IsDefaultInt === 1}
                        onChange={() => handleDefaultChange(address.AddressID)}
                      />
                      <span className="radio-mark"></span>
                    </label>
                    <div>
                      <strong>{address.Full_Name}</strong> - {address.Phone_Number}
                      <p>
                        {address.Street}, {address.Municipality}, {address.Province}
                        {address.Region ? `, ${address.Region}` : ''} {address.Zip_Code}
                      </p>
                    </div>
                    <div className="action-buttons">
                      <button type="button" className="edit-btn" onClick={() => openEditAddress(address)}>
                        Edit
                      </button>
                      <button type="button" className="delete-btn" onClick={() => handleDelete(address.AddressID)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
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

      {modalOpen && (
        <div className={`modal ${modalOpen ? 'is-open' : ''}`}>
          <div className="modal-content">
            <span className="close" onClick={closeModal}>
              &times;
            </span>
            <h3>{formData.address_id ? 'Edit Address' : 'Add New Address'}</h3>
            <form className="address-form" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Full Name"
                value={formData.full_name}
                onChange={(event) => handleFormChange('full_name', event.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={formData.phone_number}
                onChange={(event) => handleFormChange('phone_number', event.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Street"
                value={formData.street}
                onChange={(event) => handleFormChange('street', event.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Municipality"
                value={formData.municipality}
                onChange={(event) => handleFormChange('municipality', event.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Province"
                value={formData.province}
                onChange={(event) => handleFormChange('province', event.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Region"
                value={formData.region}
                onChange={(event) => handleFormChange('region', event.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Zip Code"
                value={formData.zip_code}
                onChange={(event) => handleFormChange('zip_code', event.target.value)}
                required
              />
              <input type="hidden" name="latitude" value={formData.latitude} />
              <input type="hidden" name="longitude" value={formData.longitude} />
              <label className="map-label">Pin Your Location</label>
              {GOOGLE_MAPS_KEY ? (
                <>
                  <div className="map-actions">
                    <button type="button" className="green-btn" onClick={handleUseLocation}>
                      Use My Location
                    </button>
                    {mapsError && <span className="map-error">{mapsError}</span>}
                  </div>
                  <div ref={mapContainerRef} className="map"></div>
                  {modalLoading && <p className="info-message">Loading map...</p>}
                </>
              ) : (
                <p className="map-error">Google Maps key missing.</p>
              )}
              <button type="submit" className="save-btn">
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SellerAddress
