import React, { useEffect, useState, useRef } from 'react';
import { getParts, updatePartQuantity, addTransaction, fileToBase64, getCurrentUser, addRequest, savePart } from '../services/storage';
import { Part, OutReason, TransactionType, Transaction, User, StockRequest } from '../types';
import * as XLSX from 'xlsx';

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
  
  // Form Fields
  const [qty, setQty] = useState<number>(1);
  const [outReason, setOutReason] = useState<OutReason>(OutReason.INTERNAL_MAINTENANCE);
  const [notes, setNotes] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  
  // File Upload State (Transaction)
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Excel Import State
  const excelInputRef = useRef<HTMLInputElement>(null);

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

  const handleOpenModal = (part: Part, mode: 'IN' | 'OUT') => {
    setSelectedPart(part);
    setTransactionMode(mode);
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

  // Helper to find value in row regardless of case or accents
  const getValue = (row: any, possibleKeys: string[]): string | undefined => {
    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    const rowKeys = Object.keys(row);
    
    for (const key of possibleKeys) {
      const foundKey = rowKeys.find(k => normalize(k) === normalize(key));
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
        return String(row[foundKey]).trim();
      }
    }
    return undefined;
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);

        if (jsonData.length === 0) {
          alert("A planilha parece estar vazia.");
          return;
        }

        let importedCount = 0;
        let updatedCount = 0;

        // Process data
        jsonData.forEach((row: any) => {
           // Mapeamento específico solicitado:
           // item, codigo, quantidade, sistema, localização, fabricante e equipamento
           
           const name = getValue(row, ['item', 'nome', 'peça', 'descrição']);
           const sku = getValue(row, ['codigo', 'código', 'sku', 'part number']);
           const qtyRaw = getValue(row, ['quantidade', 'qtd', 'estoque', 'saldo']);
           
           // Combine Sistema + Equipamento for Machine Model
           const sistema = getValue(row, ['sistema', 'system']);
           const equipamento = getValue(row, ['equipamento', 'equipment', 'maquina']);
           let machineModel = 'Geral';
           if (sistema && equipamento) machineModel = `${sistema} - ${equipamento}`;
           else if (sistema) machineModel = sistema;
           else if (equipamento) machineModel = equipamento;

           const location = getValue(row, ['localização', 'localizacao', 'local']);
           const fabricante = getValue(row, ['fabricante', 'marca', 'brand']);
           
           // Se tiver fabricante, adiciona na descrição
           let description = name || '';
           if (fabricante) {
             description = `[Fab: ${fabricante}] ${description}`;
           }

           if (sku && name) {
             const existingPart = parts.find(p => p.sku === sku);
             const qtyToAdd = parseInt(qtyRaw || '0') || 0;
             const minQty = 5; // Default

             if (existingPart) {
                // Update existing
                const updatedPart: Part = {
                  ...existingPart,
                  quantity: existingPart.quantity + qtyToAdd,
                  machineModel: machineModel !== 'Geral' ? machineModel : existingPart.machineModel,
                  description: description !== existingPart.name ? description : existingPart.description,
                  location: location || existingPart.location,
                  updatedAt: new Date().toISOString()
                };
                savePart(updatedPart);
                updatedCount++;
             } else {
                // Create new
                const newPart: Part = {
                  id: crypto.randomUUID(),
                  sku: String(sku).toUpperCase(),
                  name: String(name),
                  description: String(description),
                  machineModel: String(machineModel),
                  quantity: qtyToAdd,
                  minQuantity: minQty,
                  location: String(location || ''),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                savePart(newPart);
                
                // Add Initial Transaction
                if (qtyToAdd > 0) {
                  addTransaction({
                    id: crypto.randomUUID(),
                    partId: newPart.id,
                    partName: newPart.name,
                    partSku: newPart.sku,
                    type: TransactionType.IN,
                    quantity: qtyToAdd,
                    reason: 'Compra Inicial (Importação Excel)',
                    notes: 'Importado via planilha',
                    date: new Date().toISOString(),
                    requesterName: currentUser?.name
                  });
                }
                importedCount++;
             }
           }
        });
        
        setParts(getParts());
        alert(`Processamento concluído!\n${importedCount} novos itens cadastrados.\n${updatedCount} itens atualizados (estoque somado).`);
        
      } catch (error) {
        console.error("Excel Error:", error);
        alert("Erro ao ler o arquivo Excel. Verifique se é um arquivo .xlsx válido.");
      }
      
      // Reset input
      if(excelInputRef.current) excelInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmTransaction = () => {
    if (!selectedPart || !currentUser) return;

    if (transactionMode === 'OUT' && qty > selectedPart.quantity) {
      alert("Quantidade indisponível em estoque!");
      return;
    }

    // --- TECHNICIAN FLOW: CREATE REQUEST ---
    if (currentUser.role === 'TECNICO' && transactionMode === 'OUT') {
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
       alert("Solicitação enviada para aprovação do Administrador.");
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
        <h2 className="text-2xl font-bold text-slate-800">Estoque de Peças</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          
          {isAdmin && (
            <>
              <button 
                onClick={() => excelInputRef.current?.click()}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center whitespace-nowrap"
              >
                <i className="fas fa-file-excel mr-2"></i> Importar .xlsx
              </button>
              <input 
                type="file" 
                ref={excelInputRef}
                onChange={handleExcelImport}
                accept=".xlsx, .xls"
                className="hidden"
              />
            </>
          )}

          <select 
            value={selectedMachine} 
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg bg-white text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-auto"
          >
            <option value="all">Todas as Máquinas</option>
            {uniqueMachines.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="relative w-full sm:w-auto">
            <i className="fas fa-search absolute left-3 top-3 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Buscar SKU ou Nome..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredParts.map(part => (
          <div key={part.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="h-48 w-full bg-slate-100 relative">
               <img 
                 src={part.imageUrl || `https://picsum.photos/400/300?random=${part.id}`} 
                 alt={part.name} 
                 className="w-full h-full object-cover"
               />
               <span className="absolute top-2 right-2 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow">
                 SKU: {part.sku}
               </span>
               {part.quantity <= part.minQuantity && (
                 <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded shadow animate-pulse">
                   Estoque Baixo
                 </span>
               )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{part.name}</h3>
                  <p className="text-sm text-blue-600 font-medium">{part.machineModel}</p>
                   {part.location && (
                    <p className="text-xs text-slate-500 mt-1"><i className="fas fa-map-marker-alt mr-1"></i> {part.location}</p>
                   )}
                </div>
                <div className="text-right">
                  <span className={`block text-2xl font-bold ${part.quantity === 0 ? 'text-red-500' : 'text-slate-700'}`}>
                    {part.quantity}
                  </span>
                  <span className="text-xs text-slate-400">unid.</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-4 flex-1 line-clamp-2">{part.description}</p>
              
              <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-4 gap-2">
                {isAdmin && onEdit && (
                  <button 
                    onClick={() => onEdit(part)}
                    className="col-span-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium transition-colors text-sm"
                    title="Editar Detalhes"
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                )}
                
                {isAdmin && (
                  <button 
                    onClick={() => handleOpenModal(part, 'IN')}
                    className="col-span-1 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg font-medium transition-colors text-sm flex items-center justify-center"
                    title="Repor Estoque"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                )}

                <button 
                  onClick={() => handleOpenModal(part, 'OUT')}
                  disabled={part.quantity === 0}
                  className={`${isAdmin ? 'col-span-2' : 'col-span-4'} py-2 rounded-lg font-medium transition-colors text-sm flex items-center justify-center ${part.quantity === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : (isAdmin ? 'bg-red-50 hover:bg-red-100 text-red-600' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200')}`}
                >
                  {isAdmin ? <><i className="fas fa-minus mr-2"></i> Baixa</> : <><i className="fas fa-hand-holding-box mr-2"></i> Solicitar Peça</>}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && selectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md z-10 p-6 relative animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
            
            <div className="mb-6">
              <h3 className={`text-xl font-bold mb-1 ${transactionMode === 'IN' ? 'text-green-600' : isAdmin ? 'text-red-600' : 'text-blue-600'}`}>
                {transactionMode === 'IN' ? 'Repor Estoque' : isAdmin ? 'Dar Baixa (Saída)' : 'Solicitar Peça'}
              </h3>
              <p className="text-sm text-slate-500">{selectedPart.name} ({selectedPart.sku})</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quantidade {transactionMode === 'OUT' && `(Disp: ${selectedPart.quantity})`}
                </label>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
                    <i className="fas fa-minus"></i>
                  </button>
                  <input 
                    type="number" 
                    value={qty} 
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center border border-slate-300 rounded h-10 focus:ring-blue-500"
                  />
                  <button onClick={() => {
                     if (transactionMode === 'OUT') {
                       setQty(Math.min(selectedPart.quantity, qty + 1));
                     } else {
                       setQty(qty + 1);
                     }
                  }} className="w-10 h-10 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              </div>

              {/* For Admin doing OUT: Reason Select. For Tech: Just text area for reason/notes */}
              {transactionMode === 'OUT' && isAdmin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Motivo da Baixa</label>
                    <select 
                      value={outReason}
                      onChange={(e) => setOutReason(e.target.value as OutReason)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {Object.values(OutReason).filter(r => r !== 'Solicitação Aprovada').map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>
                  
                  {outReason === OutReason.SALE && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 animate-fade-in-up">
                      <label className="block text-sm font-medium text-blue-800 mb-1">Número do Pedido Cliente</label>
                      <input 
                        type="text"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="Ex: #12345"
                        className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                   <span>Anexo (Opcional)</span>
                </label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer ${attachment ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:bg-slate-50'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                  {attachment ? (
                    <div className="flex items-center justify-center text-green-700 text-sm">
                      <i className="fas fa-check-circle mr-2"></i> {attachmentName}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-sm"><i className="fas fa-paperclip mr-2"></i> Anexar arquivo</div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isAdmin ? 'Observações' : 'Justificativa / Onde será usado'}
                </label>
                <textarea 
                  placeholder={isAdmin ? "Obs..." : "Explique para qual máquina/serviço..."}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                ></textarea>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">Cancelar</button>
              <button 
                onClick={handleConfirmTransaction}
                className={`flex-1 text-white py-2 rounded-lg font-medium shadow-md transition-colors 
                  ${transactionMode === 'IN' ? 'bg-green-600 hover:bg-green-700' : 
                    isAdmin ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {transactionMode === 'IN' ? 'Confirmar Reposição' : isAdmin ? 'Confirmar Baixa' : 'Enviar Solicitação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};