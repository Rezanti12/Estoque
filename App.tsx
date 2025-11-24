import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { AddPart } from './pages/AddPart';
import { History } from './pages/History';
import { Users } from './pages/Users';
import { Requests } from './pages/Requests';
import { getCurrentUser, initializeUsers, logout } from './services/storage';
import { Part, User } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<Part | null>(null);

  useEffect(() => {
    initializeUsers(); // Ensure admin exists
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    if (page !== 'add') {
      setPartToEdit(null);
    }
  };

  const handleEditPart = (part: Part) => {
    setPartToEdit(part);
    setCurrentPage('add');
  };

  const renderPage = () => {
    if (!currentUser) return null;

    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <Inventory onEdit={handleEditPart} />;
      case 'add': 
        // Protect Add Route
        return currentUser.role === 'ADMIN' ? (
          <AddPart 
            initialData={partToEdit} 
            onSuccess={() => handleNavigate('inventory')}
          />
        ) : <Dashboard />; // Redirect fallback
      case 'history': return <History />;
      case 'users':
        return currentUser.role === 'ADMIN' ? <Users /> : <Dashboard />;
      case 'requests': return <Requests />;
      default: return <Dashboard />;
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={handleNavigate} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 overflow-y-auto w-full lg:ml-64">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-sm lg:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600 hover:text-blue-600">
            <i className="fas fa-bars text-xl"></i>
          </button>
          <span className="font-bold text-black">Estoque de Manutenção</span>
          <button onClick={handleLogout} className="text-gray-600 hover:text-red-500" title="Sair">
            <i className="fas fa-sign-out-alt text-xl"></i>
          </button>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-full">
           {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default App;