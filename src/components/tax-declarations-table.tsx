"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  MoreHorizontal,
  FileCheck,
  FileX,
  Clock,
  FileText,
  Upload,
  AlertCircle,
  Calendar,
  CheckCircle2,
  DownloadCloud,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaxDeclaration, calculateDueDate, getMonthName, getPeriodName, isDeclarationLate } from "@/models/TaxDeclaration";
import { v4 as uuidv4 } from "uuid";
import { MonthlyFiscalData } from "./fiscal-summary";

// Datos de ejemplo para mostrar en la interfaz
const exampleDeclarations: TaxDeclaration[] = [
  {
    id: uuidv4(),
    clientId: "1",
    year: 2025,
    month: 1,
    period: "monthly",
    type: "iva",
    dueDate: "2025-02-17",
    status: "pending",
    incomeAmount: 123500,
    expenseAmount: 45600,
    ivaCollected: 19760,
    ivaWithheld: 0,
    ivaPaid: 7296,
    ivaBalance: 12464,
    isrWithheld: 0,
    isrPaid: 0,
    balanceToPay: 12464,
    hasReceiptFile: false,
    hasPaymentProof: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    clientId: "1",
    year: 2025,
    month: 2,
    period: "monthly",
    type: "iva",
    dueDate: "2025-03-17",
    status: "paid",
    filingDate: "2025-03-10",
    paymentDate: "2025-03-10",
    incomeAmount: 98700,
    expenseAmount: 31200,
    ivaCollected: 15792,
    ivaWithheld: 0,
    ivaPaid: 4992,
    ivaBalance: 10800,
    isrWithheld: 0,
    isrPaid: 0,
    balanceToPay: 10800,
    paymentAmount: 10800,
    hasReceiptFile: true,
    receiptFileUrl: "#",
    hasPaymentProof: true,
    paymentProofUrl: "#",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    clientId: "1",
    year: 2025,
    month: 3,
    period: "monthly",
    type: "iva",
    dueDate: "2025-04-17",
    status: "filed",
    filingDate: "2025-04-15",
    incomeAmount: 110800,
    expenseAmount: 42300,
    ivaCollected: 17728,
    ivaWithheld: 0,
    ivaPaid: 6768,
    ivaBalance: 10960,
    isrWithheld: 0,
    isrPaid: 0,
    balanceToPay: 10960,
    hasReceiptFile: true,
    receiptFileUrl: "#",
    hasPaymentProof: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface TaxDeclarationsTableProps {
  clientId: string;
  selectedYear: number;
  declarations?: TaxDeclaration[];
  onUpdateDeclaration?: (declaration: TaxDeclaration) => void;
  onAddDeclaration?: (declaration: TaxDeclaration) => void;
  monthlyFiscalData?: MonthlyFiscalData[]; // Nuevo prop para recibir datos fiscales
}

export const TaxDeclarationsTable = ({
  clientId,
  selectedYear,
  declarations = exampleDeclarations, // Usar datos de ejemplo por defecto
  onUpdateDeclaration,
  onAddDeclaration,
  monthlyFiscalData = [], // Datos fiscales calculados por mes
}: TaxDeclarationsTableProps) => {
  const [activeTab, setActiveTab] = useState<string>("iva");
  const [selectedDeclaration, setSelectedDeclaration] = useState<TaxDeclaration | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isFileUploadDialogOpen, setIsFileUploadDialogOpen] = useState<boolean>(false);
  const [newDeclarationData, setNewDeclarationData] = useState<Partial<TaxDeclaration>>({
    clientId,
    year: selectedYear,
    period: "monthly",
    type: "iva",
    status: "pending",
  });
  
  // Filtrar las declaraciones por año seleccionado y tipo
  const filteredDeclarations = declarations.filter(
    (declaration) => 
      declaration.year === selectedYear && 
      declaration.type === activeTab
  );
  
  // Ordenar por mes
  const sortedDeclarations = [...filteredDeclarations].sort(
    (a, b) => a.month - b.month
  );
  
  const getStatusBadge = (status: TaxDeclaration["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
      case "filed":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Presentada</Badge>;
      case "paid":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pagada</Badge>;
      case "late":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Tardía</Badge>;
      case "exempt":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Exenta</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };
  
  // Función para manejar la subida de archivos
  const handleFileUpload = (file: File | null, type: 'receipt' | 'payment') => {
    if (!file || !selectedDeclaration) return;
    
    // En producción, aquí se subiría el archivo a un storage y se obtendría la URL
    console.log(`Subiendo archivo ${file.name} para ${type === 'receipt' ? 'acuse' : 'comprobante'}`);
    
    // Simulamos la actualización con una URL ficticia
    const updatedDeclaration = {
      ...selectedDeclaration,
      ...(type === 'receipt' 
        ? { hasReceiptFile: true, receiptFileUrl: URL.createObjectURL(file) }
        : { hasPaymentProof: true, paymentProofUrl: URL.createObjectURL(file) }),
      updatedAt: new Date().toISOString()
    };
    
    if (onUpdateDeclaration) {
      onUpdateDeclaration(updatedDeclaration);
    }
    
    setIsFileUploadDialogOpen(false);
  };
  
  // Función para rellenar datos fiscales al seleccionar un mes
  const handleMonthSelect = (month: number) => {
    // Buscar los datos fiscales para el mes seleccionado
    const fiscalData = monthlyFiscalData.find(data => data.month === month - 1);
    
    if (fiscalData) {
      // Calcular fecha límite de presentación
      const dueDate = calculateDueDate(selectedYear, month, activeTab as TaxDeclaration["type"]);
      
      // Actualizar formulario con los datos fiscales
      setNewDeclarationData({
        ...newDeclarationData,
        month,
        dueDate,
        incomeAmount: fiscalData.incomeAmount,
        expenseAmount: fiscalData.expenseAmount,
        ivaCollected: fiscalData.ivaCollected,
        ivaWithheld: fiscalData.ivaWithheld,
        ivaPaid: fiscalData.ivaPaid,
        ivaBalance: fiscalData.ivaBalance,
        isrWithheld: fiscalData.isrWithheld,
        isrPaid: fiscalData.estimatedIsrToPay,
        balanceToPay: fiscalData.ivaBalance > 0 ? fiscalData.ivaBalance : 0,
        favorBalance: fiscalData.ivaBalance < 0 ? Math.abs(fiscalData.ivaBalance) : 0,
      });
    }
  };
  
  // Función para crear declaración desde datos fiscales
  const createDeclarationFromFiscalData = (fiscalData: MonthlyFiscalData) => {
    // Mes del calendario (1-12) en lugar del índice (0-11)
    const month = fiscalData.month + 1;
    
    // Calcular fecha límite de presentación
    const dueDate = calculateDueDate(selectedYear, month, activeTab as TaxDeclaration["type"]);
    
    const newDeclaration: TaxDeclaration = {
      id: uuidv4(),
      clientId,
      year: selectedYear,
      month,
      period: "monthly",
      type: activeTab as TaxDeclaration["type"],
      dueDate,
      status: "pending",
      incomeAmount: fiscalData.incomeAmount,
      expenseAmount: fiscalData.expenseAmount,
      ivaCollected: fiscalData.ivaCollected,
      ivaWithheld: fiscalData.ivaWithheld,
      ivaPaid: fiscalData.ivaPaid,
      ivaBalance: fiscalData.ivaBalance,
      isrWithheld: fiscalData.isrWithheld,
      isrPaid: fiscalData.estimatedIsrToPay,
      balanceToPay: fiscalData.ivaBalance > 0 ? fiscalData.ivaBalance : 0,
      favorBalance: fiscalData.ivaBalance < 0 ? Math.abs(fiscalData.ivaBalance) : 0,
      hasReceiptFile: false,
      hasPaymentProof: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (onAddDeclaration) {
      onAddDeclaration(newDeclaration);
    }
  };
  
  // Función para crear una nueva declaración
  const handleAddDeclaration = (formData: any) => {
    const newDeclaration: TaxDeclaration = {
      id: uuidv4(),
      clientId,
      year: selectedYear,
      month: parseInt(formData.month),
      period: formData.period,
      type: activeTab as TaxDeclaration["type"],
      dueDate: formData.dueDate,
      status: "pending",
      incomeAmount: parseFloat(formData.incomeAmount) || 0,
      expenseAmount: parseFloat(formData.expenseAmount) || 0,
      ivaCollected: parseFloat(formData.ivaCollected) || 0,
      ivaWithheld: parseFloat(formData.ivaWithheld) || 0,
      ivaPaid: parseFloat(formData.ivaPaid) || 0,
      ivaBalance: parseFloat(formData.ivaBalance) || 0,
      isrWithheld: parseFloat(formData.isrWithheld) || 0,
      isrPaid: parseFloat(formData.isrPaid) || 0,
      balanceToPay: parseFloat(formData.balanceToPay) || 0,
      hasReceiptFile: false,
      hasPaymentProof: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (onAddDeclaration) {
      onAddDeclaration(newDeclaration);
    }
    
    setIsAddDialogOpen(false);
  };

  // Función para actualizar una declaración existente
  const handleUpdateDeclaration = (formData: any) => {
    if (!selectedDeclaration) return;
    
    const updatedDeclaration: TaxDeclaration = {
      ...selectedDeclaration,
      month: parseInt(formData.month),
      period: formData.period,
      dueDate: formData.dueDate,
      status: formData.status,
      filingDate: formData.filingDate || selectedDeclaration.filingDate,
      paymentDate: formData.paymentDate || selectedDeclaration.paymentDate,
      incomeAmount: parseFloat(formData.incomeAmount) || 0,
      expenseAmount: parseFloat(formData.expenseAmount) || 0,
      ivaCollected: parseFloat(formData.ivaCollected) || 0,
      ivaWithheld: parseFloat(formData.ivaWithheld) || 0,
      ivaPaid: parseFloat(formData.ivaPaid) || 0,
      ivaBalance: parseFloat(formData.ivaBalance) || 0,
      isrWithheld: parseFloat(formData.isrWithheld) || 0,
      isrPaid: parseFloat(formData.isrPaid) || 0,
      balanceToPay: parseFloat(formData.balanceToPay) || 0,
      paymentAmount: formData.paymentAmount ? parseFloat(formData.paymentAmount) : selectedDeclaration.paymentAmount,
      updatedAt: new Date().toISOString(),
    };
    
    if (onUpdateDeclaration) {
      onUpdateDeclaration(updatedDeclaration);
    }
    
    setIsEditDialogOpen(false);
  };

  // Función para editar una declaración existente
  const handleEditDeclaration = (declaration: TaxDeclaration) => {
    setSelectedDeclaration(declaration);
    setIsEditDialogOpen(true);
  };
  
  // Función para iniciar la subida de archivos
  const handleOpenFileUpload = (declaration: TaxDeclaration, type: 'receipt' | 'payment') => {
    setSelectedDeclaration(declaration);
    setIsFileUploadDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Declaraciones Fiscales {selectedYear}</CardTitle>
          <Button 
            onClick={() => {
              setNewDeclarationData({
                clientId,
                year: selectedYear,
                period: "monthly",
                type: activeTab as TaxDeclaration["type"],
                status: "pending",
              });
              setIsAddDialogOpen(true);
            }}
            size="sm"
          >
            Nueva Declaración
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          defaultValue="iva"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="iva">IVA</TabsTrigger>
            <TabsTrigger value="isr">ISR</TabsTrigger>
            <TabsTrigger value="provisional">Provisional</TabsTrigger>
            <TabsTrigger value="annual">Anual</TabsTrigger>
          </TabsList>
          
          <TabsContent value="iva" className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Fecha Límite</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ingresos</TableHead>
                  <TableHead>IVA Trasladado</TableHead>
                  <TableHead>IVA Acreditable</TableHead>
                  <TableHead>A Pagar/Favor</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDeclarations.length > 0 ? (
                  sortedDeclarations.map((declaration) => (
                    <TableRow key={declaration.id}>
                      <TableCell>{getMonthName(declaration.month)}</TableCell>
                      <TableCell>
                        {format(new Date(declaration.dueDate), 'dd/MM/yyyy')}
                        {isDeclarationLate(declaration.dueDate, declaration.filingDate, declaration.status) && (
                          <span title="La declaración está atrasada">
                            <AlertCircle 
                              size={16} 
                              className="inline ml-1 text-red-500" 
                            />
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(declaration.status)}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(declaration.incomeAmount)}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(declaration.ivaCollected)}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(declaration.ivaPaid)}
                      </TableCell>
                      <TableCell className={declaration.ivaBalance >= 0 ? "text-red-600" : "text-green-600"}>
                        {declaration.ivaBalance >= 0 ? "A pagar: " : "A favor: "}
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Math.abs(declaration.ivaBalance))}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditDeclaration(declaration)}>
                              <FileText className="mr-2 h-4 w-4" /> Editar declaración
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenFileUpload(declaration, 'receipt')}>
                              <Upload className="mr-2 h-4 w-4" /> Subir acuse
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenFileUpload(declaration, 'payment')}>
                              <Upload className="mr-2 h-4 w-4" /> Subir comprobante de pago
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                      No hay declaraciones registradas para este año
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
          
          {/* Contenido similar para las otras pestañas */}
          <TabsContent value="isr">
            <div className="py-6 text-center text-muted-foreground">
              Declaraciones de ISR - En desarrollo
            </div>
          </TabsContent>
          
          <TabsContent value="provisional">
            <div className="py-6 text-center text-muted-foreground">
              Declaraciones provisionales - En desarrollo
            </div>
          </TabsContent>
          
          <TabsContent value="annual">
            <div className="py-6 text-center text-muted-foreground">
              Declaración anual - En desarrollo
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Diálogo para agregar nueva declaración */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Declaración</DialogTitle>
            <DialogDescription>
              Ingresa los datos de la nueva declaración fiscal
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddDeclaration(Object.fromEntries(new FormData(e.currentTarget)));
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="month" className="text-right">
                  Mes
                </Label>
                <select
                  id="month"
                  name="month"
                  className="col-span-3 h-10 rounded-md border border-input px-3"
                  value={newDeclarationData.month || ""}
                  onChange={(e) => {
                    const month = parseInt(e.target.value);
                    handleMonthSelect(month);
                  }}
                  required
                >
                  <option value="">Seleccionar mes</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {getMonthName(m)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="period" className="text-right">
                  Periodo
                </Label>
                <select
                  id="period"
                  name="period"
                  className="col-span-3 h-10 rounded-md border border-input px-3"
                  value={newDeclarationData.period}
                  onChange={(e) => setNewDeclarationData({
                    ...newDeclarationData,
                    period: e.target.value as TaxDeclaration["period"]
                  })}
                  required
                >
                  <option value="monthly">Mensual</option>
                  <option value="bimonthly">Bimestral</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="annual">Anual</option>
                </select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate" className="text-right">
                  Fecha límite
                </Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  className="col-span-3"
                  value={newDeclarationData.dueDate || ""}
                  onChange={(e) => setNewDeclarationData({
                    ...newDeclarationData,
                    dueDate: e.target.value
                  })}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="incomeAmount" className="text-right">
                  Ingresos
                </Label>
                <Input
                  id="incomeAmount"
                  name="incomeAmount"
                  type="number"
                  step="0.01"
                  className="col-span-3"
                  value={newDeclarationData.incomeAmount || ""}
                  onChange={(e) => setNewDeclarationData({
                    ...newDeclarationData,
                    incomeAmount: parseFloat(e.target.value) || 0
                  })}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="expenseAmount" className="text-right">
                  Gastos
                </Label>
                <Input
                  id="expenseAmount"
                  name="expenseAmount"
                  type="number"
                  step="0.01"
                  className="col-span-3"
                  value={newDeclarationData.expenseAmount || ""}
                  onChange={(e) => setNewDeclarationData({
                    ...newDeclarationData,
                    expenseAmount: parseFloat(e.target.value) || 0
                  })}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ivaCollected" className="text-right">
                  IVA Trasladado
                </Label>
                <Input
                  id="ivaCollected"
                  name="ivaCollected"
                  type="number"
                  step="0.01"
                  className="col-span-3"
                  value={newDeclarationData.ivaCollected || ""}
                  onChange={(e) => setNewDeclarationData({
                    ...newDeclarationData,
                    ivaCollected: parseFloat(e.target.value) || 0
                  })}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ivaPaid" className="text-right">
                  IVA Acreditable
                </Label>
                <Input
                  id="ivaPaid"
                  name="ivaPaid"
                  type="number"
                  step="0.01"
                  className="col-span-3"
                  value={newDeclarationData.ivaPaid || ""}
                  onChange={(e) => setNewDeclarationData({
                    ...newDeclarationData,
                    ivaPaid: parseFloat(e.target.value) || 0
                  })}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ivaWithheld" className="text-right">
                  IVA Retenido
                </Label>
                <Input
                  id="ivaWithheld"
                  name="ivaWithheld"
                  type="number"
                  step="0.01"
                  className="col-span-3"
                  value={newDeclarationData.ivaWithheld || ""}
                  onChange={(e) => setNewDeclarationData({
                    ...newDeclarationData,
                    ivaWithheld: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ivaBalance" className="text-right">
                  Saldo IVA
                </Label>
                <Input
                  id="ivaBalance"
                  name="ivaBalance"
                  type="number"
                  step="0.01"
                  className="col-span-3"
                  value={newDeclarationData.ivaBalance || ""}
                  onChange={(e) => setNewDeclarationData({
                    ...newDeclarationData,
                    ivaBalance: parseFloat(e.target.value) || 0
                  })}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="balanceToPay" className="text-right">
                  Importe a pagar
                </Label>
                <Input
                  id="balanceToPay"
                  name="balanceToPay"
                  type="number"
                  step="0.01"
                  className="col-span-3"
                  value={newDeclarationData.balanceToPay || ""}
                  onChange={(e) => setNewDeclarationData({
                    ...newDeclarationData,
                    balanceToPay: parseFloat(e.target.value) || 0
                  })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar declaración */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Declaración</DialogTitle>
            <DialogDescription>
              Actualiza los datos de la declaración fiscal
            </DialogDescription>
          </DialogHeader>
          {selectedDeclaration && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateDeclaration(Object.fromEntries(new FormData(e.currentTarget)));
              }}
            >
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Estado
                  </Label>
                  <select
                    id="status"
                    name="status"
                    className="col-span-3 h-10 rounded-md border border-input px-3"
                    defaultValue={selectedDeclaration.status}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="filed">Presentada</option>
                    <option value="paid">Pagada</option>
                    <option value="exempt">Exenta</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="filingDate" className="text-right">
                    Fecha presentación
                  </Label>
                  <Input
                    id="filingDate"
                    name="filingDate"
                    type="date"
                    className="col-span-3"
                    defaultValue={selectedDeclaration.filingDate || ""}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="paymentDate" className="text-right">
                    Fecha pago
                  </Label>
                  <Input
                    id="paymentDate"
                    name="paymentDate"
                    type="date"
                    className="col-span-3"
                    defaultValue={selectedDeclaration.paymentDate || ""}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="paymentAmount" className="text-right">
                    Monto pagado
                  </Label>
                  <Input
                    id="paymentAmount"
                    name="paymentAmount"
                    type="number"
                    step="0.01"
                    className="col-span-3"
                    defaultValue={selectedDeclaration.paymentAmount || selectedDeclaration.balanceToPay}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Actualizar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo para subir archivos */}
      <Dialog open={isFileUploadDialogOpen} onOpenChange={setIsFileUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
            <DialogDescription>
              Sube el archivo del acuse o comprobante de pago
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="file-upload">Archivo</Label>
            <Input
              id="file-upload"
              type="file"
              onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'receipt')}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsFileUploadDialogOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};