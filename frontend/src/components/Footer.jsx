import logoImage from '../assets/logo.png'
import './Footer.css'

const Footer = ({ footerColumns }) => (
  <footer className="main-footer">
    <div className="footer-content">
      <div className="footer-about">
        <img src={logoImage} alt="AngkatAni Logo" className="logo-icon" />
        <h4>AngkatAni</h4>
        <p>Empowering farmers and connecting communities through sustainable commerce.</p>
        <p><strong>09271674524</strong><br />angkatani@.com</p>
      </div>
      <div className="footer-columns">
        {footerColumns.map((column) => (
          <div key={column.title}>
            <h5>{column.title}</h5>
            <ul>
              {column.links.map((link) => (
                <li key={link}>{link}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </footer>
)

export default Footer
