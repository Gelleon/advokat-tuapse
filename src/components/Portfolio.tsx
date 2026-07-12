import React, { useState, useRef } from 'react';
import { Eye, ChevronRight, ChevronLeft, FileText } from 'lucide-react';
import { useCases, Case } from '../store/useCases';
import { BASE_URL } from '../config';

const Portfolio = () => {
  const { cases } = useCases();
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const openCaseModal = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setIsModalOpen(true);
  };

  const closeCaseModal = () => {
    setIsModalOpen(false);
    setSelectedCase(null);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section id="portfolio" className="py-32 bg-white overflow-hidden border-t border-surface-dark">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
              Наши дела
            </h2>
            <p className="text-lg text-primary/70 leading-relaxed font-light">
              В этом разделе представлены результаты нашей работы. Изучите судебную практику и реализованные дела, чтобы лучше понять наш опыт и подход к защите интересов доверителей.
            </p>
          </div>
          
          <div className="flex gap-4">
            <button onClick={() => scroll('left')} className="p-4 border border-primary/20 rounded-sm hover:border-secondary hover:text-secondary transition-colors text-primary">
              <ChevronLeft className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <button onClick={() => scroll('right')} className="p-4 border border-primary/20 rounded-sm hover:border-secondary hover:text-secondary transition-colors text-primary">
              <ChevronRight className="w-6 h-6" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div 
          ref={carouselRef}
          className="flex overflow-x-auto gap-8 pb-12 snap-x snap-mandatory hide-scrollbar -mx-6 px-6 md:mx-0 md:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {cases.map((caseItem) => (
            <div 
              key={caseItem.id}
              className="flex-none w-[85vw] md:w-[400px] snap-center group bg-surface rounded-sm p-8 transition-all duration-500 cursor-pointer border border-transparent hover:border-secondary flex flex-col"
              onClick={() => openCaseModal(caseItem)}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-medium tracking-wider uppercase text-secondary">
                  {caseItem.category}
                </span>
                <Eye className="w-5 h-5 text-primary/30 group-hover:text-secondary transition-colors flex-shrink-0" strokeWidth={1.5} />
              </div>

              <h3 className="text-2xl font-serif font-bold text-primary mb-4 group-hover:text-secondary transition-colors line-clamp-2 min-h-[4rem]">
                {caseItem.title}
              </h3>
              
              <p className="text-primary/70 mb-8 font-light leading-relaxed line-clamp-3 min-h-[4.5rem] flex-grow">
                {caseItem.description}
              </p>

              <div className="flex items-center justify-between text-primary text-sm font-medium tracking-wider uppercase group-hover:text-secondary transition-colors mt-auto pt-6 border-t border-primary/10">
                <div className="flex items-center">
                  <span>Изучить дело</span>
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
                </div>
                {caseItem.pdfUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`${BASE_URL}${caseItem.pdfUrl}`, '_blank', 'noopener,noreferrer');
                    }}
                    className="p-2 -mr-2 hover:bg-surface-dark rounded-full transition-colors group/pdf"
                    title="Посмотреть документ"
                  >
                    <FileText className="w-5 h-5 text-primary/50 group-hover/pdf:text-secondary transition-colors" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Case Detail Modal */}
      {isModalOpen && selectedCase && (
        <div className="fixed inset-0 bg-primary/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-sm max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-premium animate-modal-appear relative">
            <div className="p-10">
              <button 
                onClick={closeCaseModal}
                className="absolute top-8 right-8 text-primary/50 hover:text-primary transition-colors"
              >
                <span className="text-3xl font-light">×</span>
              </button>
              
              <div className="mb-10 pr-12">
                <span className="text-xs font-medium tracking-wider uppercase text-secondary mb-4 block">
                  {selectedCase.category}
                </span>
                <h3 className="text-3xl md:text-4xl font-serif font-bold text-primary leading-tight">
                  {selectedCase.title}
                </h3>
              </div>

              {selectedCase.description && (
                <div className="mb-10">
                  <h4 className="text-sm font-medium tracking-wider uppercase text-primary/50 mb-4">Суть дела</h4>
                  <p className="text-primary/80 leading-relaxed font-light text-lg">
                    {selectedCase.description}
                  </p>
                </div>
              )}

              {selectedCase.challenges && selectedCase.challenges.length > 0 && (
                <div className="mb-10">
                  <h4 className="text-sm font-medium tracking-wider uppercase text-primary/50 mb-4">Основные вызовы</h4>
                  <ul className="space-y-3">
                    {selectedCase.challenges.map((challenge, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-secondary mr-3 mt-1.5 text-xs">◆</span>
                        <span className="text-primary/80 leading-relaxed font-light">{challenge}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedCase.outcome && (
                <div className="mb-10 bg-surface p-8 border-l-4 border-secondary">
                  <h4 className="text-sm font-medium tracking-wider uppercase text-primary/50 mb-4">Достигнутый результат</h4>
                  <p className="text-primary font-medium leading-relaxed">
                    {selectedCase.outcome}
                  </p>
                </div>
              )}

              {selectedCase.pdfUrl && (
                <div className="pt-8 border-t border-surface-dark">
                  <a 
                    href={`${BASE_URL}${selectedCase.pdfUrl}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-primary text-white hover:bg-primary-light px-6 py-4 rounded-sm font-medium tracking-wider uppercase text-sm transition-colors"
                  >
                    <FileText className="w-5 h-5" strokeWidth={1.5} />
                    Посмотреть решение суда (PDF)
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Portfolio;