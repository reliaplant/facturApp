"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { clientService } from "@/services/client-service";
import { Client } from "@/models/Client";
import { DashboardHeader } from "./components/dashboardHeader";
import { ListaClientesPF } from "./components/listaClientesPF";

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    rfc: "",
    email: ""
  });
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadClients() {
      setIsLoading(true);
      try {
        const firebaseClients = await clientService.getAllClients();
        setClients(firebaseClients);

        if (firebaseClients.length === 0) {
          toast({
            title: "No se encontraron clientes",
            description: "No hay clientes en la base de datos. Se mostrarán datos de ejemplo.",
            variant: "default",
          });
        }
      } catch (error) {
        console.error("Error loading clients:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadClients();
  }, [toast]);

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.rfc) {
      toast({
        title: "Campos requeridos",
        description: "El nombre y RFC son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Create the client data object with proper typing
      const clientData: {
        name: string;
        rfc: string;
        email?: string;
      } = {
        name: newClient.name,
        rfc: newClient.rfc,
      };

      // Only add email if it's not empty
      if (newClient.email && newClient.email.trim() !== '') {
        clientData.email = newClient.email;
      }

      const testClient = await clientService.createClient(clientData);

      setClients(prev => [...prev, testClient]);

      toast({
        title: "Cliente creado",
        description: `${testClient.name} ha sido añadido correctamente.`,
      });

      // Reset form and close dialog
      setNewClient({
        name: "",
        rfc: "",
        email: ""
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error creating client:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el cliente. Revise los datos e intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader />
      <div className="p-[1vw] bg-gray-50">
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
    </div>
  );
}
