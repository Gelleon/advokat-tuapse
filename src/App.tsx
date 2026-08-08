import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import { API_URL } from './config';

const HelmetProvider = lazy(() =>
  import('react-helmet-async').then((module) => ({ default: module.HelmetProvider }))
);

const Admin = lazy(() => import('./pages/Admin'));
const Login = lazy(() => import('./pages/Login'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const ServicePage = lazy(() => import('./pages/ServicePage'));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 text-primary/60">
    Загрузка...
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include'
        });
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          sessionStorage.removeItem('isAdminAuth');
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Загрузка...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const scrollToHash = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return true;
        }
        return false;
      };

      if (!scrollToHash()) {
        const timer = setTimeout(scrollToHash, 100);
        return () => clearTimeout(timer);
      }
      return;
    }

    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
};

const AppRoutes = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/login" element={<Login />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/admin" element={
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      } />
      <Route path="/:areaSlug" element={<ServicePage />} />
      <Route path="/:areaSlug/:topicSlug" element={<ServicePage />} />
    </Routes>
  </Suspense>
);

const AppWithOptionalHelmet = () => {
  const { pathname } = useLocation();

  if (pathname === '/') {
    return <AppRoutes />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <HelmetProvider>
        <AppRoutes />
      </HelmetProvider>
    </Suspense>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppWithOptionalHelmet />
    </BrowserRouter>
  );
}

export default App;
