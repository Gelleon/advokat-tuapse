import { useState, useEffect, useCallback } from 'react';

const API_URL = 'http://localhost:5000/api';

export interface Case {
  id: string;
  title: string;
  client: string;
  amount: string;
  result: string;
  date: string;
  description: string;
  category: string;
  duration: string;
  challenges: string[];
  outcome: string;
  color: string;
  pdfUrl?: string;
}

export const useCases = () => {
  const [cases, setCases] = useState<Case[]>([]);

  const fetchCases = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/cases`);
      if (response.ok) {
        const data = await response.json();
        setCases(data);
      }
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const addCase = async (formData: FormData) => {
    try {
      const response = await fetch(`${API_URL}/cases`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (response.ok) {
        const newCase = await response.json();
        setCases(prev => [newCase, ...prev]);
      } else {
        alert('Ошибка при сохранении');
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка соединения с сервером');
    }
  };

  const updateCase = async (id: string, formData: FormData) => {
    try {
      const response = await fetch(`${API_URL}/cases/${id}`, {
        method: 'PUT',
        body: formData,
        credentials: 'include'
      });
      if (response.ok) {
        const updatedCase = await response.json();
        setCases(prev => prev.map(c => c.id === id ? updatedCase : c));
      } else {
        alert('Ошибка при обновлении');
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка соединения с сервером');
    }
  };

  const deleteCase = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/cases/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setCases(prev => prev.filter(c => c.id !== id));
      } else {
        alert('Ошибка при удалении');
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка соединения с сервером');
    }
  };

  return { cases, addCase, updateCase, deleteCase };
};
