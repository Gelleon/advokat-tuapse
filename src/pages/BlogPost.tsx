import React, { useState, useEffect, useMemo } from 'react';
import Seo from '../components/Seo';
import { articleSchema, breadcrumbSchema } from '../seo/schemas';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ArrowLeft } from 'lucide-react';
import { Post } from '../store/usePosts';
import { API_URL, BASE_URL, absoluteUrl, SITE_NAME } from '../config';
import VcPostCard from '../components/blog/VcPostCard';
import { getTopicLabel, getVisibleTags } from '../components/blog/blogHelpers';

const formatFullDate = (value?: string) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

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
            const related = allPosts
              .filter((p) => p.id !== data.id)
              .sort((a, b) => {
                const sameCategory = Number(b.category === data.category) - Number(a.category === data.category);
                if (sameCategory !== 0) return sameCategory;
                return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
              })
              .slice(0, 3);
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
    () => getVisibleTags(post?.tags || []),
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

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-primary/50 font-light">
        Загрузка...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-primary/50 text-xl font-light">
        Публикация не найдена
      </div>
    );
  }

  const publishedDate = post.publishedAt || post.createdAt;
  const publishedLabel = formatFullDate(publishedDate);
  const author = post.author || SITE_NAME;
  const topic = getTopicLabel(post);
  const seoDescription = post.metaDescription || post.previewText;

  return (
    <div className="min-h-screen bg-surface font-sans">
      <Seo
        title={post.metaTitle || `${post.title} | ${SITE_NAME}`}
        description={seoDescription}
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
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-primary/45 hover:text-secondary font-medium tracking-wider uppercase text-xs transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            Вернуться в блог
          </Link>

          <article itemScope itemType="https://schema.org/NewsArticle">
            <header className="mb-10">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium tracking-widest uppercase text-primary/40 mb-6">
                <span className="text-secondary">{topic}</span>
                <time dateTime={publishedDate} itemProp="datePublished">
                  {publishedLabel}
                </time>
                <span itemProp="author" itemScope itemType="https://schema.org/Organization">
                  <span itemProp="name">{author}</span>
                </span>
              </div>

              <h1
                className="text-3xl md:text-[2.75rem] font-bold text-primary font-serif leading-[1.2] tracking-tight mb-6"
                itemProp="headline"
              >
                {post.title}
              </h1>

              {post.previewText && (
                <p
                  className="news-dek"
                  itemProp="description"
                >
                  {post.previewText}
                </p>
              )}
            </header>

            {post.thumbnailUrl && (
              <figure className="mb-12 overflow-hidden rounded-xl bg-[#1c1c1e]">
                <img
                  src={`${BASE_URL}${post.thumbnailUrl}`}
                  alt={post.title}
                  className="w-full h-auto object-contain block"
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
              <div className="flex flex-wrap gap-2 pt-2" aria-label="Теги статьи">
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
          </article>

          {relatedPosts.length > 0 && (
            <section className="mt-20 pt-12 border-t border-surface-dark">
              <div className="vc-related__head mb-4">
                <h2 className="!font-serif !text-2xl md:!text-3xl !font-bold text-primary">Читайте также</h2>
                <Link to="/blog">Все материалы</Link>
              </div>
              <div className="vc-feed">
                {relatedPosts.map((rp) => (
                  <VcPostCard key={rp.id} post={rp} />
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
