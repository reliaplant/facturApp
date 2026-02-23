"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { cfdiService } from "@/services/cfdi-service";
import { declaracionService } from "@/services/declaracion-service";
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
  ArrowLeft,
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
  Download,
  Eye
} from "lucide-react";
import { MiContabilidadSkeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import Link from "next/link";
import { parseLocalDate } from "@/lib/utils";

export default function VerContabilidadClientePage() {
  const { user, isAdmin, isSuperAdmin, isContador, canAccessClient } = useAuth();
  const router = useRouter();
  const params = useParams();
  const clientId = params?.clientId as string;

  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [cfdis, setCfdis] = useState<CFDI[]>([]);
  const [declaraciones, setDeclaraciones] = useState<Declaracion[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [facturasExtranjeras, setFacturasExtranjeras] = useState<FacturaExtranjera[]>([]);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [accessDenied, setAccessDenied] = useState(false);
  
  // Modal de facturas
  const [facturasModalOpen, setFacturasModalOpen] = useState(false);
  const [facturasModalType, setFacturasModalType] = useState<'emitidas' | 'recibidas' | 'anuales'>('emitidas');
  const [facturasSearchTerm, setFacturasSearchTerm] = useState('');
  
  // Modal de detalle de declaración
  const [selectedDeclaracion, setSelectedDeclaracion] = useState<Declaracion | null>(null);

  // Años disponibles para seleccionar
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  // Verificar acceso
  useEffect(() => {
    if (!loading && user) {
      // Solo admins, superadmins y contadores con acceso al cliente pueden ver
      const hasPermission = isSuperAdmin || isAdmin || (isContador && canAccessClient(clientId));
      if (!hasPermission) {
        setAccessDenied(true);
      }
    }
  }, [user, loading, isSuperAdmin, isAdmin, isContador, canAccessClient, clientId]);

  // Cargar datos del cliente
  useEffect(() => {
    const loadData = async () => {
      if (!clientId) {
        setLoading(false);
        return;
      }

      try {
        // Cargar CFDIs del cliente
        const clientCfdis = await cfdiService.getInvoices(clientId, selectedYear);
        setCfdis(clientCfdis);

        // Cargar declaraciones
        const clientDeclaraciones = await declaracionService.getDeclaraciones(clientId, selectedYear);
        setDeclaraciones(clientDeclaraciones);

        // Cargar activos fijos
        const fixedAssetService = new FixedAssetService();
        const clientAssets = await fixedAssetService.getFixedAssetsByClient(clientId);
        setFixedAssets(clientAssets.filter((a: FixedAsset) => a.status === 'active' || a.status === 'fullyDepreciated'));

        // Cargar facturas extranjeras
        const clientFacturasExtranjeras = await facturasExtranjerasService.getFacturasExtranjeras(clientId, selectedYear);
        setFacturasExtranjeras(clientFacturasExtranjeras);

        // Cargar datos del cliente
        const client = await clientService.getClientById(clientId);
        setClientData(client);
      } catch (error) {
        console.error("Error loading client data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clientId, selectedYear]);

  // Función para toggle estado de pago de declaración
  const handleTogglePago = async (declaracion: Declaracion) => {
    if (!declaracion.id || !clientId) return;
    
    setMarkingPaid(true);
    try {
      const nuevoEstado = !declaracion.clientePagoImpuestos;
      await declaracionService.updateDeclaracion(clientId, {
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
    if (!declaracionId || !clientId) return;
    
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
    const date = typeof fecha === 'string' ? parseLocalDate(fecha) : fecha;
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
    .sort((a, b) => parseLocalDate(b.fecha).getTime() - parseLocalDate(a.fecha).getTime());
  
  const ultimasEmitidas = [...facturasEmitidasList]
    .sort((a, b) => parseLocalDate(b.fecha).getTime() - parseLocalDate(a.fecha).getTime())
    .slice(0, 5);
  
  const ultimasRecibidas = todasFacturasRecibidas.slice(0, 5);

  // Buscar TODAS las declaraciones pendientes de pago (solo vigentes)
  const getDeclaracionesPendientesPago = () => {
    return declaraciones.filter(d => {
      const montoTotal = (d.montoISR || 0) + (d.montoIVA || 0);
      return d.estatus !== 'sustituida' && !d.clientePagoImpuestos && montoTotal > 0;
    }).map(declaracionPendiente => {
      const montoTotal = (declaracionPendiente.montoISR || 0) + (declaracionPendiente.montoIVA || 0);
      const mesNombre = getMesNombre(declaracionPendiente.mes);
      
      return {
        estado: 'pago_pendiente',
        mensaje: `Pendiente el pago de ${mesNombre} ${declaracionPendiente.anio}`,
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
        total: c.gravadoISR || c.subTotal || 0,
        categoria: c.categoria,
        esDeducible: c.esDeducible,
        anual: c.anual,
      }));
    }
    
    // Filtrar por búsqueda
    if (facturasSearchTerm) {
      facturas = facturas.filter(f => 
        f.nombreEmisor?.toLowerCase().includes(facturasSearchTerm.toLowerCase()) ||
        f.nombreReceptor?.toLowerCase().includes(facturasSearchTerm.toLowerCase()) ||
        f.categoria?.toLowerCase().includes(facturasSearchTerm.toLowerCase())
      );
    }
    
    return facturas;
  };

  // Nombre del cliente para mostrar
  const clientName = clientData?.name || 
    `${clientData?.nombres || ''} ${clientData?.primerApellido || ''} ${clientData?.segundoApellido || ''}`.trim() ||
    clientData?.rfc || 'Cliente';

  if (accessDenied) {
    return (
      <ProtectedRoute requiredRole="contador">
        <div className="min-h-screen flex flex-col bg-gray-50">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Denegado</h2>
              <p className="text-gray-600 mb-4">No tienes permiso para ver la contabilidad de este cliente.</p>
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Regresar
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="contador">
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Modal de Facturas */}
        <Dialog open={facturasModalOpen} onOpenChange={setFacturasModalOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {facturasModalType === 'emitidas' ? (
                  <>
                    <FileOutput className="h-5 w-5 text-violet-600" />
                    Facturas Emitidas
                  </>
                ) : facturasModalType === 'anuales' ? (
                  <>
                    <Calendar className="h-5 w-5 text-amber-600" />
                    Deducciones Personales
                  </>
                ) : (
                  <>
                    <FileInput className="h-5 w-5 text-orange-600" />
                    Facturas Recibidas
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por emisor, receptor o categoría..."
                value={facturasSearchTerm}
                onChange={(e) => setFacturasSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            
            {/* Lista de facturas */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {getFacturasForModal().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="mx-auto h-8 w-8 mb-2 text-gray-300" />
                  <p className="text-sm">No hay facturas</p>
                </div>
              ) : (
                getFacturasForModal().map((factura, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg flex items-start justify-between hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${
                          facturasModalType === 'anuales' && factura.esDeducible === false ? 'text-gray-400' : 'text-gray-900'
                        }`}>
                          {factura.tipo === 'extranjera' && factura.pais && (
                            <span className="mr-1">{getCountryFlag(factura.pais)}</span>
                          )}
                          {facturasModalType === 'emitidas' ? factura.nombreReceptor : factura.nombreEmisor}
                        </p>
                        {facturasModalType === 'recibidas' && (
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.back()}
                  className="mr-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Volver
                </Button>
                <div className="h-6 w-px bg-gray-300" />
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-violet-600" />
                  <span className="text-sm text-gray-600">Viendo como:</span>
                  <Badge variant="outline" className="font-semibold text-violet-700 border-violet-300 bg-violet-50">
                    {clientName}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/${clientId}`}>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <MiContabilidadSkeleton />
          ) : !clientData ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Cliente no encontrado</h2>
              <p className="text-gray-600">No se encontró información del cliente.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Título y selector de año */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Resumen Fiscal {selectedYear}</h2>
                  <p className="text-gray-600 mt-1">Vista de contabilidad del cliente</p>
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

              {/* Banners de pago pendiente */}
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
                          <span className="group-hover:hidden">¿Ya la pagó?</span>
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
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Cliente</p>
                        <p className="text-sm font-bold text-gray-900">{clientName}</p>
                      </div>
                      <div className="h-8 w-px bg-gray-200 hidden md:block" />
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
                </div>
              )}

              {/* Cards de Resumen */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ingresos */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openFacturasModal('emitidas')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ingresos</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(ingresos)}</p>
                        <p className="text-xs text-gray-500 mt-1">{facturasEmitidas} facturas emitidas</p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-violet-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gastos */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openFacturasModal('recibidas')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gastos</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(gastos)}</p>
                        <p className="text-xs text-gray-500 mt-1">{facturasRecibidas + facturasExtranjeras.length} facturas recibidas</p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <TrendingDown className="h-5 w-5 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Utilidad */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Utilidad</p>
                        <p className={`text-2xl font-bold mt-1 ${utilidad >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(utilidad)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {ingresos > 0 ? `${((utilidad / ingresos) * 100).toFixed(1)}% margen` : 'Sin ingresos'}
                        </p>
                      </div>
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${utilidad >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        <DollarSign className={`h-5 w-5 ${utilidad >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Declaraciones */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Declaraciones</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{declaracionesPresentadas}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {declaracionesPendientesCount > 0 ? `${declaracionesPendientesCount} pendientes` : 'Al corriente'}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* IVA e ISR */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* IVA */}
                <Card className="bg-white shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-900">Balance IVA</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">IVA Cobrado</span>
                        <span className="font-medium text-gray-900">{formatCurrency(ivaCollected)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">IVA Pagado</span>
                        <span className="font-medium text-gray-900">- {formatCurrency(ivaPagado)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between items-center">
                        <span className="font-medium text-gray-700">Balance</span>
                        <span className={`font-bold ${(ivaCollected - ivaPagado) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(ivaCollected - ivaPagado)}
                        </span>
                      </div>
                      {totalIVAAFavor > 0 && (
                        <div className="flex justify-between items-center text-sm bg-emerald-50 p-2 rounded-lg mt-2">
                          <span className="text-emerald-700">Saldo a favor acumulado</span>
                          <span className="font-medium text-emerald-700">{formatCurrency(totalIVAAFavor)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* ISR */}
                <Card className="bg-white shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-900">ISR Pagado</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">ISR retenido acumulado</span>
                        <span className="font-medium text-gray-900">{formatCurrency(totalISRPagado)}</span>
                      </div>
                      {totalISRAFavor > 0 && (
                        <div className="flex justify-between items-center text-sm bg-emerald-50 p-2 rounded-lg">
                          <span className="text-emerald-700">Saldo a favor acumulado</span>
                          <span className="font-medium text-emerald-700">{formatCurrency(totalISRAFavor)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Declaraciones presentadas */}
              {declaraciones.length > 0 && (
                <Card className="bg-white shadow-sm">
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-violet-600" />
                      Declaraciones {selectedYear}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                      {[...Array(12)].map((_, idx) => {
                        const mes = (idx + 1).toString().padStart(2, '0');
                        const declaracion = declaraciones.find(d => d.mes === mes && d.estatus === 'vigente');
                        const mesNombre = getMesNombre(mes).substring(0, 3);
                        const isPast = idx < new Date().getMonth() || selectedYear < currentYear;
                        
                        return (
                          <div
                            key={mes}
                            onClick={() => declaracion && setSelectedDeclaracion(declaracion)}
                            className={`p-2 rounded-lg text-center cursor-pointer transition-all ${
                              declaracion
                                ? declaracion.clientePagoImpuestos
                                  ? 'bg-emerald-100 hover:bg-emerald-200'
                                  : (declaracion.montoISR || 0) + (declaracion.montoIVA || 0) > 0
                                    ? 'bg-amber-100 hover:bg-amber-200'
                                    : 'bg-emerald-100 hover:bg-emerald-200'
                                : isPast
                                  ? 'bg-red-50 hover:bg-red-100'
                                  : 'bg-gray-100'
                            }`}
                          >
                            <p className="text-xs font-medium text-gray-600">{mesNombre}</p>
                            {declaracion ? (
                              <div className="mt-1">
                                {declaracion.clientePagoImpuestos ? (
                                  <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-600" />
                                ) : (declaracion.montoISR || 0) + (declaracion.montoIVA || 0) > 0 ? (
                                  <Clock className="h-4 w-4 mx-auto text-amber-600" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-600" />
                                )}
                              </div>
                            ) : isPast ? (
                              <AlertCircle className="h-4 w-4 mx-auto text-red-400 mt-1" />
                            ) : (
                              <div className="h-4 w-4 mx-auto mt-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-emerald-100"></div>
                        <span>Pagado</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-amber-100"></div>
                        <span>Pendiente de pago</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-50"></div>
                        <span>Sin declarar</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-gray-100"></div>
                        <span>Próximo</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Últimas facturas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Últimas Emitidas */}
                <Card className="bg-white shadow-sm">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <FileOutput className="h-4 w-4 text-violet-600" />
                      Últimas Emitidas
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => openFacturasModal('emitidas')}>
                      Ver todas
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {ultimasEmitidas.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">Sin facturas emitidas</p>
                    ) : (
                      <div className="space-y-2">
                        {ultimasEmitidas.map((factura, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{factura.nombreReceptor}</p>
                              <p className="text-xs text-gray-500">{formatDate(factura.fecha)}</p>
                            </div>
                            <p className="text-sm font-semibold text-violet-600 ml-2">+{formatCurrency(factura.total || 0)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Últimas Recibidas */}
                <Card className="bg-white shadow-sm">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <FileInput className="h-4 w-4 text-orange-600" />
                      Últimas Recibidas
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => openFacturasModal('recibidas')}>
                      Ver todas
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {ultimasRecibidas.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">Sin facturas recibidas</p>
                    ) : (
                      <div className="space-y-2">
                        {ultimasRecibidas.map((factura, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {factura.tipo === 'extranjera' && factura.pais && (
                                  <span>{getCountryFlag(factura.pais)}</span>
                                )}
                                <p className="text-sm font-medium text-gray-900 truncate">{factura.nombreEmisor}</p>
                              </div>
                              <p className="text-xs text-gray-500">{formatDate(factura.fecha)}</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 ml-2">-{formatCurrency(factura.total || 0)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Deducciones Anuales */}
              {facturasAnuales.length > 0 && (
                <Card className="bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => openFacturasModal('anuales')}>
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-amber-600" />
                      Deducciones Personales ({facturasAnuales.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Total deducciones</span>
                        <span className="font-semibold">{formatCurrency(deduccionesAnualesTotal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Deducciones aplicables</span>
                        <span className="font-semibold text-emerald-600">{formatCurrency(deduccionesAnualesDeducibles)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Límite según ley</span>
                        <span className="text-gray-400">{formatCurrency(limiteDeduccionesPersonales)}</span>
                      </div>
                      {deduccionesAnualesDeducibles > limiteDeduccionesPersonales && (
                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                          ⚠️ Las deducciones exceden el límite deducible
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 text-center mt-4">
                      El límite de deducciones personales es el menor entre 5 UMAs anuales o 15% de los ingresos
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

        {/* Footer */}
        <footer className="mt-auto py-4 px-6 border-t bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>© {new Date().getFullYear()} Kontia</span>
            <div className="flex gap-4">
              <a href="/terminos" target="_blank" className="hover:text-violet-600">Términos y Condiciones</a>
              <a href="/privacidad" target="_blank" className="hover:text-violet-600">Política de Privacidad</a>
            </div>
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
}
