import React, { useEffect, useState } from 'react';
import { getUsers, saveUser, deleteUser } from '../services/storage';
import { User, UserRole, UserStatus } from '../types';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'TECNICO' as UserRole,
    status: 'ACTIVE' as UserStatus
  });

  useEffect(() => {
    setUsers(getUsers());
  }, []);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        name: user.name,
        username: user.username,
        password: user.password,
        role: user.role,
        status: user.status
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        username: '',
        password: '',
        role: 'TECNICO',
        status: 'ACTIVE'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.password) {
      alert("Preencha todos os campos");
      return;
    }

    // Check for duplicate username if new user
    if (!editingId && users.some(u => u.username === formData.username)) {
      alert("Nome de usuário já existe!");
      return;
    }

    const newUser: User = {
      id: editingId || crypto.randomUUID(),
      ...formData
    };

    saveUser(newUser);
    setUsers(getUsers());
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteUser(id);
      setUsers(getUsers());
    }
  };

  const handleApprove = (user: User) => {
      const updatedUser: User = { ...user, status: 'ACTIVE' };
      saveUser(updatedUser);
      setUsers(getUsers());
  };

  const pendingUsers = users.filter(u => u.status === 'PENDING');
  const activeUsers = users.filter(u => u.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gerenciar Usuários</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-colors"
        >
          <i className="fas fa-plus mr-2"></i> Novo Usuário Manual
        </button>
      </div>

      {/* PENDING USERS SECTION */}
      {pendingUsers.length > 0 && (
          <div className="bg-yellow-900/20 rounded-xl shadow-sm border border-yellow-700 overflow-hidden mb-6">
              <div className="bg-yellow-900/40 px-6 py-3 border-b border-yellow-700 flex justify-between items-center">
                  <h3 className="font-bold text-yellow-400"><i className="fas fa-clock mr-2"></i>Aprovações Pendentes</h3>
                  <span className="bg-yellow-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingUsers.length}</span>
              </div>
              <table className="w-full text-left">
                  <tbody className="divide-y divide-yellow-700/50">
                      {pendingUsers.map(user => (
                          <tr key={user.id}>
                              <td className="px-6 py-4">
                                  <p className="font-bold text-white">{user.name}</p>
                                  <p className="text-xs text-gray-400">@{user.username}</p>
                              </td>
                              <td className="px-6 py-4">
                                  <span className="text-xs uppercase font-bold text-gray-500">Solicitou: TÉCNICO</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <button onClick={() => handleApprove(user)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium mr-2">
                                      <i className="fas fa-check mr-1"></i> Aceitar
                                  </button>
                                  <button onClick={() => handleDelete(user.id)} className="bg-red-900/40 hover:bg-red-900/60 text-red-400 px-3 py-1 rounded text-sm font-medium">
                                      <i className="fas fa-times mr-1"></i> Rejeitar
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* ACTIVE USERS LIST */}
      <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-700 border-b border-gray-600">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-300 uppercase">Nome</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-300 uppercase">Usuário (Login)</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-300 uppercase">Função</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-300 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-300 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {activeUsers.map(user => (
              <tr key={user.id} className="hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${user.role === 'ADMIN' ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-900/50 text-blue-300'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                   {user.status === 'BLOCKED' ? (
                       <span className="text-red-500 text-xs font-bold"><i className="fas fa-ban mr-1"></i>Bloqueado</span>
                   ) : (
                       <span className="text-green-500 text-xs font-bold"><i className="fas fa-check-circle mr-1"></i>Ativo</span>
                   )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleOpenModal(user)} className="text-blue-400 hover:text-blue-300 mr-3">
                    <i className="fas fa-pen"></i>
                  </button>
                  {user.username !== 'admin' && ( // Prevent deleting main admin
                    <button onClick={() => handleDelete(user.id)} className="text-red-500 hover:text-red-400">
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-md z-10 p-6 relative animate-fade-in-up border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-white">{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white bg-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome de Usuário (Login)</label>
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white bg-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
                <input 
                  type="text" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white bg-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Função</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                  className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white bg-gray-700"
                >
                  <option value="TECNICO">Técnico</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as UserStatus})}
                  className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white bg-gray-700"
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="BLOCKED">Bloqueado</option>
                  <option value="PENDING">Pendente</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-gray-400 hover:bg-gray-700 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};