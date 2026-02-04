'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SaldoFavor, SaldoFavorInput, TipoSaldoFavor } from '@/models/SaldoFavor';
import { saldoFavorService } from '@/services/saldo-favor-service';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface SaldosFavorSectionProps {
  clientId: string;
  ejercicio: number;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function SaldosFavorSection({ clientId, ejercicio }: SaldosFavorSectionProps) {
  const [saldos, setSaldos] = useState<SaldoFavor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSaldo, setEditingSaldo] = useState<SaldoFavor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saldoToDelete, setSaldoToDelete] = useState<string | null>(null);
  
  // Form state
  const [tipo, setTipo] = useState<TipoSaldoFavor>('IVA');
  const [monto, setMonto] = useState('');
  const [mesOrigen, setMesOrigen] = useState<number>(1);
  const [ejercicioOrigen, setEjercicioOrigen] = useState<number>(ejercicio);
  const [mesAplicacion, setMesAplicacion] = useState<number>(1);
  const [ejercicioAplicacion, setEjercicioAplicacion] = useState<number>(ejercicio);
  const [descripcion, setDescripcion] = useState('');

  const loadSaldos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await saldoFavorService.getSaldosFavor(clientId, ejercicio);
      setSaldos(data);
    } catch (error) {
      console.error('Error loading saldos:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, ejercicio]);

  useEffect(() => {
    loadSaldos();
  }, [loadSaldos]);

  // Calcular totales
  const { totalIVA, totalISR } = useMemo(() => {
    const iva = saldos
      .filter(s => s.tipo === 'IVA' && s.activo)
      .reduce((sum, s) => sum + (s.monto - s.montoAplicado), 0);
    
    const isr = saldos
      .filter(s => s.tipo === 'ISR' && s.activo)
      .reduce((sum, s) => sum + (s.monto - s.montoAplicado), 0);
    
    return { totalIVA: iva, totalISR: isr };
  }, [saldos]);

  const openNewModal = () => {
    setEditingSaldo(null);
    setTipo('IVA');
    setMonto('');
    setMesOrigen(1);
    setEjercicioOrigen(ejercicio);
    setMesAplicacion(2);
    setEjercicioAplicacion(ejercicio);
    setDescripcion('');
    setModalOpen(true);
  };

  const openEditModal = (saldo: SaldoFavor) => {
    setEditingSaldo(saldo);
    setTipo(saldo.tipo);
    setMonto(saldo.monto.toString());
    setMesOrigen(saldo.mesOrigen);
    setEjercicioOrigen(saldo.ejercicioOrigen || saldo.ejercicio);
    setMesAplicacion(saldo.mesAplicacion);
    setEjercicioAplicacion(saldo.ejercicioAplicacion || saldo.ejercicio);
    setDescripcion(saldo.descripcion || '');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSaldo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || parseFloat(monto) <= 0) return;

    try {
      setSubmitting(true);
      
      const input: SaldoFavorInput = {
        tipo,
        monto: parseFloat(monto),
        ejercicio,
        mesOrigen,
        ejercicioOrigen,
        mesAplicacion,
        ejercicioAplicacion,
        descripcion: descripcion.trim() || undefined,
      };

      if (editingSaldo) {
        await saldoFavorService.updateSaldoFavor(editingSaldo.id, input);
      } else {
        await saldoFavorService.createSaldoFavor(clientId, input);
      }

      closeModal();
      await loadSaldos();
    } catch (error) {
      console.error('Error saving saldo:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (id: string) => {
    setSaldoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!saldoToDelete) return;
    
    try {
      await saldoFavorService.deleteSaldoFavor(saldoToDelete);
      await loadSaldos();
    } catch (error) {
      console.error('Error deleting saldo:', error);
    } finally {
      setSaldoToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        {/* Header */}
        <div className="bg-gray-100 px-7 py-2 border-b border-gray-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium whitespace-nowrap">
              Saldos a Favor {ejercicio}
            </h2>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              IVA: {formatCurrency(totalIVA)}
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
              ISR: {formatCurrency(totalISR)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={openNewModal} 
              size="xs" 
              className="text-xs bg-black hover:bg-gray-800 text-white"
            >
              <Plus className="h-3 w-3 mr-1" /> Agregar
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="relative">
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto">
            <table className="w-full text-xs relative">
              <thead className="sticky top-0 z-20">
                <tr className="after:absolute after:content-[''] after:h-[4px] after:left-0 after:right-0 after:bottom-0 after:shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
                  <th className="pl-7 px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left w-20">Tipo</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-right w-28">Monto Original</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-right w-28">Aplicado</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-right w-28">Disponible</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center w-24">Mes Origen</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center w-28">Aplica desde</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Descripción</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Cargando...
                    </td>
                  </tr>
                ) : saldos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      No hay saldos a favor registrados
                    </td>
                  </tr>
                ) : (
                  saldos.map((saldo) => {
                    const disponible = saldo.monto - saldo.montoAplicado;
                    return (
                      <tr 
                        key={saldo.id} 
                        className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => openEditModal(saldo)}
                      >
                        <td className="pl-7 px-2 py-2">
                          <Badge 
                            variant="outline"
                            className={saldo.tipo === 'IVA' 
                              ? 'bg-blue-100 text-blue-700 border-blue-200' 
                              : 'bg-purple-100 text-purple-700 border-purple-200'
                            }
                          >
                            {saldo.tipo}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 text-right font-medium">
                          {formatCurrency(saldo.montoOriginal)}
                        </td>
                        <td className="px-2 py-2 text-right text-orange-600">
                          {formatCurrency(saldo.montoAplicado)}
                        </td>
                        <td className={`px-2 py-2 text-right font-medium ${disponible > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {formatCurrency(disponible)}
                        </td>
                        <td className="px-2 py-2 text-center text-gray-600">
                          {MESES[saldo.mesOrigen - 1]?.substring(0, 3)} {saldo.ejercicioOrigen || saldo.ejercicio}
                        </td>
                        <td className="px-2 py-2 text-center text-gray-600">
                          {MESES[saldo.mesAplicacion - 1]?.substring(0, 3)} {saldo.ejercicioAplicacion || saldo.ejercicio}
                        </td>
                        <td className="px-2 py-2 text-gray-500 truncate max-w-[200px]">
                          {saldo.descripcion || '-'}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(saldo);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(saldo.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Agregar/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingSaldo ? 'Editar Saldo a Favor' : 'Nuevo Saldo a Favor'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Tipo */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Tipo de Impuesto
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTipo('IVA')}
                  className={`flex-1 px-3 py-2 rounded border text-sm font-medium transition-all ${
                    tipo === 'IVA' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  IVA
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('ISR')}
                  className={`flex-1 px-3 py-2 rounded border text-sm font-medium transition-all ${
                    tipo === 'ISR' 
                      ? 'border-purple-500 bg-purple-50 text-purple-700' 
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  ISR
                </button>
              </div>
            </div>

            {/* Monto */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Monto a Favor
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <Input
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="pl-7 text-sm"
                  required
                />
              </div>
            </div>

            {/* Mes Origen */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Mes/Año donde se generó
              </label>
              <div className="flex gap-2">
                <Select value={mesOrigen.toString()} onValueChange={(v) => setMesOrigen(parseInt(v))}>
                  <SelectTrigger className="text-sm flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((mes, idx) => (
                      <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                        {mes}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ejercicioOrigen.toString()} onValueChange={(v) => setEjercicioOrigen(parseInt(v))}>
                  <SelectTrigger className="text-sm w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[ejercicio - 2, ejercicio - 1, ejercicio, ejercicio + 1].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mes Aplicación */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Aplica a partir de
              </label>
              <div className="flex gap-2">
                <Select value={mesAplicacion.toString()} onValueChange={(v) => setMesAplicacion(parseInt(v))}>
                  <SelectTrigger className="text-sm flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((mes, idx) => (
                      <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                        {mes}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ejercicioAplicacion.toString()} onValueChange={(v) => setEjercicioAplicacion(parseInt(v))}>
                  <SelectTrigger className="text-sm w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[ejercicio - 1, ejercicio, ejercicio + 1, ejercicio + 2].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Descripción (opcional)
              </label>
              <Input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Saldo de declaración anual 2025"
                className="text-sm"
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !monto || parseFloat(monto) <= 0}
                className="bg-black hover:bg-gray-800"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Guardando...
                  </>
                ) : editingSaldo ? (
                  'Guardar'
                ) : (
                  'Agregar'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar saldo a favor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El saldo será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
