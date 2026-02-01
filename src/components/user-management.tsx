'use client';

import React, { useState, useEffect } from 'react';
import { userService } from '@/services/firebase';
import { User, CreateUserData, UpdateUserData, UserRole, ROLE_LABELS } from '@/models/User';
import { useAuth } from '@/contexts/AuthContext';
import { userActivityService, UserActivity } from '@/services/user-activity-service';
import { clientService } from '@/services/client-service';
import { Client } from '@/models/Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Users, UserPlus, Search, Activity, Building2 } from 'lucide-react';

// Función para formatear tiempo relativo
function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'hace unos segundos';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `hace ${weeks} sem`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} mes${months > 1 ? 'es' : ''}`;
  const years = Math.floor(days / 365);
  return `hace ${years} año${years > 1 ? 's' : ''}`;
}

export default function UserManagement() {
  const { user: currentAuthUser } = useAuth();
  const isSuperAdmin = currentAuthUser?.role === 'super_admin';
  const isAdmin = currentAuthUser?.role === 'admin';
  const canEdit = isSuperAdmin || isAdmin; // Admin y Super Admin pueden editar
  const canDelete = isSuperAdmin; // Solo Super Admin puede eliminar
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [accessCounts, setAccessCounts] = useState<Record<string, number>>({});
  const [activityHistory, setActivityHistory] = useState<UserActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  // New user form state
  const [newUserData, setNewUserData] = useState<CreateUserData>({
    email: '',
    password: '',
    displayName: '',
    role: 'cliente',
    clientId: ''
  });

  // Edit user form state
  const [editUserData, setEditUserData] = useState<UpdateUserData>({
    displayName: '',
    role: 'cliente',
    isActive: true,
    clientId: ''
  });

  // Load users on component mount
  useEffect(() => {
    loadUsers();
    loadClients();
  }, []);

  // Cargar conteos de acceso para todos los usuarios
  useEffect(() => {
    const loadAccessCounts = async () => {
      const counts: Record<string, number> = {};
      for (const user of users) {
        try {
          counts[user.uid] = await userActivityService.getAccessCount(user.uid);
        } catch (error) {
          counts[user.uid] = 0;
        }
      }
      setAccessCounts(counts);
    };
    
    if (users.length > 0) {
      loadAccessCounts();
    }
  }, [users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await userService.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const clientsData = await clientService.getAllClients();
      setClients(clientsData);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  // Helper para obtener nombre del cliente por ID
  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.name || clientId;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await userService.createUser(newUserData);
      setCreateDialogOpen(false);
      setNewUserData({
        email: '',
        password: '',
        displayName: '',
        role: 'cliente',
        clientId: ''
      });
      
      await loadUsers();
      
      toast({
        title: "Éxito",
        description: "Usuario creado correctamente",
      });
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el usuario",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    try {
      setLoading(true);
      await userService.updateUser(currentUser.uid, editUserData);
      setEditDialogOpen(false);
      
      await loadUsers();
      
      toast({
        title: "Éxito",
        description: "Usuario actualizado correctamente",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el usuario",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm("¿Estás seguro que deseas eliminar este usuario?")) {
      return;
    }
    
    try {
      setLoading(true);
      await userService.deleteUser(uid);
      
      await loadUsers();
      
      toast({
        title: "Éxito",
        description: "Usuario eliminado correctamente",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setCurrentUser(user);
    setEditUserData({
      displayName: user.displayName || '',
      role: user.role,
      isActive: user.isActive,
      clientId: user.clientId || ''
    });
    setEditDialogOpen(true);
  };

  const openActivityDialog = async (user: User) => {
    setCurrentUser(user);
    setActivityDialogOpen(true);
    setLoadingActivity(true);
    try {
      const history = await userActivityService.getAccessHistory(user.uid);
      setActivityHistory(history);
    } catch (error) {
      console.error("Error loading activity history:", error);
      setActivityHistory([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  // Filtrar usuarios por búsqueda
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Color del badge según rol
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'contador': return 'bg-blue-100 text-blue-800';
      case 'cliente': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-violet-600" />
          <div>
            <h2 className="text-xl font-semibold">Usuarios</h2>
            <p className="text-sm text-gray-500">{users.length} usuarios registrados</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          {/* Add user button - Solo Super Admin */}
          {isSuperAdmin && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Agregar Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium">Correo Electrónico</label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="displayName" className="text-sm font-medium">Nombre</label>
                  <Input
                    id="displayName"
                    value={newUserData.displayName}
                    onChange={(e) => setNewUserData({...newUserData, displayName: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="role" className="text-sm font-medium">Rol</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    id="role"
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({...newUserData, role: e.target.value as UserRole})}
                  >
                    <option value="cliente">Cliente</option>
                    <option value="contador">Contador</option>
                    <option value="admin">Administrador</option>
                    <option value="super_admin">Super Administrador</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creando...' : 'Crear Usuario'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border">
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Contabilidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead>Uso</TableHead>
                {canEdit && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-medium">
                          {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{user.displayName || 'Sin nombre'}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.clientId ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-700">{getClientName(user.clientId)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'secondary'} className={user.isActive ? 'bg-green-100 text-green-800' : ''}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {user.lastLogin 
                        ? timeAgo(user.lastLogin)
                        : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-1 text-violet-600 hover:text-violet-700"
                        onClick={() => openActivityDialog(user)}
                      >
                        <Activity className="h-3 w-3" />
                        {accessCounts[user.uid] || 0} días
                      </Button>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                            Editar
                          </Button>
                          {canDelete && (
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteUser(user.uid)}>
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            {currentUser && (
              <p className="text-sm text-gray-500">{currentUser.email}</p>
            )}
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <label htmlFor="edit-displayName" className="text-sm font-medium">Nombre</label>
              <Input
                id="edit-displayName"
                value={editUserData.displayName}
                onChange={(e) => setEditUserData({...editUserData, displayName: e.target.value})}
                disabled={!isSuperAdmin}
              />
            </div>
            {isSuperAdmin && (
              <div className="grid gap-2">
                <label htmlFor="edit-role" className="text-sm font-medium">Rol</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="edit-role"
                  value={editUserData.role}
                  onChange={(e) => setEditUserData({...editUserData, role: e.target.value as UserRole})}
                >
                  <option value="cliente">Cliente</option>
                  <option value="contador">Contador</option>
                  <option value="admin">Administrador</option>
                  <option value="super_admin">Super Administrador</option>
                </select>
              </div>
            )}
            <div className="grid gap-2">
              <label htmlFor="edit-clientId" className="text-sm font-medium">Contabilidad Asignada</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="edit-clientId"
                value={editUserData.clientId || ''}
                onChange={(e) => setEditUserData({...editUserData, clientId: e.target.value || undefined})}
              >
                <option value="">Sin asignar</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.rfc})
                  </option>
                ))}
              </select>
            </div>
            {isSuperAdmin && (
              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="edit-status"
                  checked={editUserData.isActive}
                  onChange={(e) => setEditUserData({...editUserData, isActive: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="edit-status" className="text-sm font-medium">
                  Usuario activo
                </label>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activity History Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-violet-600" />
              Historial de Uso
            </DialogTitle>
            {currentUser && (
              <p className="text-sm text-gray-500">{currentUser.displayName || currentUser.email}</p>
            )}
          </DialogHeader>
          <div className="pt-2">
            {loadingActivity ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
              </div>
            ) : activityHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Sin registros de actividad</p>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityHistory.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="text-sm">
                          {new Date(activity.date).toLocaleDateString('es-MX', { 
                            weekday: 'short',
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 text-right">
                          {new Date(activity.timestamp).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}