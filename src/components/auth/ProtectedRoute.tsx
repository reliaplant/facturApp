'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/models/User';
import Image from 'next/image';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  clientId?: string; // Si se proporciona, verifica acceso al cliente específico
  fallbackUrl?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole = 'cliente', 
  clientId,
  fallbackUrl = '/login' 
}: ProtectedRouteProps) {
  const { user, loading, hasAccess, canAccessClient } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Si no está autenticado, redirigir a login
      if (!user) {
        router.push(fallbackUrl);
        return;
      }

      // Verificar rol mínimo
      if (!hasAccess(requiredRole)) {
        router.push('/unauthorized');
        return;
      }

      // Si se especificó un clientId, verificar acceso
      if (clientId && !canAccessClient(clientId)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [user, loading, requiredRole, clientId, hasAccess, canAccessClient, router, fallbackUrl]);

  // Mostrar loading mientras verifica
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <Image
            src="/assets/logoKontia.png"
            alt="Kontia"
            width={120}
            height={40}
            priority
          />
        </div>
        <div className="flex gap-1 mt-4">
          <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  // Si no tiene acceso, no mostrar nada (se redirigirá)
  if (!user || !hasAccess(requiredRole)) {
    return null;
  }

  // Si requiere acceso a cliente específico y no lo tiene
  if (clientId && !canAccessClient(clientId)) {
    return null;
  }

  return <>{children}</>;
}

// Componente para mostrar contenido solo si tiene el rol
interface RoleGateProps {
  children: React.ReactNode;
  requiredRole: UserRole;
  fallback?: React.ReactNode;
}

export function RoleGate({ children, requiredRole, fallback = null }: RoleGateProps) {
  const { hasAccess, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!hasAccess(requiredRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Componente para mostrar contenido solo si puede acceder al cliente
interface ClientGateProps {
  children: React.ReactNode;
  clientId: string;
  fallback?: React.ReactNode;
}

export function ClientGate({ children, clientId, fallback = null }: ClientGateProps) {
  const { canAccessClient, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!canAccessClient(clientId)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
