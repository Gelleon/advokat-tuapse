import React, { useState } from 'react';
import { ArrowRight, MessageCircle, Phone, X } from 'lucide-react';

const Hero = () => {
  const [showConsultationPopup, setShowConsultationPopup] = useState(false);

  const scrollToPortfolio = () => {
    const portfolioSection = document.getElementById('portfolio');
    if (portfolioSection) {
      portfolioSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTelegramClick = () => {
    window.open('https://t.me/+79180486112', '_blank');
    setShowConsultationPopup(false);
  };

  const handleMaxClick = () => {
    window.open('https://max.ru/+79180486112', '_blank');
    setShowConsultationPopup(false);
  };

  const handleCallClick = () => {
    window.location.href = 'tel:+79180486112';
    setShowConsultationPopup(false);
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center bg-primary overflow-hidden">
      {/* Dynamic Premium Aurora Background Effect */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#0f172a]">
        {/* Animated Aurora Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-secondary/10 blur-[100px] mix-blend-screen animate-aurora-1 opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] rounded-full bg-secondary/15 blur-[120px] mix-blend-screen animate-aurora-2 opacity-50" style={{ animationDelay: '-5s' }}></div>
        <div className="absolute top-[20%] right-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-blue-900/20 blur-[100px] mix-blend-screen animate-aurora-3 opacity-40" style={{ animationDelay: '-10s' }}></div>
        
        {/* Noise overlay for premium texture */}
        <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.7\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
      </div>
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-primary via-primary/72 to-transparent"></div>

      {/* Consultation Popup */}
      {showConsultationPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/80 backdrop-blur-sm">
          <div className="bg-white rounded-sm p-8 max-w-sm w-full mx-4 shadow-premium animate-fade-in-up">
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
              
              <button
                onClick={handleMaxClick}
                className="w-full flex items-center justify-center space-x-3 bg-surface hover:bg-surface-dark text-primary px-6 py-4 rounded-sm font-medium transition-colors border border-surface-dark"
              >
                <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
                <span>MAX</span>
              </button>
              
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

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto pt-20">
        <div className="mb-10 animate-fade-in-up md:max-w-[48rem] mx-auto">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white mb-6 leading-tight tracking-tight">
            Профессиональная юридическая защита
            <span className="block text-secondary mt-2">
              ваших интересов
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed font-light tracking-wide">
            Комплексное правовое сопровождение бизнеса и частных лиц в Туапсе. Опыт, конфиденциальность, результат.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button
            onClick={() => setShowConsultationPopup(true)}
            className="group bg-secondary hover:bg-secondary-light text-primary px-8 py-4 rounded-sm font-semibold tracking-wider uppercase text-sm transition-all duration-300 flex items-center space-x-3"
          >
            <span>Получить консультацию</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
          </button>
          
          <button 
            onClick={scrollToPortfolio}
            className="group bg-transparent hover:bg-white/5 text-white border border-white/30 hover:border-white/60 px-8 py-4 rounded-sm font-semibold tracking-wider uppercase text-sm transition-all duration-300"
          >
            Наши дела
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
