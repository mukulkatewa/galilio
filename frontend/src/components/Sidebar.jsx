import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: '🏠' },
    { name: 'Limbo', path: '/games/limbo', icon: '🎯' },
    { name: 'Crash', path: '/games/crash', icon: '🚀' },
    { name: 'Dragon Tower', path: '/games/dragon-tower', icon: '🐉' },
    { name: 'Dice', path: '/games/dice', icon: '🎲' },
    { name: 'Keno', path: '/games/keno', icon: '🎱' },
    { name: 'History', path: '/history', icon: '📜' },
  ];

  if (user?.isAdmin) {
    navItems.push({ name: 'Admin', path: '/admin', icon: '⚙️' });
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 border-r flex-col"
        style={{ backgroundColor: '#1a1f2e', borderColor: '#2d3748' }}
      >
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 transition-colors ${
                  isActive ? 'bg-active' : ''
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? '#2d3748' : 'transparent',
                color: isActive ? '#e2e8f0' : '#a0aec0',
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.classList.contains('bg-active')) {
                  e.currentTarget.style.backgroundColor = '#252b3b';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.classList.contains('bg-active')) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-normal">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 border-t flex justify-around py-2 z-50"
        style={{ backgroundColor: '#1e2433', borderColor: '#2d3748' }}
      >
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors"
            style={({ isActive }) => ({
              backgroundColor: isActive ? '#2d3748' : 'transparent',
              color: isActive ? '#e2e8f0' : '#a0aec0',
            })}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-normal">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};

export default Sidebar;
