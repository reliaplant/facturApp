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

interface FacturasExtranjerasModalProps {   
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

  // Define a consistent height class for all form controls
  const formControlClass = "h-10"; // This ensures all form elements have the same height

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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
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
      
      if (isEditing && factura) {
        // Update existing invoice
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
        console.log('Factura actualizada correctamente');
      } else {
        // Create new invoice
        await facturasExtranjerasService.createFacturaExtranjera(
          clientId,
          {
            ...formData,
            fecha: fechaDate.toISOString(),
            ejercicioFiscal,
            totalMXN,
          }
        );
        console.log('Factura creada correctamente');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving foreign invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Factura Extranjera' : 'Agregar Factura Extranjera'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Fecha (keep this field) - now single column */}
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              name="fecha"
              type="date"
              value={formData.fecha}
              onChange={handleChange}
              className={`${formControlClass} ${errors.fecha ? 'border-red-500' : ''}`}
            />
            {errors.fecha && <p className="text-red-500 text-xs">{errors.fecha}</p>}
          </div>
          
          {/* Emisor and Categoría in a row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Emisor - with typeahead */}
            <div className="space-y-2">
              <Label htmlFor="emisor">Emisor</Label>
              <Popover open={emisorOpen} onOpenChange={setEmisorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={emisorOpen}
                    className={cn(
                      `w-full justify-between ${formControlClass}`,
                      errors.emisor ? 'border-red-500' : '',
                      !formData.emisor && "text-muted-foreground"
                    )}
                  >
                    {formData.emisor || "Seleccionar emisor..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <div className="relative">
                    <Input 
                      placeholder="Buscar o agregar emisor..."
                      value={formData.emisor} 
                      onChange={(e) => handleEmisorInput(e.target.value)} 
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <div className="max-h-[200px] overflow-y-auto">
                      {previousEmisores
                        .filter(e => e.toLowerCase().includes(formData.emisor.toLowerCase()))
                        .map(emisor => (
                          <div
                            key={emisor}
                            className={cn(
                              "flex items-center px-4 py-2 cursor-pointer hover:bg-gray-100",
                              formData.emisor === emisor && "bg-gray-100"
                            )}
                            onClick={() => handleEmisorSelect(emisor)}
                          >
                            <Check 
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.emisor === emisor ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span>{emisor}</span>
                          </div>
                        ))}
                        
                      {previousEmisores.filter(e => 
                        e.toLowerCase().includes(formData.emisor.toLowerCase())
                      ).length === 0 && (
                        <div className="px-4 py-2 text-sm text-gray-500">
                          {formData.emisor ? 
                            "Emisor no encontrado. Se agregará como nuevo." : 
                            "No hay emisores disponibles."}
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {errors.emisor && <p className="text-red-500 text-xs">{errors.emisor}</p>}
            </div>
            
            {/* Categoría */}
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => handleSelectChange('categoria', value)}
              >
                <SelectTrigger className={`${formControlClass} ${errors.categoria ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Seleccionar categoría" />
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
                      Cargando categorías...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.categoria && <p className="text-red-500 text-xs">{errors.categoria}</p>}
            </div>
          </div>
          
          {/* País */}
          <div className="space-y-2">
            <Label htmlFor="pais">País</Label>
            <Select
              value={formData.pais}
              onValueChange={(value) => handleSelectChange('pais', value)}
            >
              <SelectTrigger className={`${formControlClass} ${errors.pais ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Seleccionar país" />
              </SelectTrigger>
              <SelectContent>
                {countries.map(country => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.pais && <p className="text-red-500 text-xs">{errors.pais}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Moneda */}
            <div className="space-y-2">
              <Label htmlFor="moneda">Moneda</Label>
              <Select
                value={formData.moneda}
                onValueChange={(value) => handleSelectChange('moneda', value)}
              >
                <SelectTrigger className={`${formControlClass} ${errors.moneda ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Seleccionar moneda" />
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
            
            {/* Tipo de Cambio */}
            <div className="space-y-2">
              <Label htmlFor="tipoCambio">Tipo de Cambio (MXN)</Label>
              <Input
                id="tipoCambio"
                name="tipoCambio"
                type="number"
                step="0.01"
                value={formData.tipoCambio || ''}
                onChange={handleChange}
                className={`${formControlClass} ${errors.tipoCambio ? 'border-red-500' : ''}`}
              />
              {errors.tipoCambio && <p className="text-red-500 text-xs">{errors.tipoCambio}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Monto - with dynamic currency label */}
            <div className="space-y-2">
              <Label htmlFor="monto">Monto ({formData.moneda})</Label>
              <Input
                id="monto"
                name="monto"
                type="number"
                step="0.01"
                value={formData.monto || ''}
                onChange={handleChange}
                className={`${formControlClass} ${errors.monto ? 'border-red-500' : ''}`}
              />
              {errors.monto && <p className="text-red-500 text-xs">{errors.monto}</p>}
            </div>
            
            {/* IVA */}
            <div className="space-y-2">
              <Label htmlFor="iva">IVA</Label>
              <Input
                id="iva"
                name="iva"
                type="number"
                step="0.01"
                min="0"
                value={formData.iva === 0 ? '0' : formData.iva || ''}
                onChange={handleChange}
                className={`${formControlClass} ${errors.iva ? 'border-red-500' : ''}`}
              />
              {errors.iva && <p className="text-red-500 text-xs">{errors.iva}</p>}
            </div>
          </div>
          
          {/* Total MXN Preview */}
          <div className="mt-2 p-2 bg-gray-50 rounded-md">
            <p className="text-sm font-medium">
              Total en MXN: <span className="text-emerald-600 font-bold">{formattedTotalMXN}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formData.monto} {formData.moneda} × {formData.tipoCambio} = {formattedTotalMXN}
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
