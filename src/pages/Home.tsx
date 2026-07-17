import React from 'react';
import Seo from '../components/Seo';
import { legalServiceSchema, webSiteSchema } from '../seo/schemas';
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
      <Seo
        title="Адвокаты Туапсе | Профессиональные юридические услуги"
        description="Квалифицированная юридическая помощь в Туапсе. Арбитражные споры, защита бизнеса, семейное и наследственное право. Более 15 лет успешной практики."
        path="/"
        keywords="адвокат туапсе, юрист туапсе, юридические услуги, арбитражный адвокат, защита в суде"
        jsonLd={[legalServiceSchema(), webSiteSchema()]}
      />
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
