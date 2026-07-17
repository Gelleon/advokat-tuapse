import { Post } from '../../store/usePosts';

export const formatBlogDate = (value?: string) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const getVisibleTags = (tags: string[] = []) =>
  tags.filter((tag) => !tag.startsWith('pravo:'));

export const getTopicLabel = (post: Post) => {
  const tag = getVisibleTags(post.tags).find((t) => t !== 'Изменения законодательства');
  return tag || post.category;
};

export const getAuthorInitials = (author?: string) => {
  if (!author?.trim()) return 'АТ';
  const parts = author.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};
