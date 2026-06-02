import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import authService from '../../services/authService';
import { getNavigationItems } from '../../services/api';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [navigationItems, setNavigationItems] = useState([]);

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const isActivePrefix = (path) => {
    return location.pathname.startsWith(path) ? 'active' : '';
  };

  const isAdminRoute = () => {
    return location.pathname.startsWith('/admin');
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  useEffect(() => {
    const loadNavigationItems = async () => {
      try {
        const response = await getNavigationItems('sidebar');
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

  // Don't show sidebar on admin login page or non-admin routes
  if (location.pathname === '/' || !isAdminRoute() || !isAuthenticated) {
    return null;
  }

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button className="sidebar-toggle" onClick={toggleSidebar} title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}>
        <i className={`pi ${isCollapsed ? 'pi-angle-right' : 'pi-angle-left'}`}></i>
      </button>

      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {visibleItems.map((item) => {
            const activeClass = item.match_type === 'prefix' ? isActivePrefix(item.route_path) : isActive(item.route_path);
            return (
              <li className="sidebar-item" key={item.menu_key}>
                <Link to={item.route_path} className={`sidebar-link ${activeClass}`} title={item.label}>
                  <i className={`${item.icon_class || 'pi pi-circle'} sidebar-icon`}></i>
                  <span className="sidebar-text">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
