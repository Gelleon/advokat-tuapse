import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { Save, Loader2, Info } from 'lucide-react';
import { BLOG_PROMPT_SETTING_KEY, DEFAULT_BLOG_PROMPT } from '../../data/blogPrompt';
import { IMAGE_PROMPT_SETTING_KEY, DEFAULT_IMAGE_PROMPT } from '../../data/imagePrompt';

const DEFAULT_CASE_PROMPT =
  'Оптимизируй следующий текст для юридического портфолио, сделай его профессиональным, лаконичным и грамотным:\n\n{text}';

const SettingsAdmin = () => {
  const [casePrompt, setCasePrompt] = useState('');
  const [blogPrompt, setBlogPrompt] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [caseRes, blogRes, imageRes] = await Promise.all([
        fetch(`${API_URL}/settings/ai_prompt_template`, { credentials: 'include' }),
        fetch(`${API_URL}/settings/${BLOG_PROMPT_SETTING_KEY}`, { credentials: 'include' }),
        fetch(`${API_URL}/settings/${IMAGE_PROMPT_SETTING_KEY}`, { credentials: 'include' }),
      ]);

      if (caseRes.ok) {
        const data = await caseRes.json();
        setCasePrompt(data.value || DEFAULT_CASE_PROMPT);
      } else {
        setCasePrompt(DEFAULT_CASE_PROMPT);
      }

      if (blogRes.ok) {
        const data = await blogRes.json();
        setBlogPrompt(data.value || DEFAULT_BLOG_PROMPT);
      } else {
        setBlogPrompt(DEFAULT_BLOG_PROMPT);
      }

      if (imageRes.ok) {
        const data = await imageRes.json();
        setImagePrompt(data.value || DEFAULT_IMAGE_PROMPT);
      } else {
        setImagePrompt(DEFAULT_IMAGE_PROMPT);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setCasePrompt(DEFAULT_CASE_PROMPT);
      setBlogPrompt(DEFAULT_BLOG_PROMPT);
      setImagePrompt(DEFAULT_IMAGE_PROMPT);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const [caseRes, blogRes, imageRes] = await Promise.all([
        fetch(`${API_URL}/settings/ai_prompt_template`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: casePrompt }),
          credentials: 'include',
        }),
        fetch(`${API_URL}/settings/${BLOG_PROMPT_SETTING_KEY}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: blogPrompt }),
          credentials: 'include',
        }),
        fetch(`${API_URL}/settings/${IMAGE_PROMPT_SETTING_KEY}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: imagePrompt }),
          credentials: 'include',
        }),
      ]);

      if (caseRes.ok && blogRes.ok && imageRes.ok) {
        setMessage({ text: 'Настройки успешно сохранены', type: 'success' });
      } else {
        throw new Error('Ошибка сохранения');
      }
    } catch (error) {
      setMessage({ text: 'Произошла ошибка при сохранении', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-3xl">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Настройки интеграции ИИ</h2>
      
      <form onSubmit={handleSave} className="space-y-8">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Промпт для оптимизации текстов дел
          </label>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4 flex gap-3 text-sm text-blue-800">
            <Info className="w-5 h-5 flex-shrink-0 text-blue-500" />
            <p>
              Используется в разделе «Дела». Обязательный плейсхолдер: <strong>{`{text}`}</strong>.
            </p>
          </div>
          <textarea
            value={casePrompt}
            onChange={(e) => setCasePrompt(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none font-mono text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Промпт для генерации статей блога
          </label>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4 flex gap-3 text-sm text-blue-800">
            <Info className="w-5 h-5 flex-shrink-0 text-blue-500" />
            <div className="space-y-2">
              <p>Используется AI-агентом в разделе «Блог». Доступные плейсхолдеры:</p>
              <p className="font-mono text-xs">
                {`{practiceArea}`} · {`{practiceDescription}`} · {`{practiceFeatures}`} · {`{sourceBrief}`}
              </p>
              <p>Формат ответа JSON добавляется системой автоматически.</p>
            </div>
          </div>
          <textarea
            value={blogPrompt}
            onChange={(e) => setBlogPrompt(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none font-mono text-sm"
            required
          />
          <button
            type="button"
            onClick={() => setBlogPrompt(DEFAULT_BLOG_PROMPT)}
            className="mt-2 text-sm text-slate-500 hover:text-amber-600 transition-colors"
          >
            Сбросить промпт блога к стандартному
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Промпт для генерации обложки статьи
          </label>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4 flex gap-3 text-sm text-blue-800">
            <Info className="w-5 h-5 flex-shrink-0 text-blue-500" />
            <div className="space-y-2">
              <p>
                Формат как на vc.ru: тёмный фон и сцена в скруглённой панели по центру.
                Перед картинкой ИИ читает текст статьи ({`{sceneBrief}`}). Промпт лучше на английском.
              </p>
              <p className="font-mono text-xs">
                {`{sceneBrief}`} · {`{articleExcerpt}`} · {`{practiceArea}`} · {`{previewText}`} · {`{title}`} · {`{category}`}
              </p>
            </div>
          </div>
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none font-mono text-sm"
            required
          />
          <button
            type="button"
            onClick={() => setImagePrompt(DEFAULT_IMAGE_PROMPT)}
            className="mt-2 text-sm text-slate-500 hover:text-amber-600 transition-colors"
          >
            Сбросить промпт изображения к стандартному
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="pt-4 border-t border-slate-100">
          <button 
            type="submit" 
            disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Сохранить настройки
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsAdmin;
