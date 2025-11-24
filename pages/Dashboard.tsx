import React, { useEffect, useState } from 'react';
import { getParts, getTransactions } from '../services/storage';
import { Part, Transaction, TransactionType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export const Dashboard: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    setParts(getParts());
    setTransactions(getTransactions());
  }, []);

  const totalItems = parts.length;
  const totalQuantity = parts.reduce((acc, p) => acc + p.quantity, 0);
  const lowStock = parts.filter(p => p.quantity <= p.minQuantity).length;
  
  // Recent transactions
  const recentTransactions = transactions.slice(0, 5);

  // Chart Data: Stock Distribution by Machine Model (Top 5)
  const machineDistribution = parts.reduce((acc: any, part) => {
    acc[part.machineModel] = (acc[part.machineModel] || 0) + part.quantity;
    return acc;
  }, {});
  
  const pieData = Object.keys(machineDistribution)
    .map(key => ({ name: key, value: machineDistribution[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Painel de Controle</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-lg">
            <i className="fas fa-box text-2xl"></i>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Itens Cadastrados</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalItems}</h3>
            <p className="text-xs text-slate-400">{totalQuantity} unidades totais</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-4 bg-red-100 text-red-600 rounded-lg">
            <i className="fas fa-exclamation-triangle text-2xl"></i>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Estoque Baixo</p>
            <h3 className="text-2xl font-bold text-slate-800">{lowStock}</h3>
            <p className="text-xs text-slate-400">Itens precisam de reposição</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-4 bg-green-100 text-green-600 rounded-lg">
            <i className="fas fa-exchange-alt text-2xl"></i>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Movimentações (Total)</p>
            <h3 className="text-2xl font-bold text-slate-800">{transactions.length}</h3>
            <p className="text-xs text-slate-400">Entradas e Saídas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Movimentações Recentes</h3>
          <div className="space-y-4">
            {recentTransactions.length === 0 ? (
              <p className="text-slate-400 text-sm">Nenhuma movimentação registrada.</p>
            ) : (
              recentTransactions.map(t => (
                <div key={t.id} className="flex items-start justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start space-x-3">
                    <div className={`w-2 h-2 mt-2 rounded-full ${t.type === TransactionType.IN ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{t.partName}</p>
                      <p className="text-xs text-slate-500">{t.reason} - {new Date(t.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${t.type === TransactionType.IN ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === TransactionType.IN ? '+' : '-'}{t.quantity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Distribuição por Máquina</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {pieData.map((entry, index) => (
               <div key={index} className="flex items-center text-xs text-slate-500">
                 <span className="w-2 h-2 rounded-full mr-1" style={{backgroundColor: COLORS[index % COLORS.length]}}></span>
                 {entry.name}
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};