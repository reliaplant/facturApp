// Roles del sistema
export type UserRole = 'super_admin' | 'admin' | 'contador' | 'cliente';

// Descripciones de roles para UI
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  contador: 'Contador',
  cliente: 'Cliente'
};

// Jerarquía de roles (mayor número = más permisos)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  cliente: 1,
  contador: 2,
  admin: 3,
  super_admin: 4
};

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  lastLogin?: string;
  role: UserRole;
  isActive: boolean;
  // Para contadores: lista de IDs de clientes asignados
  assignedClients?: string[];
  // Para clientes: ID del cliente al que pertenece
  clientId?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  displayName?: string;
  role?: UserRole;
  assignedClients?: string[];
  clientId?: string;
}

export interface UpdateUserData {
  displayName?: string;
  photoURL?: string;
  role?: UserRole;
  isActive?: boolean;
  assignedClients?: string[];
  clientId?: string | null;
}

// Helper para verificar si un rol tiene acceso a otro nivel
export function hasRoleAccess(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}