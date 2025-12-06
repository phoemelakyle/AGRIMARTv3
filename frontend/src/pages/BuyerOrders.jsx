import { Fragment, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  API_URL,
  cancelBuyerOrder,
  fetchBuyerOrders,
  fetchCategories,
  logoutUser,
  markBuyerOrderReceived,
  payBuyerOrder,
} from '../api/agrimartApi'
import './BuyerOrders.css'

const STATUS_STEPS = [
  { key: 'to_pay', label: 'To Pay', icon: 'fa-wallet' },
  { key: 'to_ship', label: 'To Ship', icon: 'fa-box' },
  { key: 'shipping', label: 'Shipping', icon: 'fa-truck' },
  { key: 'delivered', label: 'Delivered', icon: 'fa-check-circle' },
  { key: 'cancelled', label: 'Cancelled', icon: 'fa-times-circle' },
]

const STATUS_LABELS = {
  'waiting for payment': 'To Pay',
  pending: 'To Ship',
  shipping: 'Shipping',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const ORDER_TITLES = {
  to_pay: 'TO PAY',
  to_ship: 'TO SHIP',
  shipping: 'SHIPPING',
  delivered: 'DELIVERED',
  cancelled: 'CANCELLED',
}

const formatCurrency = (value) => {
  const amount = Number(value)
  if (Number.isFinite(amount)) {
    return `₱${amount.toFixed(2)}`
  }
  return `₱${value ?? '0.00'}`
}

const statusBadgeClass = (status) => {
  if (!status) {
    return 'waiting-for-payment'
  }
  return status.replace(/\s+/g, '-').toLowerCase()
}

const BuyerOrders = () => {
  const [orderType, setOrderType] = useState('to_pay')
  const [sort, setSort] = useState('recent')
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [categories, setCategories] = useState([])
  const [notification, setNotification] = useState('')
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()

  const loadOrders = async () => {
    setLoadingOrders(true)
    setError('')
    const response = await fetchBuyerOrders({ status: orderType, sort })
    if (response.ok) {
      setOrders(response.body.orders || [])
    } else {
      setError(response.body?.message || 'Unable to load orders right now.')
    }
    setLoadingOrders(false)
  }

  useEffect(() => {
    loadOrders()
  }, [orderType, sort])

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

  const handleStatusClick = (status) => {
    if (status === orderType) {
      return
    }
    setOrderType(status)
    setNotification('')
    setError('')
  }

  const handleAction = async (orderId, type) => {
    setActionLoading(orderId)
    setNotification('')
    setError('')
    let response
    if (type === 'pay') {
      response = await payBuyerOrder(orderId)
    } else if (type === 'received') {
      response = await markBuyerOrderReceived(orderId)
    } else {
      response = await cancelBuyerOrder(orderId)
    }
    setActionLoading('')
    if (response.ok) {
      if (type === 'pay') {
        setNotification('Payment confirmed. Order is now pending shipment.')
      } else if (type === 'received') {
        setNotification('Order marked as received. Thank you!')
      } else {
        setNotification('Order cancelled and inventory has been updated.')
      }
      loadOrders()
    } else {
      setError(response.body?.message || `Unable to ${type} this order.`)
    }
  }

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
  }

  const imageUrl = (filename) => {
    if (!filename) return ''
    return `${API_URL}/static/images/products/${filename}`
  }

  const title = ORDER_TITLES[orderType] || 'ORDERS'

  return (
    <div className="buyer-orders-page">
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
            <Link to="/buyer_orders" className="button">
              Orders
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
                <Link className="status-item" to="/buyer_orders">
                  <i className="fas fa-receipt" /> Orders
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
                <button
                  key={step.key}
                  type="button"
                  className={`step ${orderType === step.key ? 'active-step' : ''}`}
                  onClick={() => handleStatusClick(step.key)}
                >
                  <span className="circle">
                    <i className={`fas ${step.icon}`} />
                  </span>
                  <p>{step.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="product-info">
            <h1>{title}</h1>
            {orderType === 'to_ship' && (
              <div className="note">
                Note: Once your order is in the shipping process,{' '}
                <span>cancellation is not possible.</span>
              </div>
            )}
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
                          <span className={`status-badge ${statusBadgeClass(order.Order_Status)}`}>
                            {STATUS_LABELS[order.Order_Status] || 'Status'}
                          </span>
                        </td>
                        <td>
                          {orderType === 'to_pay' && (
                            <div className="action-buttons">
                              <button
                                type="button"
                                className="button1"
                                onClick={() => handleAction(order.OrderID, 'pay')}
                                disabled={actionLoading === order.OrderID}
                              >
                                Pay Now
                              </button>
                              <button
                                type="button"
                                className="button1 cancel-btn"
                                onClick={() => handleAction(order.OrderID, 'cancel')}
                                disabled={actionLoading === order.OrderID}
                              >
                                Cancel Order
                              </button>
                            </div>
                          )}
                          {orderType === 'to_ship' && (
                            <button
                              type="button"
                              className="button1 cancel-btn"
                              onClick={() => handleAction(order.OrderID, 'cancel')}
                              disabled={actionLoading === order.OrderID}
                            >
                              Cancel Order
                            </button>
                          )}
                          {orderType === 'shipping' && (
                            <button
                              type="button"
                              className="button1"
                              onClick={() => handleAction(order.OrderID, 'received')}
                              disabled={actionLoading === order.OrderID}
                            >
                              Order Received
                            </button>
                          )}
                          {orderType === 'delivered' && <p className="order-completed">Order completed.</p>}
                          {orderType === 'cancelled' && <p className="order-cancelled">Order cancelled.</p>}
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

export default BuyerOrders
