import React from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../../store/usePosts';
import { BASE_URL } from '../../config';
import { formatBlogDate, getAuthorInitials, getTopicLabel } from './blogHelpers';

interface VcPostCardProps {
  post: Post;
  compact?: boolean;
}

const VcPostCard = ({ post, compact = false }: VcPostCardProps) => {
  const dateLabel = formatBlogDate(post.publishedAt || post.createdAt);
  const topic = getTopicLabel(post);
  const author = post.author || 'Адвокаты Туапсе';
  const initials = getAuthorInitials(author);

  return (
    <Link to={`/blog/${post.slug}`} className="vc-card group">
      <div className="vc-card__body">
        <div className="vc-card__meta">
          <span className="vc-avatar" aria-hidden="true">{initials}</span>
          <span className="vc-card__author">{author}</span>
          <span className="vc-dot" aria-hidden="true" />
          <span className="vc-card__topic">{topic}</span>
          {dateLabel && (
            <>
              <span className="vc-dot" aria-hidden="true" />
              <time dateTime={post.publishedAt || post.createdAt}>{dateLabel}</time>
            </>
          )}
        </div>

        <h3 className={`vc-card__title ${compact ? 'vc-card__title--compact' : ''}`}>
          {post.title}
        </h3>

        {post.previewText && (
          <p className="vc-card__excerpt">{post.previewText}</p>
        )}
      </div>

      <div className={`vc-card__media ${compact ? 'vc-card__media--compact' : ''}`}>
        {post.thumbnailUrl ? (
          <img
            src={`${BASE_URL}${post.thumbnailUrl}`}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="vc-card__placeholder">{topic}</div>
        )}
      </div>
    </Link>
  );
};

export default VcPostCard;
