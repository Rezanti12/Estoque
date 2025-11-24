import React, { useEffect, useState } from 'react';
import { getCurrentUser, logout, getRequests, getUsers } from '../services/storage';
import { User, RequestStatus } from '../types';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, setIsOpen, onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    
    // Initial fetch
    updateBadges();

    // Poll for updates on badges (simple mechanism)
    const interval = setInterval(updateBadges, 2000);
    return () => clearInterval(interval);
  }, []);

  const updateBadges = () => {
    // Requests badge
    const requests = getRequests();
    const pendingReq = requests.filter(r => r.status === 'PENDING').length;
    setPendingRequestsCount(pendingReq);

    // Users badge (only for admin)
    const allUsers = getUsers();
    const pendingUsr = allUsers.filter(u => u.status === 'PENDING').length;
    setPendingUsersCount(pendingUsr);
  };

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const menuItems = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Visão Geral', roles: ['ADMIN', 'TECNICO'] },
    { id: 'inventory', icon: 'fa-boxes-stacked', label: 'Estoque de Peças', roles: ['ADMIN', 'TECNICO'] },
    { id: 'requests', icon: 'fa-clipboard-list', label: user?.role === 'ADMIN' ? 'Solicitações' : 'Meus Pedidos', roles: ['ADMIN', 'TECNICO'], badgeCount: pendingRequestsCount },
    { id: 'add', icon: 'fa-plus-circle', label: 'Cadastrar Peça', roles: ['ADMIN'] }, // Only Admin
    { id: 'history', icon: 'fa-clock-rotate-left', label: 'Histórico', roles: ['ADMIN', 'TECNICO'] },
    { id: 'users', icon: 'fa-users-gear', label: 'Usuários', roles: ['ADMIN'], badgeCount: pendingUsersCount }, // Only Admin
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-30 h-full w-64 bg-slate-900 text-white transform transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-wider text-blue-400">
            <i className="fas fa-tools mr-2"></i>ManutStock
          </h1>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          {menuItems.filter(item => user && item.roles.includes(user.role)).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                currentPage === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <i className={`fas ${item.icon} w-6 text-center`}></i>
                <span className="font-medium">{item.label}</span>
              </div>
              {user?.role === 'ADMIN' && item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {item.badgeCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-slate-800 bg-slate-900">
           <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-3 text-sm text-slate-500">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                  <i className="fas fa-user"></i>
                </div>
                <div className="overflow-hidden">
                  <p className="text-white truncate w-32 font-medium">{user?.name}</p>
                  <p className="text-xs truncate w-32 text-blue-400 font-bold">{user?.role}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-400 py-2 rounded-lg transition-colors text-xs uppercase font-bold tracking-wide"
                title="Sair"
              >
                <i className="fas fa-sign-out-alt"></i>
                <span>Sair / Trocar Conta</span>
              </button>
            </div>
        </div>
      </aside>
    </>
  );
};