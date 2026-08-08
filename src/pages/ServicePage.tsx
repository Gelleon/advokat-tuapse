import React from 'react';
import '../styles/service.css';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';
import Seo from '../components/Seo';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FaqAccordion from '../components/services/FaqAccordion';
import {
  getParentService,
  getRelatedServices,
  getServiceByPath,
} from '../data/services';
import { breadcrumbSchema, faqSchema, serviceSchema } from '../seo/schemas';

const ServicePage = () => {
  const { areaSlug, topicSlug } = useParams<{ areaSlug: string; topicSlug?: string }>();

  if (!areaSlug) {
    return <Navigate to="/" replace />;
  }

  const service = getServiceByPath(areaSlug, topicSlug);
  if (!service) {
    return <Navigate to="/" replace />;
  }

  const parent = getParentService(service);
  const related = getRelatedServices(service);
  const path = `/${service.path}`;

  const breadcrumbs = [
    { name: 'Главная', path: '/' },
    { name: 'Услуги', path: '/#services' },
  ];
  if (parent) {
    breadcrumbs.push({ name: parent.shortTitle, path: `/${parent.path}` });
  }
  breadcrumbs.push({ name: service.shortTitle, path });

  const jsonLd = [
    serviceSchema({
      name: `${service.shortTitle} — Адвокаты Туапсе`,
      description: service.metaDescription,
      path,
    }),
    breadcrumbSchema(breadcrumbs),
    faqSchema(service.faq),
  ];

  return (
    <div className="min-h-screen bg-surface font-sans">
      <Seo
        title={service.metaTitle}
        description={service.metaDescription}
        path={path}
        keywords={service.keywords}
        jsonLd={jsonLd}
      />
      <Header solid />

      <main className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <nav aria-label="Хлебные крошки" className="mb-10">
            <ol className="flex flex-wrap items-center gap-2 text-xs tracking-wider uppercase text-primary/45">
              {breadcrumbs.map((crumb, index) => (
                <li key={crumb.path} className="flex items-center gap-2">
                  {index > 0 && <span className="text-primary/25">/</span>}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-primary/70">{crumb.name}</span>
                  ) : (
                    <Link to={crumb.path} className="hover:text-secondary transition-colors">
                      {crumb.name}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <article className="bg-white rounded-sm shadow-premium p-8 md:p-14 border border-surface-dark">
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-primary mb-6 leading-tight">
              {service.title}
            </h1>
            <div className="w-16 h-px bg-secondary mb-8" />
            <p className="text-lg text-primary/80 font-light leading-relaxed mb-12">
              {service.intro}
            </p>

            {service.children && service.children.length > 0 && (
              <section className="mb-14">
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-primary mb-6">
                  Направления работы
                </h2>
                <div className="grid gap-4">
                  {service.children.map((child) => (
                    <Link
                      key={child.slug}
                      to={`/${service.areaSlug}/${child.slug}`}
                      className="group border border-primary/10 hover:border-secondary p-5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-serif text-xl font-bold text-primary mb-2 group-hover:text-secondary transition-colors">
                            {child.title}
                          </h3>
                          <p className="text-primary/70 font-light leading-relaxed">
                            {child.shortDescription}
                          </p>
                        </div>
                        <ArrowRight
                          className="w-5 h-5 text-secondary flex-shrink-0 mt-1 opacity-60 group-hover:opacity-100 transition-opacity"
                          strokeWidth={1.5}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className="space-y-12 mb-14">
              {service.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="text-2xl md:text-3xl font-serif font-bold text-primary mb-4">
                    {section.heading}
                  </h2>
                  <p className="text-primary/80 font-light leading-relaxed whitespace-pre-line">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>

            <section className="mb-14">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-primary mb-6">
                Частые вопросы
              </h2>
              <FaqAccordion items={service.faq} />
            </section>

            {related.length > 0 && (
              <section className="mb-14">
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-primary mb-6">
                  Связанные услуги
                </h2>
                <div className="flex flex-wrap gap-3">
                  {related.map((item) => (
                    <Link
                      key={item.path}
                      to={`/${item.path}`}
                      className="px-4 py-2 border border-primary/15 text-sm text-primary/80 hover:border-secondary hover:text-secondary transition-colors"
                    >
                      {item.shortTitle}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-surface border border-primary/10 p-8 md:p-10">
              <h2 className="text-2xl font-serif font-bold text-primary mb-4">
                Обсудим вашу ситуацию
              </h2>
              <p className="text-primary/70 font-light leading-relaxed mb-8 max-w-2xl">
                Расскажите обстоятельства дела — проведём первичный анализ и предложим понятный план действий.
                Конфиденциальность гарантируется. Офис в Туапсе, ул. Тельмана, 2.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/#contact"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white hover:bg-primary/90 transition-colors text-sm tracking-wider uppercase"
                >
                  Оставить заявку
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </Link>
                <a
                  href="tel:+79180486112"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-primary/20 text-primary hover:border-secondary hover:text-secondary transition-colors text-sm tracking-wider uppercase"
                >
                  <Phone className="w-4 h-4" strokeWidth={1.5} />
                  +7 (918) 048-61-12
                </a>
              </div>
            </section>

            {parent && (
              <div className="mt-10">
                <Link
                  to={`/${parent.path}`}
                  className="text-sm tracking-wider uppercase text-primary/50 hover:text-secondary transition-colors"
                >
                  ← Все услуги: {parent.shortTitle}
                </Link>
              </div>
            )}
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ServicePage;
