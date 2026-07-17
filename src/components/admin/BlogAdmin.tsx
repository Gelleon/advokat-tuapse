import React, { useState, useRef, useEffect } from 'react';
import { usePosts, Post } from '../../store/usePosts';
import { Trash2, Edit2, X, Image as ImageIcon, Calendar, Sparkles, Loader2, Send, ChevronDown, Save } from 'lucide-react';
import { API_URL, BASE_URL } from '../../config';
import { PRACTICE_AREA_OPTIONS } from '../../data/practiceAreas';
import { BLOG_PROMPT_SETTING_KEY, DEFAULT_BLOG_PROMPT } from '../../data/blogPrompt';
import { IMAGE_PROMPT_SETTING_KEY, DEFAULT_IMAGE_PROMPT } from '../../data/imagePrompt';

const nowLocalInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const BlogAdmin = () => {
  const { posts, addPost, updatePost, deletePost, refreshPosts } = usePosts(true); // pass isAdmin=true
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const initialFormState: Partial<Post> = {
    title: '',
    slug: '',
    previewText: '',
    content: '',
    category: 'Отраслевые новости',
    tags: [],
    author: '',
    status: 'DRAFT',
    publishedAt: nowLocalInput(),
    metaTitle: '',
    metaDescription: ''
  };

  const [formData, setFormData] = useState<Partial<Post>>(initialFormState);
  const [tagInput, setTagInput] = useState('');
  const [thumbnailName, setThumbnailName] = useState('');
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState('');
  const [previewNonce, setPreviewNonce] = useState(0);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);

  const [practiceAreaId, setPracticeAreaId] = useState('auto');
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentMessage, setAgentMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [blogPrompt, setBlogPrompt] = useState(DEFAULT_BLOG_PROMPT);
  const [imagePrompt, setImagePrompt] = useState(DEFAULT_IMAGE_PROMPT);
  const [isPromptLoading, setIsPromptLoading] = useState(false);
  const [isPromptSaving, setIsPromptSaving] = useState(false);

  useEffect(() => {
    const loadPrompt = async () => {
      setIsPromptLoading(true);
      try {
        const [blogRes, imageRes] = await Promise.all([
          fetch(`${API_URL}/settings/${BLOG_PROMPT_SETTING_KEY}`, { credentials: 'include' }),
          fetch(`${API_URL}/settings/${IMAGE_PROMPT_SETTING_KEY}`, { credentials: 'include' }),
        ]);
        if (blogRes.ok) {
          const data = await blogRes.json();
          setBlogPrompt(data.value || DEFAULT_BLOG_PROMPT);
        }
        if (imageRes.ok) {
          const data = await imageRes.json();
          setImagePrompt(data.value || DEFAULT_IMAGE_PROMPT);
        }
      } catch (error) {
        console.error('Failed to load prompts:', error);
      } finally {
        setIsPromptLoading(false);
      }
    };
    loadPrompt();
  }, []);

  const saveBlogPrompts = async () => {
    setIsPromptSaving(true);
    try {
      const [blogRes, imageRes] = await Promise.all([
        fetch(`${API_URL}/settings/${BLOG_PROMPT_SETTING_KEY}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ value: blogPrompt }),
        }),
        fetch(`${API_URL}/settings/${IMAGE_PROMPT_SETTING_KEY}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ value: imagePrompt }),
        }),
      ]);
      if (!blogRes.ok || !imageRes.ok) throw new Error('save failed');
      setAgentMessage({ text: 'Промпты статьи и обложки сохранены.', type: 'success' });
    } catch {
      setAgentMessage({ text: 'Не удалось сохранить промпты', type: 'error' });
    } finally {
      setIsPromptSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      // При выборе «Опубликовано» автоматически ставим текущую дату, если её нет
      if (name === 'status' && value === 'PUBLISHED' && !prev.publishedAt) {
        next.publishedAt = nowLocalInput();
      }
      return next;
    });
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
    setExistingThumbnailUrl(post.thumbnailUrl || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setTagInput('');
    setThumbnailName('');
    setExistingThumbnailUrl('');
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
        publishedAt: nowLocalInput(),
        metaTitle: post.metaTitle || '',
        metaDescription: post.metaDescription || ''
      });
      setExistingThumbnailUrl(post.thumbnailUrl || '');
      setThumbnailName(post.thumbnailUrl ? 'AI-обложка сгенерирована' : '');
      if (fileInputRef.current) fileInputRef.current.value = '';

      setPreviewNonce(Date.now());
      await refreshPosts();

      if (post.thumbnailUrl) {
        setAgentMessage({
          text: `Черновик и обложка созданы по документу: ${data.source?.complexName || data.source?.eoNumber}. Проверьте и опубликуйте.`,
          type: 'success'
        });
      } else {
        setAgentMessage({
          text: `Черновик создан без обложки. ${data.imageError || 'Можно нажать «Сгенерировать обложку» или загрузить фото вручную.'} Источник: ${data.source?.complexName || data.source?.eoNumber}.`,
          type: 'error'
        });
      }
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

  const handleRegenerateImage = async () => {
    if (!editingId) {
      alert('Сначала сохраните или сгенерируйте статью');
      return;
    }

    setIsRegeneratingImage(true);
    setAgentMessage(null);
    try {
      const response = await fetch(`${API_URL}/ai/blog/regenerate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ postId: editingId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось сгенерировать обложку');
      }

      const url = data.post?.thumbnailUrl || '';
      setExistingThumbnailUrl(url);
      setThumbnailName(url ? 'AI-обложка сгенерирована' : '');
      setPreviewNonce(Date.now());
      await refreshPosts();
      setAgentMessage({ text: 'Обложка успешно сгенерирована.', type: 'success' });
    } catch (error: any) {
      setAgentMessage({
        text: error?.message || 'Ошибка генерации обложки',
        type: 'error'
      });
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const coverPreviewSrc = existingThumbnailUrl
    ? `${BASE_URL}${existingThumbnailUrl}${existingThumbnailUrl.includes('?') ? '&' : '?'}v=${previewNonce}`
    : '';

  const buildFormPayload = (status: 'DRAFT' | 'PUBLISHED') => {
    const form = new FormData();
    form.append('title', formData.title || '');
    form.append('slug', formData.slug || '');
    form.append('previewText', formData.previewText || '');
    form.append('content', formData.content || '');
    form.append('category', formData.category || 'Отраслевые новости');
    form.append('tags', JSON.stringify(formData.tags || []));
    form.append('author', formData.author || '');
    form.append('status', status);

    const publishedAtValue = status === 'PUBLISHED'
      ? (formData.publishedAt || nowLocalInput())
      : formData.publishedAt;

    if (publishedAtValue) {
      form.append('publishedAt', new Date(publishedAtValue).toISOString());
    }

    form.append('metaTitle', formData.metaTitle || '');
    form.append('metaDescription', formData.metaDescription || '');

    if (fileInputRef.current?.files?.[0]) {
      form.append('thumbnail', fileInputRef.current.files[0]);
    }

    return form;
  };

  const savePost = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!formData.title || !formData.slug || !formData.content) {
      alert('Заполните обязательные поля (Заголовок, Slug, Текст)');
      return;
    }

    setIsSaving(true);
    try {
      const form = buildFormPayload(status);
      if (editingId) {
        await updatePost(editingId, form);
      } else {
        await addPost(form);
      }
      await refreshPosts();
      handleCancelEdit();
      if (status === 'PUBLISHED') {
        setAgentMessage({ text: 'Статья опубликована и доступна в разделе Блог на сайте.', type: 'success' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePost((formData.status as 'DRAFT' | 'PUBLISHED') || 'DRAFT');
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
              Ищет акты на publication.pravo.gov.ru, пишет SEO-статью, генерирует обложку и сохраняет черновик.
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
              {isGenerating ? 'Генерируем текст и обложку…' : 'Сгенерировать черновик'}
            </button>
          </div>
        </div>

        {agentMessage && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${agentMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {agentMessage.text}
          </div>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setShowPromptEditor((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showPromptEditor ? 'rotate-180' : ''}`} />
            Промпты статьи и обложки
          </button>

          {showPromptEditor && (
            <div className="mt-4 space-y-5">
              {isPromptLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Загрузка промптов…
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Текст статьи</p>
                    <p className="text-xs text-slate-500">
                      Плейсхолдеры: <code className="bg-slate-100 px-1 rounded">{'{practiceArea}'}</code>,{' '}
                      <code className="bg-slate-100 px-1 rounded">{'{practiceDescription}'}</code>,{' '}
                      <code className="bg-slate-100 px-1 rounded">{'{practiceFeatures}'}</code>,{' '}
                      <code className="bg-slate-100 px-1 rounded">{'{sourceBrief}'}</code>
                    </p>
                    <textarea
                      value={blogPrompt}
                      onChange={(e) => setBlogPrompt(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Обложка (Recraft / RouterAI)</p>
                    <p className="text-xs text-slate-500">
                      Плейсхолдеры: <code className="bg-slate-100 px-1 rounded">{'{title}'}</code>,{' '}
                      <code className="bg-slate-100 px-1 rounded">{'{previewText}'}</code>,{' '}
                      <code className="bg-slate-100 px-1 rounded">{'{practiceArea}'}</code>,{' '}
                      <code className="bg-slate-100 px-1 rounded">{'{category}'}</code>
                    </p>
                    <textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none font-mono text-xs"
                    />
                  </div>
                </>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={saveBlogPrompts}
                  disabled={isPromptSaving || isPromptLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  {isPromptSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Сохранить промпты
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBlogPrompt(DEFAULT_BLOG_PROMPT);
                    setImagePrompt(DEFAULT_IMAGE_PROMPT);
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Сбросить к стандартным
                </button>
              </div>
            </div>
          )}
        </div>
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

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Обложка статьи</label>
            {coverPreviewSrc ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <img
                  src={coverPreviewSrc}
                  alt="Превью обложки"
                  className="w-full max-h-64 object-cover"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Обложки пока нет — сгенерируйте AI или загрузите файл
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                {thumbnailName ? 'Заменить файлом' : 'Загрузить файл'}
              </button>
              <button
                type="button"
                onClick={handleRegenerateImage}
                disabled={!editingId || isRegeneratingImage || isGenerating}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-lg transition-colors"
              >
                {isRegeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isRegeneratingImage ? 'Генерируем…' : 'Сгенерировать обложку'}
              </button>
            </div>
            {thumbnailName && <p className="text-xs text-green-600 truncate">{thumbnailName}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Статус</label>
              <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none">
                <option value="DRAFT">Черновик</option>
                <option value="PUBLISHED">Опубликовано</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Или просто нажмите кнопку «Опубликовать на сайте» ниже.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Дата публикации</label>
              <input
                type="datetime-local"
                name="publishedAt"
                value={formData.publishedAt || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
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

          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => savePost('DRAFT')}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Edit2 className="w-5 h-5" />}
              Сохранить черновик
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => savePost('PUBLISHED')}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Опубликовать на сайте
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
              <div className="flex gap-3 items-start">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0 border border-slate-200">
                  {p.thumbnailUrl ? (
                    <img
                      src={`${BASE_URL}${p.thumbnailUrl}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 px-1 text-center leading-tight">
                      нет фото
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="min-w-0">
                      <div className="flex gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-medium px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-500">
                          {p.category}
                        </span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-md ${p.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {p.status === 'PUBLISHED' ? 'Опубликовано' : 'Черновик'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 leading-tight">{p.title}</h3>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <button type="button" onClick={() => handleEdit(p)} className="text-slate-400 hover:text-amber-500">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => deletePost(p.id)} className="text-slate-400 hover:text-red-500">
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