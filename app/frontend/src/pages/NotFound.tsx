/**
 * 404 Not Found Page
 */

import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="text-8xl mb-4">404</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
      <p className="text-gray-600 mb-6">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}

export default NotFound;
