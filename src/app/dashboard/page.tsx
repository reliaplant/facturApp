"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clientService } from "@/services/client-service";
import { Client } from "@/models/Client";
import { ListaClientesPF } from "./components/listaClientesPF";
import { Configuracion } from "./components/Configuracion";
import UserManagement from "@/components/user-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/firebase";
import { ROLE_LABELS } from "@/models/User";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon, Settings } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);

  const handleLogout = async () => {
    try {
      await userService.logoutUser();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    rfc: "",
    email: "",
    tipoPersona: 'fisica' as 'fisica' | 'moral'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("personaFisica");

  useEffect(() => {
    async function loadClients() {
      setIsLoading(true);
      try {
        const firebaseClients = await clientService.getAllClients();
        
        const clientsWithTiers = firebaseClients.map((client, index) => {
          const tiers = ["onboarding", "basico", "emprendedores", "pro", "perdidos"];
          const tier = tiers[index % tiers.length];
          return { ...client, tier };
        });
        
        setClients(clientsWithTiers);
      } catch (error) {
        console.error("Error loading clients:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadClients();
  }, []);

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.rfc || !newClient.email) {
      return;
    }

    setIsCreating(true);
    try {
      // Simple client data with just name
      const clientData = {
        name: newClient.name,
        rfc: newClient.rfc,
        tier: "onboarding",
        email: newClient.email && newClient.email.trim() !== '' ? newClient.email : undefined,
        tipoPersona: newClient.tipoPersona
      };

      const testClient = await clientService.createClient(clientData);
      setClients(prev => [...prev, testClient]);

      // Reset form and close dialog
      setNewClient({
        name: "",
        rfc: "",
        email: "",
        tipoPersona: 'fisica'
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error creating client:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="contador">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b-2 border-gray-200">
          <div className="w-full px-7 pr-7 py-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-6">
                <h1 className="font-bold text-gray-900 dark:text-white text-xl">
                  Kontia
                </h1>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                  <TabsList size="default" className="overflow-x-auto bg-transparent">
                    <TabsTrigger size="default" value="personaFisica">Clientes PF</TabsTrigger>
                    <TabsTrigger size="default" value="personaMoral">Clientes PM</TabsTrigger>
                    <TabsTrigger size="default" value="usuarios">Usuarios</TabsTrigger>
                    <TabsTrigger size="default" value="configuracion">Configuración</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              {/* User info with dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 pl-3 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                      {user?.displayName || user?.email || 'Usuario'}
                    </div>
                    <div className="h-8 w-8 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-medium hover:bg-violet-600 transition-colors">
                      {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.displayName || 'Usuario'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      <p className="text-xs text-violet-600 font-medium">
                        {user?.role ? ROLE_LABELS[user.role] : 'Sin rol'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Mi Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

      {/* Content */}
      <main className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="personaFisica">
            <div className="">
              <div className="mb-8">
                <ListaClientesPF 
                  clients={clients}
                  isLoading={isLoading}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  isDialogOpen={isDialogOpen}
                  setIsDialogOpen={setIsDialogOpen}
                  newClient={newClient}
                  setNewClient={setNewClient}
                  handleCreateClient={handleCreateClient}
                  isCreating={isCreating}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="personaMoral">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-md shadow-sm mt-4">
              <h2 className="text-xl font-semibold mb-4">Clientes - Persona Moral</h2>
              <p className="text-gray-600 dark:text-gray-300">
                La sección de personas morales está en desarrollo.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="usuarios">
            <UserManagement />
          </TabsContent>
          
          <TabsContent value="configuracion">
            <Configuracion />
          </TabsContent>
        </Tabs>
      </main>
    </div>
    </ProtectedRoute>
  );
}
