import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';

export interface Post {
  id: string;
  title: string;
  slug: string;
  previewText: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  thumbnailUrl?: string;
  status: string;
  publishedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export const usePosts = (isAdmin = false) => {
  const [posts, setPosts] = useState<Post[]>([]);

  const fetchPosts = useCallback(async () => {
    try {
      const url = isAdmin ? `${API_URL}/posts?isAdmin=true` : `${API_URL}/posts`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const addPost = async (formData: FormData) => {
    try {
      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (response.ok) {
        const newPost = await response.json();
        setPosts(prev => [newPost, ...prev]);
      } else {
        const err = await response.json();
        alert(err.error || 'Ошибка при сохранении');
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка соединения с сервером');
    }
  };

  const updatePost = async (id: string, formData: FormData) => {
    try {
      const response = await fetch(`${API_URL}/posts/${id}`, {
        method: 'PUT',
        body: formData,
        credentials: 'include'
      });
      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(prev => prev.map(p => p.id === id ? updatedPost : p));
      } else {
        const err = await response.json();
        alert(err.error || 'Ошибка при обновлении');
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка соединения с сервером');
    }
  };

  const deletePost = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/posts/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setPosts(prev => prev.filter(p => p.id !== id));
      } else {
        alert('Ошибка при удалении');
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка соединения с сервером');
    }
  };

  return { posts, addPost, updatePost, deletePost };
};