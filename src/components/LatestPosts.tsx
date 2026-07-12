import React from 'react';
import { Link } from 'react-router-dom';
import { usePosts } from '../store/usePosts';
import { ArrowRight } from 'lucide-react';

const LatestPosts = () => {
  const { posts } = usePosts();
  
  // Берем только 3 последние опубликованные статьи
  const latestPosts = posts.slice(0, 3);

  if (latestPosts.length === 0) return null;

  return (
    <section id="latest-news" className="py-32 bg-surface">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
              Последние публикации
            </h2>
            <p className="text-lg text-primary/70 leading-relaxed font-light">
              Экспертные статьи, анализ изменений в законодательстве и разбор прецедентов из нашей практики.
            </p>
          </div>
          <Link 
            to="/blog" 
            className="inline-flex items-center gap-2 text-primary hover:text-secondary font-medium tracking-wider uppercase text-sm transition-colors group"
          >
            Читать блог 
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {latestPosts.map(post => (
            <Link 
              to={`/blog/${post.slug}`} 
              key={post.id} 
              className="group bg-white rounded-sm overflow-hidden shadow-premium hover:shadow-premium-hover transition-all duration-500 flex flex-col h-full border border-transparent hover:border-secondary"
            >
              <div className="aspect-[4/3] bg-surface-dark overflow-hidden relative">
                {post.thumbnailUrl ? (
                  <img 
                    src={`http://localhost:5000${post.thumbnailUrl}`} 
                    alt={`Иллюстрация к статье: ${post.title}`} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-dark text-primary/30 font-light">
                    Нет изображения
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-primary text-white text-[10px] font-medium px-3 py-1.5 rounded-sm uppercase tracking-widest">
                  {post.category}
                </div>
              </div>
              
              <div className="p-8 flex flex-col flex-grow">
                <div className="text-xs text-primary/40 font-medium tracking-wider uppercase mb-4">
                  {new Date(post.publishedAt || post.createdAt).toLocaleDateString('ru-RU')}
                </div>
                
                <h3 className="text-2xl font-serif font-bold text-primary mb-4 group-hover:text-secondary transition-colors leading-tight line-clamp-2">
                  {post.title}
                </h3>
                
                <p className="text-primary/70 mb-8 font-light leading-relaxed line-clamp-3 text-sm flex-grow">
                  {post.previewText}
                </p>
                
                <div className="mt-auto flex items-center text-primary text-xs font-medium tracking-widest uppercase group-hover:text-secondary transition-colors">
                  Читать статью 
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestPosts;