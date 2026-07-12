import React, { useState, useRef } from 'react';
import { useCases, Case } from '../../store/useCases';
import { Plus, Trash2, Upload, FileText, Edit2, X, Wand2, Undo, Loader2 } from 'lucide-react';
import { API_URL } from '../../config';

const CasesAdmin = () => {
  const { cases, addCase, updateCase, deleteCase, refreshCases } = useCases();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const initialFormState: Partial<Case> = {
    title: '',
    description: '',
    category: '',
    challenges: [],
    outcome: '',
    color: 'from-slate-600 to-slate-800'
  };

  const [formData, setFormData] = useState<Partial<Case>>(initialFormState);
  const [challengeInput, setChallengeInput] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');

  const [isOptimizingDesc, setIsOptimizingDesc] = useState(false);
  const [undoDesc, setUndoDesc] = useState<string | null>(null);

  const [isOptimizingOutcome, setIsOptimizingOutcome] = useState(false);
  const [undoOutcome, setUndoOutcome] = useState<string | null>(null);

  const optimizeText = async (field: 'description' | 'outcome') => {
    const text = formData[field];
    if (!text) {
      alert('Пожалуйста, введите текст для оптимизации');
      return;
    }

    if (field === 'description') setIsOptimizingDesc(true);
    if (field === 'outcome') setIsOptimizingOutcome(true);

    try {
      const response = await fetch(`${API_URL}/ai/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.optimizedText) {
        if (field === 'description') {
          setUndoDesc(text);
        } else {
          setUndoOutcome(text);
        }
        setFormData(prev => ({ ...prev, [field]: data.optimizedText }));
      } else {
        alert(data.error || 'Ошибка при оптимизации текста');
      }
    } catch (error) {
      console.error('AI optimization failed:', error);
      alert('Ошибка соединения с сервером при оптимизации текста');
    } finally {
      if (field === 'description') setIsOptimizingDesc(false);
      if (field === 'outcome') setIsOptimizingOutcome(false);
    }
  };

  const handleUndo = (field: 'description' | 'outcome') => {
    if (field === 'description' && undoDesc !== null) {
      setFormData(prev => ({ ...prev, description: undoDesc }));
      setUndoDesc(null);
    }
    if (field === 'outcome' && undoOutcome !== null) {
      setFormData(prev => ({ ...prev, outcome: undoOutcome }));
      setUndoOutcome(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddChallenge = () => {
    if (challengeInput.trim()) {
      setFormData(prev => ({
        ...prev,
        challenges: [...(prev.challenges || []), challengeInput.trim()]
      }));
      setChallengeInput('');
    }
  };

  const handleRemoveChallenge = (index: number) => {
    setFormData(prev => ({
      ...prev,
      challenges: prev.challenges?.filter((_, i) => i !== index)
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Пожалуйста, загрузите PDF файл');
        return;
      }
      
      if (file.size > 20 * 1024 * 1024) {
        alert('Размер файла превышает 20МБ. Выберите файл поменьше.');
        return;
      }

      setPdfFileName(file.name);
    }
  };

  const handleEdit = (caseItem: Case) => {
    setEditingId(caseItem.id);
    setFormData({
      title: caseItem.title,
      description: caseItem.description,
      category: caseItem.category,
      challenges: caseItem.challenges || [],
      outcome: caseItem.outcome,
      color: caseItem.color,
      pdfUrl: caseItem.pdfUrl
    });
    setPdfFileName(caseItem.pdfUrl ? 'PDF уже загружен' : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setChallengeInput('');
    setPdfFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.category) {
      alert('Заполните обязательные поля (Название, Категория)');
      return;
    }

    const form = new FormData();
    form.append('title', formData.title || '');
    form.append('description', formData.description || '');
    form.append('category', formData.category || '');
    form.append('challenges', JSON.stringify(formData.challenges || []));
    form.append('outcome', formData.outcome || '');
    form.append('color', formData.color || 'from-slate-600 to-slate-800');

    if (fileInputRef.current?.files?.[0]) {
      form.append('pdf', fileInputRef.current.files[0]);
    }

    try {
      if (editingId) {
        await updateCase(editingId, form);
      } else {
        await addCase(form);
      }

      // Принудительно синхронизируемся с сервером, чтобы избежать
      // рассинхрона между админкой и публичной частью сайта
      await refreshCases();
      
      // Сбрасываем форму только после успешного сохранения
      handleCancelEdit();
    } catch (error) {
      console.error('Failed to save case:', error);
      alert('Произошла ошибка при сохранении дела. Пожалуйста, попробуйте еще раз.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            {editingId ? 'Редактировать дело' : 'Добавить новое дело'}
          </h2>
          {editingId && (
            <button 
              onClick={handleCancelEdit}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
              Отменить редактирование
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Название дела *</label>
              <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Категория *</label>
              <input type="text" name="category" value={formData.category} onChange={handleInputChange} placeholder="Например: Корпоративное право" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" required />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">Краткое описание</label>
              <div className="flex gap-2">
                {undoDesc !== null && (
                  <button 
                    type="button" 
                    onClick={() => handleUndo('description')}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <Undo className="w-3 h-3" /> Отменить ИИ
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => optimizeText('description')}
                  disabled={isOptimizingDesc || !formData.description}
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors disabled:opacity-50"
                >
                  {isOptimizingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  Оптимизировать с ИИ
                </button>
              </div>
            </div>
            <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"></textarea>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">Подробный итог</label>
              <div className="flex gap-2">
                {undoOutcome !== null && (
                  <button 
                    type="button" 
                    onClick={() => handleUndo('outcome')}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <Undo className="w-3 h-3" /> Отменить ИИ
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => optimizeText('outcome')}
                  disabled={isOptimizingOutcome || !formData.outcome}
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors disabled:opacity-50"
                >
                  {isOptimizingOutcome ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  Оптимизировать с ИИ
                </button>
              </div>
            </div>
            <textarea name="outcome" value={formData.outcome} onChange={handleInputChange} rows={2} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Вызовы (тезисно)</label>
            <div className="flex gap-2 mb-2">
              <input 
                type="text" 
                value={challengeInput} 
                onChange={(e) => setChallengeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChallenge())}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" 
                placeholder="Например: Сложная экспертиза"
              />
              <button type="button" onClick={handleAddChallenge} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">
                Добавить
              </button>
            </div>
            {formData.challenges && formData.challenges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.challenges.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm">
                    {c}
                    <button type="button" onClick={() => handleRemoveChallenge(i)} className="text-amber-500 hover:text-amber-700">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Цветовая тема карточки</label>
              <select name="color" value={formData.color} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none">
                <option value="from-blue-600 to-blue-800">Синяя</option>
                <option value="from-amber-600 to-amber-800">Золотая</option>
                <option value="from-slate-600 to-slate-800">Темная</option>
                <option value="from-green-600 to-green-800">Зеленая</option>
                <option value="from-red-600 to-red-800">Красная</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Решение суда (PDF)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept=".pdf" 
                  ref={fileInputRef}
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 border-dashed rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {pdfFileName ? 'Изменить PDF' : 'Загрузить PDF'}
                </button>
              </div>
              {pdfFileName && <p className="text-xs text-green-600 mt-1 truncate">Выбран: {pdfFileName}</p>}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingId ? 'Сохранить изменения' : 'Сохранить карточку дела'}
            </button>
          </div>
        </form>
      </div>

      {/* List of cases */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-[calc(100vh-14rem)] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Список дел ({cases.length})</h2>
        <div className="space-y-4">
          {cases.map((c) => (
            <div key={c.id} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50 hover:bg-white transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-medium px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-500 mb-2 inline-block">
                    {c.category}
                  </span>
                  <h3 className="font-semibold text-slate-900 leading-tight">{c.title}</h3>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleEdit(c)} className="text-slate-400 hover:text-amber-500">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteCase(c.id)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-sm text-slate-500 mb-2 line-clamp-1">{c.description}</div>
              {c.pdfUrl && (
                <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">
                  <FileText className="w-3 h-3" /> PDF прикреплен
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CasesAdmin;