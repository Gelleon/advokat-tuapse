import './index.css';
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Home from './pages/Home';
import { API_URL } from './config';
import { isValidServicePath } from './data/services';

// #region debug-point shared:contact-anchor-scroll
const reportDebugEvent = (hypothesisId: string, location: string, msg: string, data: Record<string, unknown>) => {
  fetch('http://127.0.0.1:7777/event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId: 'contact-anchor-scroll',
      runId: 'post-fix',
      hypothesisId,
      location,
      msg,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
};
// #endregion

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

const getHeaderOffset = () => {
  const header = document.querySelector('header');
  const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 0;

  return headerHeight + 16;
};

const scrollToElement = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    const headerOffset = getHeaderOffset();
    const elementTop = el.getBoundingClientRect().top + window.scrollY;
    const top = elementTop - headerOffset;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // #region debug-point B:scroll-target
    reportDebugEvent('B', 'src/App.tsx:80', '[DEBUG] Calculated anchor target', {
      targetId: id,
      headerOffset,
      elementTop,
      scrollY: window.scrollY,
      targetTop: Math.max(top, 0),
      prefersReducedMotion,
    });
    // #endregion

    window.scrollTo({
      top: Math.max(top, 0),
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });

    window.setTimeout(() => {
      const currentEl = document.getElementById(id);
      // #region debug-point C:post-scroll-position
      reportDebugEvent('C', 'src/App.tsx:94', '[DEBUG] Anchor position after scroll', {
        targetId: id,
        scrollY: window.scrollY,
        targetViewportTop: currentEl?.getBoundingClientRect().top ?? null,
        headerOffset: getHeaderOffset(),
      });
      // #endregion
    }, 450);

    window.setTimeout(() => {
      const currentEl = document.getElementById(id);
      // #region debug-point D:settled-scroll-position
      reportDebugEvent('D', 'src/App.tsx:106', '[DEBUG] Anchor position after scroll settled', {
        targetId: id,
        scrollY: window.scrollY,
        targetViewportTop: currentEl?.getBoundingClientRect().top ?? null,
        headerOffset: getHeaderOffset(),
      });
      // #endregion
    }, 1600);
    return true;
  }
  return false;
};

const isServicePath = (pathname: string) => {
  const normalized = pathname.replace(/^\/+|\/+$/g, '');
  if (!normalized) return false;
  const [areaSlug, topicSlug] = normalized.split('/');
  return isValidServicePath(areaSlug, topicSlug);
};

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    if (hash) {
      const id = hash.replace('#', '');
      // #region debug-point A:hash-navigation
      reportDebugEvent('A', 'src/App.tsx:116', '[DEBUG] Hash navigation detected', {
        pathname,
        hash,
        navigationType,
        prevPathname,
        targetId: id,
      });
      // #endregion
      if (!scrollToElement(id)) {
        const timer = setTimeout(() => scrollToElement(id), 100);
        return () => clearTimeout(timer);
      }
      return;
    }

    const cameBackFromService =
      pathname === '/' &&
      navigationType === 'POP' &&
      isServicePath(prevPathname);

    if (cameBackFromService) {
      if (!scrollToElement('services')) {
        const timer = setTimeout(() => scrollToElement('services'), 100);
        return () => clearTimeout(timer);
      }
      return;
    }

    window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);

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

const MAIN_STYLE_HINTS = ['/assets/index-', '/fonts/fonts.css'];

const purgeOrphanRouteStyles = () => {
  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const href = link.getAttribute('href') ?? '';
    if (!href.includes('/assets/') && !href.includes('/fonts/')) return;
    if (MAIN_STYLE_HINTS.some((hint) => href.includes(hint))) return;
    link.remove();
  });
};

const AppShell = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    purgeOrphanRouteStyles();
  }, [pathname]);

  return (
    <HelmetProvider>
      <AppRoutes />
    </HelmetProvider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
