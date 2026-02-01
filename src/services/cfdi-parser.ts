import { CFDI, CFDIConcepto, ConceptoImpuesto, CfdiRelacionado, PagoComplemento, DoctoRelacionadoPago } from '@/models/CFDI';
import { v4 as uuidv4 } from 'uuid';
import { XMLParser } from 'fast-xml-parser';

/**
 * Procesa archivos CFDI (XML) y los convierte en objetos CFDI
 */
export async function processCFDIFiles(files: File[], clientId: string, clientRfc: string): Promise<CFDI[]> {
  const cfdis: CFDI[] = [];
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
      
      // Valores para deducibilidad - desglose por tasa de IVA
      let baseIva16 = 0;  // Base gravada al 16%
      let baseIva8 = 0;   // Base gravada al 8% (frontera)
      let tasa0 = 0;      // Base gravada al 0%
      let exento = 0;     // Base exenta
      
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
          const tipoFactor = traslado.TipoFactor || '';
          
          // Clasificar por tipo de impuesto y tasa
          if (impuesto === '002' || impuesto === 'IVA') {
            impuestoTrasladado += importe;
            
            // Clasificar base por tasa de IVA
            if (tipoFactor === 'Exento') {
              exento += base;
            } else if (tasa === 0.16 || tasa === 0.160000) {
              baseIva16 += base;
            } else if (tasa === 0.08 || tasa === 0.080000) {
              baseIva8 += base;
            } else if (tasa === 0) {
              tasa0 += base;
            }
          } else if (impuesto === '003' || impuesto === 'IEPS') {
            iepsTrasladado += importe;
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
      
      // Detectar conceptos exentos y extraer desglose
      const conceptosArray: CFDIConcepto[] = [];
      let conceptoResumen = '';
      try {
        const conceptosNode = comprobante['cfdi:Conceptos'] || comprobante.Conceptos || {};
        const conceptosXml = conceptosNode['cfdi:Concepto'] || conceptosNode.Concepto || [];
        const conceptosList = Array.isArray(conceptosXml) ? conceptosXml : [conceptosXml];

        for (const concepto of conceptosList) {
          if (!concepto) continue;
          
          const importe = parseFloat(concepto.Importe) || 0;
          const impuestosConcepto = concepto['cfdi:Impuestos'] || concepto.Impuestos || {};
          
          // Si el concepto no tiene impuestos, considerarlo exento
          if (!impuestosConcepto.Traslados && !impuestosConcepto.Retenciones && 
              !impuestosConcepto['cfdi:Traslados'] && !impuestosConcepto['cfdi:Retenciones']) {
            exento += importe;
          }
          
          // Extraer impuestos del concepto
          const trasladosConcepto: ConceptoImpuesto[] = [];
          const retencionesConcepto: ConceptoImpuesto[] = [];
          
          try {
            const trasladosNode = impuestosConcepto['cfdi:Traslados'] || impuestosConcepto.Traslados || {};
            const trasladosXml = trasladosNode['cfdi:Traslado'] || trasladosNode.Traslado || [];
            const trasladosList = Array.isArray(trasladosXml) ? trasladosXml : (trasladosXml ? [trasladosXml] : []);
            
            for (const traslado of trasladosList) {
              if (!traslado) continue;
              trasladosConcepto.push({
                base: parseFloat(traslado.Base) || 0,
                impuesto: traslado.Impuesto || '',
                tipoFactor: traslado.TipoFactor || 'Tasa',
                tasaOCuota: traslado.TasaOCuota ? parseFloat(traslado.TasaOCuota) : undefined,
                importe: traslado.Importe ? parseFloat(traslado.Importe) : undefined,
              });
            }
            
            const retencionesNode = impuestosConcepto['cfdi:Retenciones'] || impuestosConcepto.Retenciones || {};
            const retencionesXml = retencionesNode['cfdi:Retencion'] || retencionesNode.Retencion || [];
            const retencionesList = Array.isArray(retencionesXml) ? retencionesXml : (retencionesXml ? [retencionesXml] : []);
            
            for (const retencion of retencionesList) {
              if (!retencion) continue;
              retencionesConcepto.push({
                base: parseFloat(retencion.Base) || 0,
                impuesto: retencion.Impuesto || '',
                tipoFactor: retencion.TipoFactor || 'Tasa',
                tasaOCuota: retencion.TasaOCuota ? parseFloat(retencion.TasaOCuota) : undefined,
                importe: retencion.Importe ? parseFloat(retencion.Importe) : undefined,
              });
            }
          } catch (e) {
            // Ignorar errores en impuestos de concepto
          }
          
          // Agregar el concepto al array
          const cfdiConcepto: CFDIConcepto = {
            claveProdServ: concepto.ClaveProdServ || '',
            noIdentificacion: concepto.NoIdentificacion || undefined,
            cantidad: parseFloat(concepto.Cantidad) || 0,
            claveUnidad: concepto.ClaveUnidad || '',
            unidad: concepto.Unidad || undefined,
            descripcion: concepto.Descripcion || '',
            valorUnitario: parseFloat(concepto.ValorUnitario) || 0,
            importe: importe,
            descuento: concepto.Descuento ? parseFloat(concepto.Descuento) : undefined,
            objetoImp: concepto.ObjetoImp || undefined,
          };
          
          // Solo agregar impuestos si existen
          if (trasladosConcepto.length > 0 || retencionesConcepto.length > 0) {
            cfdiConcepto.impuestos = {
              ...(trasladosConcepto.length > 0 && { traslados: trasladosConcepto }),
              ...(retencionesConcepto.length > 0 && { retenciones: retencionesConcepto }),
            };
          }
          
          conceptosArray.push(cfdiConcepto);
          
          // Guardar el primer concepto como resumen
          if (!conceptoResumen && concepto.Descripcion) {
            conceptoResumen = concepto.Descripcion;
          }
        }
      } catch (error) {
        // Ignorar errores
      }
      
      // Extraer CFDIs relacionados
      const cfdiRelacionados: CfdiRelacionado[] = [];
      try {
        const cfdiRelacionadosNode = comprobante['cfdi:CfdiRelacionados'] || comprobante.CfdiRelacionados;
        if (cfdiRelacionadosNode) {
          const relacionadosNodeList = Array.isArray(cfdiRelacionadosNode) ? cfdiRelacionadosNode : [cfdiRelacionadosNode];
          
          for (const relacionadosNode of relacionadosNodeList) {
            const tipoRelacion = relacionadosNode.TipoRelacion || '';
            const relacionadosXml = relacionadosNode['cfdi:CfdiRelacionado'] || relacionadosNode.CfdiRelacionado || [];
            const relacionadosList = Array.isArray(relacionadosXml) ? relacionadosXml : (relacionadosXml ? [relacionadosXml] : []);
            
            for (const relacionado of relacionadosList) {
              if (relacionado) {
                cfdiRelacionados.push({
                  uuid: relacionado.UUID || relacionado,
                  tipoRelacion: tipoRelacion,
                });
              }
            }
          }
        }
      } catch (error) {
        // Ignorar errores en CFDIs relacionados
      }
      
      // Si no se pudo clasificar las bases, derivar de los totales
      const totalBases = baseIva16 + baseIva8 + tasa0 + exento;
      if (totalBases <= 0) {
        // Si hay IVA, asumir que todo es gravado al 16%
        if (impuestoTrasladado > 0) {
          baseIva16 = subTotal;
        } else {
          // Si no hay IVA, asumir que todo es tasa 0%
          tasa0 = subTotal;
        }
      }
      
      // Extraer documentos relacionados y detalle de complemento de pago
      let docsRelacionados: string[] = [];
      const pagosComplemento: PagoComplemento[] = [];
      
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
          
          // Extraer detalle del pago
          const doctosRelacionados: DoctoRelacionadoPago[] = [];
          
          // Obtener documentos relacionados
          const docRelArray = pago['pago20:DoctoRelacionado'] || pago['pagos:DoctoRelacionado'] || pago.DoctoRelacionado || [];
          const docRelList = Array.isArray(docRelArray) ? docRelArray : [docRelArray];
          
          // Extraer el detalle de cada documento relacionado
          for (const docRel of docRelList) {
            if (docRel && docRel.IdDocumento) {
              docsRelacionados.push(docRel.IdDocumento);
              
              doctosRelacionados.push({
                idDocumento: docRel.IdDocumento,
                serie: docRel.Serie || undefined,
                folio: docRel.Folio || undefined,
                monedaDR: docRel.MonedaDR || 'MXN',
                equivalenciaDR: docRel.EquivalenciaDR ? parseFloat(docRel.EquivalenciaDR) : undefined,
                numParcialidad: docRel.NumParcialidad ? parseInt(docRel.NumParcialidad) : undefined,
                impSaldoAnt: docRel.ImpSaldoAnt ? parseFloat(docRel.ImpSaldoAnt) : undefined,
                impPagado: docRel.ImpPagado ? parseFloat(docRel.ImpPagado) : undefined,
                impSaldoInsoluto: docRel.ImpSaldoInsoluto ? parseFloat(docRel.ImpSaldoInsoluto) : undefined,
                objetoImpDR: docRel.ObjetoImpDR || undefined,
              });
            }
          }
          
          // Crear objeto de pago completo
          if (doctosRelacionados.length > 0) {
            pagosComplemento.push({
              fechaPago: pago.FechaPago || '',
              formaPago: pago.FormaDePagoP || pago.FormaPago || '',
              moneda: pago.MonedaP || pago.Moneda || 'MXN',
              tipoCambio: pago.TipoCambioP ? parseFloat(pago.TipoCambioP) : undefined,
              monto: parseFloat(pago.Monto) || 0,
              numOperacion: pago.NumOperacion || undefined,
              rfcEmisorCtaOrd: pago.RfcEmisorCtaOrd || undefined,
              ctaOrdenante: pago.CtaOrdenante || undefined,
              rfcEmisorCtaBen: pago.RfcEmisorCtaBen || undefined,
              ctaBeneficiario: pago.CtaBeneficiario || undefined,
              doctoRelacionados: doctosRelacionados,
            });
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
      
      // Calcular mes fiscal
      const mesFiscal = fecha ? new Date(fecha).getMonth() + 1 : undefined;
      
      // Calcular tipo de cambio numérico y total en MXN
      const tipoCambioNum = parseFloat(comprobante.TipoCambio) || 1;
      const moneda = comprobante.Moneda || 'MXN';
      const totalMXN = moneda !== 'MXN' ? total * tipoCambioNum : undefined;
      
      // Crear objeto CFDI con solo los campos definidos en la interfaz
      // esIngreso = factura emitida (nosotros facturamos al cliente)
      // esEgreso = factura recibida (proveedor nos factura a nosotros)
      const esEgreso = rfcReceptor === clientRfcNormalizado;
      const esIngreso = !esEgreso;
      
      const cfdi: CFDI = {
        id: uuid, // This is now the primary identifier
        idCliente: clientId,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        contenidoXml: xmlContent,
        esIngreso,
        esEgreso,
        recibida: esEgreso, // Mantener por compatibilidad
        fecha: ensureDefined(fecha, ''),
        tipoDeComprobante: ensureDefined(comprobante.TipoDeComprobante, ''),
        version: ensureDefined(comprobante.Version, '4.0'),
        exportacion: ensureDefined(comprobante.Exportacion, '01'),
        rfcReceptor: ensureDefined(rfcReceptor, ''),
        nombreReceptor: ensureDefined(receptor.Nombre, ''),
        domicilioFiscalReceptor: ensureDefined(receptor.DomicilioFiscalReceptor, ''),
        regimenFiscalReceptor: ensureDefined(receptor.RegimenFiscalReceptor, ''),
        usoCFDI: ensureDefined(usoCFDI, 'G03'),
        // Remove default deductibility values
        anual: undefined, // Don't set this automatically
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
        condicionesDePago: ensureDefined(comprobante.CondicionesDePago, ''),
        moneda: ensureDefined(moneda, 'MXN'),
        tipoCambio: tipoCambioNum,
        totalMXN: totalMXN,
        subTotal: ensureDefined(subTotal, 0),
        impuestosTrasladados: ensureDefined((impuestoTrasladado + iepsTrasladado), 0),
        impuestoTrasladado: ensureDefined(impuestoTrasladado, 0),
        iepsTrasladado: ensureDefined(iepsTrasladado, 0),
        // Bases desglosadas por tasa de IVA
        baseIva16: baseIva16 > 0 ? baseIva16 : undefined,
        baseIva8: baseIva8 > 0 ? baseIva8 : undefined,
        ivaTasa0: tasa0 > 0 ? tasa0 : undefined,
        exento: exento > 0 ? exento : undefined,
        // Retenciones
        impuestoRetenido: ensureDefined((ivaRetenido + isrRetenido), 0),
        ivaRetenido: ensureDefined(ivaRetenido, 0),
        isrRetenido: ensureDefined(isrRetenido, 0),
        descuento: ensureDefined(descuento, 0),
        total: ensureDefined(total, 0),
        estaCancelado: ensureDefined(estaCancelado, false),
        fechaCancelación: ensureDefined(fechaCancelacion, ''),
        noCertificado: ensureDefined(comprobante.NoCertificado, ''),
        ejercicioFiscal: ensureDefined(ejercicioFiscal, new Date().getFullYear()),
        mesFiscal: mesFiscal,
        // Conceptos/Items
        conceptos: conceptosArray.length > 0 ? conceptosArray : undefined,
        concepto: ensureDefined(conceptoResumen, ''),
        // CFDIs relacionados
        cfdiRelacionados: cfdiRelacionados.length > 0 ? cfdiRelacionados : undefined,
        // Complemento de pago
        docsRelacionadoComplementoPago: ensureDefined(docsRelacionados, []),
        pagos: pagosComplemento.length > 0 ? pagosComplemento : undefined,
        // IMPORTANT: Don't set deductibility status or month - keep these undefined 
        // so they need explicit evaluation
        esDeducible: undefined,
        mesDeduccion: undefined,
      };
      
      // Añadir UUID al set para evitar duplicados
      processedUUIDs.add(uuid);
      
      // Añadir CFDI al array de resultados
      cfdis.push(cfdi);
      
    } catch (error) {
      // Continuar con el siguiente archivo si hay un error
    }
  }
  
  // Post-processing: update CFDIs that are referenced in payment complements
  const paymentComplementMap = new Map<string, string[]>(); // UUID -> [Payment Complement UUIDs]
  
  // First, identify all payment complements and their referenced documents
  cfdis.forEach(cfdi => {
    if (cfdi.tipoDeComprobante === 'P' && cfdi.docsRelacionadoComplementoPago.length > 0) {
      // This is a payment complement, store references to all documents it pays
      cfdi.docsRelacionadoComplementoPago.forEach(referencedUUID => {
        const normalizedUUID = referencedUUID.toUpperCase();
        if (!paymentComplementMap.has(normalizedUUID)) {
          paymentComplementMap.set(normalizedUUID, []);
        }
        paymentComplementMap.get(normalizedUUID)?.push(cfdi.uuid);
      });
    }
  });
  
  // Second, update regular CFDIs with payment information
  cfdis.forEach(cfdi => {
    if (cfdi.tipoDeComprobante !== 'P') {
      // Check if this CFDI is referenced in any payment complement
      const normalizedUUID = cfdi.uuid.toUpperCase();
      if (paymentComplementMap.has(normalizedUUID)) {
        // This CFDI has been paid through payment complement(s)
        const paymentComplements = paymentComplementMap.get(normalizedUUID) || [];
        
        // Add these payment complements to the CFDI's references
        cfdi.pagadoConComplementos = paymentComplements;
        
        // If the CFDI has PPD payment method, it needs a complement to be considered paid
        if (cfdi.metodoPago === 'PPD') {
          // Automatically set the payment month based on payment date if available
          // For now we just mark it as paid
          cfdi.pagado = true;
        }
      }
    }
  });
  
  return cfdis;
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
