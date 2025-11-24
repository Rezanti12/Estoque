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
    // Logout Item added to menu
    { id: 'logout', icon: 'fa-sign-out-alt', label: 'Sair', roles: ['ADMIN', 'TECNICO'], isAction: true }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-30 h-full w-64 bg-black text-white transform transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} border-r border-gray-800 flex flex-col`}>
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h1 className="text-lg font-bold tracking-wide text-white flex items-center">
            <i className="fas fa-tools mr-2 text-blue-500"></i>Estoque de Manutenção
          </h1>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto">
          {menuItems.filter(item => user && item.roles.includes(user.role)).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'logout') {
                  handleLogout();
                } else {
                  onNavigate(item.id);
                }
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                item.id === 'logout' 
                  ? 'text-red-400 hover:bg-red-900/20 mt-4 border border-transparent hover:border-red-900/30' 
                  : currentPage === item.id 
                    ? 'bg-purple-700 text-white shadow-lg shadow-purple-900/50' 
                    : 'text-gray-400 hover:bg-gray-900 hover:text-white'
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

        <div className="p-4 border-t border-gray-800 bg-black">
           <div className="flex items-center space-x-3 text-sm text-gray-500 bg-gray-900/50 p-3 rounded-lg border border-gray-800">
             <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center text-purple-400 border border-purple-900/50">
               <i className="fas fa-user"></i>
             </div>
             <div className="overflow-hidden">
               <p className="text-white truncate w-36 font-medium">{user?.name}</p>
               <div className="flex items-center gap-1">
                 <span className={`w-2 h-2 rounded-full ${user?.status === 'ACTIVE' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                 <p className="text-xs truncate w-32 text-gray-400 font-bold">{user?.role}</p>
               </div>
             </div>
           </div>
        </div>
      </aside>
    </>
  );
};