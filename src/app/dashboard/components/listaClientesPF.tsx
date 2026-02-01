"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Client } from "@/models/Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ListaClientesPFProps {
  clients: Client[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
  newClient: {
    name: string;
    rfc: string;
    email: string;
    tipoPersona: 'fisica' | 'moral';
  };
  setNewClient: (client: { name: string; rfc: string; email: string; tipoPersona: 'fisica' | 'moral' }) => void;
  handleCreateClient: () => Promise<void>;
  isCreating: boolean;
}

// Client tiers with color scheme
const clientTiers = [
  { id: "onboarding", name: "Onboarding", color: "bg-yellow-400" },
  { id: "basico", name: "Básico", color: "bg-violet-300" },
  { id: "emprendedores", name: "Emprendedores", color: "bg-violet-500" },
  { id: "pro", name: "Pro", color: "bg-violet-800" },
  { id: "perdidos", name: "Perdidos", color: "bg-red-500" }
];

export const ListaClientesPF = ({
  clients,
  isLoading,
  searchTerm,
  setSearchTerm,
  isDialogOpen,
  setIsDialogOpen,
  newClient,
  setNewClient,
  handleCreateClient,
  isCreating,
}: ListaClientesPFProps) => {
  const filteredClients = clients.filter(client => {
    // Handle clients with either name pattern
    let clientName = '';
    
    // Use name field if available
    if (client.name) {
      clientName = client.name.toLowerCase();
    } 
    // Otherwise construct from nombres and apellidos
    else if (client.nombres || client.primerApellido) {
      clientName = `${client.nombres || ''} ${client.primerApellido || ''}`.toLowerCase().trim();
    }
    
    const clientRfc = client.rfc ? client.rfc.toLowerCase() : '';
    
    return searchTerm === '' || 
           clientName.includes(searchTerm.toLowerCase()) || 
           clientRfc.includes(searchTerm.toLowerCase());
  });

  // Group clients by tier
  const getClientsByTier = () => {
    const clientsByTier: Record<string, Client[]> = {};
    
    // Initialize empty arrays for each tier
    clientTiers.forEach(tier => {
      clientsByTier[tier.id] = [];
    });
    
    // Distribute clients to their respective tiers
    filteredClients.forEach(client => {
      const tier = client.tier || "onboarding";
      if (clientsByTier[tier]) {
        clientsByTier[tier].push(client);
      } else {
        clientsByTier["onboarding"].push(client);
      }
    });
    
    return clientsByTier;
  };

  const clientsByTier = getClientsByTier();

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="bg-gray-100 px-7 py-2 flex flex-row items-center justify-between space-y-0 border-b border-gray-200 ">
        <div className="flex items-center gap-4 w-full">
          <CardTitle className="text-base">Clientes</CardTitle>

          <div className="relative max-w-[250px] flex-1">
            <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-gray-500" />
            <Input
              type="search"
              placeholder="Buscar..."
              className="w-full h-7 pl-7 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-1.5 ml-auto">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="xs" className="h-7">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Nuevo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Cliente</DialogTitle>
                  <DialogDescription>
                    Ingrese los datos básicos del cliente.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tipoPersona" className="text-right">
                      Tipo*
                    </Label>
                    <Select 
                      value={newClient.tipoPersona} 
                      onValueChange={(value: 'fisica' | 'moral') => setNewClient({ ...newClient, tipoPersona: value })}
                    >
                      <SelectTrigger id="tipoPersona" className="col-span-3">
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fisica">Persona Física</SelectItem>
                        <SelectItem value="moral">Persona Moral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      {newClient.tipoPersona === 'fisica' ? 'Nombre*' : 'Razón Social*'}
                    </Label>
                    <Input
                      id="name"
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      className="col-span-3"
                      placeholder="Nombre completo o razón social"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="rfc" className="text-right">
                      RFC*
                    </Label>
                    <Input
                      id="rfc"
                      value={newClient.rfc}
                      onChange={(e) => setNewClient({ ...newClient, rfc: e.target.value.toUpperCase() })}
                      className="col-span-3"
                      placeholder="XXXX000000XXX"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email*
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      className="col-span-3"
                      placeholder="correo@ejemplo.com"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    onClick={handleCreateClient}
                    disabled={isCreating || !newClient.name || !newClient.rfc}
                  >
                    {isCreating ? "Creando..." : "Crear cliente"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2 bg-gray-100 dark:bg-gray-850 h-[calc(100vh-140px)] overflow-auto p-2">
            {clientTiers.map(tier => (
              <div key={tier.id} className="flex flex-col border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                <div className="px-3 py-2 bg-gray-100 dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className={`w-2.5 h-2.5 ${tier.color} rounded-full mr-1.5`}></div>
                    <span className="font-medium text-xs">{tier.name}</span>
                  </div>
                  <div className="flex items-center justify-center w-4 h-4 bg-white dark:bg-gray-700 rounded-full text-[10px]">
                    {clientsByTier[tier.id].length}
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-850 flex-1 p-2 overflow-y-auto">
                  {clientsByTier[tier.id].length > 0 ? (
                    <div className="space-y-2">
                      {clientsByTier[tier.id].map((client) => (
                        <Link key={client.id} href={`/dashboard/${client.id}`} passHref>
                          <div className="bg-white dark:bg-gray-800 p-2 rounded-md shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700">
                            <div className="font-medium truncate text-xs">
                              {client.name || `${client.nombres || ''} ${client.primerApellido || ''}`.trim()}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">{client.rfc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-16 text-gray-400 text-xs">
                      <Users className="h-4 w-4 mb-1 opacity-40" />
                      <span>Sin clientes</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="py-1.5 px-7 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="text-xs text-gray-500">
          {filteredClients.length} de {clients.length} clientes
        </div>
      </CardFooter>
    </Card>
  );
};
