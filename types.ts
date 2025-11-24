export enum TransactionType {
  IN = 'ENTRADA',
  OUT = 'SAIDA'
}

export enum OutReason {
  CLIENT_MAINTENANCE = 'Manutenção Cliente',
  INTERNAL_MAINTENANCE = 'Manutenção Interna',
  SALE = 'Venda de Peça',
  CORRECTION = 'Ajuste de Estoque',
  REQUEST_FULFILLMENT = 'Solicitação Aprovada'
}

export interface Part {
  id: string;
  sku: string;
  name: string;
  description: string;
  machineModel: string; // Machine this part belongs to
  quantity: number;
  minQuantity: number;
  salePrice?: number; // Value in BRL
  imageUrl?: string;
  location?: string; // Shelf/Bin
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  partId: string;
  partName: string;
  partSku: string;
  type: TransactionType;
  quantity: number;
  reason: OutReason | 'Compra Inicial' | 'Reposição' | 'Entrada Avulsa' | string;
  notes?: string; // e.g., Client Name, WO Number
  date: string;
  attachmentUrl?: string; // Base64 of PDF or Image
  attachmentName?: string; // Filename
  requesterName?: string;
}

export interface Stats {
  totalItems: number;
  lowStockItems: number;
  totalValue?: number; // If we had price
}

// --- Auth & Access Control ---

export type UserRole = 'ADMIN' | 'TECNICO';
export type UserStatus = 'ACTIVE' | 'PENDING' | 'BLOCKED';

export interface User {
  id: string;
  name: string;
  username: string; // Used for login
  password: string; // Simple storage for demo
  role: UserRole;
  status: UserStatus;
}

// --- Requests System ---

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface StockRequest {
  id: string;
  partId: string;
  partName: string;
  partSku: string;
  requesterId: string;
  requesterName: string;
  quantity: number;
  reason: string; // Why they need it
  status: RequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string; // Admin Name
  attachmentUrl?: string;
  attachmentName?: string;
}