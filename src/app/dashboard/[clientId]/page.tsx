"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploader } from "@/components/file-uploader";
import { IncomesTable } from "@/components/incomes-table";
import { ExpensesTable } from "@/components/expenses-table";
import { FiscalSummary } from "@/components/fiscal-summary";
import { YearSelector } from "@/components/year-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, RefreshCw, FileUp, ChevronDown, ChevronUp } from "lucide-react";
import { Invoice, calculateTotalIncomesByYear, calculateTotalExpensesByYear } from "@/models/Invoice";
import { processCFDIFiles } from "@/services/cfdi-parser";
import { v4 as uuidv4 } from "uuid";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TaxDeclarationsTable } from "@/components/tax-declarations-table";
import { getMonthName } from "@/models/TaxDeclaration";
import { Client } from "@/models/Client";
import { clientService } from "@/services/client-service";

export default function ClientDashboard() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showUploader, setShowUploader] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("fiscal");
  const { toast } = useToast();

  // Load client data
  useEffect(() => {
    const fetchClient = async () => {
      try {
        const clientData = await clientService.getClientById(clientId);

        // If we can't find the client in Firestore, try using mock data for development
        if (!clientData) {
          const mockClients = clientService.getMockClients();
          const mockClient = mockClients.find(c => c.id === clientId);
          if (mockClient) {
            setClient(mockClient);
          } else {
            toast({
              title: "Error",
              description: "No se encontró el cliente solicitado.",
              variant: "destructive",
            });
          }
        } else {
          setClient(clientData);
        }
      } catch (error) {
        console.error("Error loading client:", error);
        // Fallback to mock client data if there's an error
        const mockClients = clientService.getMockClients();
        const mockClient = mockClients.find(c => c.id === clientId);
        if (mockClient) {
          setClient(mockClient);
        }

        toast({
          title: "Error de conexión",
          description: "Se está usando información de ejemplo mientras se restablece la conexión.",
          variant: "destructive",
        });
      }
    };

    fetchClient();
  }, [clientId, toast]);

  // Calcular datos fiscales basados en las facturas
  const fiscalData = {
    incomes: calculateTotalIncomesByYear(invoices, selectedYear),
    expenses: calculateTotalExpensesByYear(invoices, selectedYear),
    incomesCount: invoices.filter(
      inv =>
        new Date(inv.date).getFullYear() === selectedYear &&
        inv.cfdiType === "I" &&
        !inv.isCancelled
    ).length,
    expensesCount: invoices.filter(
      inv =>
        new Date(inv.date).getFullYear() === selectedYear &&
        inv.cfdiType === "E" &&
        !inv.isCancelled
    ).length,
    get taxableIncome() {
      return this.incomes - this.expenses;
    },
  };

  const handleFileUpload = async (files: File[]) => {
    if (!client) return;

    setIsLoading(true);
    try {
      console.log(
        `Procesando ${files.length} archivos para el cliente ${client.name} (RFC: ${client.rfc})`
      );

      // Para debugging - mostramos los nombres de los archivos
      files.forEach((file, index) => {
        console.log(`Archivo ${index + 1}: ${file.name}, Tamaño: ${file.size} bytes`);
      });

      // Procesar los archivos XML utilizando el servicio real
      const processedInvoices = await processCFDIFiles(files, clientId, client.rfc);

      console.log(`Resultado del procesamiento: ${processedInvoices.length} facturas`);
      if (processedInvoices.length > 0) {
        // Mostrar detalles de las facturas procesadas para debugging
        processedInvoices.forEach((inv, idx) => {
          console.log(`Factura ${idx + 1}: Tipo=${inv.cfdiType}, Total=${inv.total}, UUID=${inv.uuid}`);
        });

        console.log(`Facturas procesadas: ${processedInvoices.length} total`);
        console.log(`Recibidas: ${processedInvoices.filter(inv => inv.cfdiType === "I").length}`);
        console.log(`Emitidas: ${processedInvoices.filter(inv => inv.cfdiType === "E").length}`);

        // Añadir las nuevas facturas al estado actual
        setInvoices(prevInvoices => {
          // Verificar que no existan facturas duplicadas por UUID
          const uuids = new Set(prevInvoices.map(inv => inv.uuid));
          const uniqueNewInvoices = processedInvoices.filter(inv => !uuids.has(inv.uuid));

          console.log(`Se agregarán ${uniqueNewInvoices.length} facturas nuevas a la lista`);

          // Mostrar resumen de facturas únicas
          const newRecibidas = uniqueNewInvoices.filter(inv => inv.cfdiType === "I").length;
          const newEmitidas = uniqueNewInvoices.filter(inv => inv.cfdiType === "E").length;
          console.log(`Nuevas recibidas: ${newRecibidas}, Nuevas emitidas: ${newEmitidas}`);

          return [...prevInvoices, ...uniqueNewInvoices];
        });

        toast({
          title: "Archivos cargados correctamente",
          description: `Se han procesado ${processedInvoices.length} factura(s) CFDI.`,
        });
      } else {
        console.warn("No se procesaron facturas correctamente");
        toast({
          title: "Aviso",
          description: "No se pudieron procesar facturas válidas de los archivos seleccionados.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error procesando archivos:", error);
      toast({
        title: "Error al cargar archivos",
        description: "Ocurrió un error al procesar los archivos XML.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      // En un caso real, aquí consultarías facturas desde una API o base de datos
      // Para este ejemplo, solo simulamos una actualización
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Datos actualizados",
        description: "La información fiscal ha sido actualizada correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error al actualizar",
        description: "No se pudieron actualizar los datos fiscales.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadExampleData = () => {
    if (!client) return;

    const currentYear = new Date().getFullYear();
    const exampleInvoices: Invoice[] = [
      // Facturas recibidas
      {
        id: uuidv4(),
        uuid: uuidv4(),
        date: `${currentYear}-01-15`,
        cfdiType: "I",
        paymentMethod: "PUE",
        paymentForm: "01",
        cfdiUsage: "G03",
        fiscalYear: currentYear,
        fiscalRegime: "621",
        subtotal: 10000,
        total: 11600,
        tax: 1600,
        issuerRfc: client.rfc,
        issuerName: client.name,
        receiverRfc: "XAXX010101000",
        receiverName: "Cliente de Ejemplo",
        concepts: [
          {
            id: uuidv4(),
            description: "Servicios profesionales enero",
            quantity: 1,
            unitValue: 10000,
            amount: 10000,
            unitMeasure: "E48",
            taxes: [],
          },
        ],
        isCancelled: false,
        clientId: clientId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Facturas emitidas
      {
        id: uuidv4(),
        uuid: uuidv4(),
        date: `${currentYear}-01-10`,
        cfdiType: "E",
        paymentMethod: "PUE",
        paymentForm: "01",
        cfdiUsage: "G03",
        fiscalYear: currentYear,
        fiscalRegime: "601",
        subtotal: 2500,
        total: 2900,
        tax: 400,
        issuerRfc: "XAXX010101000",
        issuerName: "Proveedor de Ejemplo",
        receiverRfc: client.rfc,
        receiverName: client.name,
        concepts: [
          {
            id: uuidv4(),
            description: "Material de oficina",
            quantity: 1,
            unitValue: 2500,
            amount: 2500,
            unitMeasure: "H87",
            taxes: [],
          },
        ],
        isCancelled: false,
        expenseType: "Gastos generales",
        clientId: clientId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    setInvoices(prevInvoices => [...prevInvoices, ...exampleInvoices]);

    toast({
      title: "Datos de ejemplo cargados",
      description: "Se han agregado facturas de ejemplo para demostración.",
    });
  };

  const testXMLParser = async () => {
    // XML de prueba con estructura básica CFDI
    const xmlSample = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante Version="4.0" 
                 Fecha="2023-01-15T12:00:00" 
                 SubTotal="10000.00" 
                 Total="11600.00"
                 TipoDeComprobante="I" 
                 FormaPago="01" 
                 MetodoPago="PUE">
  <cfdi:Emisor Rfc="${client?.rfc}" Nombre="${client?.name}" RegimenFiscal="621"/>
  <cfdi:Receptor Rfc="XAXX010101000" Nombre="Cliente Público General" UsoCFDI="G03"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="80141600" Cantidad="1" ClaveUnidad="E48" 
                  Descripcion="Servicios profesionales" ValorUnitario="10000.00" Importe="10000.00">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="10000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="1600.00"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="1600.00">
    <cfdi:Traslados>
      <cfdi:Traslado Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="1600.00"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital UUID="ecb477da-98f8-4791-8d28-c9724326bda1"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

    // Convertir string a Blob y luego a File
    const blob = new Blob([xmlSample], { type: "application/xml" });
    const file = new File([blob], "factura_prueba.xml", { type: "application/xml" });

    // Procesar el archivo
    await handleFileUpload([file]);
  };

  const debugInvoicesState = () => {
    console.log("===== ESTADO ACTUAL DE FACTURAS =====");
    console.log(`Total facturas: ${invoices.length}`);

    const recibidas = invoices.filter(inv => inv.cfdiType === "I");
    const emitidas = invoices.filter(inv => inv.cfdiType === "E");

    console.log(`Facturas recibidas: ${recibidas.length}`);
    recibidas.forEach((inv, i) => {
      console.log(
        `Recibida ${i + 1}: UUID=${inv.uuid.substring(0, 8)}, Emisor=${inv.issuerRfc}, Receptor=${inv.receiverRfc}, Total=${inv.total}`
      );
    });

    console.log(`Facturas emitidas: ${emitidas.length}`);
    emitidas.forEach((inv, i) => {
      console.log(
        `Emitida ${i + 1}: UUID=${inv.uuid.substring(0, 8)}, Emisor=${inv.issuerRfc}, Receptor=${inv.receiverRfc}, Total=${inv.total}`
      );
    });

    toast({
      title: "Diagnóstico completado",
      description: `Ver consola para detalles (${invoices.length} facturas analizadas)`,
    });
  };

  if (!client) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Primera barra */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="w-full px-3 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-3">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Volver al Dashboard
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {client.name} <span className="font-normal">({client.rfc})</span>
              </h1>
            </div>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString("es-ES", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Segunda barra - Tabs y botones */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-t border-gray-200 dark:border-gray-700">
        <div className="w-full px-3 py-2">
          <div className="flex justify-between items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="overflow-x-auto">
                <TabsTrigger value="fiscal">Cédula Fiscal</TabsTrigger>
                <TabsTrigger value="incomes">Facturas Recibidas</TabsTrigger>
                <TabsTrigger value="expenses">Facturas Emitidas</TabsTrigger>
                <TabsTrigger value="declaraciones">Declaraciones</TabsTrigger>
                <TabsTrigger value="pagos">Pagos</TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="llaves">Llaves</TabsTrigger>
                <TabsTrigger value="cuestionario">Cuestionario</TabsTrigger>
                <TabsTrigger value="activos">Activos</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploader(!showUploader)}
                className="flex items-center whitespace-nowrap"
              >
                <FileUp className="h-4 w-4 mr-1" />
                {showUploader ? "Ocultar" : "Cargar"}
                {showUploader ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full px-3 py-4">
        {/* Área de carga que se muestra/oculta */}
        {showUploader && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 transition-all duration-300">
            <h2 className="text-lg font-medium mb-4">Cargar Facturas CFDI</h2>
            <FileUploader onFilesUploaded={handleFileUpload} isLoading={isLoading} />

            <div className="flex justify-end mt-4 gap-2">
              <Button variant="outline" onClick={debugInvoicesState} className="text-sm">
                Debug Facturas
              </Button>
              <Button variant="outline" onClick={testXMLParser} className="text-sm">
                Probar Parser XML
              </Button>
              <Button variant="outline" onClick={loadExampleData} className="text-sm">
                Cargar datos de ejemplo
              </Button>
            </div>
          </div>
        )}

        {/* Contenido de las tabs - Ahora dentro de un componente Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="fiscal">
            <FiscalSummary year={selectedYear} invoices={invoices} />
          </TabsContent>

          <TabsContent value="incomes">
            <IncomesTable
              year={selectedYear}
              invoices={invoices.filter(inv => inv.cfdiType === "I")}
            />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesTable
              year={selectedYear}
              invoices={invoices.filter(inv => inv.cfdiType === "E")}
            />
          </TabsContent>

          <TabsContent value="declaraciones">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Declaraciones Fiscales</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Nueva Declaración
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Agregar Nueva Declaración</DialogTitle>
                      <DialogDescription>
                        Complete la información para añadir una nueva declaración fiscal.
                      </DialogDescription>
                    </DialogHeader>
                    {/* Aquí iría el formulario para crear una nueva declaración */}
                    <div className="grid gap-4 py-4">
                      <p className="text-sm text-muted-foreground">
                        La función para agregar declaraciones estará disponible próximamente.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">Cancelar</Button>
                      <Button>Guardar Declaración</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="iva" className="w-full">
                  <TabsList>
                    <TabsTrigger value="iva">IVA</TabsTrigger>
                    <TabsTrigger value="isr">ISR</TabsTrigger>
                    <TabsTrigger value="annual">Anual</TabsTrigger>
                  </TabsList>

                  <div className="mt-4">
                    <TabsContent value="iva">
                      <TaxDeclarationsTable
                        clientId={clientId}
                        selectedYear={selectedYear}
                        declarations={[]} /* En producción, aquí se pasarían las declaraciones desde una API o base de datos */
                        onUpdateDeclaration={declaration => {
                          console.log("Actualizar declaración:", declaration);
                          toast({
                            title: "Declaración actualizada",
                            description: `Se ha actualizado la declaración de ${getMonthName(
                              declaration.month
                            )} ${declaration.year}.`,
                          });
                        }}
                        onAddDeclaration={declaration => {
                          console.log("Nueva declaración:", declaration);
                          toast({
                            title: "Declaración agregada",
                            description: `Se ha agregado una nueva declaración para ${getMonthName(
                              declaration.month
                            )} ${declaration.year}.`,
                          });
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="isr">
                      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h3 className="text-lg font-semibold mb-4">Declaraciones de ISR</h3>
                        <p className="text-muted-foreground">
                          El módulo de declaraciones de ISR estará disponible próximamente.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="annual">
                      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h3 className="text-lg font-semibold mb-4">Declaración Anual</h3>
                        <p className="text-muted-foreground">
                          El módulo de declaraciones anuales estará disponible próximamente.
                        </p>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pagos">
            <Card>
              <CardHeader>
                <CardTitle>Pagos</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Control de pagos y movimientos financieros.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Información Fiscal</CardTitle>
                <Button variant="outline" size="sm">
                  Editar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Datos Generales</h3>
                      <div className="grid gap-2">
                        <div>
                          <div className="text-sm font-medium">Nombre completo</div>
                          <div className="text-base">{client.name}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">RFC</div>
                          <div className="text-base">{client.rfc}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">CURP</div>
                          <div className="text-base">{client.curp || "No especificado"}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Correo electrónico</div>
                          <div className="text-base">{client.email || "No especificado"}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Teléfono</div>
                          <div className="text-base">{client.phone || "No especificado"}</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Domicilio Fiscal</h3>
                      <div className="grid gap-2">
                        <div>
                          <div className="text-sm font-medium">Calle</div>
                          <div className="text-base">{client.address?.street || "No especificado"}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Número exterior / interior</div>
                          <div className="text-base">
                            {client.address?.exteriorNumber || "-"} / {client.address?.interiorNumber || "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Colonia</div>
                          <div className="text-base">{client.address?.colony || "No especificado"}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Ciudad y Estado</div>
                          <div className="text-base">
                            {client.address?.city || "-"}, {client.address?.state || "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Código Postal</div>
                          <div className="text-base">{client.address?.zipCode || "No especificado"}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Información Fiscal</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium">Régimen fiscal</div>
                        <div className="text-base">{client.fiscalInfo?.regime || "No especificado"}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Actividad económica principal</div>
                        <div className="text-base">{client.fiscalInfo?.economicActivity || "No especificado"}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Fecha de alta</div>
                        <div className="text-base">
                          {client.fiscalInfo?.registrationDate
                            ? new Date(client.fiscalInfo.registrationDate).toLocaleDateString("es-ES")
                            : "No especificado"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Fecha de última actualización</div>
                        <div className="text-base">
                          {client.fiscalInfo?.lastUpdateDate
                            ? new Date(client.fiscalInfo.lastUpdateDate).toLocaleDateString("es-ES")
                            : "No especificado"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Estatus fiscal</div>
                        <div className="text-base text-green-600 font-medium">
                          {client.fiscalInfo?.status || "Activo"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Obligaciones fiscales</div>
                        <div className="text-base">
                          {client.fiscalInfo?.obligations ? client.fiscalInfo.obligations.join(", ") : "No especificado"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Estatus de Cliente</h3>
                    <div className="grid gap-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium">Estatus de servicio</div>
                          <div
                            className={`text-base ${
                              client.isActive !== false ? "text-green-600" : "text-red-600"
                            } font-medium flex items-center`}
                          >
                            <div
                              className={`h-2 w-2 rounded-full ${
                                client.isActive !== false ? "bg-green-600" : "bg-red-600"
                              } mr-2`}
                            ></div>
                            {client.isActive !== false ? "Activo" : "Inactivo"}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Cliente desde:{" "}
                            {client.serviceInfo?.clientSince
                              ? new Date(client.serviceInfo.clientSince).toLocaleDateString("es-ES", {
                                  year: "numeric",
                                  month: "long",
                                })
                              : "No especificado"}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="text-sm font-medium">Última factura</div>
                          <div className="text-base">
                            {client.serviceInfo?.lastInvoice
                              ? new Date(client.serviceInfo.lastInvoice).toLocaleDateString("es-ES", {
                                  year: "numeric",
                                  month: "long",
                                })
                              : "No disponible"}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Plan de servicio</div>
                        <div className="text-base">{client.serviceInfo?.plan || "No especificado"}</div>
                        <div className="text-sm text-gray-500 mt-1">{client.serviceInfo?.planDescription || ""}</div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <div>
                          <div className="text-sm font-medium">Próxima renovación</div>
                          <div className="text-base">
                            {client.serviceInfo?.nextRenewal
                              ? new Date(client.serviceInfo.nextRenewal).toLocaleDateString("es-ES")
                              : "No especificado"}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await clientService.toggleClientStatus(client.id, !client.isActive);

                              // Update local state
                              setClient(prev =>
                                prev
                                  ? {
                                      ...prev,
                                      isActive: !prev.isActive,
                                    }
                                  : null
                              );

                              toast({
                                title: `Cliente ${!client.isActive ? "activado" : "desactivado"}`,
                                description: `El cliente ha sido ${
                                  !client.isActive ? "activado" : "desactivado"
                                } correctamente.`,
                              });
                            } catch (error) {
                              console.error("Error toggling client status:", error);
                              toast({
                                title: "Error",
                                description: "No se pudo cambiar el estatus del cliente.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          {client.isActive !== false ? "Marcar como inactivo" : "Reactivar cliente"}
                        </Button>
                      </div>
                      {client.isActive === false && (
                        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                          <div className="text-sm text-red-600 dark:text-red-400 font-medium">Motivo de inactividad</div>
                          <div className="text-sm mt-1">{client.inactiveReason || "No especificado"}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            Fecha de inactivación:{" "}
                            {client.inactiveDate
                              ? new Date(client.inactiveDate).toLocaleDateString("es-ES")
                              : "No registrada"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="llaves">
            <Card>
              <CardHeader>
                <CardTitle>Llaves</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Gestión de llaves fiscales y certificados.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cuestionario">
            <Card>
              <CardHeader>
                <CardTitle>Cuestionario</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Cuestionarios fiscales y formularios del cliente.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activos">
            <Card>
              <CardHeader>
                <CardTitle>Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Control de activos y bienes del cliente.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Resumen y panel de control principal del cliente.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
