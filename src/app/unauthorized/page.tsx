'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <ShieldX className="h-24 w-24 text-red-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900">
          Acceso No Autorizado
        </h1>
        
        <p className="text-gray-600 max-w-md">
          No tienes permisos para acceder a esta sección. 
          Si crees que esto es un error, contacta al administrador.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
          >
            Volver
          </Button>
          <Button 
            onClick={() => router.push('/dashboard')}
          >
            Ir al Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
