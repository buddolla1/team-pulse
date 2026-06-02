import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import { getNavigationItems } from '../../services/api';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();
  const [navigationItems, setNavigationItems] = useState([]);

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const isAdminRoute = () => {
    return location.pathname.startsWith('/admin');
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/');
  };

  useEffect(() => {
    const loadNavigationItems = async () => {
      try {
        const response = await getNavigationItems('topnav');
        setNavigationItems(response.data?.data || []);
      } catch (error) {
        setNavigationItems([]);
      }
    };

    loadNavigationItems();
  }, []);

  const visibleItems = useMemo(() => {
    return navigationItems.filter((item) => {
      if (!item.is_active) return false;
      if (!item.permission_name) return true;
      return authService.hasPermission(item.permission_name);
    });
  }, [navigationItems]);

  // Don't show navigation on admin login page
  if (location.pathname === '/') {
    return null;
  }

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          TeamPulse
        </Link>
        <ul className="nav-menu">
          {isAdminRoute() && isAuthenticated && (
            <>
              {visibleItems.map((item) => {
                const activeClass = item.match_type === 'prefix' ? location.pathname.startsWith(item.route_path) : isActive(item.route_path);
                return (
                  <li className="nav-item" key={item.menu_key}>
                    <Link to={item.route_path} className={`nav-link ${activeClass}`}>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li className="nav-item">
                <span className="nav-user-info">
                  Welcome, {currentUser?.full_name}
                </span>
              </li>
              <li className="nav-item">
                <button onClick={handleLogout} className="nav-link nav-logout-btn">
                  Logout
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;
