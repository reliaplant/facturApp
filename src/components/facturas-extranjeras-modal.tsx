import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { facturasExtranjerasService } from "@/services/facturas-extranjeras-service";
import { FacturaExtranjera } from "@/models/facturaManual";
import { format } from "date-fns";
import { categoryService } from "@/services/category-service";
import { Category } from "@/models/Category";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

interface FacturasExtranjerasModalProps {   
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: (id: string) => void;
  clientId: string;
  factura?: FacturaExtranjera; // If provided, we're editing an existing invoice
}

// List of common currencies
const currencies = [
  { code: 'USD', name: 'Dólar estadounidense' },
  { code: 'EUR', name: 'Euro' },
  { code: 'CAD', name: 'Dólar canadiense' },
  { code: 'GBP', name: 'Libra esterlina' },
  { code: 'JPY', name: 'Yen japonés' },
  { code: 'CHF', name: 'Franco suizo' },
  { code: 'AUD', name: 'Dólar australiano' },
  { code: 'CNY', name: 'Yuan chino' },
];

// List of common countries
const countries = [
  "Estados Unidos", "Canadá", "España", "Reino Unido", "Francia", "Alemania", 
  "Italia", "Japón", "China", "Australia", "Brasil", "Argentina", "Chile", 
  "Colombia", "Perú", "Portugal", "Suiza", "Suecia", "Holanda", "Bélgica"
];

export function FacturasExtranjerasModal({ 
  open, 
  onClose, 
  onSuccess,
  onDelete,
  clientId,
  factura 
}: FacturasExtranjerasModalProps) {
  const isEditing = !!factura;
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Form state with default values for país and moneda
  const [formData, setFormData] = useState({
    fecha: today,
    emisor: '',
    categoria: '',
    pais: 'Estados Unidos', // Default país
    moneda: 'USD',          // Default moneda
    tipoCambio: 0,
    monto: 0,
    iva: 0,
    esDeducible: true, // Default deducible
    // Removed mesDeduccion from form state
  });
  
  // Calculate total MXN
  const totalMXN = formData.monto * formData.tipoCambio;
  const formattedTotalMXN = new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: 'MXN' 
  }).format(totalMXN);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  
  // State for previous emisores typeahead
  const [previousEmisores, setPreviousEmisores] = useState<string[]>([]);
  const [emisorOpen, setEmisorOpen] = useState(false);
  
  // Load previous emisores
  useEffect(() => {
    if (!open) return;
    
    async function loadPreviousEmisores() {
      try {
        const facturas = await facturasExtranjerasService.getFacturasExtranjeras(clientId, new Date().getFullYear());
        // Extract unique emisores
        const emisores = Array.from(new Set(facturas.map(f => f.emisor))).filter(Boolean);
        setPreviousEmisores(emisores);
      } catch (error) {
        console.error('Error loading previous emisores:', error);
      }
    }
    
    loadPreviousEmisores();
  }, [clientId, open]);
  
  // Load categories from service
  useEffect(() => {
    async function loadCategories() {
      try {
        const fetchedCategories = await categoryService.getAllCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    }
    
    loadCategories();
  }, []); // No dependency on clientId anymore
  
  // Load data if editing
  useEffect(() => {
    if (factura) {
      setFormData({
        fecha: format(new Date(factura.fecha), 'yyyy-MM-dd'),
        emisor: factura.emisor,
        categoria: factura.categoria,
        pais: factura.pais,
        moneda: factura.moneda,
        tipoCambio: factura.tipoCambio,
        monto: factura.monto,
        iva: factura.iva,
        esDeducible: factura.esDeducible !== false, // Default true si no existe
        // Removed mesDeduccion
      });
    } else {
      // Reset form when opening for new creation
      setFormData({
        fecha: today,
        emisor: '',
        categoria: '',
        pais: 'Estados Unidos',
        moneda: 'USD',
        tipoCambio: 0,
        monto: 0,
        iva: 0,
        esDeducible: true,
        // Removed mesDeduccion
      });
    }
    setErrors({});
  }, [factura, open]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Simplified date handling - no longer updates mesDeduccion
    if (name === 'fecha' && value) {
      setFormData(prev => ({
        ...prev,
        fecha: value,
      }));
    }
    // Handle numeric fields
    else if (name === 'tipoCambio' || name === 'monto' || name === 'iva') {
      const numValue = parseFloat(value);
      setFormData(prev => ({
        ...prev,
        [name]: isNaN(numValue) ? 0 : numValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle select change
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Completely rewritten emisor typeahead selection - simpler approach
  const handleEmisorInput = (value: string) => {
    setFormData(prev => ({
      ...prev,
      emisor: value
    }));
  };
  
  // Handle emisor direct selection
  const handleEmisorSelect = (emisor: string) => {
    setFormData(prev => ({
      ...prev,
      emisor
    }));
    setEmisorOpen(false);
  };

  // Validate the form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fecha) newErrors.fecha = "La fecha es requerida";
    if (!formData.emisor.trim()) newErrors.emisor = "El emisor es requerido";
    if (!formData.categoria.trim()) newErrors.categoria = "La categoría es requerida";
    if (!formData.pais.trim()) newErrors.pais = "El país es requerido";
    if (!formData.moneda.trim()) newErrors.moneda = "La moneda es requerida";
    if (formData.tipoCambio <= 0) newErrors.tipoCambio = "El tipo de cambio debe ser mayor a 0";
    if (formData.monto <= 0) newErrors.monto = "El monto debe ser mayor a 0";
    if (formData.iva < 0) newErrors.iva = "El IVA no puede ser negativo"; // This already allows 0
    
    console.log("🔍 Validation check:", { formData, newErrors });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("📝 Form submitted, validating...");
    console.log("Form data:", formData);
    
    if (!validateForm()) {
      console.log("❌ Validation failed:", errors);
      return;
    }
    
    console.log("✅ Validation passed, saving...");
    setLoading(true);
    try {
      // Create a date object from the form's fecha value
      const fechaDate = new Date(formData.fecha);
      // Get the year for ejercicioFiscal
      const ejercicioFiscal = fechaDate.getFullYear();
      
      // Derive mesDeduccion from the fecha
      const mesDeduccion = fechaDate.getMonth() + 1;
      
      // Calculate totalMXN
      const totalMXN = formData.monto * formData.tipoCambio;
      
      console.log("📊 Calculated values:", { ejercicioFiscal, mesDeduccion, totalMXN });
      
      if (isEditing && factura) {
        // Update existing invoice
        console.log("🔄 Updating existing factura...");
        await facturasExtranjerasService.updateFacturaExtranjera(
          clientId,
          factura.id,
          {
            ...formData,
            fecha: fechaDate.toISOString(),
            ejercicioFiscal,
            totalMXN,
          }
        );
        console.log('✅ Factura actualizada correctamente');
      } else {
        // Create new invoice
        console.log("🆕 Creating new factura for clientId:", clientId);
        const newId = await facturasExtranjerasService.createFacturaExtranjera(
          clientId,
          {
            ...formData,
            fecha: fechaDate.toISOString(),
            ejercicioFiscal,
            totalMXN,
          }
        );
        console.log('✅ Factura creada correctamente con ID:', newId);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ Error saving foreign invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold">
            {isEditing ? 'Editar Factura Extranjera' : 'Agregar Factura Extranjera'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
          {/* Row 1: Fecha + País */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="fecha" className="text-xs text-gray-500">Fecha</Label>
              <Input
                id="fecha"
                name="fecha"
                type="date"
                value={formData.fecha}
                onChange={handleChange}
                className={`h-9 text-sm ${errors.fecha ? 'border-red-500' : ''}`}
              />
              {errors.fecha && <p className="text-red-500 text-xs">{errors.fecha}</p>}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="pais" className="text-xs text-gray-500">País</Label>
              <Select
                value={formData.pais}
                onValueChange={(value) => handleSelectChange('pais', value)}
              >
                <SelectTrigger className={`h-9 text-sm ${errors.pais ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.pais && <p className="text-red-500 text-xs">{errors.pais}</p>}
            </div>
          </div>
          
          {/* Row 2: Emisor + Categoría */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="emisor" className="text-xs text-gray-500">Emisor</Label>
              <Popover open={emisorOpen} onOpenChange={setEmisorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={emisorOpen}
                    className={cn(
                      "w-full justify-between h-9 text-sm font-normal",
                      errors.emisor ? 'border-red-500' : '',
                      !formData.emisor && "text-muted-foreground"
                    )}
                  >
                    <span className="truncate">{formData.emisor || "Seleccionar..."}</span>
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <div className="relative">
                    <Input 
                      placeholder="Buscar o agregar..."
                      value={formData.emisor} 
                      onChange={(e) => handleEmisorInput(e.target.value)} 
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 text-sm"
                    />
                    <div className="max-h-[150px] overflow-y-auto">
                      {previousEmisores
                        .filter(e => e.toLowerCase().includes(formData.emisor.toLowerCase()))
                        .map(emisor => (
                          <div
                            key={emisor}
                            className={cn(
                              "flex items-center px-3 py-1.5 cursor-pointer hover:bg-gray-100 text-sm",
                              formData.emisor === emisor && "bg-gray-100"
                            )}
                            onClick={() => handleEmisorSelect(emisor)}
                          >
                            <Check 
                              className={cn(
                                "mr-2 h-3 w-3",
                                formData.emisor === emisor ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate">{emisor}</span>
                          </div>
                        ))}
                        
                      {previousEmisores.filter(e => 
                        e.toLowerCase().includes(formData.emisor.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-1.5 text-xs text-gray-500">
                          {formData.emisor ? 
                            "Se agregará como nuevo" : 
                            "No hay emisores"}
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {errors.emisor && <p className="text-red-500 text-xs">{errors.emisor}</p>}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="categoria" className="text-xs text-gray-500">Categoría</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => handleSelectChange('categoria', value)}
              >
                <SelectTrigger className={`h-9 text-sm ${errors.categoria ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <SelectItem key={category.id || ''} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      Cargando...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.categoria && <p className="text-red-500 text-xs">{errors.categoria}</p>}
            </div>
          </div>
          
          {/* Row 3: Moneda + Tipo de Cambio */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="moneda" className="text-xs text-gray-500">Moneda</Label>
              <Select
                value={formData.moneda}
                onValueChange={(value) => handleSelectChange('moneda', value)}
              >
                <SelectTrigger className={`h-9 text-sm ${errors.moneda ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Seleccionar">
                    {formData.moneda}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.moneda && <p className="text-red-500 text-xs">{errors.moneda}</p>}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="tipoCambio" className="text-xs text-gray-500">Tipo de Cambio</Label>
              <Input
                id="tipoCambio"
                name="tipoCambio"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.tipoCambio || ''}
                onChange={handleChange}
                className={`h-9 text-sm ${errors.tipoCambio ? 'border-red-500' : ''}`}
              />
              {errors.tipoCambio && <p className="text-red-500 text-xs">{errors.tipoCambio}</p>}
            </div>
          </div>
          
          {/* Row 4: Monto + IVA */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="monto" className="text-xs text-gray-500">Monto ({formData.moneda})</Label>
              <Input
                id="monto"
                name="monto"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.monto || ''}
                onChange={handleChange}
                className={`h-9 text-sm ${errors.monto ? 'border-red-500' : ''}`}
              />
              {errors.monto && <p className="text-red-500 text-xs">{errors.monto}</p>}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="iva" className="text-xs text-gray-500">IVA</Label>
              <Input
                id="iva"
                name="iva"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={formData.iva === 0 ? '0' : formData.iva || ''}
                onChange={handleChange}
                className={`h-9 text-sm ${errors.iva ? 'border-red-500' : ''}`}
              />
              {errors.iva && <p className="text-red-500 text-xs">{errors.iva}</p>}
            </div>
          </div>
          
          {/* Total MXN Preview - más compacto */}
          <div className="pt-2 pb-1 px-3 bg-gray-50 rounded-md border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Total MXN</span>
              <span className="text-sm font-semibold text-purple-600">{formattedTotalMXN}</span>
            </div>
            <p className="text-[10px] text-gray-400 text-right">
              {formData.monto} {formData.moneda} × {formData.tipoCambio}
            </p>
          </div>
          
          <DialogFooter className="pt-2">
            <div className="flex w-full justify-between">
              {/* Delete button - only show when editing */}
              {isEditing && onDelete && factura ? (
                <Button 
                  type="button" 
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onDelete(factura.id);
                    onClose();
                  }} 
                  disabled={loading || factura.locked}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              ) : (
                <div />
              )}
              
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={onClose} 
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={loading}
                  className="bg-black hover:bg-gray-800"
                >
                  {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
