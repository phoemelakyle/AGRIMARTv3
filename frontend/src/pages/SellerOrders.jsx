import { Fragment, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  API_URL,
  cancelSellerOrder,
  fetchSellerOrders,
  logoutUser,
  shipSellerOrder,
} from '../api/agrimartApi'
import './SellerOrders.css'

const STATUS_STEPS = [
  { key: 'unpaid', label: 'Unpaid', icon: 'fa-wallet' },
  { key: 'to_ship', label: 'To Ship', icon: 'fa-box' },
  { key: 'shipping', label: 'Shipping', icon: 'fa-truck' },
  { key: 'delivered', label: 'Completed', icon: 'fa-check-circle' },
  { key: 'cancelled', label: 'Cancelled', icon: 'fa-times-circle' },
]

const STATUS_LABELS = {
  unpaid: 'Unpaid',
  to_ship: 'To Ship',
  shipping: 'Shipping',
  delivered: 'Completed',
  cancelled: 'Cancelled',
}

const formatCurrency = (value) => {
  const number = Number(value)
  if (Number.isFinite(number)) {
    return `P${number.toFixed(2)}`
  }
  return `P${value ?? '0.00'}`
}

const getStatusClass = (status) => {
  if (status === 'delivered') {
    return 'completed'
  }
  return status.replace('_', '-')
}

const SellerOrders = () => {
  const [orderType, setOrderType] = useState('unpaid')
  const [sort, setSort] = useState('recent')
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [notification, setNotification] = useState('')
  const [error, setError] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      setLoadingOrders(true)
      setError('')
      const response = await fetchSellerOrders({ status: orderType, sort })
      if (response.ok) {
        setOrders(response.body.orders || [])
      } else {
        setError(response.body?.message || 'Unable to load orders right now.')
      }
      setLoadingOrders(false)
    }
    load()
  }, [orderType, sort])

  const handleAction = async (orderId, type) => {
    setActionLoading(orderId)
    setNotification('')
    setError('')
    const response = type === 'ship' ? await shipSellerOrder(orderId) : await cancelSellerOrder(orderId)
    setActionLoading('')
    if (response.ok) {
      setNotification(
        type === 'ship' ? 'Order moved to Shipping status.' : 'Order cancelled and inventory updated.'
      )
      setLoadingOrders(true)
      const refreshed = await fetchSellerOrders({ status: orderType, sort })
      if (refreshed.ok) {
        setOrders(refreshed.body.orders || [])
      }
      setLoadingOrders(false)
    } else {
      setError(response.body?.message || `Unable to ${type} this order.`)
    }
  }

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
  }

  const handleStatusClick = (status) => {
    setOrderType(status)
    setNotification('')
    setError('')
  }

  const imageUrl = (filename) => {
    if (!filename) return ''
    return `${API_URL}/static/images/products/${filename}`
  }

  return (
    <div className="seller-orders-page">
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
            <Link to="/homepage_seller" className="button">
              Order Status
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
            <h3>SELLER MENU</h3>
            <ul className="status-list">
              <li>
                <Link to="/homepage_seller" className="status-item">
                  <i className="fas fa-home" /> Homepage
                </Link>
              </li>
              <li>
                <button type="button" className="status-item" onClick={() => handleStatusClick('unpaid')}>
                  <i className="fas fa-receipt" /> Orders
                </button>
              </li>
              <li>
                <Link to="/add_product" className="status-item">
                  <i className="fas fa-plus-circle" /> Add Product
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="status-item">
                  <i className="fas fa-tachometer-alt" /> Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </aside>

        <div className="column-right">
          <div className="status-container">
            <h3>STATUS</h3>
            <div className="status-tracker">
              {STATUS_STEPS.map((step) => (
                <div key={step.key} className="step">
                  <button
                    type="button"
                    className={`circle ${orderType === step.key ? 'active-status' : ''}`}
                    onClick={() => handleStatusClick(step.key)}
                  >
                    <i className={`fas ${step.icon}`} />
                  </button>
                  <p>{step.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="product-info">
            <h1>ORDER DETAILS</h1>
            <form className="sort-form">
              <label htmlFor="sort">Sort by:</label>
              <select id="sort" value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="recent">Recent</option>
                <option value="old">Old</option>
              </select>
            </form>

            {notification && <p className="info-message">{notification}</p>}
            {error && <p className="error-message">{error}</p>}
            {loadingOrders ? (
              <p className="info-message">Loading orders...</p>
            ) : orders.length === 0 ? (
              <p className="no-orders-msg">No orders yet! Place an order now!</p>
            ) : (
              <table className="variation-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Variation</th>
                    <th>Price</th>
                    <th>Shipping Fee</th>
                    <th>Buyer Address</th>
                    <th>Payment Method</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <Fragment key={order.OrderID}>
                      <tr>
                        <td>
                          <img src={imageUrl(order.ImageFileName)} alt={order.Product_Name} className="order-thumb" />
                        </td>
                        <td>{order.Product_Name}</td>
                        <td>x{order.Quantity}</td>
                        <td>{order.Unit}</td>
                        <td>{formatCurrency(order.Price)}</td>
                        <td>{formatCurrency(order.Shipping_Fee)}</td>
                        <td>{order.Buyer_Address || 'N/A'}</td>
                        <td>{order.Payment_Option || 'N/A'}</td>
                        <td>{formatCurrency(order.Total_Amount)}</td>
                        <td>
                          <span className={`status-badge ${getStatusClass(order.Order_Status)}`}>
                            {STATUS_LABELS[order.Order_Status] || 'Status'}
                          </span>
                        </td>
                        <td>
                          {orderType === 'unpaid' && (
                            <button
                              type="button"
                              className="button1"
                              onClick={() => handleAction(order.OrderID, 'cancel')}
                              disabled={actionLoading === order.OrderID}
                            >
                              Cancel
                            </button>
                          )}
                          {orderType === 'to_ship' && (
                            <div className="action-group">
                              <button
                                type="button"
                                className="button1"
                                onClick={() => handleAction(order.OrderID, 'ship')}
                                disabled={actionLoading === order.OrderID}
                              >
                                Ship
                              </button>
                              <button
                                type="button"
                                className="button1 delete-btn"
                                onClick={() => handleAction(order.OrderID, 'cancel')}
                                disabled={actionLoading === order.OrderID}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="11" className="order-date-row">
                          <strong>Order Date &amp; Time:</strong> {order.Order_Date}
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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

export default SellerOrders
