"use client";

import { useState, useEffect } from "react";
import { clientService } from "@/services/client-service";
import { Client } from "@/models/Client";
import { ListaClientesPF } from "./components/listaClientesPF";
import { Configuracion } from "./components/Configuracion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
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
  const [loggedInUser] = useState({ name: "Ana Rodríguez", email: "ana@example.com" });

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
                  <TabsTrigger size="default" value="configuracion">Configuración</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 pl-3 border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                  {loggedInUser.name}
                </div>
                <div className="h-7 w-7 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-medium">
                  {loggedInUser.name.charAt(0)}
                </div>
              </div>
            </div>
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
          
          <TabsContent value="configuracion">
            <Configuracion />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
