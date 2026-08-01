import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, Heart, MapPin, TrendingDown, UserCheck, Gavel, ArrowRight } from 'lucide-react';
import { getMainServices, type ServiceIconId } from '../data/services';

const ICONS: Record<ServiceIconId, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  criminal: Gavel,
  family: Heart,
  land: MapPin,
  bankruptcy: TrendingDown,
  arbitration: Scale,
  inheritance: UserCheck,
};

const ICON_BY_AREA: Record<string, ServiceIconId> = {
  'ugolovnye-dela': 'criminal',
  'semeynye-spory': 'family',
  'zemelnye-spory': 'land',
  bankrotstvo: 'bankruptcy',
  'arbitrazhnye-spory': 'arbitration',
  'nasledstvennye-spory': 'inheritance',
};

const Services = () => {
  const services = getMainServices();

  return (
    <section id="services" className="py-32 bg-surface">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
              Специализация
            </h2>
            <p className="text-lg text-primary/70 leading-relaxed font-light">
              Мы предоставляем комплексные правовые решения, опираясь на глубокую экспертизу и многолетнюю практику в ключевых отраслях права.
            </p>
          </div>
          <div className="hidden md:block w-24 h-px bg-secondary"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {services.map((service) => {
            const iconId = ICON_BY_AREA[service.areaSlug] || 'arbitration';
            const Icon = ICONS[iconId];
            const children = service.children || [];

            return (
              <div
                key={service.path}
                className="group border-t border-primary/10 pt-8 transition-colors duration-300 hover:border-secondary"
              >
                <div className="mb-6 text-secondary">
                  <Icon className="w-10 h-10" strokeWidth={1} />
                </div>

                <h3 className="text-2xl font-serif font-bold text-primary mb-4">
                  <Link
                    to={`/${service.path}`}
                    className="hover:text-secondary transition-colors"
                  >
                    {service.shortTitle}
                  </Link>
                </h3>

                <p className="text-primary/70 mb-8 leading-relaxed font-light">
                  {service.cardDescription}
                </p>

                <ul className="space-y-3 mb-8">
                  {children.map((child) => (
                    <li key={child.slug} className="flex items-start">
                      <span className="text-secondary mr-3 mt-1.5 text-xs">◆</span>
                      <Link
                        to={`/${service.areaSlug}/${child.slug}`}
                        className="text-primary/80 text-sm leading-relaxed hover:text-secondary transition-colors"
                      >
                        {child.title}
                      </Link>
                    </li>
                  ))}
                </ul>

                <Link
                  to={`/${service.path}`}
                  className="inline-flex items-center gap-2 text-xs tracking-wider uppercase text-primary/50 group-hover:text-secondary transition-colors"
                >
                  Подробнее
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Services;
