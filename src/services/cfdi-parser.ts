import { Invoice } from '@/models/Invoice';
import { v4 as uuidv4 } from 'uuid';
import { XMLParser } from 'fast-xml-parser';

/**
 * Procesa archivos CFDI (XML) y los convierte en objetos Invoice
 */
export async function processCFDIFiles(files: File[], clientId: string, clientRfc: string): Promise<Invoice[]> {
  const invoices: Invoice[] = [];
  const processedUUIDs = new Set<string>(); // Para evitar duplicados
  
  // First process all invoices normally
  for (const file of files) {
    try {
      const xmlContent = await readFileAsText(file);
      
      // Parsear el XML directamente
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
      });
      
      const result = parser.parse(xmlContent);
      
      // Obtener el nodo principal Comprobante
      const comprobante = result['cfdi:Comprobante'] || result.Comprobante;
      if (!comprobante) {
        continue;
      }
      
      // Obtener TimbreFiscalDigital para el UUID
      let uuid = '';
      try {
        const complemento = comprobante['cfdi:Complemento'] || comprobante.Complemento || {};
        const timbreFiscal = complemento['tfd:TimbreFiscalDigital'] || complemento.TimbreFiscalDigital || {};
        uuid = timbreFiscal.UUID || uuidv4(); // Usar un UUID generado si no está disponible
      } catch (error) {
        uuid = uuidv4();
      }
      
      // Si ya procesamos este UUID, continuar con el siguiente archivo
      if (processedUUIDs.has(uuid)) {
        continue;
      }
      
      // Extraer información del emisor y receptor
      const emisor = comprobante['cfdi:Emisor'] || comprobante.Emisor || {};
      const receptor = comprobante['cfdi:Receptor'] || comprobante.Receptor || {};
      
      // Obtener información básica de la factura
      const fecha = (comprobante.Fecha || '').split('T')[0];
      const ejercicioFiscal = fecha ? new Date(fecha).getFullYear() : new Date().getFullYear();
      
      // Normalizar RFCs para comparación
      const rfcEmisor = (emisor.Rfc || '').trim().toUpperCase();
      const rfcReceptor = (receptor.Rfc || '').trim().toUpperCase();
      const clientRfcNormalizado = clientRfc.trim().toUpperCase();
      
      // Determinar si la factura es recibida
      const recibida = rfcReceptor === clientRfcNormalizado;
      
      // Impuestos y montos
      const subTotal = parseFloat(comprobante.SubTotal) || 0;
      const total = parseFloat(comprobante.Total) || 0;
      const descuento = comprobante.Descuento ? parseFloat(comprobante.Descuento) : undefined;
      
      // Extraer datos de impuestos
      const impuestos = comprobante['cfdi:Impuestos'] || comprobante.Impuestos || {};
      
      // Procesamiento de impuestos
      let impuestoTrasladado = 0;
      let ivaRetenido = 0;
      let isrRetenido = 0;
      let iepsTrasladado = 0;
      
      // Valores para deducibilidad
      let gravado = 0;
      let tasa0 = 0;
      let exento = 0;
      
      // Procesar traslados
      try {
        const traslados = impuestos['cfdi:Traslados'] || impuestos.Traslados || {};
        const trasladosArray = traslados['cfdi:Traslado'] || traslados.Traslado || [];
        const trasladosList = Array.isArray(trasladosArray) ? trasladosArray : [trasladosArray];
        
        for (const traslado of trasladosList) {
          if (!traslado) continue;
          
          const impuesto = traslado.Impuesto || '';
          const importe = parseFloat(traslado.Importe) || 0;
          const base = parseFloat(traslado.Base) || 0;
          const tasa = parseFloat(traslado.TasaOCuota) || 0;
          
          // Clasificar importes por tasa
          if (tasa > 0) {
            gravado += base;
            if (impuesto === '002' || impuesto === 'IVA') {
              impuestoTrasladado += importe;
            } else if (impuesto === '003' || impuesto === 'IEPS') {
              iepsTrasladado += importe;
            }
          } else if (tasa === 0) {
            tasa0 += base;
          }
        }
      } catch (error) {
        // Ignorar errores en procesamiento de traslados
      }
      
      // Procesar retenciones
      try {
        const retenciones = impuestos['cfdi:Retenciones'] || impuestos.Retenciones || {};
        const retencionesArray = retenciones['cfdi:Retencion'] || retenciones.Retencion || [];
        const retencionesList = Array.isArray(retencionesArray) ? retencionesArray : [retencionesArray];
        
        for (const retencion of retencionesList) {
          if (!retencion) continue;
          
          const impuesto = retencion.Impuesto || '';
          const importe = parseFloat(retencion.Importe) || 0;
          
          if (impuesto === '002' || impuesto === 'IVA') {
            ivaRetenido += importe;
          } else if (impuesto === '001' || impuesto === 'ISR') {
            isrRetenido += importe;
          }
        }
      } catch (error) {
        // Ignorar errores en procesamiento de retenciones
      }
      
      // Detectar conceptos exentos
      try {
        const conceptosNode = comprobante['cfdi:Conceptos'] || comprobante.Conceptos || {};
        const conceptosArray = conceptosNode['cfdi:Concepto'] || conceptosNode.Concepto || [];
        const conceptosList = Array.isArray(conceptosArray) ? conceptosArray : [conceptosArray];
        
        for (const concepto of conceptosList) {
          if (!concepto) continue;
          
          const importe = parseFloat(concepto.Importe) || 0;
          const impuestosConcepto = concepto['cfdi:Impuestos'] || concepto.Impuestos || {};
          
          // Si el concepto no tiene impuestos, considerarlo exento
          if (!impuestosConcepto.Traslados && !impuestosConcepto.Retenciones) {
            exento += importe;
          }
        }
      } catch (error) {
        // Ignorar errores
      }
      
      // Si no se pudo calcular gravado o tasa0, derivar de los totales
      if (gravado <= 0 && tasa0 <= 0 && exento <= 0) {
        // Si hay IVA, asumir que todo es gravado
        if (impuestoTrasladado > 0) {
          gravado = subTotal;
        } else {
          // Si no hay IVA, asumir que todo es tasa 0
          tasa0 = subTotal;
        }
      }
      
      // Extraer documentos relacionados en complemento de pago
      let docsRelacionados: string[] = [];
      try {
        const complemento = comprobante['cfdi:Complemento'] || comprobante.Complemento || {};
        
        // Buscar el nodo de Pagos (versión 2.0 o anterior)
        const pagos = complemento['pago20:Pagos'] || complemento['pagos:Pagos'] || complemento.Pagos || {};
        
        // Obtener los pagos (puede haber múltiples)
        const pagosArray = pagos['pago20:Pago'] || pagos['pagos:Pago'] || pagos.Pago || [];
        const pagosList = Array.isArray(pagosArray) ? pagosArray : [pagosArray];
        
        // Procesar cada pago
        for (const pago of pagosList) {
          if (!pago) continue;
          
          // Obtener documentos relacionados
          const docRelArray = pago['pago20:DoctoRelacionado'] || pago['pagos:DoctoRelacionado'] || pago.DoctoRelacionado || [];
          const docRelList = Array.isArray(docRelArray) ? docRelArray : [docRelArray];
          
          // Extraer el UUID (IdDocumento) de cada documento relacionado
          for (const docRel of docRelList) {
            if (docRel && docRel.IdDocumento) {
              docsRelacionados.push(docRel.IdDocumento);
            }
          }
        }
      } catch (error) {
        // Ignorar errores en procesamiento de documentos relacionados
      }
      
      // Check for cancellation date - new code
      let fechaCancelacion: string | undefined = undefined;
      try {
        // Check for cancellation in different potential places
        const complemento = comprobante['cfdi:Complemento'] || comprobante.Complemento || {};
        
        // Check in cancellation node
        const cancelacion = complemento['cancelacion:Cancelacion'] || 
                           complemento['cancelacioncfdi:Cancelacion'] || 
                           complemento.Cancelacion;
        
        if (cancelacion && cancelacion.FechaCancelacion) {
          fechaCancelacion = cancelacion.FechaCancelacion;
        }
        
        // Check for cancellation status in the invoice status attributes
        if (comprobante.EstadoComprobante && (
            comprobante.EstadoComprobante.toUpperCase() === 'CANCELADO' || 
            comprobante.EstadoComprobante.toUpperCase() === 'CANCELLED')) {
          // If we know it's cancelled but don't have a date, use the timestamp from the digital stamp
          if (!fechaCancelacion && timbreFiscal && timbreFiscal.FechaTimbrado) {
            fechaCancelacion = timbreFiscal.FechaTimbrado;
          }
        }
        
        // Check for cancellation date attribute directly on comprobante (newer CFDIs)
        if (comprobante.FechaCancelacion) {
          fechaCancelacion = comprobante.FechaCancelacion;
        }
      } catch (error) {
        // Ignore errors in cancellation processing
      }
      
      // Check if the invoice is cancelled based on the data found
      const estaCancelado = !!fechaCancelacion || 
                         (comprobante.EstadoComprobante && 
                          comprobante.EstadoComprobante.toUpperCase() === 'CANCELADO');
      
      // Determine if it's an annual deduction based on usoCFDI
      const usoCFDI = receptor.UsoCFDI || 'G03';
      const isAnnual = usoCFDI.startsWith('D');
      
      // Crear objeto factura con solo los campos definidos en la interfaz
      const invoice: Invoice = {
        id: uuid, // This is now the primary identifier
        idCliente: clientId,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        contenidoXml: xmlContent,
        recibida,
        fecha: ensureDefined(fecha, ''),
        tipoDeComprobante: ensureDefined(comprobante.TipoDeComprobante, ''),
        rfcReceptor: ensureDefined(rfcReceptor, ''),
        nombreReceptor: ensureDefined(receptor.Nombre, ''),
        domicilioFiscalReceptor: ensureDefined(receptor.DomicilioFiscalReceptor, ''),
        regimenFiscalReceptor: ensureDefined(receptor.RegimenFiscalReceptor, ''),
        usoCFDI: ensureDefined(usoCFDI, 'G03'),
        anual: isAnnual,
        rfcEmisor: ensureDefined(rfcEmisor, ''),
        nombreEmisor: ensureDefined(emisor.Nombre, ''),
        lugarExpedicion: ensureDefined(comprobante.LugarExpedicion, ''),
        regimenFiscal: ensureDefined(emisor.RegimenFiscal, ''),
        serie: ensureDefined(comprobante.Serie, ''),
        folio: ensureDefined(comprobante.Folio, ''),
        uuid: ensureDefined(uuid, ''),
        metodoPago: ensureDefined(comprobante.MetodoPago, 'PUE'),
        numCtaPago: ensureDefined(comprobante.NumCtaPago, ''),
        formaPago: ensureDefined(comprobante.FormaPago, '99'),
        moneda: ensureDefined(comprobante.Moneda, 'MXN'),
        tipoCambio: ensureDefined(comprobante.TipoCambio, '1'),
        subTotal: ensureDefined(subTotal, 0),
        impuestosTrasladados: ensureDefined((impuestoTrasladado + iepsTrasladado), 0),
        impuestoTrasladado: ensureDefined(impuestoTrasladado, 0),
        iepsTrasladado: ensureDefined(iepsTrasladado, 0),
        impuestoRetenido: ensureDefined((ivaRetenido + isrRetenido), 0),
        ivaRetenido: ensureDefined(ivaRetenido, 0),
        isrRetenido: ensureDefined(isrRetenido, 0),
        descuento: ensureDefined(descuento, 0),
        total: ensureDefined(total, 0),
        estaCancelado: ensureDefined(estaCancelado, false),
        fechaCancelación: ensureDefined(fechaCancelacion, ''),
        Tasa0: ensureDefined(tasa0, 0),
        Exento: ensureDefined(exento, 0),
        noCertificado: ensureDefined(comprobante.NoCertificado, ''),
        ejercicioFiscal: ensureDefined(ejercicioFiscal, new Date().getFullYear()),
        esDeducible: false,
        docsRelacionadoComplementoPago: ensureDefined(docsRelacionados, [])
      };
      
      // Añadir UUID al set para evitar duplicados
      processedUUIDs.add(uuid);
      
      // Añadir factura al array de resultados
      invoices.push(invoice);
      
    } catch (error) {
      // Continuar con el siguiente archivo si hay un error
    }
  }
  
  // Post-processing: update invoices that are referenced in payment complements
  const paymentComplementMap = new Map<string, string[]>(); // UUID -> [Payment Complement UUIDs]
  
  // First, identify all payment complements and their referenced documents
  invoices.forEach(invoice => {
    if (invoice.tipoDeComprobante === 'P' && invoice.docsRelacionadoComplementoPago.length > 0) {
      // This is a payment complement, store references to all documents it pays
      invoice.docsRelacionadoComplementoPago.forEach(referencedUUID => {
        const normalizedUUID = referencedUUID.toUpperCase();
        if (!paymentComplementMap.has(normalizedUUID)) {
          paymentComplementMap.set(normalizedUUID, []);
        }
        paymentComplementMap.get(normalizedUUID)?.push(invoice.uuid);
      });
    }
  });
  
  // Second, update regular invoices with payment information
  invoices.forEach(invoice => {
    if (invoice.tipoDeComprobante !== 'P') {
      // Check if this invoice is referenced in any payment complement
      const normalizedUUID = invoice.uuid.toUpperCase();
      if (paymentComplementMap.has(normalizedUUID)) {
        // This invoice has been paid through payment complement(s)
        const paymentComplements = paymentComplementMap.get(normalizedUUID) || [];
        
        // Add these payment complements to the invoice's references
        invoice.pagadoConComplementos = paymentComplements;
        
        // If the invoice has PPD payment method, it needs a complement to be considered paid
        if (invoice.metodoPago === 'PPD') {
          // Automatically set the payment month based on payment date if available
          // For now we just mark it as paid
          invoice.pagado = true;
        }
      }
    }
  });
  
  return invoices;
}

/**
 * Lee un archivo como texto
 */
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        resolve(event.target.result);
      } else {
        reject(new Error('Error leyendo el archivo'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

// Helper function to handle undefined values
function ensureDefined<T>(value: T | undefined, defaultValue: T): T {
  return value !== undefined ? value : defaultValue;
}
