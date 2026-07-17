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
import {
  formatBlogDate,
  getAuthorInitials,
  getTopicLabel,
  getVisibleTags,
} from '../components/blog/blogHelpers';

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
      <div className="vc-page min-h-screen flex items-center justify-center text-[#8a8a8a]">
        Загрузка...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="vc-page min-h-screen flex items-center justify-center text-[#8a8a8a] text-lg">
        Публикация не найдена
      </div>
    );
  }

  const publishedDate = post.publishedAt || post.createdAt;
  const publishedLabel = formatBlogDate(publishedDate);
  const author = post.author || SITE_NAME;
  const initials = getAuthorInitials(author);
  const topic = getTopicLabel(post);

  return (
    <div className="vc-page min-h-screen font-sans">
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

      <main className="pt-24 pb-16">
        <div className="vc-container">
          <Link to="/blog" className="vc-back">
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            Лента блога
          </Link>

          <article className="vc-article" itemScope itemType="https://schema.org/Article">
            <header className="vc-article__header">
              <div className="vc-article__meta">
                <span className="vc-avatar vc-avatar--lg" aria-hidden="true">{initials}</span>
                <div className="vc-article__meta-text">
                  <div className="vc-article__author" itemProp="author" itemScope itemType="https://schema.org/Organization">
                    <span itemProp="name">{author}</span>
                  </div>
                  <div className="vc-article__submeta">
                    <span className="vc-chip">{topic}</span>
                    <span className="vc-dot" aria-hidden="true" />
                    <time dateTime={publishedDate} itemProp="datePublished">
                      {publishedLabel}
                    </time>
                  </div>
                </div>
              </div>

              <h1 className="vc-article__title" itemProp="headline">
                {post.title}
              </h1>

              {post.previewText && (
                <p className="vc-article__subtitle">{post.previewText}</p>
              )}
            </header>

            {post.thumbnailUrl && (
              <figure className="vc-article__cover">
                <img
                  src={`${BASE_URL}${post.thumbnailUrl}`}
                  alt={post.title}
                  itemProp="image"
                />
              </figure>
            )}

            <div
              className="article-body"
              itemProp="articleBody"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {visibleTags.length > 0 && (
              <div className="vc-tags" aria-label="Теги статьи">
                {visibleTags.map((tag) => (
                  <span key={tag} className="vc-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </article>

          {relatedPosts.length > 0 && (
            <section className="vc-related">
              <div className="vc-related__head">
                <h2>Читайте также</h2>
                <Link to="/blog">Все материалы</Link>
              </div>
              <div className="vc-feed">
                {relatedPosts.map((rp) => (
                  <VcPostCard key={rp.id} post={rp} compact />
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
