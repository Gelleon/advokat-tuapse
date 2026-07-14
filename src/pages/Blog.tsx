import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { usePosts } from '../store/usePosts';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Search } from 'lucide-react';
import { BASE_URL } from '../config';

const Blog = () => {
  const { posts } = usePosts(); // fetches only published posts
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [selectedTag, setSelectedTag] = useState<string>('Все');

  const categories = ['Все', 'Отраслевые новости', 'Наши дела'];
  
  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    posts.forEach(post => post.tags.forEach(tag => tags.add(tag)));
    return ['Все', ...Array.from(tags)];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            post.previewText.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Все' || post.category === selectedCategory;
      const matchesTag = selectedTag === 'Все' || post.tags.includes(selectedTag);
      
      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [posts, searchTerm, selectedCategory, selectedTag]);

  return (
    <div className="min-h-screen bg-surface font-sans">
      <Helmet>
        <title>Блог адвокатов | Экспертные статьи и новости юриспруденции</title>
        <meta name="description" content="Читайте полезные статьи, обзоры судебной практики и юридические советы от ведущих адвокатов Туапсе." />
        <meta property="og:title" content="Блог адвокатов | Экспертные статьи и новости" />
      </Helmet>
      <Header solid />
      
      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h1 className="text-5xl md:text-6xl font-bold text-primary mb-8 font-serif">Блог</h1>
            <div className="w-16 h-px bg-secondary mx-auto mb-8"></div>
            <p className="text-lg text-primary/70 font-light leading-relaxed">
              Актуальные новости из мира права, разбор сложных кейсов и экспертная аналитика законодательства.
            </p>
          </div>

          {/* Filters and Search */}
          <div className="bg-white p-8 rounded-sm shadow-premium mb-16 flex flex-col md:flex-row gap-8 items-center justify-between border border-transparent">
            <div className="flex flex-col sm:flex-row gap-6 w-full">
              <div className="relative flex-grow max-w-md">
                <Search className="w-5 h-5 text-primary/40 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
                <input 
                  type="text"
                  placeholder="Поиск по статьям..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 border border-surface-dark rounded-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none w-full bg-surface/50 text-primary transition-all"
                />
              </div>
              <div className="flex gap-4">
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-6 py-3 border border-surface-dark rounded-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface/50 text-primary transition-all appearance-none cursor-pointer"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select 
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="px-6 py-3 border border-surface-dark rounded-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface/50 text-primary transition-all appearance-none cursor-pointer max-w-[200px]"
                >
                  {allTags.map(t => <option key={t} value={t}>{t === 'Все' ? 'Все теги' : t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Grid */}
          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredPosts.map(post => (
                <Link to={`/blog/${post.slug}`} key={post.id} className="group bg-white rounded-sm overflow-hidden shadow-premium hover:shadow-premium-hover transition-all duration-500 flex flex-col h-full border border-transparent hover:border-secondary">
                  <div className="aspect-[4/3] bg-surface-dark overflow-hidden relative">
                    {post.thumbnailUrl ? (
                      <img src={`${BASE_URL}${post.thumbnailUrl}`} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary/30 font-light">
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
                    <h3 className="text-2xl font-bold text-primary mb-4 group-hover:text-secondary transition-colors font-serif leading-tight line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-primary/70 mb-8 font-light leading-relaxed line-clamp-3 text-sm flex-grow">
                      {post.previewText}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-auto pt-6 border-t border-primary/10">
                      {post.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] text-primary/60 font-medium tracking-widest uppercase border border-primary/10 px-2 py-1 rounded-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-sm shadow-premium border border-surface-dark">
              <p className="text-xl text-primary/50 font-light mb-6">По вашему запросу ничего не найдено.</p>
              <button onClick={() => {setSearchTerm(''); setSelectedCategory('Все'); setSelectedTag('Все');}} className="text-secondary font-medium uppercase tracking-wider text-sm hover:text-secondary-dark transition-colors border-b border-secondary pb-1">
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Blog;