export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  lastLogin?: string;
  role: 'admin' | 'user';
  isActive: boolean;
}

export interface CreateUserData {
  email: string;
  password: string;
  displayName?: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserData {
  displayName?: string;
  photoURL?: string;
  role?: 'admin' | 'user';
  isActive?: boolean;
}