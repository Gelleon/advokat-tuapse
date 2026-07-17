import React, { useState, useRef } from 'react';
import { usePosts, Post } from '../../store/usePosts';
import { Plus, Trash2, Edit2, X, Image as ImageIcon, Calendar, Sparkles, Loader2 } from 'lucide-react';
import { API_URL } from '../../config';
import { PRACTICE_AREA_OPTIONS } from '../../data/practiceAreas';

const BlogAdmin = () => {
  const { posts, addPost, updatePost, deletePost, refreshPosts } = usePosts(true); // pass isAdmin=true
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const initialFormState: Partial<Post> = {
    title: '',
    slug: '',
    previewText: '',
    content: '',
    category: 'Отраслевые новости',
    tags: [],
    author: '',
    status: 'DRAFT',
    publishedAt: new Date().toISOString().slice(0, 16),
    metaTitle: '',
    metaDescription: ''
  };

  const [formData, setFormData] = useState<Partial<Post>>(initialFormState);
  const [tagInput, setTagInput] = useState('');
  const [thumbnailName, setThumbnailName] = useState('');

  const [practiceAreaId, setPracticeAreaId] = useState('auto');
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentMessage, setAgentMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter((_, i) => i !== index)
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, загрузите изображение');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла превышает 5МБ.');
        return;
      }
      setThumbnailName(file.name);
    }
  };

  const handleEdit = (post: Post) => {
    setEditingId(post.id);
    setFormData({
      title: post.title,
      slug: post.slug,
      previewText: post.previewText,
      content: post.content,
      category: post.category,
      tags: post.tags || [],
      author: post.author,
      status: post.status,
      publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 16) : '',
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
    });
    setThumbnailName(post.thumbnailUrl ? 'Изображение загружено' : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setTagInput('');
    setThumbnailName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateArticle = async () => {
    setIsGenerating(true);
    setAgentMessage(null);

    try {
      const response = await fetch(`${API_URL}/ai/blog/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          practiceAreaId,
          periodType,
          author: formData.author || 'Адвокаты Туапсе'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось сгенерировать статью');
      }

      const post = data.post as Post;
      setEditingId(post.id);
      setFormData({
        title: post.title,
        slug: post.slug,
        previewText: post.previewText,
        content: post.content,
        category: post.category || 'Отраслевые новости',
        tags: post.tags || [],
        author: post.author || 'Адвокаты Туапсе',
        status: 'DRAFT',
        publishedAt: '',
        metaTitle: post.metaTitle || '',
        metaDescription: post.metaDescription || ''
      });
      setThumbnailName('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      await refreshPosts();
      setAgentMessage({
        text: `Черновик создан по документу: ${data.source?.complexName || data.source?.eoNumber}. Проверьте текст и опубликуйте вручную.`,
        type: 'success'
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('Blog agent failed:', error);
      setAgentMessage({
        text: error?.message || 'Ошибка генерации статьи',
        type: 'error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.slug || !formData.content) {
      alert('Заполните обязательные поля (Заголовок, Slug, Текст)');
      return;
    }

    const form = new FormData();
    form.append('title', formData.title || '');
    form.append('slug', formData.slug || '');
    form.append('previewText', formData.previewText || '');
    form.append('content', formData.content || '');
    form.append('category', formData.category || 'Отраслевые новости');
    form.append('tags', JSON.stringify(formData.tags || []));
    form.append('author', formData.author || '');
    form.append('status', formData.status || 'DRAFT');
    
    if (formData.publishedAt) {
      form.append('publishedAt', new Date(formData.publishedAt).toISOString());
    }

    form.append('metaTitle', formData.metaTitle || '');
    form.append('metaDescription', formData.metaDescription || '');

    if (fileInputRef.current?.files?.[0]) {
      form.append('thumbnail', fileInputRef.current.files[0]);
    }

    if (editingId) {
      await updatePost(editingId, form);
    } else {
      await addPost(form);
    }
    
    handleCancelEdit();
  };

  return (
    <div className="space-y-8">
      {/* AI Agent */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              AI-агент блога
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Ищет свежие акты на publication.pravo.gov.ru, пишет понятную SEO-статью и сохраняет черновик.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Направление</label>
            <select
              value={practiceAreaId}
              onChange={(e) => setPracticeAreaId(e.target.value)}
              disabled={isGenerating}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            >
              {PRACTICE_AREA_OPTIONS.map((area) => (
                <option key={area.id} value={area.id}>{area.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Период поиска</label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as 'weekly' | 'monthly')}
              disabled={isGenerating}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            >
              <option value="weekly">За неделю</option>
              <option value="monthly">За месяц</option>
            </select>
          </div>
          <div>
            <button
              type="button"
              onClick={handleGenerateArticle}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? 'Генерируем…' : 'Сгенерировать черновик'}
            </button>
          </div>
        </div>

        {agentMessage && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${agentMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {agentMessage.text}
          </div>
        )}
      </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            {editingId ? 'Редактировать публикацию' : 'Добавить новую публикацию'}
          </h2>
          {editingId && (
            <button 
              onClick={handleCancelEdit}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
              Отменить
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Заголовок *</label>
              <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL) *</label>
              <input type="text" name="slug" value={formData.slug} onChange={handleInputChange} placeholder="naprimer-novaya-statya" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Категория</label>
              <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none">
                <option value="Отраслевые новости">Отраслевые новости</option>
                <option value="Наши дела">Наши дела</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Автор</label>
              <input type="text" name="author" value={formData.author} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Превью текст</label>
            <textarea name="previewText" value={formData.previewText} onChange={handleInputChange} rows={2} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Полный текст (Поддерживает HTML) *</label>
            <textarea name="content" value={formData.content} onChange={handleInputChange} rows={6} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none font-mono text-sm" required></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Теги</label>
            <div className="flex gap-2 mb-2">
              <input 
                type="text" 
                value={tagInput} 
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" 
                placeholder="Например: Арбитраж"
              />
              <button type="button" onClick={handleAddTag} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">
                Добавить
              </button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                    {t}
                    <button type="button" onClick={() => handleRemoveTag(i)} className="text-blue-500 hover:text-blue-700">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Миниатюра (Изображение)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef}
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 border-dashed rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  {thumbnailName ? 'Изменить фото' : 'Загрузить фото'}
                </button>
              </div>
              {thumbnailName && <p className="text-xs text-green-600 mt-1 truncate">Выбран: {thumbnailName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Статус</label>
              <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none">
                <option value="DRAFT">Черновик</option>
                <option value="PUBLISHED">Опубликовано</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Дата публикации</label>
              <div className="relative">
                <input 
                  type="datetime-local" 
                  name="publishedAt" 
                  value={formData.publishedAt} 
                  onChange={handleInputChange} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" 
                />
              </div>
            </div>
          </div>

          {/* SEO Block */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-6 space-y-4">
            <h3 className="font-semibold text-slate-800">SEO Настройки</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Meta Title</label>
              <input type="text" name="metaTitle" value={formData.metaTitle} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Meta Description</label>
              <textarea name="metaDescription" value={formData.metaDescription} onChange={handleInputChange} rows={2} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"></textarea>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingId ? 'Сохранить изменения' : 'Сохранить публикацию'}
            </button>
          </div>
        </form>
      </div>

      {/* List of posts */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-[calc(100vh-14rem)] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Все записи ({posts.length})</h2>
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50 hover:bg-white transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex gap-2 mb-2">
                    <span className="text-xs font-medium px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-500">
                      {p.category}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-md ${p.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.status === 'PUBLISHED' ? 'Опубликовано' : 'Черновик'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 leading-tight">{p.title}</h3>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleEdit(p)} className="text-slate-400 hover:text-amber-500">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deletePost(p.id)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-sm text-slate-500 mb-2 line-clamp-1">{p.previewText}</div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('ru-RU') : 'Не запланировано'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
};

export default BlogAdmin;