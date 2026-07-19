import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MAX_PROFILE_URL } from '../config';
import { Scale, Menu, X, Phone, MessageCircle } from 'lucide-react';

interface HeaderProps {
  solid?: boolean;
}

const Header = ({ solid = false }: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const isSolid = solid || isScrolled;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showConsultationPopup, setShowConsultationPopup] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTelegramClick = () => {
    window.open('https://t.me/+79180486112', '_blank');
    setShowConsultationPopup(false);
  };

  const handleMaxClick = () => {
    if (MAX_PROFILE_URL) {
      window.open(MAX_PROFILE_URL, '_blank', 'noopener,noreferrer');
    }
    setShowConsultationPopup(false);
  };

  const handleCallClick = () => {
    window.location.href = 'tel:+79180486112';
    setShowConsultationPopup(false);
  };

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isSolid 
            ? 'bg-white/95 backdrop-blur-md shadow-premium py-4' 
            : 'bg-transparent py-6'
        }`}
      >
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <Scale 
                className={`w-8 h-8 transition-colors duration-500 ${
                  isSolid ? 'text-primary' : 'text-white'
                }`} 
                strokeWidth={1.5}
              />
              <span className={`text-2xl font-serif font-bold tracking-wide transition-colors duration-500 ${
                isSolid ? 'text-primary' : 'text-white'
              }`}>
                Адвокаты Туапсе
              </span>
            </Link>

            <nav className="hidden lg:flex items-center space-x-8">
              <Link 
                to="/#services" 
                className={`text-sm font-medium tracking-wider uppercase transition-colors duration-300 hover:text-secondary ${
                  isSolid ? 'text-primary' : 'text-white/90'
                }`}
              >
                Услуги
              </Link>
              <Link 
                to="/blog" 
                className={`text-sm font-medium tracking-wider uppercase transition-colors duration-300 hover:text-secondary ${
                  isSolid ? 'text-primary' : 'text-white/90'
                }`}
              >
                Блог
              </Link>
              <Link 
                to="/#portfolio" 
                className={`text-sm font-medium tracking-wider uppercase transition-colors duration-300 hover:text-secondary ${
                  isSolid ? 'text-primary' : 'text-white/90'
                }`}
              >
                Наши дела
              </Link>
              <Link 
                to="/#contact" 
                className={`text-sm font-medium tracking-wider uppercase transition-colors duration-300 hover:text-secondary ${
                  isSolid ? 'text-primary' : 'text-white/90'
                }`}
              >
                Контакты
              </Link>
            </nav>

            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Phone className={`w-4 h-4 ${isSolid ? 'text-primary' : 'text-white'}`} strokeWidth={1.5} />
                <span className={`text-sm font-medium tracking-wider ${isSolid ? 'text-primary' : 'text-white'}`}>
                  +7 (918) 048-61-12
                </span>
              </div>
              <button 
                onClick={() => setShowConsultationPopup(true)}
                className={`px-6 py-2.5 rounded-sm font-medium text-sm tracking-wider uppercase transition-all duration-300 border ${
                  isSolid 
                    ? 'bg-primary text-white border-primary hover:bg-primary-light hover:border-primary-light' 
                    : 'bg-white text-primary border-white hover:bg-transparent hover:text-white'
                }`}
              >
                Консультация
              </button>
            </div>

            <button 
              className={`lg:hidden transition-colors duration-300 ${
                isSolid ? 'text-primary' : 'text-white'
              }`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" strokeWidth={1.5} /> : <Menu className="w-6 h-6" strokeWidth={1.5} />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="lg:hidden mt-4 bg-white rounded-sm p-6 shadow-premium">
              <nav className="flex flex-col space-y-6">
                <Link to="/#services" className="text-primary font-medium tracking-wider uppercase text-sm hover:text-secondary transition-colors" onClick={() => setIsMenuOpen(false)}>
                  Услуги
                </Link>
                <Link to="/blog" className="text-primary font-medium tracking-wider uppercase text-sm hover:text-secondary transition-colors" onClick={() => setIsMenuOpen(false)}>
                  Блог
                </Link>
                <Link to="/#portfolio" className="text-primary font-medium tracking-wider uppercase text-sm hover:text-secondary transition-colors" onClick={() => setIsMenuOpen(false)}>
                  Наши дела
                </Link>
                <Link to="/#contact" className="text-primary font-medium tracking-wider uppercase text-sm hover:text-secondary transition-colors" onClick={() => setIsMenuOpen(false)}>
                  Контакты
                </Link>
                <div className="pt-6 border-t border-surface-dark">
                  <div className="flex items-center space-x-2 text-sm text-primary mb-4">
                    <Phone className="w-4 h-4" strokeWidth={1.5} />
                    <span className="font-medium tracking-wider">+7 (918) 048-61-12</span>
                  </div>
                  <button 
                    onClick={() => setShowConsultationPopup(true)}
                    className="w-full bg-primary hover:bg-primary-light text-white px-6 py-3 rounded-sm font-medium tracking-wider uppercase text-sm transition-colors"
                  >
                    Консультация
                  </button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Consultation Popup */}
      {showConsultationPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/80 backdrop-blur-sm">
          <div className="bg-white rounded-sm p-8 max-w-sm w-full mx-4 shadow-premium animate-modal-appear">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-serif font-bold text-primary">Связаться с нами</h3>
              <button
                onClick={() => setShowConsultationPopup(false)}
                className="text-primary/50 hover:text-primary transition-colors"
              >
                <X className="w-6 h-6" strokeWidth={1.5} />
              </button>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={handleTelegramClick}
                className="w-full flex items-center justify-center space-x-3 bg-surface hover:bg-surface-dark text-primary px-6 py-4 rounded-sm font-medium transition-colors border border-surface-dark"
              >
                <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
                <span>Telegram</span>
              </button>
              
              {MAX_PROFILE_URL && (
                <button
                  onClick={handleMaxClick}
                  className="w-full flex items-center justify-center space-x-3 bg-surface hover:bg-surface-dark text-primary px-6 py-4 rounded-sm font-medium transition-colors border border-surface-dark"
                >
                  <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
                  <span>MAX</span>
                </button>
              )}
              <button
                onClick={handleCallClick}
                className="w-full flex items-center justify-center space-x-3 bg-primary hover:bg-primary-light text-white px-6 py-4 rounded-sm font-medium transition-colors"
              >
                <Phone className="w-5 h-5" strokeWidth={1.5} />
                <span>Позвонить</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
