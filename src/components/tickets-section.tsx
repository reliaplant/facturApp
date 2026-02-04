'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Ticket } from '@/models/Ticket';
import { ticketService } from '@/services/ticket-service';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Bug, 
  Lightbulb, 
  Plus, 
  X, 
  Image as ImageIcon, 
  Trash2,
  Pencil,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function TicketsSection() {
  const { user, isSuperAdmin } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [tipo, setTipo] = useState<'error' | 'mejora'>('error');
  const [descripcion, setDescripcion] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [estatus, setEstatus] = useState<Ticket['estatus']>('pendiente');
  const [notas, setNotas] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar tickets
  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketService.getTickets();
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Abrir modal para nuevo ticket
  const openNewTicketModal = () => {
    setEditingTicket(null);
    setTipo('error');
    setDescripcion('');
    setEstatus('pendiente');
    setNotas('');
    removeImage();
    setModalOpen(true);
  };

  // Abrir modal para editar ticket (solo super admin)
  const openEditTicketModal = (ticket: Ticket) => {
    if (!isSuperAdmin) return;
    setEditingTicket(ticket);
    setTipo(ticket.tipo);
    setDescripcion(ticket.descripcion);
    setEstatus(ticket.estatus);
    setNotas(ticket.notas || '');
    setImagePreview(ticket.imagenUrl || null);
    setImageFile(null);
    setModalOpen(true);
  };

  // Cerrar modal
  const closeModal = () => {
    setModalOpen(false);
    setEditingTicket(null);
    removeImage();
  };

  // Manejar paste de imagen (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!modalOpen) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            setImageFile(blob);
            const url = URL.createObjectURL(blob);
            setImagePreview(url);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [modalOpen]);

  // Manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  // Eliminar imagen
  const removeImage = () => {
    setImageFile(null);
    if (imagePreview && !imagePreview.startsWith('http')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Enviar ticket (crear o actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) return;

    try {
      setSubmitting(true);
      
      if (editingTicket) {
        // Actualizar ticket existente (solo estatus y notas)
        await ticketService.updateTicketStatus(editingTicket.id, estatus, notas);
      } else {
        // Crear nuevo ticket
        await ticketService.createTicket(
          {
            tipo,
            descripcion: descripcion.trim(),
            creadoPor: user?.email || 'anónimo',
            creadoPorNombre: user?.displayName || user?.email || 'Usuario',
          },
          imageFile || undefined
        );
      }

      closeModal();
      await loadTickets();
    } catch (error) {
      console.error('Error saving ticket:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar ticket (solo super admin)
  const handleDelete = async (ticketId: string) => {
    if (!isSuperAdmin) return;
    if (!confirm('¿Eliminar este ticket?')) return;
    
    try {
      await ticketService.deleteTicket(ticketId);
      await loadTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
    }
  };

  const getStatusColor = (estatus: Ticket['estatus']) => {
    switch (estatus) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'en_progreso': return 'bg-blue-100 text-blue-800';
      case 'resuelto': return 'bg-green-100 text-green-800';
      case 'cerrado': return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (estatus: Ticket['estatus']) => {
    switch (estatus) {
      case 'pendiente': return 'Pendiente';
      case 'en_progreso': return 'En progreso';
      case 'resuelto': return 'Resuelto';
      case 'cerrado': return 'Cerrado';
    }
  };

  const getTipoIcon = (tipo: Ticket['tipo']) => {
    if (tipo === 'error') {
      return <Bug className="w-4 h-4 text-red-500" />;
    }
    return <Lightbulb className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
            <p className="text-sm text-gray-500">Reporta errores o sugiere mejoras</p>
          </div>
          <Button
            onClick={openNewTicketModal}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Ticket
          </Button>
        </div>

        {/* Tabla de tickets */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border rounded-lg">
            <Bug className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay tickets registrados</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[80px]">Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[100px]">Estatus</TableHead>
                  <TableHead className="w-[120px]">Creado por</TableHead>
                  <TableHead className="w-[140px]">Fecha</TableHead>
                  <TableHead className="w-[60px]">Img</TableHead>
                  {isSuperAdmin && <TableHead className="w-[80px]">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow 
                    key={ticket.id} 
                    className={`hover:bg-gray-50 ${isSuperAdmin ? 'cursor-pointer' : ''}`}
                    onClick={() => isSuperAdmin && openEditTicketModal(ticket)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTipoIcon(ticket.tipo)}
                        <span className="text-xs capitalize">{ticket.tipo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm line-clamp-2">{ticket.descripcion}</p>
                      {ticket.notas && (
                        <p className="text-xs text-blue-600 mt-1">Nota: {ticket.notas}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.estatus)}`}>
                        {getStatusLabel(ticket.estatus)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-600">{ticket.creadoPorNombre}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500">
                        {format(new Date(ticket.createdAt), "d MMM yy, HH:mm", { locale: es })}
                      </span>
                    </TableCell>
                    <TableCell>
                      {ticket.imagenUrl && (
                        <a 
                          href={ticket.imagenUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditTicketModal(ticket);
                            }}
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(ticket.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Modal para crear/editar ticket */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingTicket ? 'Editar Ticket' : 'Nuevo Ticket'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => !editingTicket && setTipo('error')}
                    disabled={!!editingTicket}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                      tipo === 'error' 
                        ? 'border-red-500 bg-red-50 text-red-700' 
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    } ${editingTicket ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <Bug className="w-4 h-4" />
                    Error
                  </button>
                  <button
                    type="button"
                    onClick={() => !editingTicket && setTipo('mejora')}
                    disabled={!!editingTicket}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                      tipo === 'mejora' 
                        ? 'border-amber-500 bg-amber-50 text-amber-700' 
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    } ${editingTicket ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <Lightbulb className="w-4 h-4" />
                    Mejora
                  </button>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe el problema o mejora... (Ctrl+V para pegar imagen)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                  required
                  disabled={!!editingTicket}
                />
              </div>

              {/* Imagen (solo para nuevos tickets) */}
              {!editingTicket && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Captura (opcional)
                  </label>
                  
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-32 rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-purple-400 transition-colors"
                    >
                      <ImageIcon className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                      <p className="text-xs text-gray-500">
                        Clic o <strong>Ctrl+V</strong>
                      </p>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {/* Imagen existente (solo mostrar en edición) */}
              {editingTicket && editingTicket.imagenUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Captura adjunta
                  </label>
                  <a 
                    href={editingTicket.imagenUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <img 
                      src={editingTicket.imagenUrl} 
                      alt="Captura" 
                      className="max-h-32 rounded-lg border border-gray-200 hover:opacity-90"
                    />
                  </a>
                </div>
              )}

              {/* Estatus (solo super admin en edición) */}
              {editingTicket && isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estatus
                  </label>
                  <select
                    value={estatus}
                    onChange={(e) => setEstatus(e.target.value as Ticket['estatus'])}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En progreso</option>
                    <option value="resuelto">Resuelto</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                </div>
              )}

              {/* Notas (solo super admin en edición) */}
              {editingTicket && isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas (visibles para todos)
                  </label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Agregar notas sobre el ticket..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !descripcion.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : editingTicket ? (
                    'Guardar cambios'
                  ) : (
                    'Crear Ticket'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
