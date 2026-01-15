import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { platform, setAuthToken } from '@/lib/platform';
import { connectWithToken } from '@/lib/socket';

export function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      // Get tokens from URL fragment
      const fragment = window.location.hash.slice(1);

      if (!fragment) {
        setError('No authentication data received');
        return;
      }

      const tokens = platform.auth.parseOAuthCallback(fragment);

      if (!tokens) {
        setError('Invalid authentication response');
        return;
      }

      // Store tokens
      setAuthToken(tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      // Connect WebSocket
      connectWithToken(tokens.accessToken);

      // Clear URL fragment for security
      window.history.replaceState(null, '', window.location.pathname);

      // Get redirect URL from tokens or localStorage fallback
      const redirectUrl = tokens.redirectUrl || localStorage.getItem('auth_redirect') || '/';
      localStorage.removeItem('auth_redirect');

      // Navigate to intended destination
      // Small delay to ensure state is updated
      setTimeout(() => {
        navigate(redirectUrl, { replace: true });
      }, 100);
    };

    processCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-5xl">!</div>
          <h1 className="text-xl font-bold text-gray-900">Authentication Error</h1>
          <p className="text-gray-600">{error}</p>
          <Link
            to="/login"
            className="inline-block text-indigo-600 hover:text-indigo-700 underline"
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
