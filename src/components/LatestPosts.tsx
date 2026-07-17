import React from 'react';
import { Link } from 'react-router-dom';
import { usePosts } from '../store/usePosts';
import { ArrowRight } from 'lucide-react';
import VcPostCard from './blog/VcPostCard';

const LatestPosts = () => {
  const { posts } = usePosts();
  const latestPosts = posts.slice(0, 3);

  if (latestPosts.length === 0) return null;

  return (
    <section id="latest-news" className="vc-home-section py-20 md:py-28">
      <div className="vc-container">
        <div className="vc-related__head mb-6">
          <div>
            <h2>Последние публикации</h2>
            <p className="vc-home-section__sub">Свежие материалы правового блога</p>
          </div>
          <Link to="/blog" className="vc-link-more">
            Весь блог
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Link>
        </div>

        <div className="vc-feed">
          {latestPosts.map((post) => (
            <VcPostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestPosts;
