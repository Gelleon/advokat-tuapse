import React, { useState, useMemo, useEffect } from 'react';
import Seo from '../components/Seo';
import { breadcrumbSchema } from '../seo/schemas';
import { usePosts } from '../store/usePosts';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Search } from 'lucide-react';
import VcPostCard from '../components/blog/VcPostCard';
import { getTopicFilterOptions, postMatchesTopic } from '../components/blog/blogHelpers';

const Blog = () => {
  const { posts } = usePosts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [selectedTag, setSelectedTag] = useState<string>('Все');

  const categories = ['Все', 'Отраслевые новости', 'Наши дела'];

  const allTags = useMemo(() => getTopicFilterOptions(posts), [posts]);

  useEffect(() => {
    if (selectedTag !== 'Все' && !allTags.includes(selectedTag)) {
      setSelectedTag('Все');
    }
  }, [allTags, selectedTag]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.previewText.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Все' || post.category === selectedCategory;
      const matchesTag = postMatchesTopic(post, selectedTag);
      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [posts, searchTerm, selectedCategory, selectedTag]);

  return (
    <div className="vc-page min-h-screen font-sans">
      <Seo
        title="Блог адвокатов | Экспертные статьи и новости юриспруденции"
        description="Читайте полезные статьи, обзоры судебной практики и юридические советы от ведущих адвокатов Туапсе."
        path="/blog"
        keywords="юридический блог, судебная практика, правовые новости, адвокат туапсе"
        jsonLd={breadcrumbSchema([
          { name: 'Главная', path: '/' },
          { name: 'Блог', path: '/blog' },
        ])}
      />
      <Header solid />

      <main className="pt-24 pb-16">
        <div className="vc-container">
          <div className="vc-feed-header">
            <h1>Блог</h1>
            <p>Правовые новости, разборы изменений закона и материалы из практики</p>
          </div>

          <div className="vc-toolbar">
            <div className="vc-search">
              <Search className="w-4 h-4" strokeWidth={2} />
              <input
                type="text"
                placeholder="Поиск по материалам"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="vc-filters">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
              >
                {allTags.map((t) => (
                  <option key={t} value={t}>{t === 'Все' ? 'Все темы' : t}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredPosts.length > 0 ? (
            <div className="vc-feed">
              {filteredPosts.map((post) => (
                <VcPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="vc-empty">
              <p>По вашему запросу ничего не найдено</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('Все');
                  setSelectedTag('Все');
                }}
              >
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
