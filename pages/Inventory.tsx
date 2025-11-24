import React, { useEffect, useState, useRef } from 'react';
import { getParts, updatePartQuantity, addTransaction, fileToBase64, getCurrentUser, addRequest, savePart } from '../services/storage';
import { Part, OutReason, TransactionType, Transaction, User, StockRequest } from '../types';

interface InventoryProps {
  onEdit?: (part: Part) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ onEdit }) => {
  const [parts, setParts] = useState<Part[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<string>('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Modal State
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionMode, setTransactionMode] = useState<'IN' | 'OUT'>('OUT');
  const [isRequestMode, setIsRequestMode] = useState(false);
  
  // Form Fields
  const [qty, setQty] = useState<number>(1);
  const [outReason, setOutReason] = useState<OutReason>(OutReason.INTERNAL_MAINTENANCE);
  const [notes, setNotes] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  
  // File Upload State (Transaction)
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setParts(getParts());
    setCurrentUser(getCurrentUser());
  }, []);

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          part.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMachine = selectedMachine === 'all' || part.machineModel === selectedMachine;
    return matchesSearch && matchesMachine;
  });

  const uniqueMachines = Array.from(new Set(parts.map(p => p.machineModel)));

  const handleOpenModal = (part: Part, mode: 'IN' | 'OUT', isRequest: boolean = false) => {
    setSelectedPart(part);
    setTransactionMode(mode);
    setIsRequestMode(isRequest);
    setQty(1);
    setOutReason(OutReason.INTERNAL_MAINTENANCE);
    setNotes('');
    setOrderNumber('');
    setAttachment(null);
    setAttachmentName('');
    setIsModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 1024 * 1024) {
        alert("O arquivo é muito grande (Máx 1MB).");
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        setAttachment(base64);
        setAttachmentName(file.name);
      } catch (err) {
        alert("Erro ao processar arquivo.");
      }
    }
  };

  const handleConfirmTransaction = () => {
    if (!selectedPart || !currentUser) return;

    if (transactionMode === 'OUT' && qty > selectedPart.quantity) {
      alert("Quantidade indisponível em estoque!");
      return;
    }

    // --- TECHNICIAN FLOW OR REQUEST MODE: CREATE REQUEST ---
    if ((currentUser.role === 'TECNICO' || isRequestMode) && transactionMode === 'OUT') {
       const request: StockRequest = {
         id: crypto.randomUUID(),
         partId: selectedPart.id,
         partName: selectedPart.name,
         partSku: selectedPart.sku,
         requesterId: currentUser.id,
         requesterName: currentUser.name,
         quantity: qty,
         reason: notes ? notes : 'Manutenção',
         status: 'PENDING',
         createdAt: new Date().toISOString(),
         attachmentUrl: attachment || undefined,
         attachmentName: attachmentName || undefined
       };
       addRequest(request);
       alert("Solicitação enviada para aprovação.");
       setIsModalOpen(false);
       return;
    }

    // --- ADMIN FLOW: DIRECT UPDATE ---
    const delta = transactionMode === 'IN' ? qty : -qty;
    updatePartQuantity(selectedPart.id, delta);
    
    // Construct notes with Order Number if available
    let finalNotes = notes;
    if (transactionMode === 'OUT' && outReason === OutReason.SALE && orderNumber) {
        finalNotes = `Pedido: #${orderNumber} | ${notes}`;
    }

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      partId: selectedPart.id,
      partName: selectedPart.name,
      partSku: selectedPart.sku,
      type: transactionMode === 'IN' ? TransactionType.IN : TransactionType.OUT,
      quantity: qty,
      reason: transactionMode === 'IN' ? 'Reposição' : outReason,
      notes: finalNotes,
      date: new Date().toISOString(),
      attachmentUrl: attachment || undefined,
      attachmentName: attachmentName || undefined,
      requesterName: currentUser.name
    };
    addTransaction(transaction);

    setParts(getParts());
    setIsModalOpen(false);
    setSelectedPart(null);
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Estoque de Peças</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          
          <select 
            value={selectedMachine} 
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="p-2 border border-gray-700 rounded-lg bg-gray-800 text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-auto"
          >
            <option value="all">Todas as Máquinas</option>
            {uniqueMachines.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="relative w-full sm:w-auto">
            <i className="fas fa-search absolute left-3 top-3 text-gray-500"></i>
            <input 
              type="text" 
              placeholder="Buscar SKU ou Nome..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-700 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none bg-gray-800 text-white placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredParts.map(part => (
          <div key={part.id} className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="h-48 w-full bg-gray-700 relative">
               <img 
                 src={part.imageUrl || `https://picsum.photos/400/300?random=${part.id}`} 
                 alt={part.name} 
                 className="w-full h-full object-cover"
               />
               <span className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded shadow backdrop-blur-sm">
                 SKU: {part.sku}
               </span>
               {part.quantity <= part.minQuantity && (
                 <span className="absolute top-2 left-2 bg-red-600/90 text-white text-xs px-2 py-1 rounded shadow animate-pulse">
                   Estoque Baixo
                 </span>
               )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg text-white">{part.name}</h3>
                  <p className="text-sm text-blue-400 font-medium">{part.machineModel}</p>
                   {part.location && (
                    <p className="text-xs text-gray-500 mt-1"><i className="fas fa-map-marker-alt mr-1"></i> {part.location}</p>
                   )}
                </div>
                <div className="text-right">
                  <span className={`block text-2xl font-bold ${part.quantity === 0 ? 'text-red-500' : 'text-gray-300'}`}>
                    {part.quantity}
                  </span>
                  <span className="text-xs text-gray-500">unid.</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-2">
                {part.salePrice !== undefined && part.salePrice > 0 && (
                  <span className="text-sm font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded border border-green-900/50">
                    R$ {part.salePrice.toFixed(2)}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-400 mb-4 flex-1 line-clamp-2">{part.description}</p>
              
              <div className="mt-auto pt-4 border-t border-gray-700 grid grid-cols-4 gap-2">
                {isAdmin && onEdit && (
                  <button 
                    onClick={() => onEdit(part)}
                    className="col-span-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors text-sm"
                    title="Editar Detalhes"
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                )}
                
                {isAdmin && (
                  <button 
                    onClick={() => handleOpenModal(part, 'IN')}
                    className="col-span-1 py-2 bg-green-900/20 hover:bg-green-900/40 text-green-500 rounded-lg font-medium transition-colors text-sm flex items-center justify-center border border-green-900/30"
                    title="Repor Estoque"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                )}

                <button 
                  onClick={() => handleOpenModal(part, 'OUT', false)} // Baixa Direta
                  disabled={part.quantity === 0}
                  className={`col-span-1 py-2 rounded-lg font-medium transition-colors text-sm flex items-center justify-center ${part.quantity === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/30'}`}
                  title="Dar Baixa"
                >
                  <i className="fas fa-minus"></i>
                </button>

                <button 
                  onClick={() => handleOpenModal(part, 'OUT', true)} // Solicitar
                  disabled={part.quantity === 0}
                  className={`col-span-1 py-2 rounded-lg font-medium transition-colors text-sm flex items-center justify-center ${part.quantity === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-900/50'}`}
                  title="Solicitar Peça"
                >
                   <i className="fas fa-hand-holding-box"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && selectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-md z-10 p-6 relative animate-fade-in-up max-h-[90vh] overflow-y-auto border border-gray-700">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
            
            <div className="mb-6">
              <h3 className={`text-xl font-bold mb-1 ${transactionMode === 'IN' ? 'text-green-500' : isRequestMode ? 'text-blue-500' : 'text-red-500'}`}>
                {transactionMode === 'IN' ? 'Repor Estoque' : isRequestMode ? 'Solicitar Peça' : 'Dar Baixa (Saída)'}
              </h3>
              <p className="text-sm text-gray-400">{selectedPart.name} ({selectedPart.sku})</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Quantidade {transactionMode === 'OUT' && `(Disp: ${selectedPart.quantity})`}
                </label>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300">
                    <i className="fas fa-minus"></i>
                  </button>
                  <input 
                    type="number" 
                    value={qty} 
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center border border-gray-600 rounded h-10 focus:ring-blue-500 text-white bg-gray-700"
                  />
                  <button onClick={() => {
                     if (transactionMode === 'OUT') {
                       setQty(Math.min(selectedPart.quantity, qty + 1));
                     } else {
                       setQty(qty + 1);
                     }
                  }} className="w-10 h-10 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300">
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              </div>

              {/* Only show "Reason Select" if Admin doing direct OUT. If Request Mode, use text area only. */}
              {transactionMode === 'OUT' && isAdmin && !isRequestMode && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Motivo da Baixa</label>
                    <select 
                      value={outReason}
                      onChange={(e) => setOutReason(e.target.value as OutReason)}
                      className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white bg-gray-700"
                    >
                      {Object.values(OutReason).filter(r => r !== 'Solicitação Aprovada').map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>
                  
                  {outReason === OutReason.SALE && (
                    <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-900/50 animate-fade-in-up">
                      <label className="block text-sm font-medium text-blue-400 mb-1">Número do Pedido Cliente</label>
                      <input 
                        type="text"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="Ex: #12345"
                        className="w-full p-2 border border-blue-500/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-800 text-white placeholder-gray-500"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex justify-between">
                   <span>Anexo (Opcional)</span>
                </label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer ${attachment ? 'border-green-500/50 bg-green-900/20' : 'border-gray-600 hover:bg-gray-700'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                  {attachment ? (
                    <div className="flex items-center justify-center text-green-400 text-sm">
                      <i className="fas fa-check-circle mr-2"></i> {attachmentName}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm"><i className="fas fa-paperclip mr-2"></i> Anexar arquivo</div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {isRequestMode ? 'Justificativa da Solicitação' : isAdmin ? 'Observações' : 'Justificativa'}
                </label>
                <textarea 
                  placeholder={isRequestMode ? "Explique por que precisa desta peça..." : "Obs..."}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none text-white bg-gray-700 placeholder-gray-500"
                ></textarea>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors">Cancelar</button>
              <button 
                onClick={handleConfirmTransaction}
                className={`flex-1 text-white py-2 rounded-lg font-medium shadow-md transition-colors 
                  ${transactionMode === 'IN' ? 'bg-green-600 hover:bg-green-700' : 
                    isRequestMode ? 'bg-blue-600 hover:bg-blue-700' :
                    isAdmin ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {transactionMode === 'IN' ? 'Confirmar Reposição' : isRequestMode ? 'Enviar Solicitação' : 'Confirmar Baixa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};