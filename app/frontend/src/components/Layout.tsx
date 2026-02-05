/**
 * Layout Component
 *
 * Main layout with navigation sidebar
 */

import { Outlet, Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/items', label: 'Items', icon: '📦' },
  { path: '/jobs', label: 'Jobs', icon: '⚙️' },
  { path: '/health', label: 'Health', icon: '💚' },
];

function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🚀</span>
              <h1 className="text-xl font-bold text-gray-900">
                DevOps Platform Master
              </h1>
            </div>
            <div className="text-sm text-gray-500">
              v1.0.0
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white shadow-sm min-h-[calc(100vh-73px)] border-r border-gray-200">
          <div className="p-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={clsx(
                      'flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors',
                      location.pathname === item.path
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div className="p-4 border-t border-gray-200 mt-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="/metrics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-blue-600"
                >
                  Metrics
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:3001"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-blue-600"
                >
                  Grafana
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:16686"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-blue-600"
                >
                  Jaeger
                </a>
              </li>
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
