'use client';

import React, { useState, useEffect } from 'react';
import { Payment, IVA_RATE, calcularIVA, calcularTotal, METODOS_PAGO } from '@/models/Payment';
import { paymentService } from '@/services/payment-service';
import { userService } from '@/services/firebase';
import { declaracionService } from '@/services/declaracion-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, DollarSign, Calendar, User, BarChart3, List } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface SimpleUser {
  id: string;
  displayName?: string;
  email?: string;
  clientId?: string;
  isActive?: boolean;
}

interface MesStatus {
  tieneDeclaracion: boolean;
  tienePago: boolean;
}

export default function Facturacion() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'resumen' | 'pagos'>('resumen');
  const [mesesConDeclaracion, setMesesConDeclaracion] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    userId: '',
    monto: '',
    iva: '',
    fechaPago: new Date().toISOString().split('T')[0],
    metodoPago: 'Transferencia',
    tipoServicio: '' as 'mensual' | 'anual' | 'otro' | '',
    mesesMensual: [] as string[],
    añoMensual: new Date().getFullYear().toString(),
    añoAnual: new Date().getFullYear().toString(),
    conceptoOtro: '',
    referencia: ''
  });

  const MESES = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  const AÑOS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

  // Obtener meses ya pagados para el usuario y año seleccionados
  const getMesesPagados = (): Set<string> => {
    if (!formData.userId || formData.tipoServicio !== 'mensual') return new Set();
    
    const año = parseInt(formData.añoMensual);
    const mesesPagados = new Set<string>();
    
    payments.forEach(p => {
      if (p.userId === formData.userId && 
          p.concepto?.toLowerCase().includes('mensual') &&
          p.concepto?.includes(formData.añoMensual)) {
        // Extraer los meses del concepto
        MESES.forEach(mes => {
          if (p.concepto?.includes(mes.label)) {
            mesesPagados.add(mes.value);
          }
        });
      }
    });
    
    return mesesPagados;
  };

  const mesesYaPagados = getMesesPagados();

  // Cargar declaraciones cuando cambia el usuario o año
  useEffect(() => {
    const loadDeclaraciones = async () => {
      // Limpiar si no hay usuario seleccionado
      if (!formData.userId) {
        setMesesConDeclaracion(new Set());
        return;
      }

      const selectedUser = users.find(u => u.id === formData.userId);
      console.log('Usuario seleccionado:', selectedUser);
      
      if (!selectedUser?.clientId) {
        console.log('Usuario no tiene clientId asignado');
        setMesesConDeclaracion(new Set());
        return;
      }

      try {
        console.log('Buscando declaraciones para cliente:', selectedUser.clientId, 'año:', formData.añoMensual);
        const declaraciones = await declaracionService.getDeclaraciones(
          selectedUser.clientId, 
          parseInt(formData.añoMensual)
        );
        
        console.log('Declaraciones encontradas:', declaraciones);
        
        const mesesSet = new Set<string>();
        declaraciones.forEach(d => {
          console.log('Declaración mes:', d.mes);
          // El mes se guarda como número string ("1", "2", etc.)
          // Solo agregarlo si es un número válido
          const mesNum = parseInt(d.mes);
          if (mesNum >= 1 && mesNum <= 12) {
            mesesSet.add(d.mes);
          }
        });
        console.log('Meses con declaración:', Array.from(mesesSet));
        setMesesConDeclaracion(mesesSet);
      } catch (error) {
        console.error('Error loading declaraciones:', error);
        setMesesConDeclaracion(new Set());
      }
    };

    loadDeclaraciones();
  }, [formData.userId, formData.añoMensual, formData.tipoServicio, users]);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [paymentsData, usersData] = await Promise.all([
        paymentService.getAllPayments(),
        userService.getAllUsers()
      ]);
      setPayments(paymentsData);
      
      const mappedUsers = usersData.map(u => ({ 
        id: u.uid, 
        displayName: u.displayName, 
        email: u.email,
        clientId: u.clientId,
        isActive: u.isActive
      }));
      console.log('Usuarios cargados:', mappedUsers);
      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular IVA automáticamente cuando cambia el monto
  const handleMontoChange = (value: string) => {
    const monto = parseFloat(value) || 0;
    const iva = calcularIVA(monto);
    setFormData(prev => ({
      ...prev,
      monto: value,
      iva: iva.toFixed(2)
    }));
  };

  // Registrar pago
  const handleSubmit = async () => {
    if (!formData.userId || !formData.monto || !formData.fechaPago || !formData.tipoServicio) {
      toast({
        title: 'Error',
        description: 'Completa los campos requeridos',
        variant: 'destructive'
      });
      return;
    }

    // Validar campos según tipo de servicio
    if (formData.tipoServicio === 'mensual' && formData.mesesMensual.length === 0) {
      toast({
        title: 'Error',
        description: 'Selecciona al menos un mes',
        variant: 'destructive'
      });
      return;
    }

    if (formData.tipoServicio === 'otro' && !formData.conceptoOtro) {
      toast({
        title: 'Error',
        description: 'Especifica el concepto',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const selectedUser = users.find(u => u.id === formData.userId);
      const monto = parseFloat(formData.monto);
      const iva = parseFloat(formData.iva) || 0;
      const fecha = new Date(formData.fechaPago);

      // Generar concepto según tipo
      let concepto = '';
      if (formData.tipoServicio === 'mensual') {
        const mesesLabels = formData.mesesMensual
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map(m => MESES.find(mes => mes.value === m)?.label || '')
          .join(', ');
        concepto = `Declaración mensual ${mesesLabels} ${formData.añoMensual}`;
      } else if (formData.tipoServicio === 'anual') {
        concepto = `Declaración anual ${formData.añoAnual}`;
      } else {
        concepto = formData.conceptoOtro;
      }

      const payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: formData.userId,
        userName: selectedUser?.displayName || '',
        userEmail: selectedUser?.email || '',
        monto,
        iva,
        total: calcularTotal(monto, iva),
        fechaPago: formData.fechaPago,
        mes: fecha.getMonth() + 1,
        año: fecha.getFullYear(),
        metodoPago: formData.metodoPago,
        concepto: concepto || '',
        referencia: formData.referencia || ''
      };

      console.log('Creando pago:', payment);
      const result = await paymentService.createPayment(payment);
      console.log('Pago creado:', result);
      
      toast({
        title: 'Pago registrado',
        description: `Se registró el pago de $${payment.total.toLocaleString()}`,
      });

      // Reset form y cerrar dialog
      setFormData({
        userId: '',
        monto: '',
        iva: '',
        fechaPago: new Date().toISOString().split('T')[0],
        metodoPago: 'Transferencia',
        tipoServicio: '',
        mesesMensual: [],
        añoMensual: new Date().getFullYear().toString(),
        añoAnual: new Date().getFullYear().toString(),
        conceptoOtro: '',
        referencia: ''
      });
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar el pago',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar pago
  const handleDelete = async (paymentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este pago?')) return;
    
    setDeletingId(paymentId);
    try {
      await paymentService.deletePayment(paymentId);
      toast({
        title: 'Pago eliminado',
        description: 'El pago se eliminó correctamente',
      });
      loadData();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el pago',
        variant: 'destructive'
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMM yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  // Obtener nombre del mes
  const getMonthName = (mes: number) => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months[mes - 1] || '';
  };

  // Calcular totales
  const totales = payments.reduce((acc, p) => ({
    monto: acc.monto + p.monto,
    iva: acc.iva + p.iva,
    total: acc.total + p.total
  }), { monto: 0, iva: 0, total: 0 });

  // Agrupar pagos por mes/año
  const pagosPorMes = payments.reduce((acc, payment) => {
    const key = `${payment.año}-${String(payment.mes).padStart(2, '0')}`;
    if (!acc[key]) {
      acc[key] = {
        año: payment.año,
        mes: payment.mes,
        monto: 0,
        iva: 0,
        total: 0,
        count: 0
      };
    }
    acc[key].monto += payment.monto;
    acc[key].iva += payment.iva;
    acc[key].total += payment.total;
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { año: number; mes: number; monto: number; iva: number; total: number; count: number }>);

  // Ordenar meses de más reciente a más antiguo
  const mesesOrdenados = Object.values(pagosPorMes).sort((a, b) => {
    if (a.año !== b.año) return b.año - a.año;
    return b.mes - a.mes;
  });

  // Obtener nombre completo del mes
  const getFullMonthName = (mes: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[mes - 1] || '';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-green-600" />
          <div>
            <h2 className="text-xl font-semibold">Facturación</h2>
            <p className="text-sm text-gray-500">{payments.length} pagos registrados</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Pago
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Pago</DialogTitle>
              <DialogDescription>
                Ingresa los datos del pago
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-6 py-4">
              {/* Columna izquierda - Datos del pago */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-gray-500 uppercase tracking-wide">Datos del Pago</h3>
                
                {/* Usuario */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Usuario *</label>
                  <Select 
                    value={formData.userId} 
                    onValueChange={(value) => {
                      // Limpiar meses seleccionados y tipo de servicio cuando cambia el usuario
                      setFormData(prev => ({ 
                        ...prev, 
                        userId: value,
                        mesesMensual: [],
                        tipoServicio: '' as 'mensual' | 'anual' | 'otro' | ''
                      }));
                      setMesesConDeclaracion(new Set());
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.displayName || user.email || 'Sin nombre'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Avisos generales sobre el usuario */}
                {formData.userId && (() => {
                  const selectedUser = users.find(u => u.id === formData.userId);
                  if (!selectedUser) return null;
                  
                  const hasWarnings = selectedUser.isActive === false || !selectedUser.clientId;
                  if (!hasWarnings) return null;
                  
                  return (
                    <div className="space-y-2">
                      {selectedUser.isActive === false && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                          <span className="text-lg">🚫</span>
                          <span>Este usuario está <strong>inactivo</strong>.</span>
                        </div>
                      )}
                      {!selectedUser.clientId && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 flex items-center gap-2">
                          <span className="text-lg">⚠️</span>
                          <span>Este usuario <strong>no tiene cliente asignado</strong>. No se pueden verificar declaraciones.</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Monto e IVA */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Monto (sin IVA) *</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.monto}
                      onChange={(e) => handleMontoChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">IVA (16%)</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.iva}
                      onChange={(e) => setFormData(prev => ({ ...prev, iva: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Total calculado */}
                {formData.monto && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-600">Total: </span>
                    <span className="font-bold text-green-700">
                      ${calcularTotal(parseFloat(formData.monto) || 0, parseFloat(formData.iva) || 0).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Fecha y Método */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Fecha de Pago *</label>
                    <Input
                      type="date"
                      value={formData.fechaPago}
                      onChange={(e) => setFormData(prev => ({ ...prev, fechaPago: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Método de Pago</label>
                    <Select 
                      value={formData.metodoPago} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, metodoPago: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METODOS_PAGO.map(metodo => (
                          <SelectItem key={metodo} value={metodo}>
                            {metodo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Referencia */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Referencia (opcional)</label>
                  <Input
                    placeholder="Número de transferencia o comprobante"
                    value={formData.referencia}
                    onChange={(e) => setFormData(prev => ({ ...prev, referencia: e.target.value }))}
                  />
                </div>
              </div>

              {/* Columna derecha - Concepto */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-gray-500 uppercase tracking-wide">Concepto</h3>
                
                {/* Si no hay usuario seleccionado, mostrar placeholder */}
                {!formData.userId ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400">
                    <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Primero selecciona un usuario</p>
                  </div>
                ) : (
                  <>
                    {/* Tipo de servicio */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">Corresponde a *</label>
                      <Select 
                        value={formData.tipoServicio} 
                        onValueChange={(value: 'mensual' | 'anual' | 'otro') => setFormData(prev => ({ ...prev, tipoServicio: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="¿A qué corresponde este pago?" />
                        </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensual">Declaración Mensual</SelectItem>
                      <SelectItem value="anual">Declaración Anual</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Si es mensual: selector de meses (múltiple) y año */}
                {formData.tipoServicio === 'mensual' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Año</label>
                      <Select 
                        value={formData.añoMensual} 
                        onValueChange={(value) => {
                          // Limpiar meses seleccionados cuando cambia el año
                          setFormData(prev => ({ ...prev, añoMensual: value, mesesMensual: [] }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AÑOS.map(año => (
                            <SelectItem key={año} value={año}>
                              {año}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Meses *</label>
                      
                      <div className="grid grid-cols-4 gap-1.5">
                        {MESES.map(mes => {
                          const isSelected = formData.mesesMensual.includes(mes.value);
                          const isPaid = mesesYaPagados.has(mes.value);
                          const hasDeclaracion = mesesConDeclaracion.has(mes.value);
                          const isPending = hasDeclaracion && !isPaid; // Tiene declaración pero no pago
                          
                          return (
                            <button
                              key={mes.value}
                              type="button"
                              disabled={isPaid}
                              onClick={() => {
                                if (isPaid) return;
                                setFormData(prev => ({
                                  ...prev,
                                  mesesMensual: isSelected
                                    ? prev.mesesMensual.filter(m => m !== mes.value)
                                    : [...prev.mesesMensual, mes.value]
                                }));
                              }}
                              className={`px-2 py-1.5 text-xs rounded-md border transition-colors relative ${
                                isPaid
                                  ? 'bg-green-100 text-green-600 border-green-300 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-green-600 text-white border-green-600'
                                    : isPending
                                      ? 'bg-amber-50 text-amber-700 border-amber-300 hover:border-amber-500'
                                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                              }`}
                              title={isPaid ? 'Ya pagado' : isPending ? 'Pendiente de pago' : ''}
                            >
                              {isPaid && <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center">✓</span>}
                              {isPending && !isSelected && <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center">!</span>}
                              {mes.label.substring(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Leyenda de estados */}
                      <div className="mt-3 space-y-1 text-xs">
                        {mesesYaPagados.size > 0 && (
                          <p className="text-green-600 flex items-center gap-1">
                            <span className="w-3 h-3 bg-green-100 border border-green-300 rounded text-[8px] flex items-center justify-center">✓</span>
                            Pagados: {Array.from(mesesYaPagados)
                              .sort((a, b) => parseInt(a) - parseInt(b))
                              .map(m => MESES.find(mes => mes.value === m)?.label?.substring(0, 3))
                              .join(', ')}
                          </p>
                        )}
                        {Array.from(mesesConDeclaracion).filter(m => !mesesYaPagados.has(m)).length > 0 && (
                          <p className="text-amber-600 flex items-center gap-1">
                            <span className="w-3 h-3 bg-amber-50 border border-amber-300 rounded text-[8px] flex items-center justify-center">!</span>
                            Pendientes: {Array.from(mesesConDeclaracion)
                              .filter(m => !mesesYaPagados.has(m))
                              .sort((a, b) => parseInt(a) - parseInt(b))
                              .map(m => MESES.find(mes => mes.value === m)?.label?.substring(0, 3))
                              .join(', ')}
                          </p>
                        )}
                        {formData.mesesMensual.length > 0 && (
                          <p className="text-green-700 font-medium flex items-center gap-1">
                            <span className="w-3 h-3 bg-green-600 rounded"></span>
                            Seleccionados: {formData.mesesMensual
                              .sort((a, b) => parseInt(a) - parseInt(b))
                              .map(m => MESES.find(mes => mes.value === m)?.label)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Si es anual: selector de año */}
                {formData.tipoServicio === 'anual' && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Año de la declaración *</label>
                    <Select 
                      value={formData.añoAnual} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, añoAnual: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AÑOS.map(año => (
                          <SelectItem key={año} value={año}>
                            {año}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Si es otro: campo de texto */}
                {formData.tipoServicio === 'otro' && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Especifica el concepto *</label>
                    <Input
                      placeholder="Ej: Asesoría fiscal, Contabilidad trimestral..."
                      value={formData.conceptoOtro}
                      onChange={(e) => setFormData(prev => ({ ...prev, conceptoOtro: e.target.value }))}
                    />
                  </div>
                )}

                {/* Placeholder cuando no hay tipo seleccionado */}
                {!formData.tipoServicio && (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Selecciona el tipo de servicio</p>
                  </div>
                )}
                  </>
                )}
              </div>
            </div>

            {(() => {
              // Validar formulario completo
              const isFormValid = () => {
                if (!formData.userId || !formData.monto || !formData.fechaPago || !formData.tipoServicio) {
                  return false;
                }
                if (formData.tipoServicio === 'mensual' && formData.mesesMensual.length === 0) {
                  return false;
                }
                if (formData.tipoServicio === 'otro' && !formData.conceptoOtro.trim()) {
                  return false;
                }
                return true;
              };
              
              const formIsValid = isFormValid();
              
              return (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSaving || !formIsValid}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Registrar Pago'
                    )}
                  </Button>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs de vista */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'resumen' | 'pagos')} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="resumen" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumen por Mes
          </TabsTrigger>
          <TabsTrigger value="pagos" className="gap-2">
            <List className="h-4 w-4" />
            Todos los Pagos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen por Mes */}
        <TabsContent value="resumen">
          {/* Totales generales */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-500">Subtotal Total</p>
              <p className="text-2xl font-bold">${totales.monto.toLocaleString()}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-500">IVA Total</p>
              <p className="text-2xl font-bold">${totales.iva.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600">Total Recaudado</p>
              <p className="text-2xl font-bold text-green-700">${totales.total.toLocaleString()}</p>
            </div>
          </div>

          {/* Tabla por mes */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Mes</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Año</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Pagos</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Subtotal</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">IVA</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                        <td className="px-4 py-3 text-center"><Skeleton className="h-6 w-8 rounded-full mx-auto" /></td>
                        <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                        <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                      </tr>
                    ))}
                  </>
                ) : mesesOrdenados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No hay pagos registrados
                    </td>
                  </tr>
                ) : (
                  mesesOrdenados.map((mes) => (
                    <tr key={`${mes.año}-${mes.mes}`} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{getFullMonthName(mes.mes)}</td>
                      <td className="px-4 py-3 text-gray-600">{mes.año}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {mes.count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">${mes.monto.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">${mes.iva.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">${mes.total.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab: Todos los Pagos */}
        <TabsContent value="pagos">
          {/* Resumen rápido */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-500">Subtotal</p>
              <p className="text-2xl font-bold">${totales.monto.toLocaleString()}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-500">IVA</p>
              <p className="text-2xl font-bold">${totales.iva.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600">Total</p>
              <p className="text-2xl font-bold text-green-700">${totales.total.toLocaleString()}</p>
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Mes</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Monto</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">IVA</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Método</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3">
                      <div>
                        <Skeleton className="h-4 w-28 mb-1" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-24 rounded" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3 text-center"><Skeleton className="h-6 w-6 rounded mx-auto" /></td>
                  </tr>
                ))}
              </>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No hay pagos registrados
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{payment.userName || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-500">{payment.userEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatDate(payment.fechaPago)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {getMonthName(payment.mes)} {payment.año}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">${payment.monto.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-500">${payment.iva.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    ${payment.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{payment.metodoPago || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(payment.id!)}
                      disabled={deletingId === payment.id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {deletingId === payment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
