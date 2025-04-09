import { Invoice, InvoiceConcept, ConceptTax } from '@/models/Invoice';
import { v4 as uuidv4 } from 'uuid';

/**
 * Servicio para el procesamiento y parseo de archivos CFDI en formato XML
 */
export class CFDIParser {
  /**
   * Parsea un archivo XML de CFDI y lo convierte a nuestro modelo Invoice
   * @param xmlContent Contenido XML del CFDI como string
   * @param clientId ID del cliente al que pertenece la factura
   * @returns Objeto factura procesado
   */
  static parseXMLToInvoice(xmlContent: string, clientId: string): Invoice {
    try {
      // Parsear XML a DOM
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
      
      // Validar que sea un CFDI válido
      if (!this.isValidCFDI(xmlDoc)) {
        throw new Error("El archivo XML no corresponde a un CFDI válido");
      }
      
      // Extraer el nodo principal Comprobante
      const comprobante = xmlDoc.getElementsByTagName("cfdi:Comprobante")[0];
      if (!comprobante) {
        throw new Error("No se encontró el nodo cfdi:Comprobante en el XML");
      }
      
      // Extraer emisor y receptor
      const emisor = xmlDoc.getElementsByTagName("cfdi:Emisor")[0];
      const receptor = xmlDoc.getElementsByTagName("cfdi:Receptor")[0];
      
      // Extraer conceptos
      const conceptosNode = xmlDoc.getElementsByTagName("cfdi:Conceptos")[0];
      const conceptos = conceptosNode ? Array.from(conceptosNode.getElementsByTagName("cfdi:Concepto")) : [];
      
      // Determinar tipo de CFDI
      const tipoDeComprobante = comprobante.getAttribute("TipoDeComprobante") || "I";
      const cfdiType = this.mapCFDIType(tipoDeComprobante);
      
      // Determinar fecha completa y extraer solo la parte de fecha (sin hora)
      const fechaString = comprobante.getAttribute("Fecha") || "";
      const date = fechaString ? fechaString.split("T")[0] : new Date().toISOString().split("T")[0];
      
      // Extraer los campos específicos del XML
      // Información básica del comprobante
      const serie = comprobante.getAttribute("Serie") || undefined;
      const folio = comprobante.getAttribute("Folio") || undefined;
      const lugarExpedicion = comprobante.getAttribute("LugarExpedicion") || undefined;
      const metodoPago = comprobante.getAttribute("MetodoPago") || undefined;
      const formaPago = comprobante.getAttribute("FormaPago") || undefined;
      const moneda = comprobante.getAttribute("Moneda") || "MXN";
      const tipoCambio = comprobante.getAttribute("TipoCambio") || "1.00";
      
      // Información fiscal
      const regimenFiscal = emisor.getAttribute("RegimenFiscal") || "";
      const domicilioFiscalReceptor = receptor.getAttribute("DomicilioFiscalReceptor") || undefined;
      const regimenFiscalReceptor = receptor.getAttribute("RegimenFiscalReceptor") || undefined;
      const usoCFDI = receptor.getAttribute("UsoCFDI") || undefined;
      
      // Información de importes
      const subTotal = parseFloat(comprobante.getAttribute("SubTotal") || "0");
      const total = parseFloat(comprobante.getAttribute("Total") || "0");
      const descuento = comprobante.hasAttribute("Descuento") ? 
        parseFloat(comprobante.getAttribute("Descuento") || "0") : undefined;
      
      // Calcular año fiscal a partir de la fecha
      const fiscalYear = new Date(date).getFullYear();
      
      // Obtener el UUID directamente
      const uuid = this.getUUID(xmlDoc);
      
      // Extraer información de impuestos
      const impuestos = xmlDoc.getElementsByTagName("cfdi:Impuestos")[0];
      let totalImpuestosTrasladados: number | undefined = undefined;
      let ivaTrasladado: number | undefined = undefined;
      let iepsTrasladado: number | undefined = undefined;
      let totalImpuestosRetenidos: number | undefined = undefined;
      let ivaRetenido: number | undefined = undefined;
      let isrRetenido: number | undefined = undefined;

      if (impuestos) {
        // Impuestos trasladados
        if (impuestos.hasAttribute("TotalImpuestosTrasladados")) {
          totalImpuestosTrasladados = parseFloat(impuestos.getAttribute("TotalImpuestosTrasladados") || "0");
        }
        
        // Procesar traslados específicos
        const traslados = impuestos.getElementsByTagName("cfdi:Traslados")[0];
        if (traslados) {
          const trasladosList = traslados.getElementsByTagName("cfdi:Traslado");
          for (let i = 0; i < trasladosList.length; i++) {
            const traslado = trasladosList[i];
            const impuesto = traslado.getAttribute("Impuesto") || "";
            const importe = parseFloat(traslado.getAttribute("Importe") || "0");
            
            if (impuesto === "002") { // IVA
              ivaTrasladado = (ivaTrasladado || 0) + importe;
            } else if (impuesto === "003") { // IEPS
              iepsTrasladado = (iepsTrasladado || 0) + importe;
            }
          }
        }
        
        // Impuestos retenidos
        if (impuestos.hasAttribute("TotalImpuestosRetenidos")) {
          totalImpuestosRetenidos = parseFloat(impuestos.getAttribute("TotalImpuestosRetenidos") || "0");
        }
        
        // Procesar retenciones específicas
        const retenciones = impuestos.getElementsByTagName("cfdi:Retenciones")[0];
        if (retenciones) {
          const retencionesList = retenciones.getElementsByTagName("cfdi:Retencion");
          for (let i = 0; i < retencionesList.length; i++) {
            const retencion = retencionesList[i];
            const impuesto = retencion.getAttribute("Impuesto") || "";
            const importe = parseFloat(retencion.getAttribute("Importe") || "0");
            
            if (impuesto === "002") { // IVA
              ivaRetenido = (ivaRetenido || 0) + importe;
            } else if (impuesto === "001") { // ISR
              isrRetenido = (isrRetenido || 0) + importe;
            }
          }
        }
      }

      // Crear objeto factura con todos los campos necesarios
      const invoice: Invoice = {
        id: uuidv4(), // Generar ID único para el sistema
        uuid, // UUID extraído del TimbreFiscalDigital
        
        // Información básica
        series: serie,
        folio: folio,
        date,
        certificateNumber: comprobante.getAttribute("NoCertificado") || undefined,
        paymentMethod: metodoPago || "PUE",
        paymentForm: formaPago || "99",
        cfdiType,
        originalType: tipoDeComprobante,
        cfdiUsage: usoCFDI || "G03",
        
        // Información fiscal
        fiscalYear,
        fiscalRegime: regimenFiscal,
        regimenFiscalReceptor,
        
        // Ubicaciones
        lugarExpedicion,
        domicilioFiscalReceptor,
        
        // Para mantener compatibilidad con código existente
        issuerZipCode: lugarExpedicion,
        receiverZipCode: domicilioFiscalReceptor,
        receiverFiscalRegime: regimenFiscalReceptor,
        
        // Moneda y tipo de cambio
        currency: moneda,
        exchangeRate: tipoCambio,
        
        // Importes
        subtotal: subTotal,
        total: total,
        discount: descuento,
        
        // Impuestos específicos
        tax: ivaTrasladado, // IVA trasladado para compatibilidad
        transferredTaxes: totalImpuestosTrasladados,
        iepsTax: iepsTrasladado,
        retainedTaxes: totalImpuestosRetenidos,
        retainedVat: ivaRetenido,
        retainedIsr: isrRetenido,
        
        // Participantes
        issuerRfc: emisor.getAttribute("Rfc") || "",
        issuerName: emisor.getAttribute("Nombre") || "",
        receiverRfc: receptor.getAttribute("Rfc") || "",
        receiverName: receptor.getAttribute("Nombre") || "",
        
        // Información adicional
        concepts: this.extractConcepts(conceptos),
        
        // Por defecto no está cancelada
        isCancelled: false,
        
        // Asignar categoría de gasto si es egreso
        expenseType: cfdiType === "E" ? "Gastos generales" : undefined,
        
        // Metadata del sistema
        clientId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        xmlContent,
        
        // Campo para guardar cualquier otra información que pueda ser útil
        observations: `Procesado el ${new Date().toLocaleString()}`
      };
      
      return invoice;
    } catch (error) {
      console.error("Error al procesar XML:", error);
      throw new Error(`Error al procesar el archivo CFDI: ${error}`);
    }
  }

  /**
   * Verifica si el documento XML es un CFDI válido
   */
  private static isValidCFDI(xmlDoc: Document): boolean {
    // Verificación básica: existencia del nodo Comprobante con namespace cfdi
    const comprobante = xmlDoc.getElementsByTagName("cfdi:Comprobante");
    return comprobante.length > 0;
  }
  
  /**
   * Obtiene el UUID (TimbreFiscalDigital) del CFDI
   */
  private static getUUID(xmlDoc: Document): string {
    try {
      // Buscar primero dentro del Complemento/TimbreFiscalDigital (forma correcta)
      const timbreFiscalNodes = xmlDoc.getElementsByTagName("tfd:TimbreFiscalDigital");
      if (timbreFiscalNodes.length > 0 && timbreFiscalNodes[0].getAttribute("UUID")) {
        return timbreFiscalNodes[0].getAttribute("UUID") || "";
      }
      
      // Si no encuentra el timbre, buscar en cualquier elemento con atributo UUID
      const allElements = xmlDoc.getElementsByTagName("*");
      for (let i = 0; i < allElements.length; i++) {
        if (allElements[i].getAttribute("UUID")) {
          return allElements[i].getAttribute("UUID") || "";
        }
      }
      
      // Si no encuentra nada, generar un UUID único
      return uuidv4();
    } catch (error) {
      console.warn("Error al extraer UUID:", error);
      return uuidv4();
    }
  }
  
  /**
   * Mapea el tipo de comprobante del CFDI al formato interno
   */
  private static mapCFDIType(tipoDeComprobante: string): 'I' | 'E' | 'P' | 'N' | 'T' {
    const mapping: Record<string, 'I' | 'E' | 'P' | 'N' | 'T'> = {
      'I': 'I', // Ingreso
      'E': 'E', // Egreso
      'P': 'P', // Pago
      'N': 'N', // Nómina
      'T': 'T'  // Traslado
    };
    
    return mapping[tipoDeComprobante] || 'I';
  }
  
  /**
   * Extrae conceptos del CFDI
   */
  private static extractConcepts(conceptoNodes: Element[]): InvoiceConcept[] {
    return conceptoNodes.map(concepto => {
      const concept: InvoiceConcept = {
        id: uuidv4(),
        description: concepto.getAttribute("Descripcion") || "",
        quantity: parseFloat(concepto.getAttribute("Cantidad") || "1"),
        unitValue: parseFloat(concepto.getAttribute("ValorUnitario") || "0"),
        amount: parseFloat(concepto.getAttribute("Importe") || "0"),
        unitMeasure: concepto.getAttribute("ClaveUnidad") || "",
        productCode: concepto.getAttribute("ClaveProdServ") || undefined,
        taxes: this.extractConceptTaxes(concepto)
      };
      
      return concept;
    });
  }
  
  /**
   * Extrae impuestos por concepto
   */
  private static extractConceptTaxes(conceptoNode: Element): ConceptTax[] {
    const taxes: ConceptTax[] = [];
    
    try {
      // Buscar nodo de impuestos en el concepto
      const impuestos = conceptoNode.getElementsByTagName("cfdi:Impuestos")[0];
      if (!impuestos) return taxes;
      
      // Procesar traslados
      const traslados = impuestos.getElementsByTagName("cfdi:Traslados")[0];
      if (traslados) {
        const trasladosList = traslados.getElementsByTagName("cfdi:Traslado");
        for (let i = 0; i < trasladosList.length; i++) {
          const traslado = trasladosList[i];
          const impuesto = traslado.getAttribute("Impuesto") || "";
          
          const tax: ConceptTax = {
            type: 'transfer',
            taxType: this.mapTaxType(impuesto),
            base: parseFloat(traslado.getAttribute("Base") || "0"),
            rate: parseFloat(traslado.getAttribute("TasaOCuota") || "0"),
            amount: parseFloat(traslado.getAttribute("Importe") || "0")
          };
          
          taxes.push(tax);
        }
      }
      
      // Procesar retenciones
      const retenciones = impuestos.getElementsByTagName("cfdi:Retenciones")[0];
      if (retenciones) {
        const retencionesList = retenciones.getElementsByTagName("cfdi:Retencion");
        for (let i = 0; i < retencionesList.length; i++) {
          const retencion = retencionesList[i];
          const impuesto = retencion.getAttribute("Impuesto") || "";
          
          const tax: ConceptTax = {
            type: 'withholding',
            taxType: this.mapTaxType(impuesto),
            base: parseFloat(retencion.getAttribute("Base") || "0"),
            rate: parseFloat(retencion.getAttribute("TasaOCuota") || "0"),
            amount: parseFloat(retencion.getAttribute("Importe") || "0")
          };
          
          taxes.push(tax);
        }
      }
    } catch (error) {
      console.warn("Error al extraer impuestos del concepto:", error);
    }
    
    return taxes;
  }
  
  /**
   * Mapea el código de impuesto a su tipo
   */
  private static mapTaxType(impuesto: string): 'IVA' | 'ISR' | 'IEPS' {
    const mapping: Record<string, 'IVA' | 'ISR' | 'IEPS'> = {
      '001': 'ISR',
      '002': 'IVA',
      '003': 'IEPS'
    };
    
    return mapping[impuesto] || 'IVA';
  }
}

/**
 * Procesa múltiples archivos XML de CFDI
 * @param files Archivos XML a procesar
 * @param clientId ID del cliente
 * @param clientRFC RFC del cliente para determinar si es ingreso o egreso
 * @returns Promise con arreglo de facturas procesadas
 */
export async function processCFDIFiles(files: File[], clientId: string, clientRFC: string): Promise<Invoice[]> {
  const invoices: Invoice[] = [];
  const processedUUIDs = new Set<string>(); // Para evitar duplicados
  
  console.log(`Iniciando procesamiento de ${files.length} archivos para cliente con RFC: ${clientRFC}`);
  
  for (const file of files) {
    try {
      console.log(`Procesando archivo: ${file.name}`);
      const xmlContent = await file.text();
      
      // Usar la clase CFDIParser para procesar el XML
      const invoice = CFDIParser.parseXMLToInvoice(xmlContent, clientId);
      
      // Evitar duplicados por UUID
      if (processedUUIDs.has(invoice.uuid)) {
        console.warn(`El archivo ${file.name} con UUID ${invoice.uuid} ya fue procesado anteriormente.`);
        continue;
      }
      
      // Agregar UUID al set de procesados
      processedUUIDs.add(invoice.uuid);
      
      // Determinar si el CFDI es un ingreso o egreso para el cliente basado en el RFC
      const normalizeRFC = (rfc: string) => rfc.trim().toUpperCase();
      const clientRfcNorm = normalizeRFC(clientRFC);
      const issuerRfcNorm = normalizeRFC(invoice.issuerRfc);
      const receiverRfcNorm = normalizeRFC(invoice.receiverRfc);
      
      // Si el cliente es el emisor, es una factura emitida (ingreso)
      // Si el cliente es el receptor, es una factura recibida (egreso)
      if (issuerRfcNorm === clientRfcNorm) {
        invoice.cfdiType = 'I'; // Emitida por el cliente = ingreso
        console.log(`Factura ${invoice.uuid} clasificada como Emitida: Cliente ${clientRfcNorm} es el Emisor`);
      } else if (receiverRfcNorm === clientRfcNorm) {
        invoice.cfdiType = 'E'; // Recibida por el cliente = egreso
        console.log(`Factura ${invoice.uuid} clasificada como Recibida: Cliente ${clientRfcNorm} es el Receptor`);
      } else {
        console.warn(`El archivo ${file.name} no está relacionado con el cliente ${clientRFC}`);
        continue; // No agregamos facturas que no correspondan al cliente
      }
      
      // Agregar la factura al array
      invoices.push(invoice);
      console.log(`Factura agregada al arreglo, tipo: ${invoice.cfdiType}, total: ${invoice.total}`);
      
    } catch (error) {
      console.error(`Error procesando archivo ${file.name}:`, error);
    }
  }
  
  console.log(`Procesamiento completado. Facturas generadas: ${invoices.length}`);
  console.log(`Emitidas: ${invoices.filter(inv => inv.cfdiType === 'I').length}, Recibidas: ${invoices.filter(inv => inv.cfdiType === 'E').length}`);
  
  return invoices;
}
