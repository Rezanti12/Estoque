import React, { useState, useRef, useEffect } from 'react';
import { analyzePartImage } from '../services/gemini';
import { savePart, compressImage, addTransaction, getCurrentUser } from '../services/storage';
import { Part, TransactionType, OutReason } from '../types';

interface AddPartProps {
  initialData?: Part | null;
  onSuccess?: () => void;
}

export const AddPart: React.FC<AddPartProps> = ({ initialData, onSuccess }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = getCurrentUser();

  // If not admin, shouldn't be here (extra safety)
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-500">Acesso negado. Apenas administradores podem cadastrar itens.</div>;
  }

  const isEditing = !!initialData;

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    machineModel: '',
    quantity: 1,
    minQuantity: 5,
    location: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        sku: initialData.sku,
        description: initialData.description,
        machineModel: initialData.machineModel,
        quantity: initialData.quantity,
        minQuantity: initialData.minQuantity,
        location: initialData.location || ''
      });
      setPreviewImage(initialData.imageUrl || null);
    } else {
      setFormData({
        name: '',
        sku: '',
        description: '',
        machineModel: '',
        quantity: 1,
        minQuantity: 5,
        location: ''
      });
      setPreviewImage(null);
    }
  }, [initialData]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64, 600);
        setPreviewImage(compressed);
        
        if (!isEditing) {
           analyzeImageWithAI(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImageWithAI = async (base64: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzePartImage(base64);
      setFormData(prev => ({
        ...prev,
        name: result.name,
        description: result.description,
        machineModel: result.machineModel,
        sku: result.suggestedSku
      }));
    } catch (err) {
      alert("Não foi possível analisar a imagem automaticamente. Por favor, preencha os dados manualmente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.sku) {
      alert("Nome e SKU são obrigatórios");
      return;
    }

    const partId = isEditing && initialData ? initialData.id : crypto.randomUUID();

    const partData: Part = {
      id: partId,
      ...formData,
      imageUrl: previewImage || undefined,
      createdAt: isEditing && initialData ? initialData.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    savePart(partData);

    if (isEditing && initialData) {
      const diff = formData.quantity - initialData.quantity;
      if (diff !== 0) {
        addTransaction({
          id: crypto.randomUUID(),
          partId: partId,
          partName: formData.name,
          partSku: formData.sku,
          type: diff > 0 ? TransactionType.IN : TransactionType.OUT,
          quantity: Math.abs(diff),
          reason: OutReason.CORRECTION,
          notes: `Ajuste Manual por ${currentUser.name}`,
          date: new Date().toISOString()
        });
      }
    } else {
      addTransaction({
        id: crypto.randomUUID(),
        partId: partId,
        partName: formData.name,
        partSku: formData.sku,
        type: TransactionType.IN,
        quantity: formData.quantity,
        reason: 'Compra Inicial',
        notes: `Cadastrado por ${currentUser.name}`,
        date: new Date().toISOString()
      });
    }

    alert(isEditing ? "Peça atualizada com sucesso!" : "Peça cadastrada com sucesso!");
    
    if (onSuccess) {
      onSuccess();
    } else {
      setFormData({
        name: '',
        sku: '',
        description: '',
        machineModel: '',
        quantity: 1,
        minQuantity: 5,
        location: ''
      });
      setPreviewImage(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">
          {isEditing ? 'Editar Peça' : 'Cadastro de Nova Peça'}
        </h2>
        {isEditing && onSuccess && (
          <button 
            onClick={onSuccess}
            className="text-slate-500 hover:text-slate-700 font-medium"
          >
            Cancelar Edição
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 transition-colors hover:bg-slate-100">
            {previewImage ? (
              <div className="relative w-full max-w-sm">
                <img src={previewImage} alt="Preview" className="w-full h-64 object-contain rounded-lg" />
                <button 
                  type="button"
                  onClick={() => {
                    setPreviewImage(null);
                    if(fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full shadow hover:bg-red-600 transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <i className="fas fa-spinner fa-spin text-3xl mb-2"></i>
                    <p className="font-medium">A IA está analisando a peça...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center" onClick={() => fileInputRef.current?.click()}>
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 cursor-pointer">
                  <i className="fas fa-camera text-2xl"></i>
                </div>
                <p className="text-sm font-medium text-slate-700">Clique para {isEditing ? 'trocar' : 'adicionar'} foto</p>
                {!isEditing && <p className="text-xs text-slate-500 mt-1">A IA irá preencher os dados automaticamente</p>}
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Peça</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU (Código)</label>
              <input 
                type="text" 
                required
                value={formData.sku}
                onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Máquina Compatível</label>
              <input 
                type="text" 
                value={formData.machineModel}
                onChange={e => setFormData({...formData, machineModel: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade {isEditing ? '(Atual)' : 'Inicial'}</label>
              <input 
                type="number" 
                min="0"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {isEditing && <p className="text-xs text-orange-500 mt-1">Alterar isso irá gerar um "Ajuste de Estoque".</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Mínimo (Alerta)</label>
              <input 
                type="number" 
                min="0"
                value={formData.minQuantity}
                onChange={e => setFormData({...formData, minQuantity: parseInt(e.target.value) || 0})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Localização (Opcional)</label>
              <input 
                type="text" 
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium shadow-lg shadow-blue-200 transition-all flex items-center"
            >
              <i className="fas fa-save mr-2"></i>
              {isEditing ? 'Salvar Alterações' : 'Cadastrar Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};