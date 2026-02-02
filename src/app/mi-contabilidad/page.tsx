"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/firebase";
import { ROLE_LABELS } from "@/models/User";
import { cfdiService } from "@/services/cfdi-service";
import { declaracionService } from "@/services/declaracion-service";
import { userActivityService } from "@/services/user-activity-service";
import { FixedAssetService } from "@/services/fixed-asset-service";
import { facturasExtranjerasService } from "@/services/facturas-extranjeras-service";
import { clientService } from "@/services/client-service";
import { CFDI } from "@/models/CFDI";
import { Declaracion } from "@/models/declaracion";
import { FixedAsset } from "@/models/FixedAsset";
import { FacturaExtranjera } from "@/models/facturaManual";
import { Client } from "@/models/Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  LogOut, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Calendar,
  FileInput,
  FileOutput,
  ChevronDown,
  Loader2,
  X,
  Search,
  Package,
  Download
} from "lucide-react";

export default function MiContabilidadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [cfdis, setCfdis] = useState<CFDI[]>([]);
  const [declaraciones, setDeclaraciones] = useState<Declaracion[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [facturasExtranjeras, setFacturasExtranjeras] = useState<FacturaExtranjera[]>([]);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Modal de facturas
  const [facturasModalOpen, setFacturasModalOpen] = useState(false);
  const [facturasModalType, setFacturasModalType] = useState<'emitidas' | 'recibidas' | 'anuales'>('emitidas');
  const [facturasSearchTerm, setFacturasSearchTerm] = useState('');
  
  // Modal de detalle de declaración
  const [selectedDeclaracion, setSelectedDeclaracion] = useState<Declaracion | null>(null);

  // Años disponibles para seleccionar
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  // Registrar acceso del usuario (una vez por día)
  useEffect(() => {
    const logUserAccess = async () => {
      if (user?.uid && user?.email) {
        try {
          await userActivityService.logAccess(user.uid, user.email);
        } catch (error) {
          console.error("Error logging user access:", error);
        }
      }
    };
    logUserAccess();
  }, [user?.uid, user?.email]);

  // Cargar datos del cliente
  useEffect(() => {
    const loadData = async () => {
      if (!user?.clientId) {
        setLoading(false);
        return;
      }

      try {
        // Cargar CFDIs del cliente
        const clientCfdis = await cfdiService.getInvoices(user.clientId, selectedYear);
        setCfdis(clientCfdis);

        // Cargar declaraciones
        const clientDeclaraciones = await declaracionService.getDeclaraciones(user.clientId, selectedYear);
        setDeclaraciones(clientDeclaraciones);

        // Cargar activos fijos
        const fixedAssetService = new FixedAssetService();
        const clientAssets = await fixedAssetService.getFixedAssetsByClient(user.clientId);
        setFixedAssets(clientAssets.filter((a: FixedAsset) => a.status === 'active' || a.status === 'fullyDepreciated'));

        // Cargar facturas extranjeras
        const clientFacturasExtranjeras = await facturasExtranjerasService.getFacturasExtranjeras(user.clientId, selectedYear);
        setFacturasExtranjeras(clientFacturasExtranjeras);

        // Cargar datos del cliente
        const client = await clientService.getClientById(user.clientId);
        setClientData(client);
      } catch (error) {
        console.error("Error loading client data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.clientId, selectedYear]);

  const handleLogout = async () => {
    try {
      await userService.logoutUser();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Función para toggle estado de pago de declaración
  const handleTogglePago = async (declaracion: Declaracion) => {
    if (!declaracion.id || !user?.clientId) return;
    
    setMarkingPaid(true);
    try {
      const nuevoEstado = !declaracion.clientePagoImpuestos;
      await declaracionService.updateDeclaracion(user.clientId, {
        ...declaracion,
        clientePagoImpuestos: nuevoEstado
      });
      
      // Actualizar declaraciones localmente
      setDeclaraciones(prev => prev.map(d => 
        d.id === declaracion.id ? { ...d, clientePagoImpuestos: nuevoEstado } : d
      ));
      
      // Actualizar el modal si está abierto
      if (selectedDeclaracion?.id === declaracion.id) {
        setSelectedDeclaracion({ ...declaracion, clientePagoImpuestos: nuevoEstado });
      }
    } catch (error) {
      console.error('Error al actualizar estado de pago:', error);
    } finally {
      setMarkingPaid(false);
    }
  };

  // Función para marcar declaración como pagada (desde banner)
  const handleMarcarPagado = async (declaracionId: string | null) => {
    if (!declaracionId || !user?.clientId) return;
    
    const declaracion = declaraciones.find(d => d.id === declaracionId);
    if (declaracion) {
      await handleTogglePago(declaracion);
    }
  };

  // Calcular resúmenes
  const ingresos = cfdis
    .filter(c => !c.esEgreso && !c.estaCancelado)
    .reduce((sum, c) => sum + (c.subTotal || 0), 0);

  const gastos = cfdis
    .filter(c => c.esEgreso && !c.estaCancelado)
    .reduce((sum, c) => sum + (c.subTotal || 0), 0);

  const utilidad = ingresos - gastos;

  const ivaCollected = cfdis
    .filter(c => !c.esEgreso && !c.estaCancelado)
    .reduce((sum, c) => sum + (c.impuestoTrasladado || 0), 0);

  const ivaPagado = cfdis
    .filter(c => c.esEgreso && !c.estaCancelado)
    .reduce((sum, c) => sum + (c.impuestoTrasladado || 0), 0);

  // Deducciones anuales autorizadas
  const facturasAnuales = cfdis.filter(c => c.esEgreso && !c.estaCancelado && c.anual === true);
  const deduccionesAnualesTotal = facturasAnuales.reduce((sum, c) => sum + (c.gravadoISR || c.subTotal || 0), 0);
  const facturasAnualesDeducibles = facturasAnuales.filter(c => c.esDeducible !== false);
  const deduccionesAnualesDeducibles = facturasAnualesDeducibles.reduce((sum, c) => sum + (c.gravadoISR || c.subTotal || 0), 0);
  
  // Límite de deducciones personales (5 UMAs anuales o 15% de ingresos, lo que sea menor)
  const UMA_ANUAL = 39481.20; // UMA 2025 aproximada (108.57 * 365)
  const limiteDeduccionesPersonales = Math.min(UMA_ANUAL * 5, ingresos * 0.15);

  // Activos fijos y depreciación
  const activosActivos = fixedAssets.filter(a => a.status === 'active');
  const totalValorActivos = activosActivos.reduce((sum, a) => sum + (a.cost || 0), 0);
  const totalDepreciacionAcumulada = activosActivos.reduce((sum, a) => sum + (a.accumulatedDepreciation || 0), 0);
  const totalValorActual = activosActivos.reduce((sum, a) => sum + (a.currentValue || 0), 0);
  const depreciacionMensualTotal = activosActivos.reduce((sum, a) => sum + (a.monthlyDepreciation || 0), 0);

  const declaracionesPresentadas = declaraciones.filter(d => d.estatus === 'vigente').length;
  const declaracionesPendientesCount = Math.max(0, new Date().getMonth() + 1 - declaracionesPresentadas);

  // Contar facturas emitidas y recibidas
  const facturasEmitidas = cfdis.filter(c => !c.esEgreso && !c.estaCancelado).length;
  const facturasRecibidas = cfdis.filter(c => c.esEgreso && !c.estaCancelado).length;

  const totalISRPagado = declaraciones.reduce((sum, d) => sum + (d.montoISR || 0), 0);
  const totalIVAPagado = declaraciones.reduce((sum, d) => sum + (d.montoIVA || 0), 0);
  
  // Saldos a favor acumulados
  const totalISRAFavor = declaraciones.reduce((sum, d) => {
    // Si isrACargo es negativo, significa que hay saldo a favor
    if ((d.isrACargo || 0) < 0) {
      return sum + Math.abs(d.isrACargo || 0);
    }
    return sum;
  }, 0);
  const totalIVAAFavor = declaraciones.reduce((sum, d) => sum + (d.ivaAFavor || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const formatDate = (fecha: string | Date) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getMesNombre = (mes: string): string => {
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return meses[parseInt(mes) - 1] || "";
  };

  // Mapa de banderas por país
  const getCountryFlag = (pais: string): string => {
    const flags: Record<string, string> = {
      'Estados Unidos': '🇺🇸',
      'USA': '🇺🇸',
      'EUA': '🇺🇸',
      'Canadá': '🇨🇦',
      'Canada': '🇨🇦',
      'España': '🇪🇸',
      'Reino Unido': '🇬🇧',
      'UK': '🇬🇧',
      'Alemania': '🇩🇪',
      'Francia': '🇫🇷',
      'Italia': '🇮🇹',
      'China': '🇨🇳',
      'Japón': '🇯🇵',
      'Corea del Sur': '🇰🇷',
      'Brasil': '🇧🇷',
      'Argentina': '🇦🇷',
      'Chile': '🇨🇱',
      'Colombia': '🇨🇴',
      'Perú': '🇵🇪',
      'India': '🇮🇳',
      'Australia': '🇦🇺',
      'Países Bajos': '🇳🇱',
      'Holanda': '🇳🇱',
      'Suiza': '🇨🇭',
      'Suecia': '🇸🇪',
      'Noruega': '🇳🇴',
      'Dinamarca': '🇩🇰',
      'Irlanda': '🇮🇪',
      'Portugal': '🇵🇹',
      'Bélgica': '🇧🇪',
      'Austria': '🇦🇹',
      'Polonia': '🇵🇱',
      'Rusia': '🇷🇺',
      'Singapur': '🇸🇬',
      'Hong Kong': '🇭🇰',
      'Taiwán': '🇹🇼',
      'Israel': '🇮🇱',
      'Emiratos Árabes': '🇦🇪',
      'EAU': '🇦🇪',
    };
    return flags[pais] || '🌎';
  };

  // Facturas emitidas (ingresos) y recibidas (gastos)
  const facturasEmitidasList = cfdis.filter(c => !c.esEgreso && !c.estaCancelado);
  const facturasRecibidasList = cfdis.filter(c => c.esEgreso && !c.estaCancelado);
  
  // Convertir facturas extranjeras a un formato compatible para mostrar junto con CFDIs
  type FacturaUnificada = {
    tipo: 'cfdi' | 'extranjera';
    fecha: string;
    nombreEmisor: string;
    nombreReceptor?: string;
    total: number;
    categoria?: string;
    esDeducible?: boolean;
    anual?: boolean;
    pais?: string;
  };

  const facturasExtranjerasUnificadas: FacturaUnificada[] = facturasExtranjeras.map(f => ({
    tipo: 'extranjera' as const,
    fecha: f.fecha,
    nombreEmisor: f.emisor,
    total: f.totalMXN,
    categoria: f.categoria,
    esDeducible: f.esDeducible !== false,
    anual: false,
    pais: f.pais,
  }));

  const facturasRecibidasUnificadas: FacturaUnificada[] = facturasRecibidasList.map(c => ({
    tipo: 'cfdi' as const,
    fecha: c.fecha,
    nombreEmisor: c.nombreEmisor,
    total: c.total || 0,
    categoria: c.categoria,
    esDeducible: c.esDeducible,
    anual: c.anual,
  }));

  // Combinar y ordenar todas las facturas recibidas
  const todasFacturasRecibidas = [...facturasRecibidasUnificadas, ...facturasExtranjerasUnificadas]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  
  const ultimasEmitidas = [...facturasEmitidasList]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 5);
  
  const ultimasRecibidas = todasFacturasRecibidas.slice(0, 5);

  // Buscar TODAS las declaraciones pendientes de pago (solo vigentes)
  const getDeclaracionesPendientesPago = () => {
    // Buscar todas las declaraciones VIGENTES que no estén pagadas y tengan monto > 0
    return declaraciones.filter(d => {
      const montoTotal = (d.montoISR || 0) + (d.montoIVA || 0);
      return d.estatus !== 'sustituida' && !d.clientePagoImpuestos && montoTotal > 0;
    }).map(declaracionPendiente => {
      const montoTotal = (declaracionPendiente.montoISR || 0) + (declaracionPendiente.montoIVA || 0);
      const mesNombre = getMesNombre(declaracionPendiente.mes);
      
      return {
        estado: 'pago_pendiente',
        mensaje: `Tienes pendiente el pago de ${mesNombre} ${declaracionPendiente.anio}`,
        descripcion: `Monto a pagar: ${formatCurrency(montoTotal)}`,
        montoTotal,
        declaracionId: declaracionPendiente.id,
        urlLineaCaptura: declaracionPendiente.urlArchivoLineaCaptura,
        urlDeclaracion: declaracionPendiente.urlArchivoDeclaracion
      };
    });
  };

  const declaracionesPendientes = getDeclaracionesPendientesPago();

  // Función para abrir el modal de facturas
  const openFacturasModal = (type: 'emitidas' | 'recibidas' | 'anuales') => {
    setFacturasModalType(type);
    setFacturasSearchTerm('');
    setFacturasModalOpen(true);
  };

  // Obtener facturas según el tipo de modal
  const getFacturasForModal = (): FacturaUnificada[] => {
    let facturas: FacturaUnificada[] = [];
    
    if (facturasModalType === 'emitidas') {
      facturas = facturasEmitidasList.map(c => ({
        tipo: 'cfdi' as const,
        fecha: c.fecha,
        nombreEmisor: c.nombreEmisor,
        nombreReceptor: c.nombreReceptor,
        total: c.total || 0,
        categoria: c.categoria,
        esDeducible: c.esDeducible,
        anual: c.anual,
      }));
    } else if (facturasModalType === 'recibidas') {
      facturas = todasFacturasRecibidas;
    } else if (facturasModalType === 'anuales') {
      facturas = facturasAnuales.map(c => ({
        tipo: 'cfdi' as const,
        fecha: c.fecha,
        nombreEmisor: c.nombreEmisor,
        total: c.total || 0,
        categoria: c.categoria,
        esDeducible: c.esDeducible,
        anual: c.anual,
      }));
    }
    
    // Filtrar por búsqueda
    if (facturasSearchTerm) {
      const term = facturasSearchTerm.toLowerCase();
      facturas = facturas.filter(f => 
        (f.nombreEmisor?.toLowerCase().includes(term)) ||
        ((f as any).nombreReceptor?.toLowerCase().includes(term)) ||
        (f.categoria?.toLowerCase().includes(term)) ||
        (f.pais?.toLowerCase().includes(term))
      );
    }
    
    // Ordenar por fecha descendente
    return facturas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  };

  const modalTitle = {
    emitidas: 'Facturas Emitidas',
    recibidas: 'Facturas Recibidas', 
    anuales: 'Deducciones para Anual'
  };

  return (
    <ProtectedRoute requiredRole="cliente">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Modal de Facturas */}
        <Dialog open={facturasModalOpen} onOpenChange={setFacturasModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {facturasModalType === 'emitidas' && <FileOutput className="h-5 w-5 text-violet-600" />}
                {facturasModalType === 'recibidas' && <FileInput className="h-5 w-5 text-violet-600" />}
                {facturasModalType === 'anuales' && <Receipt className="h-5 w-5 text-violet-600" />}
                {modalTitle[facturasModalType]} {selectedYear}
              </DialogTitle>
            </DialogHeader>
            
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o categoría..."
                value={facturasSearchTerm}
                onChange={(e) => setFacturasSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            
            {/* Lista de facturas */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {getFacturasForModal().length === 0 ? (
                <p className="text-center text-gray-400 py-8">No se encontraron facturas</p>
              ) : (
                getFacturasForModal().map((factura, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {facturasModalType === 'emitidas' ? factura.nombreReceptor : factura.nombreEmisor}
                        </p>
                        {facturasModalType === 'emitidas' && factura.categoria && (
                          <span className="text-[10px] font-bold text-violet-600 uppercase flex-shrink-0">
                            {factura.categoria}
                          </span>
                        )}
                        {facturasModalType === 'recibidas' && factura.tipo === 'extranjera' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded flex-shrink-0 font-medium">
                            🌎 {factura.pais}
                          </span>
                        )}
                        {facturasModalType === 'recibidas' && (
                          factura.esDeducible === false ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded flex-shrink-0 font-medium">
                              No deducible
                            </span>
                          ) : factura.anual ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded flex-shrink-0 font-medium">
                              Deducible en la anual
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded flex-shrink-0 font-medium">
                              Deducible
                            </span>
                          )
                        )}
                        {facturasModalType === 'anuales' && (
                          factura.esDeducible === false ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded flex-shrink-0 font-medium">
                              No deducible
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded flex-shrink-0 font-medium">
                              Deducible
                            </span>
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">
                          {formatDate(factura.fecha)}
                        </p>
                        {(facturasModalType === 'recibidas' || facturasModalType === 'anuales') && factura.categoria && (
                          <span className="text-[10px] font-bold text-violet-600 uppercase">{factura.categoria}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className={`text-sm font-semibold ${
                        facturasModalType === 'emitidas' ? 'text-violet-600' : 
                        facturasModalType === 'anuales' && factura.esDeducible === false ? 'text-gray-400' :
                        'text-gray-700'
                      }`}>
                        {facturasModalType === 'emitidas' ? '+' : '-'}{formatCurrency(factura.total || 0)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Footer con total */}
            <div className="border-t pt-3 mt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{getFacturasForModal().length} facturas</span>
                <span className="font-semibold text-gray-900">
                  Total: {formatCurrency(getFacturasForModal().reduce((sum, c) => sum + (c.total || 0), 0))}
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Detalle de Declaración */}
        <Dialog open={!!selectedDeclaracion} onOpenChange={(open) => !open && setSelectedDeclaracion(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-violet-600" />
                Detalle de Declaración
              </DialogTitle>
            </DialogHeader>
            
            {selectedDeclaracion && (
              <div className="space-y-4">
                {/* Info básica */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Período</span>
                    <span className="font-semibold">{getMesNombre(selectedDeclaracion.mes)} {selectedDeclaracion.anio}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Tipo</span>
                    <Badge className={`border-0 font-normal ${
                      selectedDeclaracion.tipoDeclaracion === 'complementaria' 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-violet-100 text-violet-700'
                    }`}>
                      {selectedDeclaracion.tipoDeclaracion === 'complementaria' ? 'Complementaria' : 'Ordinaria'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Estatus</span>
                    <Badge className={`border-0 font-normal ${
                      selectedDeclaracion.estatus === 'vigente' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {selectedDeclaracion.estatus === 'vigente' ? 'Vigente' : 'Sustituida'}
                    </Badge>
                  </div>
                </div>

                {/* Montos */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">ISR</span>
                    <span>{formatCurrency(selectedDeclaracion.montoISR || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">IVA</span>
                    <span>{formatCurrency(selectedDeclaracion.montoIVA || 0)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="font-medium">Total a pagar</span>
                    <span className="font-bold text-lg">
                      {formatCurrency((selectedDeclaracion.montoISR || 0) + (selectedDeclaracion.montoIVA || 0))}
                    </span>
                  </div>
                </div>

                {/* Archivos */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Documentos</p>
                  
                  {selectedDeclaracion.urlArchivoLineaCaptura ? (
                    <a 
                      href={selectedDeclaracion.urlArchivoLineaCaptura} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Download className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-700">Línea de Captura</p>
                        <p className="text-xs text-blue-500">Click para descargar</p>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <p className="text-sm text-gray-500">Línea de captura no disponible</p>
                    </div>
                  )}

                  {selectedDeclaracion.urlArchivoDeclaracion ? (
                    <a 
                      href={selectedDeclaracion.urlArchivoDeclaracion} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Download className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-700">Acuse de Declaración</p>
                        <p className="text-xs text-blue-500">Click para descargar</p>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <p className="text-sm text-gray-500">Acuse no disponible</p>
                    </div>
                  )}
                </div>

                {/* Botón de pago */}
                {(selectedDeclaracion.montoISR || 0) + (selectedDeclaracion.montoIVA || 0) > 0 && (
                  <Button
                    onClick={() => handleTogglePago(selectedDeclaracion)}
                    disabled={markingPaid}
                    className={`w-full ${
                      selectedDeclaracion.clientePagoImpuestos
                        ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {markingPaid ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : selectedDeclaracion.clientePagoImpuestos ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Marcar como no pagada
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar como pagada
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h1 className="font-bold text-gray-900 dark:text-white text-xl">
                  kontIA.
                </h1>
                <span className="text-gray-400">|</span>
                <span className="text-sm text-gray-600">Mi Contabilidad</span>
              </div>
              
              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                      {user?.displayName || user?.email || 'Usuario'}
                    </div>
                    <div className="h-9 w-9 rounded-full bg-violet-700 flex items-center justify-center text-white text-sm font-medium hover:bg-violet-600 transition-colors">
                      {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.displayName || 'Usuario'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
          ) : !user?.clientId ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Cuenta no vinculada</h2>
              <p className="text-gray-600">Tu cuenta aún no está vinculada a un expediente fiscal. Contacta a tu contador.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Título y selector de año */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Resumen Fiscal {selectedYear}</h2>
                  <p className="text-gray-600 mt-1">Vista general de tu situación contable</p>
                </div>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent cursor-pointer"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Banners de pago pendiente - uno por cada declaración pendiente */}
              {declaracionesPendientes.map((pendiente, index) => (
                <div key={pendiente.declaracionId || index} className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-emerald-700">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-600">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{pendiente.mensaje}</p>
                      <p className="text-sm text-emerald-100">{pendiente.descripcion}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
                    {pendiente.urlLineaCaptura && (
                      <a
                        href={pendiente.urlLineaCaptura}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Línea de Captura
                      </a>
                    )}
                    {pendiente.urlDeclaracion && (
                      <a
                        href={pendiente.urlDeclaracion}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Declaración
                      </a>
                    )}
                    <Button
                      onClick={() => handleMarcarPagado(pendiente.declaracionId || null)}
                      disabled={markingPaid}
                      className="bg-white hover:bg-emerald-50 text-emerald-700 group"
                    >
                      {markingPaid ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <span className="group-hover:hidden">¿Ya la pagaste?</span>
                          <span className="hidden group-hover:inline">Marcar como pagada</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}

              {/* Banner de información fiscal */}
              {clientData && (
                <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                  {/* Header con datos principales */}
                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">RFC</p>
                        <p className="text-sm font-bold text-gray-900">{clientData.rfc}</p>
                      </div>
                      <div className="h-8 w-px bg-gray-200 hidden md:block" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">CURP</p>
                        <p className="text-sm font-semibold text-gray-900">{clientData.curp || '—'}</p>
                      </div>
                      <div className="h-8 w-px bg-gray-200 hidden md:block" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Régimen Fiscal</p>
                        <p className="text-sm font-semibold text-gray-900 truncate" title={clientData.regimenesFiscales?.[0]?.regimen}>
                          {clientData.regimenesFiscales?.[0]?.regimen || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Domicilio fiscal + Botones de descarga */}
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      {/* Domicilio */}
                      <div className="flex-1">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Domicilio Fiscal</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                          <div>
                            <span className="text-gray-500">Vialidad:</span>{' '}
                            <span className="text-gray-900 font-medium">{clientData.address?.nombreVialidad || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">No. Ext:</span>{' '}
                            <span className="text-gray-900 font-medium">{clientData.address?.numeroExterior || 'S/N'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">No. Int:</span>{' '}
                            <span className="text-gray-900 font-medium">{clientData.address?.numeroInterior || '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Colonia:</span>{' '}
                            <span className="text-gray-900 font-medium">{clientData.address?.nombreColonia || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">C.P.:</span>{' '}
                            <span className="text-gray-900 font-medium">{clientData.address?.codigoPostal || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Municipio:</span>{' '}
                            <span className="text-gray-900 font-medium">{clientData.address?.municipio || 'N/A'}</span>
                          </div>
                          <div className="col-span-2 md:col-span-3">
                            <span className="text-gray-500">Estado:</span>{' '}
                            <span className="text-gray-900 font-medium">{clientData.address?.nombreEntidadFederativa || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Botones de descarga */}
                      <div className="flex flex-col gap-2 lg:flex-shrink-0">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Documentos SAT</p>
                        <div className="flex gap-2">
                          <a
                            href="https://www.sat.gob.mx/aplicacion/53027/genera-tu-constancia-de-situacion-fiscal"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors group"
                          >
                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1 py-0.5 rounded">PDF</span>
                            <span className="text-xs font-medium text-gray-700">CSF</span>
                            <Download className="h-3 w-3 text-gray-400 group-hover:text-red-600" />
                          </a>
                          <a
                            href="https://www.sat.gob.mx/aplicacion/operacion/66288/consulta-tu-opinion-de-cumplimiento-de-obligaciones-fiscales"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors group"
                          >
                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1 py-0.5 rounded">PDF</span>
                            <span className="text-xs font-medium text-gray-700">Opinión 32-D</span>
                            <Download className="h-3 w-3 text-gray-400 group-hover:text-red-600" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Primera fila: Declaraciones + Resumen Fiscal */}
              <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
                {/* Estado de declaraciones */}
                <Card className="bg-white shadow-sm flex-1">
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-violet-600" />
                      Estado de Declaraciones {selectedYear}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    {declaraciones.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No hay declaraciones registradas</p>
                    ) : (
                      <div className="space-y-2">
                        {declaraciones.map(decl => {
                          const montoTotal = (decl.montoISR || 0) + (decl.montoIVA || 0);
                          const esSustituida = decl.estatus === 'sustituida';
                          
                          return (
                            <div 
                              key={decl.id} 
                              className={`flex items-center justify-between py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                                esSustituida ? 'opacity-50' : ''
                              }`}
                              onClick={() => setSelectedDeclaracion(decl)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-medium ${esSustituida ? 'text-gray-500' : 'text-gray-900'}`}>
                                    {getMesNombre(decl.mes)} {decl.anio}
                                  </p>
                                  <span className={`text-[10px] font-bold uppercase ${
                                    esSustituida ? 'text-red-500' : 'text-violet-600'
                                  }`}>
                                    {decl.tipoDeclaracion === 'complementaria' ? 'Compl.' : 'Ord.'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400">
                                  {esSustituida ? 'Sustituida' : (decl.clientePagoImpuestos ? 'Pagada' : 'Pendiente de pago')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${
                                  esSustituida ? 'text-gray-400 line-through' : 
                                  decl.clientePagoImpuestos ? 'text-emerald-600' : 'text-amber-600'
                                }`}>
                                  {formatCurrency(montoTotal)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Resumen Fiscal */}
                <div className="flex-1 flex flex-col gap-4 justify-between">
                  {/* Cards de resumen 2x2 */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Ingresos */}
                    <Card className="bg-white shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500">Ingresos</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(ingresos)}</p>
                            <p className="text-xs text-gray-400 mt-1">Total facturado {selectedYear}</p>
                          </div>
                          <div className="h-10 w-10 bg-violet-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-violet-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Gastos */}
                    <Card className="bg-white shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500">Gastos</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(gastos)}</p>
                            <p className="text-xs text-gray-400 mt-1">Total deducible {selectedYear}</p>
                          </div>
                          <div className="h-10 w-10 bg-violet-100 rounded-lg flex items-center justify-center">
                            <TrendingDown className="h-5 w-5 text-violet-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Utilidad */}
                    <Card className="bg-white shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500">Utilidad</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(utilidad)}</p>
                            <p className="text-xs text-gray-400 mt-1">Ingresos - Gastos</p>
                          </div>
                          <div className="h-10 w-10 bg-violet-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-violet-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Declaraciones */}
                    <Card className="bg-white shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500">Declaraciones</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">{declaracionesPresentadas}</p>
                            <p className="text-xs text-gray-400 mt-1">Presentadas {selectedYear}</p>
                          </div>
                          <div className="h-10 w-10 bg-violet-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-violet-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Impuestos Pagados */}
                  <Card className="bg-white shadow-sm flex-1 flex flex-col">
                    <CardHeader className="p-5 pb-3">
                      <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-violet-600" />
                        Impuestos {selectedYear}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 space-y-3 flex-1 flex flex-col justify-center">
                      {/* ISR */}
                      <div className="p-4 bg-violet-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700">ISR (Impuesto sobre la Renta)</p>
                          <div className="h-8 w-8 bg-violet-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-violet-600" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500">Pagado</p>
                            <p className="text-base font-bold text-gray-900">{formatCurrency(totalISRPagado)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">A Favor</p>
                            <p className="text-base font-bold text-emerald-600">{formatCurrency(totalISRAFavor)}</p>
                          </div>
                        </div>
                      </div>
                      {/* IVA */}
                      <div className="p-4 bg-violet-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700">IVA (Impuesto al Valor Agregado)</p>
                          <div className="h-8 w-8 bg-violet-100 rounded-lg flex items-center justify-center">
                            <Receipt className="h-4 w-4 text-violet-600" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500">Pagado</p>
                            <p className="text-base font-bold text-gray-900">{formatCurrency(totalIVAPagado)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">A Favor</p>
                            <p className="text-base font-bold text-emerald-600">{formatCurrency(totalIVAAFavor)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Segunda fila: Facturas Emitidas y Recibidas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Últimas facturas emitidas */}
                <Card className="bg-white shadow-sm">
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <FileOutput className="h-4 w-4 text-violet-600" />
                      Últimas Facturas Emitidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    {ultimasEmitidas.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No hay facturas emitidas</p>
                    ) : (
                      <div className="space-y-2">
                        {ultimasEmitidas.map((cfdi, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {cfdi.nombreReceptor}
                                </p>
                                {cfdi.categoria && (
                                  <span className="text-[10px] font-bold text-violet-600 uppercase truncate max-w-[80px]">
                                    {cfdi.categoria}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">
                                {formatDate(cfdi.fecha)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-violet-600">
                                +{formatCurrency(cfdi.total || 0)}
                              </p>
                            </div>
                          </div>
                        ))}
                        {facturasEmitidasList.length > 5 && (
                          <p 
                            onClick={() => openFacturasModal('emitidas')}
                            className="text-xs text-violet-600 text-center pt-2 cursor-pointer hover:underline"
                          >
                            Ver las {facturasEmitidasList.length} existentes
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Últimas facturas recibidas */}
                <Card className="bg-white shadow-sm">
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <FileInput className="h-4 w-4 text-violet-600" />
                      Últimas Facturas Recibidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    {ultimasRecibidas.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No hay facturas recibidas</p>
                    ) : (
                      <div className="space-y-2">
                        {ultimasRecibidas.map((factura, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {factura.nombreEmisor}
                                </p>
                                {factura.tipo === 'extranjera' && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                                    {factura.pais ? getCountryFlag(factura.pais) : '🌎'} Fact. Extranjera
                                  </span>
                                )}
                                {factura.esDeducible === false ? (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium">
                                    No deducible
                                  </span>
                                ) : factura.anual ? (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded font-medium">
                                    Deducible en la anual
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                                    Deducible
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-gray-400">
                                  {formatDate(factura.fecha)}
                                </p>
                                {factura.categoria && (
                                  <span className="text-[10px] font-bold text-violet-600 uppercase">{factura.categoria}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-600">
                                -{formatCurrency(factura.total || 0)}
                              </p>
                            </div>
                          </div>
                        ))}
                        {todasFacturasRecibidas.length > 5 && (
                          <p 
                            onClick={() => openFacturasModal('recibidas')}
                            className="text-xs text-violet-600 text-center pt-2 cursor-pointer hover:underline"
                          >
                            Ver las {todasFacturasRecibidas.length} existentes
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Deducciones Anuales - Al final */}
              {facturasAnuales.length > 0 && (
                <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 shadow-sm">
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-violet-600" />
                      Deducciones Personales para Anual {selectedYear}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-4">
                    {/* Resumen */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">Facturas anuales</p>
                        <p className="text-xl font-bold text-gray-900">{facturasAnuales.length}</p>
                        <p className="text-xs text-gray-400">{facturasAnualesDeducibles.length} deducibles</p>
                      </div>
                      <div className="bg-white rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">Total deducible</p>
                        <p className="text-xl font-bold text-violet-600">{formatCurrency(deduccionesAnualesDeducibles)}</p>
                        <p className="text-xs text-gray-400">De {formatCurrency(deduccionesAnualesTotal)} total</p>
                      </div>
                      <div className="bg-white rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">Límite autorizado</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(limiteDeduccionesPersonales)}</p>
                        <p className="text-xs text-gray-400">
                          {deduccionesAnualesDeducibles <= limiteDeduccionesPersonales 
                            ? '✓ Dentro del límite' 
                            : `⚠️ Excede por ${formatCurrency(deduccionesAnualesDeducibles - limiteDeduccionesPersonales)}`}
                        </p>
                      </div>
                    </div>

                    {/* Listado de facturas anuales */}
                    <div className="bg-white rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-gray-700">Detalle de deducciones</p>
                        {facturasAnuales.length > 5 && (
                          <p 
                            onClick={() => openFacturasModal('anuales')}
                            className="text-xs text-violet-600 cursor-pointer hover:underline"
                          >
                            Ver todas ({facturasAnuales.length})
                          </p>
                        )}
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {facturasAnuales
                          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                          .slice(0, 5)
                          .map((cfdi, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {cfdi.nombreEmisor}
                                </p>
                                {cfdi.esDeducible === false ? (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded flex-shrink-0">
                                    No deducible
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded flex-shrink-0">
                                    Deducible
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">
                                {formatDate(cfdi.fecha)} • {cfdi.categoria || 'Sin categoría'}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <p className={`text-sm font-semibold ${cfdi.esDeducible === false ? 'text-gray-400' : 'text-violet-600'}`}>
                                {formatCurrency(cfdi.gravadoISR || cfdi.subTotal || 0)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {facturasAnuales.length > 5 && (
                        <p 
                          onClick={() => openFacturasModal('anuales')}
                          className="text-xs text-violet-600 text-center pt-3 cursor-pointer hover:underline"
                        >
                          Ver las {facturasAnuales.length} deducciones
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 text-center">
                      El límite de deducciones personales es el menor entre 5 UMAs anuales o 15% de tus ingresos
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Activos Fijos */}
              {fixedAssets.length > 0 && (
                <Card className="bg-white shadow-sm">
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="h-4 w-4 text-violet-600" />
                      Activos Fijos ({activosActivos.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Activo</th>
                            <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Valor Original</th>
                            <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Valor Deducible</th>
                            <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Deducido</th>
                            <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Dep. Mensual</th>
                            <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">Inicio</th>
                            <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">Fin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activosActivos.map((asset, idx) => {
                            // Calcular fecha de fin de depreciación
                            const startDate = new Date(asset.depreciationStartDate || asset.purchaseDate);
                            const endDate = new Date(startDate);
                            endDate.setMonth(endDate.getMonth() + (asset.usefulLifeMonths || 0));
                            
                            return (
                              <tr key={idx} className="border-b border-gray-100 last:border-0">
                                <td className="py-3">
                                  <p className="font-medium text-gray-900">{asset.name}</p>
                                  <p className="text-xs text-violet-600 font-bold uppercase">{asset.type}</p>
                                </td>
                                <td className="py-3 text-right text-gray-900">
                                  {formatCurrency(asset.cost || 0)}
                                </td>
                                <td className="py-3 text-right text-gray-900">
                                  {formatCurrency(asset.deductibleValue || asset.cost - (asset.residualValue || 0))}
                                </td>
                                <td className="py-3 text-right text-emerald-600 font-medium">
                                  {formatCurrency(asset.accumulatedDepreciation || 0)}
                                </td>
                                <td className="py-3 text-right text-violet-600 font-medium">
                                  {formatCurrency(asset.monthlyDepreciation || 0)}
                                </td>
                                <td className="py-3 text-center text-gray-500 text-xs">
                                  {formatDate(asset.depreciationStartDate || asset.purchaseDate)}
                                </td>
                                <td className="py-3 text-center text-gray-500 text-xs">
                                  {formatDate(endDate.toISOString())}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
