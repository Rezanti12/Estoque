import React, { useEffect, useState } from 'react';
import { getRequests, getCurrentUser, updateRequestStatus, updatePartQuantity, addTransaction, getParts } from '../services/storage';
import { StockRequest, TransactionType, OutReason } from '../types';

export const Requests: React.FC = () => {
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [user, setUser] = useState(getCurrentUser());
  const [filter, setFilter] = useState<'PENDING' | 'HISTORY'>('PENDING');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const allRequests = getRequests();
    // Admin sees all, Tech sees only theirs
    if (user?.role === 'ADMIN') {
      setRequests(allRequests);
    } else {
      setRequests(allRequests.filter(r => r.requesterId === user?.id));
    }
  };

  const handleAction = (req: StockRequest, action: 'APPROVE' | 'REJECT') => {
    if (!user || user.role !== 'ADMIN') return;

    if (action === 'APPROVE') {
      // 1. Check stock
      const parts = getParts();
      const part = parts.find(p => p.id === req.partId);
      
      if (!part) {
        alert("Peça não encontrada!");
        return;
      }
      if (part.quantity < req.quantity) {
        alert(`Estoque insuficiente! Disponível: ${part.quantity}`);
        return;
      }

      // 2. Deduct Stock
      updatePartQuantity(req.partId, -req.quantity);

      // 3. Create Transaction
      addTransaction({
        id: crypto.randomUUID(),
        partId: req.partId,
        partName: req.partName,
        partSku: req.partSku,
        type: TransactionType.OUT,
        quantity: req.quantity,
        reason: OutReason.REQUEST_FULFILLMENT,
        notes: `Solicitação aprovada por ${user.name}. Motivo original: ${req.reason}`,
        date: new Date().toISOString(),
        attachmentUrl: req.attachmentUrl,
        attachmentName: req.attachmentName,
        requesterName: req.requesterName
      });

      // 4. Update Request Status
      updateRequestStatus(req.id, 'APPROVED', user.name);
    } else {
      // Reject
      updateRequestStatus(req.id, 'REJECTED', user.name);
    }

    refreshData();
  };

  const openAttachment = (url: string) => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(
        `<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  const displayedRequests = requests.filter(r => 
    filter === 'PENDING' ? r.status === 'PENDING' : r.status !== 'PENDING'
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-white">
          {user?.role === 'ADMIN' ? 'Solicitações de Peças' : 'Minhas Solicitações'}
        </h2>
        <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
          <button 
            onClick={() => setFilter('PENDING')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'PENDING' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setFilter('HISTORY')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'HISTORY' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Histórico
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {displayedRequests.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <p className="text-gray-500">Nenhuma solicitação encontrada nesta categoria.</p>
          </div>
        ) : (
          displayedRequests.map(req => (
            <div key={req.id} className="bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-700 flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full 
                    ${req.status === 'PENDING' ? 'bg-yellow-900/50 text-yellow-500' : 
                      req.status === 'APPROVED' ? 'bg-green-900/50 text-green-500' : 'bg-red-900/50 text-red-500'}`}>
                    {req.status === 'PENDING' ? 'AGUARDANDO APROVAÇÃO' : req.status === 'APPROVED' ? 'APROVADO' : 'REJEITADO'}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleString()}</span>
                </div>
                
                <h3 className="font-bold text-lg text-white">{req.partName} <span className="text-gray-500 font-normal">({req.partSku})</span></h3>
                
                <div className="mt-2 text-sm text-gray-400 space-y-1">
                  <p><i className="fas fa-user mr-2 text-gray-600"></i>Solicitante: <strong>{req.requesterName}</strong></p>
                  <p><i className="fas fa-cubes mr-2 text-gray-600"></i>Quantidade: <strong>{req.quantity}</strong></p>
                  <p><i className="fas fa-comment-alt mr-2 text-gray-600"></i>Motivo: {req.reason}</p>
                </div>

                {req.attachmentUrl && (
                  <button 
                    onClick={() => openAttachment(req.attachmentUrl!)}
                    className="mt-3 flex items-center text-blue-400 hover:text-blue-300 text-xs font-medium"
                  >
                    <i className="fas fa-paperclip mr-1"></i>
                    {req.attachmentName || 'Ver Anexo'}
                  </button>
                )}

                {req.status !== 'PENDING' && (
                  <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
                    {req.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'} por <strong>{req.reviewedBy}</strong> em {new Date(req.reviewedAt!).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Actions for Admin on Pending Requests */}
              {user?.role === 'ADMIN' && req.status === 'PENDING' && (
                <div className="flex md:flex-col gap-2 justify-center min-w-[150px]">
                  <button 
                    onClick={() => handleAction(req, 'APPROVE')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                  >
                    <i className="fas fa-check mr-2"></i> Aprovar
                  </button>
                  <button 
                    onClick={() => handleAction(req, 'REJECT')}
                    className="flex-1 bg-red-900/40 hover:bg-red-900/60 text-red-400 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <i className="fas fa-times mr-2"></i> Rejeitar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};