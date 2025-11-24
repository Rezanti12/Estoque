import { Part, Transaction, User, StockRequest, RequestStatus } from '../types';

const PARTS_KEY = 'manutstock_parts';
const TRANSACTIONS_KEY = 'manutstock_transactions';
const USERS_KEY = 'manutstock_users';
const REQUESTS_KEY = 'manutstock_requests';
const SESSION_KEY = 'manutstock_session';

// --- AUTHENTICATION & USERS ---

export const initializeUsers = () => {
  const users = getUsers();
  if (users.length === 0) {
    // Create default Admin
    const admin: User = {
      id: 'admin-001',
      name: 'Administrador',
      username: 'admin',
      password: '123', // Demo password
      role: 'ADMIN',
      status: 'ACTIVE'
    };
    saveUser(admin);
  }
};

export const getUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  let users: User[] = data ? JSON.parse(data) : [];
  
  // Migration: Ensure all users have a status (for existing data)
  users = users.map(u => ({
    ...u,
    status: u.status || 'ACTIVE'
  }));
  
  return users;
};

export const saveUser = (user: User) => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const registerUser = (user: User): boolean => {
  const users = getUsers();
  if (users.some(u => u.username === user.username)) {
    return false; // Username exists
  }
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return true;
};

export const deleteUser = (id: string) => {
  const users = getUsers().filter(u => u.id !== id);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const login = (username: string, password: string): { user: User | null, error?: string } => {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    if (user.status === 'PENDING') {
      return { user: null, error: 'Seu cadastro está pendente de aprovação do Administrador.' };
    }
    if (user.status === 'BLOCKED') {
      return { user: null, error: 'Acesso bloqueado.' };
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { user };
  }
  return { user: null, error: 'Usuário ou senha incorretos.' };
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
};

// --- REQUESTS ---

export const getRequests = (): StockRequest[] => {
  const data = localStorage.getItem(REQUESTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const addRequest = (req: StockRequest) => {
  const list = getRequests();
  list.unshift(req);
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(list));
};

export const updateRequestStatus = (id: string, status: RequestStatus, adminName: string): StockRequest | null => {
  const list = getRequests();
  const index = list.findIndex(r => r.id === id);
  if (index === -1) return null;

  list[index].status = status;
  list[index].reviewedAt = new Date().toISOString();
  list[index].reviewedBy = adminName;
  
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(list));
  return list[index];
};

// --- PARTS & TRANSACTIONS ---

export const getParts = (): Part[] => {
  const data = localStorage.getItem(PARTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const savePart = (part: Part): void => {
  const parts = getParts();
  const existingIndex = parts.findIndex(p => p.id === part.id);
  
  if (existingIndex >= 0) {
    parts[existingIndex] = part;
  } else {
    parts.push(part);
  }
  
  localStorage.setItem(PARTS_KEY, JSON.stringify(parts));
};

export const updatePartQuantity = (id: string, delta: number): Part | null => {
  const parts = getParts();
  const partIndex = parts.findIndex(p => p.id === id);
  
  if (partIndex === -1) return null;
  
  parts[partIndex].quantity = Math.max(0, parts[partIndex].quantity + delta);
  parts[partIndex].updatedAt = new Date().toISOString();
  
  localStorage.setItem(PARTS_KEY, JSON.stringify(parts));
  return parts[partIndex];
};

export const getTransactions = (): Transaction[] => {
  const data = localStorage.getItem(TRANSACTIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const addTransaction = (transaction: Transaction): void => {
  const transactions = getTransactions();
  transactions.unshift(transaction); // Add to top
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
};

// Helpers

export const compressImage = (base64Str: string, maxWidth = 400): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(base64Str); 
  });
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};