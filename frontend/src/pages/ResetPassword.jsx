import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navigation from '../components/Navigation'
import './ResetPassword.css'

const ResetPassword = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ new_password: '', confirm_password: '' })
  const [status, setStatus] = useState({ loading: false, error: '', success: '' })

  useEffect(() => {
    if (!token) {
      navigate('/login')
    }
  }, [token, navigate])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (form.new_password !== form.confirm_password) {
      setStatus({ loading: false, error: 'Passwords must match.', success: '' })
      return
    }
    setStatus({ loading: true, error: '', success: '' })
    const response = await fetch(`/api/reset-password/${token}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_password: form.new_password }),
    })
    if (response.ok) {
      setStatus({ loading: false, error: '', success: 'Password has been reset.' })
    } else {
      const body = await response.json().catch(() => ({}))
      setStatus({ loading: false, error: body.message || 'Unable to reset password right now.', success: '' })
    }
  }

  return (
    <div className="reset-password-page">
      <Navigation />
      <nav className="nav-menu">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/login">Login</Link>
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
          <li>Account</li>
          <li>›</li>
          <li>Reset Password</li>
        </ul>
      </nav>
      <main className="main-container">
        <section className="signup-box">
          <h2>Reset Password</h2>
          <p className="p2-reset-pw">Enter a new secure password to finish resetting your account.</p>
          <form className="form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="new_password">New Password</label>
              <input
                id="new_password"
                name="new_password"
                type="password"
                value={form.new_password}
                onChange={handleChange}
                placeholder="New Password"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirm_password">Confirm New Password</label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                value={form.confirm_password}
                onChange={handleChange}
                placeholder="Confirm New Password"
                required
              />
            </div>
            <button type="submit" className="signup-btn" disabled={status.loading}>
              {status.loading ? 'Submitting...' : 'Reset Password'}
            </button>
            {status.error && <p className="error-message">{status.error}</p>}
            {status.success && <p className="success-message">{status.success}</p>}
          </form>
        </section>
      </main>
      <section className="newsletter">
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

export default ResetPassword
