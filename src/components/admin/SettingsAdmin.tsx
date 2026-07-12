import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { Save, Loader2, Info } from 'lucide-react';

const SettingsAdmin = () => {
  const [promptTemplate, setPromptTemplate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/settings/ai_prompt_template`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          setPromptTemplate(data.value);
        } else {
          setPromptTemplate("Оптимизируй следующий текст для юридического портфолио, сделай его профессиональным, лаконичным и грамотным:\n\n{text}");
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/settings/ai_prompt_template`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: promptTemplate }),
        credentials: 'include'
      });

      if (response.ok) {
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
      
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Шаблон промпта для оптимизации текста
          </label>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4 flex gap-3 text-sm text-blue-800">
            <Info className="w-5 h-5 flex-shrink-0 text-blue-500" />
            <p>
              Этот текст будет отправляться ИИ при нажатии кнопки «Оптимизировать текст с ИИ». 
              Обязательно используйте плейсхолдер <strong>{`{text}`}</strong> — вместо него будет подставлен исходный текст пользователя.
            </p>
          </div>
          <textarea
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none font-mono text-sm"
            required
          />
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
