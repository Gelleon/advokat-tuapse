import React, { useState } from 'react';
import { ArrowLeft, LogOut, Briefcase, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import CasesAdmin from '../components/admin/CasesAdmin';
import BlogAdmin from '../components/admin/BlogAdmin';

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'cases' | 'blog'>('cases');

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/logout', { method: 'POST', credentials: 'include' });
      sessionStorage.removeItem('isAdminAuth');
      navigate('/login');
    } catch (error) {
      console.error('Logout failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-500 hover:text-amber-600 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">Панель управления</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors px-4 py-2 rounded-lg hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            <span>Выйти</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl w-fit mb-8">
          <button
            onClick={() => setActiveTab('cases')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'cases' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Дела (Портфолио)
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'blog' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Блог (Новости)
          </button>
        </div>

        {activeTab === 'cases' ? <CasesAdmin /> : <BlogAdmin />}
      </div>
    </div>
  );
};

export default Admin;
