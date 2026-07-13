import React from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Services from '../components/Services';
import Portfolio from '../components/Portfolio';
import LatestPosts from '../components/LatestPosts';
import Contact from '../components/Contact';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">
      <Helmet>
        <title>Адвокаты Туапсе | Профессиональные юридические услуги</title>
        <meta name="description" content="Квалифицированная юридическая помощь в Туапсе. Арбитражные споры, защита бизнеса, семейное и наследственное право. Более 15 лет успешной практики." />
        <meta name="keywords" content="адвокат туапсе, юрист туапсе, юридические услуги, арбитражный адвокат, защита в суде" />
        <meta property="og:title" content="Адвокаты Туапсе | Профессиональные юридические услуги" />
        <meta property="og:description" content="Квалифицированная юридическая помощь в Туапсе. Арбитражные споры, защита бизнеса, семейное и наследственное право." />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header />
      <Hero />
      <Services />
      <Portfolio />
      <LatestPosts />
      <Contact />
      <Footer />
    </div>
  );
};

export default Home;
