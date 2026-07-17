import React, { useState, useEffect, useMemo } from 'react';
import Seo from '../components/Seo';
import { articleSchema, breadcrumbSchema } from '../seo/schemas';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ArrowLeft, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import { Post } from '../store/usePosts';
import { API_URL, BASE_URL, absoluteUrl, SITE_NAME } from '../config';

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`${API_URL}/posts/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setPost(data);
          
          const allResponse = await fetch(`${API_URL}/posts`);
          if (allResponse.ok) {
            const allPosts: Post[] = await allResponse.json();
            const related = allPosts.filter(p => p.category === data.category && p.id !== data.id).slice(0, 3);
            setRelatedPosts(related);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPost();
  }, [slug]);

  const visibleTags = useMemo(
    () => (post?.tags || []).filter((tag) => !tag.startsWith('pravo:')),
    [post]
  );

  const seoKeywords = useMemo(() => {
    if (!post) return undefined;
    const parts = [
      ...visibleTags,
      post.category,
      'адвокат Туапсе',
      'юридические новости',
      'изменения законодательства',
    ];
    return Array.from(new Set(parts.filter(Boolean))).join(', ');
  }, [post, visibleTags]);

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center text-primary font-light">Загрузка...</div>;
  if (!post) return <div className="min-h-screen bg-surface flex items-center justify-center text-xl text-primary/50 font-light">Публикация не найдена</div>;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const publishedDate = post.publishedAt || post.createdAt;
  const publishedLabel = new Date(publishedDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-surface font-sans">
      <Seo
        title={post.metaTitle || `${post.title} | ${SITE_NAME}`}
        description={post.metaDescription || post.previewText}
        path={`/blog/${post.slug}`}
        image={post.thumbnailUrl ? absoluteUrl(post.thumbnailUrl) : undefined}
        type="article"
        keywords={seoKeywords}
        publishedTime={publishedDate}
        modifiedTime={post.updatedAt}
        jsonLd={[
          articleSchema({
            ...post,
            tags: visibleTags,
          }),
          breadcrumbSchema([
            { name: 'Главная', path: '/' },
            { name: 'Блог', path: '/blog' },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <Header solid />
      
      <main className="pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          <Link to="/blog" className="inline-flex items-center gap-2 text-primary/50 hover:text-secondary font-medium tracking-wider uppercase text-xs transition-colors mb-10">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Вернуться в блог
          </Link>

          <article itemScope itemType="https://schema.org/Article">
            <header className="mb-10">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium tracking-widest uppercase text-primary/40 mb-6">
                <span className="text-secondary">{post.category}</span>
                <time dateTime={publishedDate} itemProp="datePublished">
                  {publishedLabel}
                </time>
                {post.author && (
                  <span itemProp="author" itemScope itemType="https://schema.org/Organization">
                    <span itemProp="name">{post.author}</span>
                  </span>
                )}
              </div>

              <h1
                className="text-3xl md:text-[2.75rem] font-bold text-primary font-serif leading-[1.2] tracking-tight mb-6"
                itemProp="headline"
              >
                {post.title}
              </h1>

              {post.previewText && (
                <p className="text-lg md:text-xl text-primary/65 font-light leading-relaxed border-l-2 border-secondary pl-5">
                  {post.previewText}
                </p>
              )}
            </header>

            {post.thumbnailUrl && (
              <figure className="mb-12 -mx-2 md:mx-0 overflow-hidden">
                <img
                  src={`${BASE_URL}${post.thumbnailUrl}`}
                  alt={post.title}
                  className="w-full max-h-[420px] object-cover"
                  itemProp="image"
                />
              </figure>
            )}

            <div
              className="article-body mb-12"
              itemProp="articleBody"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {visibleTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-12" aria-label="Теги статьи">
                {visibleTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] text-primary/55 font-medium tracking-wide uppercase border border-primary/10 px-3 py-1.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="border-t border-surface-dark pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <span className="font-medium tracking-wider uppercase text-xs text-primary/50 flex items-center gap-3">
                <Share2 className="w-4 h-4" strokeWidth={1.5} /> Поделиться статьей
              </span>
              <div className="flex gap-3">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-primary/10 flex items-center justify-center text-primary/40 hover:text-secondary hover:border-secondary transition-colors" aria-label="Facebook">
                  <Facebook className="w-4 h-4" strokeWidth={1.5} />
                </a>
                <a href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-primary/10 flex items-center justify-center text-primary/40 hover:text-secondary hover:border-secondary transition-colors" aria-label="X">
                  <Twitter className="w-4 h-4" strokeWidth={1.5} />
                </a>
                <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-primary/10 flex items-center justify-center text-primary/40 hover:text-secondary hover:border-secondary transition-colors" aria-label="LinkedIn">
                  <Linkedin className="w-4 h-4" strokeWidth={1.5} />
                </a>
              </div>
            </div>
          </article>

          {relatedPosts.length > 0 && (
            <section className="mt-20 pt-12 border-t border-surface-dark">
              <h2 className="text-2xl md:text-3xl font-bold text-primary mb-8 font-serif">Читайте также</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedPosts.map((rp) => (
                  <Link to={`/blog/${rp.slug}`} key={rp.id} className="group flex flex-col h-full">
                    {rp.thumbnailUrl && (
                      <div className="aspect-[16/10] bg-surface-dark overflow-hidden mb-4">
                        <img src={`${BASE_URL}${rp.thumbnailUrl}`} alt={rp.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                      </div>
                    )}
                    <h3 className="font-bold text-primary group-hover:text-secondary transition-colors line-clamp-2 mb-2 font-serif text-lg leading-snug">
                      {rp.title}
                    </h3>
                    <p className="text-sm text-primary/55 font-light line-clamp-2">{rp.previewText}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BlogPost;
