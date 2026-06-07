import { NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';
import '../style/header.css';

function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <NavLink to="/" className="logo" end>
          <img src={logo} alt="" className="logo-img" width={32} height={32} />
          <span className="logo-text">HemoVision AI</span>
        </NavLink>
        <nav className="header-nav" aria-label="Main">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>
            Home
          </NavLink>
          <NavLink
            to="/analyze"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            탐지
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default Header;