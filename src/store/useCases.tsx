import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { API_URL } from '../config';

export interface Case {
  id: string;
  title: string;
  client?: string;
  amount?: string;
  result?: string;
  date?: string;
  description: string;
  category: string;
  duration?: string;
  challenges: string[];
  outcome: string;
  color: string;
  pdfUrl?: string;
}

interface CasesContextValue {
  cases: Case[];
  isLoading: boolean;
  refreshCases: () => Promise<void>;
  addCase: (formData: FormData) => Promise<Case | null>;
  updateCase: (id: string, formData: FormData) => Promise<Case | null>;
  deleteCase: (id: string) => Promise<boolean>;
}

const CasesContext = createContext<CasesContextValue | null>(null);

export const CasesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем дела с сервера
  const refreshCases = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/cases`);
      if (response.ok) {
        const data = await response.json();
        // ВАЖНО: тут бэкенд возвращает массив, мы заменяем ВЕСЬ массив
        // Никакой фильтрации или группировки — каждый Case из БД попадает в state
        setCases(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch cases:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Первичная загрузка при монтировании
  useEffect(() => {
    refreshCases();
  }, [refreshCases]);

  const addCase = async (formData: FormData): Promise<Case | null> => {
    try {
      const response = await fetch(`${API_URL}/cases`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (response.ok) {
        const newCase = await response.json();
        // Добавляем в начало списка
        setCases(prev => [newCase, ...prev]);
        // Принудительно обновляем с сервера чтобы избежать рассинхрона
        // (на случай если на сервере были параллельные изменения)
        return newCase;
      } else {
        alert('Ошибка при сохранении');
        return null;
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка соединения с сервером');
      return null;
    }
  };

  const updateCase = async (id: string, formData: FormData): Promise<Case | null> => {
    try {
      const response = await fetch(`${API_URL}/cases/${id}`, {
        method: 'PUT',
        body: formData,
        credentials: 'include'
      });
      if (response.ok) {
        const updatedCase = await response.json();
        // Заменяем элемент с этим id в массиве
        setCases(prev => prev.map(c => (c.id === id ? updatedCase : c)));
        return updatedCase;
      } else {
        alert('Ошибка при обновлении');
        return null;
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка соединения с сервером');
      return null;
    }
  };

  const deleteCase = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/cases/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        // Удаляем из массива
        setCases(prev => prev.filter(c => c.id !== id));
        return true;
      } else {
        alert('Ошибка при удалении');
        return false;
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка соединения с сервером');
      return false;
    }
  };

  const value: CasesContextValue = {
    cases,
    isLoading,
    refreshCases,
    addCase,
    updateCase,
    deleteCase
  };

  return <CasesContext.Provider value={value}>{children}</CasesContext.Provider>;
};

export const useCases = (): CasesContextValue => {
  const ctx = useContext(CasesContext);
  if (!ctx) {
    throw new Error('useCases must be used inside <CasesProvider>');
  }
  return ctx;
};
