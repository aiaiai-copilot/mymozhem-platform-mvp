import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function Layout() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-indigo-600">
            Holiday Lottery
          </Link>
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/create" className="text-gray-600 hover:text-gray-900">
                  Create Room
                </Link>
                <span className="text-gray-500">{user?.name || user?.email}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="text-indigo-600 hover:text-indigo-700">
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
