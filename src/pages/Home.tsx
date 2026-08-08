import React, { lazy, Suspense } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';

const Services = lazy(() => import('../components/Services'));
const Portfolio = lazy(() => import('../components/Portfolio'));
const Contact = lazy(() => import('../components/Contact'));
const Footer = lazy(() => import('../components/Footer'));

const SectionPlaceholder = ({ className }: { className: string }) => (
  <div className={className} aria-hidden="true" />
);

const Home = () => {
  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">
      <Header />
      <Hero />
      <Suspense fallback={<SectionPlaceholder className="min-h-[52rem] bg-surface" />}>
        <Services />
      </Suspense>
      <Suspense fallback={<SectionPlaceholder className="min-h-[36rem] bg-white border-t border-surface-dark" />}>
        <Portfolio />
      </Suspense>
      <Suspense fallback={<SectionPlaceholder className="min-h-[28rem] bg-surface" />}>
        <Contact />
      </Suspense>
      <Suspense fallback={<SectionPlaceholder className="min-h-[20rem] bg-primary" />}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Home;
