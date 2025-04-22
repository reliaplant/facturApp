"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Plus, ChevronRight, Settings, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Client } from "@/models/Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
  };
  setNewClient: (client: { name: string; rfc: string; email: string }) => void;
  handleCreateClient: () => Promise<void>;
  isCreating: boolean;
}

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
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.rfc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Clientes</CardTitle>

        <div className="w-1/4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Buscar cliente por nombre o RFC..."
              className="w-full pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Ajustes
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Cliente</DialogTitle>
                <DialogDescription>
                  Ingrese los datos básicos del cliente. Podrá completar más información después.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nombre*
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
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    className="col-span-3"
                    placeholder="correo@ejemplo.com"
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <div className="divide-y">
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <div className="font-medium">{client.name}</div>
                      <div className="text-sm text-gray-500">{client.rfc}</div>
                    </div>
                    <Link href={`/dashboard/${client.id}`} passHref>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  {searchTerm ? "No se encontraron clientes que coincidan con la búsqueda." : "No hay clientes disponibles."}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="text-sm text-gray-500">
          {filteredClients.length} de {clients.length} clientes
        </div>
      </CardFooter>
    </Card>
  );
};
