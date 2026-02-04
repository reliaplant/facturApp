"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Plus, Search, User, CheckCircle, XCircle, AlertCircle, FileText, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Client } from "@/models/Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { userService } from "@/services/firebase";
import { declaracionService } from "@/services/declaracion-service";
import { Declaracion } from "@/models/declaracion";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { clientService } from "@/services/client-service";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
    selectedUserId: string;
  };
  setNewClient: (client: { name: string; rfc: string; selectedUserId: string }) => void;
  handleCreateClient: () => Promise<void>;
  isCreating: boolean;
  onClientDeleted?: () => void; // Callback para refrescar la lista después de eliminar
}

interface UserInfo {
  uid: string;
  displayName?: string;
  email?: string;
  isActive?: boolean;
  clientId?: string;
}

interface ClientWithInfo extends Client {
  usuario?: UserInfo;
  ultimaDeclaracion?: Declaracion;
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
  onClientDeleted,
}: ListaClientesPFProps) => {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [clientsWithInfo, setClientsWithInfo] = useState<ClientWithInfo[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(true);
  
  // Estados para eliminación de cliente
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientWithInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();

  // Usuarios disponibles (activos y sin cliente asignado)
  const usuariosDisponibles = users.filter(u => u.isActive !== false && !u.clientId);

  // Cargar usuarios y declaraciones
  useEffect(() => {
    const loadData = async () => {
      setLoadingInfo(true);
      try {
        // Cargar todos los usuarios
        const usersData = await userService.getAllUsers();
        const mappedUsers = usersData.map(u => ({
          uid: u.uid,
          displayName: u.displayName,
          email: u.email,
          isActive: u.isActive,
          clientId: u.clientId
        }));
        setUsers(mappedUsers);

        // Para cada cliente, buscar su usuario asignado y última declaración
        const currentYear = new Date().getFullYear();
        const enrichedClients = await Promise.all(
          clients.map(async (client) => {
            // Buscar usuario asignado a este cliente
            const assignedUser = mappedUsers.find(u => u.clientId === client.id);
            
            // Buscar última declaración
            let ultimaDeclaracion: Declaracion | undefined;
            try {
              const declaraciones = await declaracionService.getDeclaraciones(client.id, currentYear);
              if (declaraciones.length > 0) {
                // Ordenar por mes descendente
                declaraciones.sort((a, b) => parseInt(b.mes) - parseInt(a.mes));
                ultimaDeclaracion = declaraciones[0];
              } else {
                // Intentar año anterior si no hay del actual
                const declaracionesAnterior = await declaracionService.getDeclaraciones(client.id, currentYear - 1);
                if (declaracionesAnterior.length > 0) {
                  declaracionesAnterior.sort((a, b) => parseInt(b.mes) - parseInt(a.mes));
                  ultimaDeclaracion = declaracionesAnterior[0];
                }
              }
            } catch (error) {
              console.error(`Error loading declarations for ${client.id}:`, error);
            }

            return {
              ...client,
              usuario: assignedUser,
              ultimaDeclaracion
            };
          })
        );

        setClientsWithInfo(enrichedClients);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingInfo(false);
      }
    };

    if (clients.length > 0) {
      loadData();
    } else {
      setLoadingInfo(false);
    }
  }, [clients]);

  const filteredClients = clientsWithInfo.filter(client => {
    let clientName = '';
    if (client.name) {
      clientName = client.name.toLowerCase();
    } else if (client.nombres || client.primerApellido) {
      clientName = `${client.nombres || ''} ${client.primerApellido || ''}`.toLowerCase().trim();
    }
    
    const clientRfc = client.rfc ? client.rfc.toLowerCase() : '';
    const userName = client.usuario?.displayName?.toLowerCase() || '';
    
    return searchTerm === '' || 
           clientName.includes(searchTerm.toLowerCase()) || 
           clientRfc.includes(searchTerm.toLowerCase()) ||
           userName.includes(searchTerm.toLowerCase());
  });

  // Separar activos de inactivos
  const clientesActivos = filteredClients.filter(c => !c.usuario || c.usuario.isActive !== false);
  const clientesInactivos = filteredClients.filter(c => c.usuario && c.usuario.isActive === false);

  // Handler para eliminar cliente
  const handleDeleteClient = async () => {
    if (!clientToDelete || deleteConfirmText !== clientToDelete.rfc) {
      toast({
        title: "Error",
        description: "Debes escribir el RFC correctamente para confirmar la eliminación.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const result = await clientService.deleteClientAndAllData(clientToDelete.id, clientToDelete.rfc);
      
      if (result.success) {
        toast({
          title: "Cliente eliminado",
          description: `Se eliminó ${clientToDelete.name || clientToDelete.rfc} y todos sus datos relacionados.`,
        });
        
        // Llamar al callback para refrescar la lista
        if (onClientDeleted) {
          onClientDeleted();
        }
      } else {
        toast({
          title: "Eliminación parcial",
          description: `Cliente eliminado con algunos errores: ${result.errors.join(', ')}`,
          variant: "destructive",
        });
      }
      
      // Log de lo eliminado
      console.log('📊 Resumen de eliminación:', result.deletedCounts);
      
    } catch (error) {
      console.error('Error eliminando cliente:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      setDeleteConfirmText("");
    }
  };

  // Helper para obtener nombre del mes
  const getMesNombre = (mes: string) => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const num = parseInt(mes);
    return meses[num - 1] || mes;
  };

  // Helper para obtener el estado de la declaración
  const getDeclaracionStatus = (client: ClientWithInfo) => {
    if (!client.ultimaDeclaracion) {
      return { text: 'Sin declaraciones', color: 'text-gray-400', bg: 'bg-gray-100', icon: FileText };
    }
    
    const decl = client.ultimaDeclaracion;
    if (decl.clientePagoServicio === true) {
      return { text: 'Pagado', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };
    } else {
      return { text: 'Pendiente pago', color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertCircle };
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="bg-gray-100 px-7 py-2 flex flex-row items-center justify-between space-y-0 border-b border-gray-200">
        <div className="flex items-center gap-4 w-full">
          <CardTitle className="text-base">Clientes</CardTitle>

          <div className="relative max-w-[250px] flex-1">
            <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-gray-500" />
            <Input
              type="search"
              placeholder="Buscar cliente, RFC o usuario..."
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
                    <Label htmlFor="name" className="text-right">
                      Nombre*
                    </Label>
                    <Input
                      id="name"
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value.toUpperCase() })}
                      className="col-span-3 uppercase"
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
                    <Label htmlFor="usuario" className="text-right">
                      Usuario*
                    </Label>
                    <Select 
                      value={newClient.selectedUserId} 
                      onValueChange={(value) => setNewClient({ ...newClient, selectedUserId: value })}
                    >
                      <SelectTrigger id="usuario" className="col-span-3">
                        <SelectValue placeholder="Selecciona un usuario" />
                      </SelectTrigger>
                      <SelectContent>
                        {usuariosDisponibles.length === 0 ? (
                          <SelectItem value="_none" disabled>
                            No hay usuarios disponibles
                          </SelectItem>
                        ) : (
                          usuariosDisponibles.map((usuario) => (
                            <SelectItem key={usuario.uid} value={usuario.uid}>
                              {usuario.displayName || usuario.email || 'Sin nombre'}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {newClient.selectedUserId && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right text-gray-500">
                        Email
                      </Label>
                      <span className="col-span-3 text-sm text-gray-600">
                        {usuariosDisponibles.find(u => u.uid === newClient.selectedUserId)?.email || '-'}
                      </span>
                    </div>
                  )}
                  {usuariosDisponibles.length === 0 && (
                    <p className="text-xs text-amber-600 text-center">
                      Todos los usuarios ya tienen un cliente asignado
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    onClick={handleCreateClient}
                    disabled={isCreating || !newClient.name || !newClient.rfc || !newClient.selectedUserId}
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
        {isLoading || loadingInfo ? (
          <div className="overflow-auto h-[calc(100vh-140px)]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">RFC</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Usuario Asignado</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Última Declaración</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-40" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Skeleton className="h-6 w-16 rounded-full mx-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-28" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-auto h-[calc(100vh-140px)]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">RFC</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Usuario Asignado</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Última Declaración</th>
                  {isSuperAdmin && (
                    <th className="px-4 py-3 text-center font-medium text-gray-500">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                      No hay clientes
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Clientes Activos */}
                    {clientesActivos.map((client) => {
                      const status = getDeclaracionStatus(client);
                      const StatusIcon = status.icon;
                      
                      return (
                        <tr key={client.id} className="border-b hover:bg-gray-50 cursor-pointer">
                          <td className="px-4 py-3">
                            <Link href={`/dashboard/${client.id}`} className="hover:underline">
                              <div className="font-medium text-gray-900">
                                {client.name || `${client.nombres || ''} ${client.primerApellido || ''}`.trim()}
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-600 font-mono text-xs">{client.rfc}</span>
                          </td>
                          <td className="px-4 py-3">
                            {client.usuario ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-medium">
                                  {(client.usuario.displayName || client.usuario.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-sm">{client.usuario.displayName || 'Sin nombre'}</div>
                                  <div className="text-xs text-gray-500">{client.usuario.email}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Sin asignar
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {client.usuario ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-50 text-green-700">
                                <CheckCircle className="h-3 w-3" />
                                Activo
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {client.ultimaDeclaracion ? (
                              <div className="text-sm">
                                <span className="font-medium">{getMesNombre(client.ultimaDeclaracion.mes)}</span>
                                <span className="text-gray-500"> {client.ultimaDeclaracion.anio}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Sin declaraciones</span>
                            )}
                          </td>
                          {isSuperAdmin && (
                            <td className="px-4 py-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setClientToDelete(client);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {/* Separador si hay inactivos */}
                    {clientesInactivos.length > 0 && (
                      <tr className="bg-red-50 border-y-2 border-red-200">
                        <td colSpan={isSuperAdmin ? 6 : 5} className="px-4 py-2">
                          <div className="flex items-center gap-2 text-red-700 font-medium text-xs">
                            <XCircle className="h-4 w-4" />
                            Clientes Inactivos ({clientesInactivos.length})
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Clientes Inactivos - sin info de contabilidad */}
                    {clientesInactivos.map((client) => (
                      <tr key={client.id} className="border-b hover:bg-red-50/50 cursor-pointer bg-gray-50/50 opacity-70">
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/${client.id}`} className="hover:underline">
                            <div className="font-medium text-gray-600">
                              {client.name || `${client.nombres || ''} ${client.primerApellido || ''}`.trim()}
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-500 font-mono text-xs">{client.rfc}</span>
                        </td>
                        <td className="px-4 py-3">
                          {client.usuario && (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium">
                                {(client.usuario.displayName || client.usuario.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">{client.usuario.displayName || 'Sin nombre'}</div>
                                <div className="text-xs text-gray-400">{client.usuario.email}</div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-50 text-red-700">
                            <XCircle className="h-3 w-3" />
                            Inactivo
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-400 text-xs">—</td>
                        {isSuperAdmin && (
                          <td className="px-4 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setClientToDelete(client);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <CardFooter className="py-1.5 px-7 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="text-xs text-gray-500">
          {filteredClients.length} de {clients.length} clientes
        </div>
      </CardFooter>

      {/* Diálogo de confirmación para eliminar cliente */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Eliminar cliente permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Estás a punto de eliminar <strong>{clientToDelete?.name || clientToDelete?.rfc}</strong> y <strong>TODOS</strong> sus datos relacionados:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1 text-gray-600">
                <li>Todas las facturas (CFDIs)</li>
                <li>Todas las declaraciones</li>
                <li>Todos los activos fijos</li>
                <li>Todas las facturas extranjeras</li>
                <li>Todos los proveedores</li>
                <li>Todos los resúmenes fiscales</li>
                <li>Todas las solicitudes SAT</li>
                <li>Todos los archivos (FIEL, CSF, etc.)</li>
              </ul>
              <p className="text-red-600 font-medium">
                Esta acción NO se puede deshacer.
              </p>
              <div className="pt-2">
                <Label htmlFor="confirmRfc" className="text-sm font-medium">
                  Escribe el RFC para confirmar: <span className="font-mono bg-gray-100 px-1">{clientToDelete?.rfc}</span>
                </Label>
                <Input
                  id="confirmRfc"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="Escribe el RFC aquí"
                  className="mt-2 font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteConfirmText("");
                setClientToDelete(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteClient}
              disabled={isDeleting || deleteConfirmText !== clientToDelete?.rfc}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar permanentemente
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
