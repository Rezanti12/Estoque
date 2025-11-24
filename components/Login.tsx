import React, { useState } from 'react';
import { login, registerUser } from '../services/storage';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { user, error: loginError } = login(username, password);
    if (user) {
      onLogin(user);
    } else {
      setError(loginError || 'Erro ao entrar');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!regName || !regUsername || !regPassword) {
        setError('Preencha todos os campos.');
        return;
    }

    const newUser: User = {
        id: crypto.randomUUID(),
        name: regName,
        username: regUsername,
        password: regPassword,
        role: 'TECNICO', // Default role
        status: 'PENDING' // Needs approval
    };

    const success = registerUser(newUser);
    if (success) {
        setSuccessMsg('Cadastro realizado! Aguarde a aprovação do Administrador.');
        // Clear form
        setRegName('');
        setRegUsername('');
        setRegPassword('');
        // Switch to login after 2 seconds
        setTimeout(() => setIsLoginMode(true), 3000);
    } else {
        setError('Nome de usuário já existe.');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in-up">
        <div className="text-center mb-6">
           <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
             <i className="fas fa-tools"></i>
           </div>
           <h1 className="text-2xl font-bold text-black">Estoque de Manutenção</h1>
           <p className="text-gray-500">{isLoginMode ? 'Acesse o sistema' : 'Solicitar acesso'}</p>
        </div>

        {/* Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button 
                onClick={() => { setIsLoginMode(true); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${isLoginMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
                Entrar
            </button>
            <button 
                onClick={() => { setIsLoginMode(false); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${!isLoginMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
                Criar Conta
            </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-6 text-sm flex items-center">
            <i className="fas fa-check-circle mr-2"></i>
            {successMsg}
          </div>
        )}

        {isLoginMode ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-black mb-1">Usuário</label>
                <div className="relative">
                <i className="fas fa-user absolute left-3 top-3 text-gray-400"></i>
                <input 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black bg-white"
                    placeholder="Ex: admin"
                />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-black mb-1">Senha</label>
                <div className="relative">
                <i className="fas fa-lock absolute left-3 top-3 text-gray-400"></i>
                <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black bg-white"
                    placeholder="••••••"
                />
                </div>
            </div>

            <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-200 transition-all mt-4"
            >
                Entrar
            </button>
            </form>
        ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-black mb-1">Nome Completo</label>
                <input 
                    type="text" 
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black bg-white"
                    placeholder="Seu Nome"
                    required
                />
            </div>   
            <div>
                <label className="block text-sm font-medium text-black mb-1">Usuário (Login)</label>
                <input 
                    type="text" 
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black bg-white"
                    placeholder="Ex: joao.silva"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-black mb-1">Senha</label>
                <input 
                    type="password" 
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black bg-white"
                    placeholder="••••••"
                    required
                />
            </div>

            <button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-green-200 transition-all mt-4"
            >
                Solicitar Cadastro
            </button>
            <p className="text-xs text-center text-gray-400 mt-2">Seu cadastro passará por aprovação.</p>
            </form>
        )}
      </div>
    </div>
  );
};