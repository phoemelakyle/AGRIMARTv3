import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Sidebar from '../components/Sidebar'
import { categories, features } from '../data/siteData'
import landingImage from '../assets/landingpage.png'
import basketImage from '../assets/try2.png'

const LandingPage = () => (
  <>
    <Navigation />
    <div className="container" id="top">
      <Sidebar categories={categories} />
      <main className="banner">
        <div className="banner-text">
          <h1>Where Local Harvest Meets Your Basket</h1>
          <p>
            <span className="highlight">
              Curated goods from nearby farms, delivered to support local livelihoods and healthy living
            </span>
          </p>
          <Link to="/select_role" className="shop-btn">Shop now →</Link>
        </div>
        <div className="banner-image">
          <img src={landingImage} alt="Harvest" />
        </div>
      </main>
    </div>
    <section className="features">
      {features.map((feature) => (
        <div key={feature.title}>
          <div>{feature.icon}</div>
          <strong>{feature.title}</strong>
          <small>{feature.description}</small>
        </div>
      ))}
    </section>
    <section className="top-categories">
      <h2 className="section-title">Shop by Top Categories</h2>
      <div className="category-grid">
        {categories.map((category) => (
          <div key={category.name} className="category-card">
            <i className={`fas ${category.icon}`} />
            <p>{category.name}</p>
          </div>
        ))}
      </div>
    </section>
    <section id="about-agrimart" className="about-agrimart">
      <div className="info-container">
        <div className="info-text">
          <h2 className="section-title">Welcome to AngkatAni</h2>
          <p>
            <strong>AngkatAni</strong> is a modern online shopping platform that connects local farmers directly with buyers.
            By minimizing the role of middlemen, AngkatAni ensures fair pricing, promotes sustainability,
            and delivers fresh farm products straight to your doorstep.
          </p>
          <p>
            Whether you're a consumer looking for organic produce or a farmer seeking a fair marketplace,
            AngkatAni empowers communities through transparency, trust, and technology.
          </p>
        </div>
        <div className="info-image">
          <img src={basketImage} alt="Basket of produce" />
        </div>
      </div>
    </section>
    <section id="newsletter" className="newsletter">
      <div className="newsletter-content">
        <div className="newsletter-text">
          <h3><i className="fas fa-envelope" /> Subscribe to our Newsletter</h3>
          <p>Stay connected with the latest updates and local farm offers.</p>
        </div>
        <form className="newsletter-form" onSubmit={(event) => event.preventDefault()}>
          <input type="email" placeholder="Your email address" required />
          <button type="submit">Subscribe</button>
        </form>
        <div className="social-icons">
          <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f" /></a>
          <a href="#" aria-label="Twitter"><i className="fab fa-twitter" /></a>
          <a href="#" aria-label="Instagram"><i className="fab fa-instagram" /></a>
        </div>
      </div>
    </section>
  </>
)

export default LandingPage
