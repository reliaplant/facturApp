export interface Admin {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin';
  permissions?: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}
