import React from 'react';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';

const Contact = () => {
  return (
    <section id="contact" className="py-32 bg-white">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col lg:flex-row justify-between gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
              Свяжитесь с нами
            </h2>
            <div className="w-16 h-px bg-secondary mb-8"></div>
            <p className="text-lg text-primary/70 font-light leading-relaxed mb-12">
              Обсудим вашу ситуацию, проведем первичный анализ и предложим оптимальные пути решения. Конфиденциальность гарантируется.
            </p>

            <div className="space-y-10">
              <div className="flex items-start space-x-6">
                <div className="w-12 h-12 bg-surface rounded-sm flex items-center justify-center flex-shrink-0 text-secondary">
                  <Phone className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-xs font-medium tracking-wider uppercase text-primary/50 mb-2">Телефон</h3>
                  <p className="text-xl font-serif text-primary mb-1">+7 (918) 048-61-12</p>
                </div>
              </div>

              <div className="flex items-start space-x-6">
                <div className="w-12 h-12 bg-surface rounded-sm flex items-center justify-center flex-shrink-0 text-secondary">
                  <Mail className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-xs font-medium tracking-wider uppercase text-primary/50 mb-2">Email</h3>
                  <p className="text-xl font-serif text-primary mb-1">info@advokat-tuapse.ru</p>
                  <p className="text-sm text-primary/60 font-light">Ответим в течение 2 часов</p>
                </div>
              </div>

              <div className="flex items-start space-x-6">
                <div className="w-12 h-12 bg-surface rounded-sm flex items-center justify-center flex-shrink-0 text-secondary">
                  <MapPin className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-xs font-medium tracking-wider uppercase text-primary/50 mb-2">Офис</h3>
                  <p className="text-xl font-serif text-primary mb-1">352800 г. Туапсе, ул. Тельмана, 2</p>
                  <p className="text-sm text-primary/60 font-light">Центр города, удобная парковка</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-6">
                <div className="w-12 h-12 bg-surface rounded-sm flex items-center justify-center flex-shrink-0 text-secondary">
                  <Clock className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-xs font-medium tracking-wider uppercase text-primary/50 mb-2">Режим работы</h3>
                  <p className="text-xl font-serif text-primary mb-1">Пн-Пт: 9:00 - 18:00</p>
                  <p className="text-xl font-serif text-primary">Сб: 9:00 - 13:00, Вс - выходной</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-5/12">
            <div className="bg-primary p-10 md:p-14 rounded-sm shadow-premium">
              <h3 className="text-2xl font-serif font-bold text-white mb-4">
                Быстрая связь
              </h3>
              <p className="text-white/60 mb-10 font-light leading-relaxed">
                Напишите нам в удобный мессенджер.
              </p>

              <div className="space-y-4">
                <a
                  href="https://t.me/+79180486112"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-4 px-6 rounded-sm font-medium transition-all duration-300 flex items-center justify-center space-x-3"
                >
                  <MessageCircle className="w-5 h-5 text-secondary" strokeWidth={1.5} />
                  <span className="tracking-wider uppercase text-sm">Telegram</span>
                </a>

                <a
                  href="https://max.ru/+79180486112"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-4 px-6 rounded-sm font-medium transition-all duration-300 flex items-center justify-center space-x-3"
                >
                  <MessageCircle className="w-5 h-5 text-secondary" strokeWidth={1.5} />
                  <span className="tracking-wider uppercase text-sm">MAX</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;