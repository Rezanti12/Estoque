import React, { useEffect, useState } from 'react';
import { getTransactions } from '../services/storage';
import { Transaction, TransactionType } from '../types';

export const History: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setTransactions(getTransactions());
  }, []);

  const filtered = transactions.filter(t => {
    const matchesSearch = t.partName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.partSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || 
                        (filterType === 'IN' && t.type === TransactionType.IN) ||
                        (filterType === 'OUT' && t.type === TransactionType.OUT);
    return matchesSearch && matchesType;
  });

  const openAttachment = (url: string) => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(
        `<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-black">Histórico de Rastreabilidade</h2>
        
        <div className="flex gap-2">
            <button 
                onClick={() => setFilterType('ALL')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${filterType === 'ALL' ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-300'}`}
            >
                Todos
            </button>
            <button 
                onClick={() => setFilterType('IN')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${filterType === 'IN' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}
            >
                Entradas
            </button>
            <button 
                onClick={() => setFilterType('OUT')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${filterType === 'OUT' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}
            >
                Saídas
            </button>
        </div>
      </div>

      <div className="relative">
         <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
         <input 
           type="text" 
           placeholder="Buscar por peça, SKU ou motivo..." 
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full md:w-1/2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-black"
         />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item (SKU)</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Motivo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qtd</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Obs / Anexo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(t.date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${t.type === TransactionType.IN ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                    {t.partName} <span className="text-gray-400 font-normal">({t.partSku})</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {t.reason}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${t.type === TransactionType.IN ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === TransactionType.IN ? '+' : '-'}{t.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-col gap-1">
                      <span className="truncate max-w-xs">{t.notes || '-'}</span>
                      {t.attachmentUrl && (
                        <button 
                          onClick={() => openAttachment(t.attachmentUrl!)}
                          className="flex items-center text-blue-600 hover:text-blue-800 text-xs font-medium w-fit"
                        >
                          <i className="fas fa-paperclip mr-1"></i>
                          {t.attachmentName || 'Ver Anexo'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
             <div className="p-8 text-center text-gray-400">Nenhum registro encontrado.</div>
          )}
        </div>
      </div>
    </div>
  );
};