import React, { lazy, Suspense } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Services from '../components/Services';

const Portfolio = lazy(() => import('../components/Portfolio'));
const Contact = lazy(() => import('../components/Contact'));
const Footer = lazy(() => import('../components/Footer'));

const Home = () => {
  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">
      <Header />
      <Hero />
      <Services />
      <Suspense fallback={null}>
        <Portfolio />
      </Suspense>
      <Suspense fallback={null}>
        <Contact />
      </Suspense>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Home;
