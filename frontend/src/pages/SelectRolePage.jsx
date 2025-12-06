import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import './SelectRolePage.css'

const roles = [
  {
    title: 'I am a Buyer',
    description: 'Shop fresh produce directly from trusted farms, manage cart and payments, and support local agriculture.',
    icon: 'fas fa-user-circle',
    action: { label: 'Register as Buyer', to: '/buyer_registration' },
  },
  {
    title: 'I am a Seller',
    description: 'List your harvest, manage orders, and receive payments securely through AngkatAni.',
    icon: 'fas fa-store',
    action: { label: 'Register as Seller', to: '/seller_registration' },
  },
]

const SelectRolePage = () => (
  <div className="select-role-page">
    <Navigation />
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


    <main className="main-container">
      <section className="role-box">
        <h2>Select Your Role</h2>
        <div className="role-options">
          {roles.map((role) => (
            <article key={role.title} className="role-card">
              <i className={`${role.icon} role-icon`} />
              <p className="role-title">{role.title}</p>
              <p className="role-description">{role.description}</p>
              <Link to={role.action.to} className="button">
                {role.action.label}
              </Link>
            </article>
          ))}
        </div>
        <div className="button-container">
          <p className="signup-text">Already have an account?</p>
          <Link to="/login" className="button secondary">
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

export default SelectRolePage
