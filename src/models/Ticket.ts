export interface Ticket {
  id: string;
  tipo: 'error' | 'mejora';
  descripcion: string;
  imagenUrl?: string;
  estatus: 'pendiente' | 'en_progreso' | 'resuelto' | 'cerrado';
  creadoPor: string; // email del usuario
  creadoPorNombre: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  notas?: string; // notas del admin
}
