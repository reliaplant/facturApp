"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Plus, ChevronRight, Users, FileText, Settings, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { clientService } from "@/services/client-service";
import { Client } from "@/models/Client";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

          const mockClients = clientService.getMockClients();
          setClients(mockClients);
        }
      } catch (error) {
        console.error("Error loading clients:", error);

        toast({
          title: "Error de conexión",
          description: "No se pudieron cargar los clientes desde Firebase. Se mostrarán datos de ejemplo.",
          variant: "destructive",
        });

        const mockClients = clientService.getMockClients();
        setClients(mockClients);
      } finally {
        setIsLoading(false);
      }
    }

    loadClients();
  }, [toast]);

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.rfc.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <header className="border-b bg-white dark:bg-gray-950">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">FacturApp</h1>
            <nav className="hidden md:flex gap-6">
              <Link href="/dashboard" className="text-sm font-medium transition-colors hover:text-primary">
                Dashboard
              </Link>
              <Link href="#" className="text-sm font-medium transition-colors hover:text-primary">
                Clientes
              </Link>
              <Link href="#" className="text-sm font-medium transition-colors hover:text-primary">
                Configuración
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>
        </div>
      </header>
      
      <div className="flex-1">
        <div className="container px-4 py-6 md:py-8 lg:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Gestiona tus clientes y sus expedientes fiscales.
              </p>
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
                        onChange={(e) => setNewClient({...newClient, name: e.target.value})}
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
                        onChange={(e) => setNewClient({...newClient, rfc: e.target.value.toUpperCase()})}
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
                        onChange={(e) => setNewClient({...newClient, email: e.target.value})}
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
          </div>
          
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>
                  Administra los expedientes fiscales de tus clientes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
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
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clients.length}</div>
                <p className="text-xs text-muted-foreground">
                  {clients.filter(c => c.isActive !== false).length} activos
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Facturas Procesadas</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">
                  Funcionalidad en desarrollo
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Acciones Pendientes</CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">
                  Funcionalidad en desarrollo
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
