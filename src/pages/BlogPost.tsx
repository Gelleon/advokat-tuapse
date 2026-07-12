import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ArrowLeft, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import { Post } from '../store/usePosts';

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/posts/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setPost(data);
          
          // Fetch related posts (same category)
          const allResponse = await fetch(`http://localhost:5000/api/posts`);
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

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center text-primary font-light">Загрузка...</div>;
  if (!post) return <div className="min-h-screen bg-surface flex items-center justify-center text-xl text-primary/50 font-light">Публикация не найдена</div>;

  const shareUrl = window.location.href;

  return (
    <div className="min-h-screen bg-surface font-sans">
      <Helmet>
        <title>{post.metaTitle || `${post.title} | Адвокаты Туапсе`}</title>
        <meta name="description" content={post.metaDescription || post.previewText} />
        <meta property="og:title" content={post.metaTitle || post.title} />
        <meta property="og:description" content={post.metaDescription || post.previewText} />
        {post.thumbnailUrl && <meta property="og:image" content={`http://localhost:5000${post.thumbnailUrl}`} />}
        <meta property="og:type" content="article" />
      </Helmet>
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/blog" className="inline-flex items-center gap-2 text-primary/50 hover:text-secondary font-medium tracking-wider uppercase text-xs transition-colors mb-12">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Вернуться в блог
          </Link>

          <article className="bg-white rounded-sm shadow-premium border border-surface-dark overflow-hidden">
            {post.thumbnailUrl && (
              <img src={`http://localhost:5000${post.thumbnailUrl}`} alt={post.title} className="w-full h-[500px] object-cover" />
            )}
            
            <div className="p-10 md:p-16">
              <div className="flex flex-wrap items-center gap-6 text-xs font-medium tracking-widest uppercase text-primary/40 mb-10">
                <span className="text-secondary">
                  {post.category}
                </span>
                <span>{new Date(post.publishedAt || post.createdAt).toLocaleDateString('ru-RU')}</span>
                {post.author && <span>{post.author}</span>}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-primary mb-12 font-serif leading-tight">
                {post.title}
              </h1>

              {/* Render HTML content safely */}
              <div 
                className="prose prose-lg prose-slate max-w-none mb-16 prose-headings:font-serif prose-headings:text-primary prose-p:text-primary/80 prose-p:font-light prose-p:leading-relaxed prose-a:text-secondary hover:prose-a:text-secondary-dark prose-li:text-primary/80 prose-li:font-light"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              <div className="flex flex-wrap gap-3 mb-16">
                {post.tags.map(tag => (
                  <span key={tag} className="text-[10px] text-primary/60 font-medium tracking-widest uppercase border border-primary/10 px-3 py-1.5 rounded-sm">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Share block */}
              <div className="border-t border-surface-dark pt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <span className="font-medium tracking-wider uppercase text-xs text-primary/50 flex items-center gap-3">
                  <Share2 className="w-4 h-4" strokeWidth={1.5} /> Поделиться статьей:
                </span>
                <div className="flex gap-4">
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-primary/10 rounded-sm flex items-center justify-center text-primary/40 hover:text-secondary hover:border-secondary transition-colors">
                    <Facebook className="w-4 h-4" strokeWidth={1.5} />
                  </a>
                  <a href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${post.title}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-primary/10 rounded-sm flex items-center justify-center text-primary/40 hover:text-secondary hover:border-secondary transition-colors">
                    <Twitter className="w-4 h-4" strokeWidth={1.5} />
                  </a>
                  <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${post.title}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-primary/10 rounded-sm flex items-center justify-center text-primary/40 hover:text-secondary hover:border-secondary transition-colors">
                    <Linkedin className="w-4 h-4" strokeWidth={1.5} />
                  </a>
                </div>
              </div>
            </div>
          </article>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-24">
              <h2 className="text-3xl font-bold text-primary mb-12 font-serif">Материалы по теме</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedPosts.map(rp => (
                  <Link to={`/blog/${rp.slug}`} key={rp.id} className="group bg-white rounded-sm overflow-hidden shadow-premium border border-transparent hover:border-secondary transition-all flex flex-col h-full">
                    {rp.thumbnailUrl && (
                      <div className="aspect-[4/3] bg-surface-dark overflow-hidden">
                        <img src={`http://localhost:5000${rp.thumbnailUrl}`} alt={rp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="font-bold text-primary group-hover:text-secondary transition-colors line-clamp-2 mb-4 font-serif text-lg leading-snug">
                        {rp.title}
                      </h3>
                      <p className="text-sm text-primary/60 font-light line-clamp-2 mt-auto">{rp.previewText}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BlogPost;