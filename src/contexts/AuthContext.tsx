'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { User, UserRole, hasRoleAccess } from '@/models/User';
import app from '@/services/firebase';

const db = getFirestore(app);
const auth = getAuth(app);

interface AuthContextType {
  // Estado
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  
  // Helpers de roles
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isContador: boolean;
  isCliente: boolean;
  
  // Funciones de verificación
  hasAccess: (requiredRole: UserRole) => boolean;
  canAccessClient: (clientId: string) => boolean;
  
  // Acciones
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar datos del usuario desde Firestore
  const loadUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        return userDoc.data() as User;
      }
      
      // Si no existe en la colección users, verificar si es admin legacy
      const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
      if (adminDoc.exists()) {
        // Migrar admin legacy a nuevo formato
        const adminData = adminDoc.data();
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: adminData.displayName || firebaseUser.displayName,
          role: 'super_admin' as UserRole, // Los admins legacy son super_admin
          isActive: true,
          createdAt: adminData.createdAt || new Date().toISOString()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  };

  // Escuchar cambios de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        const userData = await loadUserData(fbUser);
        setUser(userData);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Refrescar datos del usuario
  const refreshUser = async () => {
    if (firebaseUser) {
      const userData = await loadUserData(firebaseUser);
      setUser(userData);
    }
  };

  // Verificar si tiene acceso a un rol mínimo
  const hasAccess = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    return hasRoleAccess(user.role, requiredRole);
  };

  // Verificar si puede acceder a un cliente específico
  const canAccessClient = (clientId: string): boolean => {
    if (!user) return false;
    
    // Super admin y admin pueden ver todos
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }
    
    // Contador solo puede ver sus clientes asignados
    if (user.role === 'contador') {
      return user.assignedClients?.includes(clientId) || false;
    }
    
    // Cliente solo puede ver su propio ID
    if (user.role === 'cliente') {
      return user.clientId === clientId;
    }
    
    return false;
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    
    // Helpers
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'super_admin',
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isContador: user?.role === 'contador',
    isCliente: user?.role === 'cliente',
    
    // Funciones
    hasAccess,
    canAccessClient,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC para proteger componentes por rol
export function withRoleAccess<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: UserRole
) {
  return function ProtectedComponent(props: P) {
    const { user, loading, hasAccess } = useAuth();
    
    if (loading) {
      return <div className="flex items-center justify-center p-8">Cargando...</div>;
    }
    
    if (!user || !hasAccess(requiredRole)) {
      return (
        <div className="flex items-center justify-center p-8 text-red-500">
          No tienes permisos para acceder a esta sección.
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}
