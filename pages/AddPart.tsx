import React, { useState, useRef, useEffect } from 'react';
import { savePart, compressImage, addTransaction, getCurrentUser } from '../services/storage';
import { Part, TransactionType, OutReason } from '../types';

interface AddPartProps {
  initialData?: Part | null;
  onSuccess?: () => void;
}

export const AddPart: React.FC<AddPartProps> = ({ initialData, onSuccess }) => {
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
    location: '',
    salePrice: 0
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
        location: initialData.location || '',
        salePrice: initialData.salePrice || 0
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
        location: '',
        salePrice: 0
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
      };
      reader.readAsDataURL(file);
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
        location: '',
        salePrice: 0
      });
      setPreviewImage(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          {isEditing ? 'Editar Peça' : 'Cadastro de Nova Peça'}
        </h2>
        {isEditing && onSuccess && (
          <button 
            onClick={onSuccess}
            className="text-gray-400 hover:text-gray-200 font-medium"
          >
            Cancelar Edição
          </button>
        )}
      </div>

      <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-600 rounded-xl bg-gray-700/50 transition-colors hover:bg-gray-700">
            {previewImage ? (
              <div className="relative w-full max-w-sm">
                <img src={previewImage} alt="Preview" className="w-full h-64 object-contain rounded-lg" />
                <button 
                  type="button"
                  onClick={() => {
                    setPreviewImage(null);
                    if(fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white w-8 h-8 rounded-full shadow hover:bg-red-700 transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ) : (
              <div className="text-center" onClick={() => fileInputRef.current?.click()}>
                <div className="w-16 h-16 bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 cursor-pointer">
                  <i className="fas fa-camera text-2xl"></i>
                </div>
                <p className="text-sm font-medium text-gray-300">Clique para {isEditing ? 'trocar' : 'adicionar'} foto</p>
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
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome da Peça</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white bg-gray-700 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">SKU (Código)</label>
              <input 
                type="text" 
                required
                value={formData.sku}
                onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})}
                className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-white bg-gray-700 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Máquina Compatível</label>
              <input 
                type="text" 
                value={formData.machineModel}
                onChange={e => setFormData({...formData, machineModel: e.target.value})}
                className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white bg-gray-700 placeholder-gray-500"
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-white bg-gray-700 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Quantidade {isEditing ? '(Atual)' : 'Inicial'}</label>
              <input 
                type="number" 
                min="0"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white bg-gray-700"
              />
              {isEditing && <p className="text-xs text-orange-400 mt-1">Alterar isso irá gerar um "Ajuste de Estoque".</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Valor de Venda (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400">R$</span>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={e => setFormData({...formData, salePrice: parseFloat(e.target.value) || 0})}
                  className="w-full pl-10 p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white bg-gray-700 placeholder-gray-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Estoque Mínimo (Alerta)</label>
              <input 
                type="number" 
                min="0"
                value={formData.minQuantity}
                onChange={e => setFormData({...formData, minQuantity: parseInt(e.target.value) || 0})}
                className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white bg-gray-700"
              />
            </div>
            
             <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Localização (Opcional)</label>
              <input 
                type="text" 
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white bg-gray-700 placeholder-gray-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-700 flex justify-end">
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium shadow-lg shadow-blue-900/50 transition-all flex items-center"
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