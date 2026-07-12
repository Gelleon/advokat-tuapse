import React from 'react';
import { Scale, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13v8l4-5" />
  </svg>
);

const MaxIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.1L2 22l4.9-1.38C8.42 21.5 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
  </svg>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0f172a] text-white">
      <div className="container mx-auto px-6 py-20 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="lg:col-span-2 pr-0 lg:pr-12">
            <div className="flex items-center space-x-3 mb-8">
              <Scale className="w-8 h-8 text-secondary" strokeWidth={1.5} />
              <h3 className="text-2xl font-serif font-bold tracking-wide">Адвокаты Туапсе</h3>
            </div>
            <p className="text-white/60 mb-8 leading-relaxed font-light max-w-md">
              Команда практикующих адвокатов с многолетним опытом ведения юридических дел. Оказываем квалифицированную правовую помощь, представляя и защищая интересы клиентов с соблюдением высоких профессиональных и этических стандартов.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://t.me/+79180486112" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="w-10 h-10 border border-white/20 hover:border-secondary hover:text-secondary rounded-sm flex items-center justify-center transition-colors text-white/80"
              >
                <TelegramIcon className="w-4 h-4" />
              </a>
              <a 
                href="https://max.ru/+79180486112" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="MAX"
                className="w-10 h-10 border border-white/20 hover:border-secondary hover:text-secondary rounded-sm flex items-center justify-center transition-colors text-white/80"
              >
                <MaxIcon className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-medium tracking-widest uppercase text-white/40 mb-6">Навигация</h4>
            <div className="flex flex-col space-y-4">
              <a href="#services" className="text-white/80 hover:text-secondary transition-colors font-light">Услуги</a>
              <a href="#portfolio" className="text-white/80 hover:text-secondary transition-colors font-light">Наши дела</a>
              <Link to="/blog" className="text-white/80 hover:text-secondary transition-colors font-light">Блог</Link>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-xs font-medium tracking-widest uppercase text-white/40 mb-6">Контакты</h4>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <Phone className="w-4 h-4 text-secondary mt-1" strokeWidth={1.5} />
                <div>
                  <p className="text-white/90 font-medium">+7 (918) 048-61-12</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <Mail className="w-4 h-4 text-secondary mt-1" strokeWidth={1.5} />
                <div>
                  <p className="text-white/90">info@advokat-tuapse.ru</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <MapPin className="w-4 h-4 text-secondary mt-1" strokeWidth={1.5} />
                <div>
                  <p className="text-white/90 leading-relaxed">352800 г. Туапсе, ул. Тельмана, 2</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-16 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-white/40 text-sm font-light">
              © {currentYear} Адвокаты Туапсе. Все права защищены.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy" className="text-white/40 hover:text-white text-sm transition-colors font-light">
                Политика конфиденциальности
              </Link>
              <Link to="/terms" className="text-white/40 hover:text-white text-sm transition-colors font-light">
                Условия использования
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;