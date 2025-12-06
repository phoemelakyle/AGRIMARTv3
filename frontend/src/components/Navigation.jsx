import logoImage from '../assets/logo.png'

const Navigation = () => (
  <header className="top-bar">
    <div className="logo">
      <img src={logoImage} alt="AngkatAni Logo" className="logo-icon" />
      AngkatAni
    </div>
    <div className="tagline">Connecting you to Local Farmers</div>
  </header>
)

export default Navigation
