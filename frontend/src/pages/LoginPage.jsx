import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoImage from '../assets/images/logo.png'
import './LoginPage.css'

const LoginPage = () => {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const response = await login({ username: form.username, password: form.password })
    if (response.ok) {
      const destination = response.body?.user?.userType === 'seller' ? '/homepage_seller' : '/homepage_buyer'
      navigate(destination)
    } else {
      setError(response.body?.message || 'Login failed, please try again.')
    }
  }

  return (
    <div className="login-page">
      <header className="top-bar">
        <div className="logo">
          <img src={logoImage} alt="AngkatAni logo" className="logo-icon" />
          AngkatAni
        </div>
        <div className="tagline">Fresh from farms, straight to you</div>
        <div className="icons">
          <span className="badge">LIVE</span>
          <span className="badge" style={{ background: '#f39c12' }}>
            BETA
          </span>
        </div>
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

      <div className="main-nav">
        <ul>
          <li>
            <Link to="/">
              <i className="fas fa-home" />
            </Link>
          </li>
          <li>›</li>
          <li>
            <a href="#">Account</a>
          </li>
          <li>›</li>
          <li style={{ color: '#2e7d32' }}>Login</li>
        </ul>
      </div>

      <div className="main-container">
        <div className="signup-box">
          <h2>Login to AngkatAni</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="sr-only" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="Username"
                required
              />
            </div>
            <div className="form-group">
              <label className="sr-only" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Password"
                required
              />
            </div>
            {error && <p className="error_message">{error}</p>}
            <button type="submit" className="signup-btn">
              Continue to dashboard
            </button>
            <div className="button-container">
              <Link to="/reset-password" className="forgot-pass">
                Forgot password?
              </Link>
              <Link to="/select_role" className="forgot-pass">
                Choose role →
              </Link>
            </div>
          </form>
        </div>
      </div>

      <section className="newsletter">
        <div className="newsletter-content">
          <div className="newsletter-text">
            <h3>Stay in the loop</h3>
            <p>Get announcements, tips, and exclusive farmer marketplace updates.</p>
          </div>
          <form className="newsletter-form" onSubmit={(event) => event.preventDefault()}>
            <input type="email" placeholder="Email address" required />
            <button type="submit">Subscribe</button>
          </form>
        </div>
      </section>

    </div>
  )
}

export default LoginPage
