import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerSeller } from '../api/agrimartApi'
import logoImage from '../assets/images/logo.png'
import './SellerRegistration.css'

const SellerRegistration = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', username: '', password: '' })
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (form.password.length < 8) {
      setStatus({ type: 'error', message: 'Password should be at least 8 characters.' })
      return
    }
    setSubmitting(true)
    setStatus({ type: '', message: '' })
    const payload = {
      name: form.name,
      email: form.email,
      phoneNumber: form.phone,
      username: form.username,
      password: form.password,
    }

    const response = await registerSeller(payload)
    setSubmitting(false)
    if (response.ok) {
      navigate('/login')
    } else {
      setStatus({ type: 'error', message: response.body?.message || 'Unable to register right now.' })
    }
  }

  return (
    <div className="seller-registration-page">
      <header className="top-bar">
        <div className="logo">
          <img src={logoImage} alt="AngkatAni logo" className="logo-icon" />
          AngkatAni
        </div>
        <div className="tagline">Connecting you to Local Farmers</div>
      </header>

      <nav className="nav-menu">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <a href="#newsletter">Contacts</a>
          </li>
        </ul>
      </nav>

      <nav className="main-nav">
        <ul>
          <li>
            <Link to="/">
              <i className="fas fa-home" />
            </Link>
          </li>
          <li>›</li>
          <li>
            <span>Account</span>
          </li>
          <li>›</li>
          <li>
            <Link to="/select_role" className="button">
              Select Role
            </Link>
          </li>
          <li>›</li>
          <li style={{ color: '#2e7d32' }}>Seller Registration</li>
        </ul>
      </nav>

      <main className="main-container">
        <section className="signup-box">
          <h2>Create Your Seller Account</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Name"
                required
              />
            </div>
            <div className="form-group">
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="Email"
                required
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                name="phoneNumber"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="Phone Number"
                required
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="Username"
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Password"
                required
              />
            </div>
            {status.message && <div className="error_message">{status.message}</div>}
            <button type="submit" className="signup-btn" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Sign Up'}
            </button>
          </form>
          <div className="button-container">
            <p className="signup-text">Already have an account?</p>
            <Link to="/login" className="button">
              Log in
            </Link>
          </div>
        </section>
      </main>

      <section id="newsletter" className="newsletter">
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

export default SellerRegistration
