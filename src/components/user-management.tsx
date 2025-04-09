'use client';

import React, { useState, useEffect } from 'react';
import { userService } from '@/services/firebase';
import { User, CreateUserData, UpdateUserData } from '@/models/User';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // New user form state
  const [newUserData, setNewUserData] = useState<CreateUserData>({
    email: '',
    password: '',
    displayName: '',
    role: 'user'
  });

  // Edit user form state
  const [editUserData, setEditUserData] = useState<UpdateUserData>({
    displayName: '',
    role: 'user',
    isActive: true
  });

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

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
        role: 'user'
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
      isActive: user.isActive
    });
    setEditDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestión de Usuarios</CardTitle>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>Agregar Usuario</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
                <div className="grid gap-2">
                  <label htmlFor="email">Correo Electrónico</label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="password">Contraseña</label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="displayName">Nombre</label>
                  <Input
                    id="displayName"
                    value={newUserData.displayName}
                    onChange={(e) => setNewUserData({...newUserData, displayName: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="role">Rol</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                    id="role"
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({...newUserData, role: e.target.value as 'admin' | 'user'})}
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creando...' : 'Crear Usuario'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading && users.length === 0 ? (
            <div className="text-center py-4">Cargando usuarios...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No hay usuarios registrados</TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell>{user.displayName || 'Sin nombre'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                          {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                            Editar
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.uid)}>
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <label htmlFor="edit-displayName">Nombre</label>
              <Input
                id="edit-displayName"
                value={editUserData.displayName}
                onChange={(e) => setEditUserData({...editUserData, displayName: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-role">Rol</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                id="edit-role"
                value={editUserData.role}
                onChange={(e) => setEditUserData({...editUserData, role: e.target.value as 'admin' | 'user'})}
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="edit-status">Estado</label>
              <input
                type="checkbox"
                id="edit-status"
                checked={editUserData.isActive}
                onChange={(e) => setEditUserData({...editUserData, isActive: e.target.checked})}
              />
              <span>{editUserData.isActive ? 'Activo' : 'Inactivo'}</span>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Actualizando...' : 'Actualizar Usuario'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}