/* eslint-disable
  object-curly-spacing,
  comma-dangle,
  max-len,
  @typescript-eslint/no-explicit-any
*/

import {XMLParser} from "fast-xml-parser";

// ============================================
// TIPOS MÍNIMOS (equivalentes a @/models/CFDI)
// ============================================

export interface ConceptoImpuesto {
  base: number;
  impuesto: string;
  tipoFactor: string;
  tasaOCuota?: number;
  importe?: number;
}

export interface CFDIConcepto {
  claveProdServ: string;
  noIdentificacion?: string;
  cantidad: number;
  claveUnidad: string;
  unidad?: string;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  descuento?: number;
  objetoImp?: string;
  impuestos?: {
    traslados?: ConceptoImpuesto[];
    retenciones?: ConceptoImpuesto[];
  };
}

export interface CfdiRelacionado {
  uuid: string;
  tipoRelacion: string;
}

export interface DoctoRelacionadoPago {
  idDocumento: string;
  serie?: string;
  folio?: string;
  monedaDR: string;
  equivalenciaDR?: number;
  numParcialidad?: number;
  impSaldoAnt?: number;
  impPagado?: number;
  impSaldoInsoluto?: number;
  objetoImpDR?: string;
}

export interface PagoComplemento {
  fechaPago: string;
  formaPago: string;
  moneda: string;
  tipoCambio?: number;
  monto: number;
  numOperacion?: string;
  rfcEmisorCtaOrd?: string;
  ctaOrdenante?: string;
  rfcEmisorCtaBen?: string;
  ctaBeneficiario?: string;
  doctoRelacionados: DoctoRelacionadoPago[];
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Parsea una fecha string evitando desfase de zona horaria
 * @param {string | undefined | null} dateString - fecha a parsear
 * @return {Date} fecha parseada
 */
function parseLocalDate(dateString: string | undefined | null): Date {
  if (!dateString) return new Date();
  if (dateString.includes("T") && dateString.length > 10) {
    return new Date(dateString);
  }
  return new Date(`${dateString}T12:00:00`);
}

/**
 * Helper para valores undefined
 * @param {T} value - valor a verificar
 * @param {T} defaultValue - valor por defecto
 * @return {T} valor definido
 */
function ensureDefined<T>(value: T | undefined, defaultValue: T): T {
  return value !== undefined ? value : defaultValue;
}

// ============================================
// PARSER XML
// ============================================

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

/**
 * Parsea un XML CFDI y devuelve un objeto listo para guardar en Firestore.
 * Puerto completo del parser del frontend (src/services/cfdi-parser.ts).
 * @param {string} xmlContent - contenido XML del CFDI
 * @param {string} clientId - ID del cliente en Firestore
 * @param {string} clientRfc - RFC del cliente
 * @return {Record<string, any> | null} objeto CFDI parseado o null
 */
export function parseCFDIFromString(
  xmlContent: string,
  clientId: string,
  clientRfc: string
): Record<string, any> | null {
  try {
    const result = xmlParser.parse(xmlContent);
    const comprobante = result["cfdi:Comprobante"] || result.Comprobante;
    if (!comprobante) return null;

    // UUID del timbre fiscal
    let uuid = "";
    try {
      const complemento = comprobante["cfdi:Complemento"] || comprobante.Complemento || {};
      const timbre = complemento["tfd:TimbreFiscalDigital"] || complemento.TimbreFiscalDigital || {};
      uuid = timbre.UUID || "";
      if (!uuid) return null; // No timbrado
    } catch {
      return null;
    }

    // Emisor y receptor
    const emisor = comprobante["cfdi:Emisor"] || comprobante.Emisor || {};
    const receptor = comprobante["cfdi:Receptor"] || comprobante.Receptor || {};

    const fecha = (comprobante.Fecha || "").split("T")[0];
    const ejercicioFiscal = fecha ? parseLocalDate(fecha).getFullYear() : new Date().getFullYear();
    const mesFiscal = fecha ? parseLocalDate(fecha).getMonth() + 1 : undefined;

    const rfcEmisor = (emisor.Rfc || "").trim().toUpperCase();
    const rfcReceptor = (receptor.Rfc || "").trim().toUpperCase();
    const clientRfcNorm = clientRfc.trim().toUpperCase();

    const esIngreso = rfcEmisor === clientRfcNorm;
    const esEgreso = rfcReceptor === clientRfcNorm;
    if (!esIngreso && !esEgreso) return null;

    // Montos
    const subTotal = parseFloat(comprobante.SubTotal) || 0;
    const total = parseFloat(comprobante.Total) || 0;
    const descuento = comprobante.Descuento ? parseFloat(comprobante.Descuento) : undefined;

    // Impuestos globales
    const impuestos = comprobante["cfdi:Impuestos"] || comprobante.Impuestos || {};
    let impuestoTrasladado = 0;
    let ivaRetenido = 0;
    let isrRetenido = 0;
    let iepsTrasladado = 0;
    let baseIva16 = 0;
    let baseIva8 = 0;
    let tasa0 = 0;
    let exento = 0;

    // Procesar traslados
    try {
      const traslados = impuestos["cfdi:Traslados"] || impuestos.Traslados || {};
      const trasladosArray = traslados["cfdi:Traslado"] || traslados.Traslado || [];
      const trasladosList = Array.isArray(trasladosArray) ? trasladosArray : [trasladosArray];

      for (const traslado of trasladosList) {
        if (!traslado) continue;
        const impuesto = traslado.Impuesto || "";
        const importe = parseFloat(traslado.Importe) || 0;
        const base = parseFloat(traslado.Base) || 0;
        const tasaVal = parseFloat(traslado.TasaOCuota) || 0;
        const tipoFactor = traslado.TipoFactor || "";

        if (impuesto === "002" || impuesto === "IVA") {
          impuestoTrasladado += importe;
          if (tipoFactor === "Exento") {
            exento += base;
          } else if (tasaVal === 0.16 || tasaVal === 0.160000) {
            baseIva16 += base;
          } else if (tasaVal === 0.08 || tasaVal === 0.080000) {
            baseIva8 += base;
          } else if (tasaVal === 0) {
            tasa0 += base;
          }
        } else if (impuesto === "003" || impuesto === "IEPS") {
          iepsTrasladado += importe;
        }
      }
    } catch {
      // Ignorar
    }

    // Procesar retenciones
    try {
      const retenciones = impuestos["cfdi:Retenciones"] || impuestos.Retenciones || {};
      const retencionesArray = retenciones["cfdi:Retencion"] || retenciones.Retencion || [];
      const retencionesList = Array.isArray(retencionesArray) ? retencionesArray : [retencionesArray];

      for (const retencion of retencionesList) {
        if (!retencion) continue;
        const impuesto = retencion.Impuesto || "";
        const importe = parseFloat(retencion.Importe) || 0;
        if (impuesto === "002" || impuesto === "IVA") ivaRetenido += importe;
        else if (impuesto === "001" || impuesto === "ISR") isrRetenido += importe;
      }
    } catch {
      // Ignorar
    }

    // Conceptos con impuestos por concepto
    const conceptosArray: CFDIConcepto[] = [];
    let conceptoResumen = "";
    try {
      const conceptosNode = comprobante["cfdi:Conceptos"] || comprobante.Conceptos || {};
      const conceptosXml = conceptosNode["cfdi:Concepto"] || conceptosNode.Concepto || [];
      const conceptosList = Array.isArray(conceptosXml) ? conceptosXml : [conceptosXml];

      for (const concepto of conceptosList) {
        if (!concepto) continue;

        const importe = parseFloat(concepto.Importe) || 0;
        const impuestosConcepto = concepto["cfdi:Impuestos"] || concepto.Impuestos || {};

        // Si no tiene impuestos, es exento
        if (
          !impuestosConcepto.Traslados && !impuestosConcepto.Retenciones &&
          !impuestosConcepto["cfdi:Traslados"] && !impuestosConcepto["cfdi:Retenciones"]
        ) {
          exento += importe;
        }

        // Impuestos del concepto
        const trasladosConcepto: ConceptoImpuesto[] = [];
        const retencionesConcepto: ConceptoImpuesto[] = [];

        try {
          const trasladosNode = impuestosConcepto["cfdi:Traslados"] || impuestosConcepto.Traslados || {};
          const trasladosXml = trasladosNode["cfdi:Traslado"] || trasladosNode.Traslado || [];
          const tList = Array.isArray(trasladosXml) ? trasladosXml : (trasladosXml ? [trasladosXml] : []);
          for (const t of tList) {
            if (!t) continue;
            trasladosConcepto.push({
              base: parseFloat(t.Base) || 0,
              impuesto: t.Impuesto || "",
              tipoFactor: t.TipoFactor || "Tasa",
              tasaOCuota: t.TasaOCuota ? parseFloat(t.TasaOCuota) : undefined,
              importe: t.Importe ? parseFloat(t.Importe) : undefined,
            });
          }

          const retencionesNode = impuestosConcepto["cfdi:Retenciones"] || impuestosConcepto.Retenciones || {};
          const retencionesXml = retencionesNode["cfdi:Retencion"] || retencionesNode.Retencion || [];
          const rList = Array.isArray(retencionesXml) ? retencionesXml : (retencionesXml ? [retencionesXml] : []);
          for (const r of rList) {
            if (!r) continue;
            retencionesConcepto.push({
              base: parseFloat(r.Base) || 0,
              impuesto: r.Impuesto || "",
              tipoFactor: r.TipoFactor || "Tasa",
              tasaOCuota: r.TasaOCuota ? parseFloat(r.TasaOCuota) : undefined,
              importe: r.Importe ? parseFloat(r.Importe) : undefined,
            });
          }
        } catch {
          // Ignorar
        }

        const cfdiConcepto: CFDIConcepto = {
          claveProdServ: concepto.ClaveProdServ || "",
          noIdentificacion: concepto.NoIdentificacion || undefined,
          cantidad: parseFloat(concepto.Cantidad) || 0,
          claveUnidad: concepto.ClaveUnidad || "",
          unidad: concepto.Unidad || undefined,
          descripcion: concepto.Descripcion || "",
          valorUnitario: parseFloat(concepto.ValorUnitario) || 0,
          importe: importe,
          descuento: concepto.Descuento ? parseFloat(concepto.Descuento) : undefined,
          objetoImp: concepto.ObjetoImp || undefined,
        };

        if (trasladosConcepto.length > 0 || retencionesConcepto.length > 0) {
          cfdiConcepto.impuestos = {
            ...(trasladosConcepto.length > 0 && {traslados: trasladosConcepto}),
            ...(retencionesConcepto.length > 0 && {retenciones: retencionesConcepto}),
          };
        }

        conceptosArray.push(cfdiConcepto);

        if (!conceptoResumen && concepto.Descripcion) {
          conceptoResumen = concepto.Descripcion;
        }
      }
    } catch {
      // Ignorar
    }

    // CFDIs relacionados (notas de crédito, sustituciones)
    const cfdiRelacionados: CfdiRelacionado[] = [];
    try {
      const cfdiRelNode = comprobante["cfdi:CfdiRelacionados"] || comprobante.CfdiRelacionados;
      if (cfdiRelNode) {
        const relNodeList = Array.isArray(cfdiRelNode) ? cfdiRelNode : [cfdiRelNode];
        for (const relNode of relNodeList) {
          const tipoRelacion = relNode.TipoRelacion || "";
          const relXml = relNode["cfdi:CfdiRelacionado"] || relNode.CfdiRelacionado || [];
          const relList = Array.isArray(relXml) ? relXml : (relXml ? [relXml] : []);
          for (const rel of relList) {
            if (rel) {
              cfdiRelacionados.push({
                uuid: rel.UUID || rel,
                tipoRelacion,
              });
            }
          }
        }
      }
    } catch {
      // Ignorar
    }

    // Complemento de pago
    const docsRelacionados: string[] = [];
    const pagosComplemento: PagoComplemento[] = [];
    try {
      const complemento = comprobante["cfdi:Complemento"] || comprobante.Complemento || {};
      const pagos = complemento["pago20:Pagos"] || complemento["pagos:Pagos"] || complemento.Pagos || {};
      const pagosArray = pagos["pago20:Pago"] || pagos["pagos:Pago"] || pagos.Pago || [];
      const pagosList = Array.isArray(pagosArray) ? pagosArray : [pagosArray];

      for (const pago of pagosList) {
        if (!pago) continue;
        const doctosRelacionados: DoctoRelacionadoPago[] = [];
        const docRelArray = pago["pago20:DoctoRelacionado"] || pago["pagos:DoctoRelacionado"] || pago.DoctoRelacionado || [];
        const docRelList = Array.isArray(docRelArray) ? docRelArray : [docRelArray];

        for (const docRel of docRelList) {
          if (docRel && docRel.IdDocumento) {
            docsRelacionados.push(docRel.IdDocumento);
            doctosRelacionados.push({
              idDocumento: docRel.IdDocumento,
              serie: docRel.Serie || undefined,
              folio: docRel.Folio || undefined,
              monedaDR: docRel.MonedaDR || "MXN",
              equivalenciaDR: docRel.EquivalenciaDR ? parseFloat(docRel.EquivalenciaDR) : undefined,
              numParcialidad: docRel.NumParcialidad ? parseInt(docRel.NumParcialidad) : undefined,
              impSaldoAnt: docRel.ImpSaldoAnt ? parseFloat(docRel.ImpSaldoAnt) : undefined,
              impPagado: docRel.ImpPagado ? parseFloat(docRel.ImpPagado) : undefined,
              impSaldoInsoluto: docRel.ImpSaldoInsoluto ? parseFloat(docRel.ImpSaldoInsoluto) : undefined,
              objetoImpDR: docRel.ObjetoImpDR || undefined,
            });
          }
        }

        if (doctosRelacionados.length > 0) {
          pagosComplemento.push({
            fechaPago: pago.FechaPago || "",
            formaPago: pago.FormaDePagoP || pago.FormaPago || "",
            moneda: pago.MonedaP || pago.Moneda || "MXN",
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
    } catch {
      // Ignorar
    }

    // Detección de cancelación
    let fechaCancelacion: string | undefined;
    let estaCancelado = false;
    try {
      const complemento = comprobante["cfdi:Complemento"] || comprobante.Complemento || {};
      const cancelacion = complemento["cancelacion:Cancelacion"] ||
        complemento["cancelacioncfdi:Cancelacion"] ||
        complemento.Cancelacion;
      if (cancelacion && cancelacion.FechaCancelacion) {
        fechaCancelacion = cancelacion.FechaCancelacion;
      }
      if (comprobante.FechaCancelacion) {
        fechaCancelacion = comprobante.FechaCancelacion;
      }
      estaCancelado = !!fechaCancelacion ||
        (comprobante.EstadoComprobante &&
          comprobante.EstadoComprobante.toUpperCase() === "CANCELADO");
    } catch {
      // Ignorar
    }

    // Fallback de bases: si no se desglosaron, derivar de subtotal
    const totalBases = baseIva16 + baseIva8 + tasa0 + exento;
    if (totalBases <= 0) {
      if (impuestoTrasladado > 0) {
        baseIva16 = subTotal;
      } else {
        tasa0 = subTotal;
      }
    }

    // Tipo de cambio y total en MXN
    const tipoCambioNum = parseFloat(comprobante.TipoCambio) || 1;
    const moneda = comprobante.Moneda || "MXN";
    const totalMXN = moneda !== "MXN" ? total * tipoCambioNum : undefined;
    const usoCFDI = receptor.UsoCFDI || "G03";
    const tipoComprobante = comprobante.TipoDeComprobante || "I";

    // Construir objeto CFDI completo
    const now = new Date().toISOString();

    return {
      id: uuid,
      idCliente: clientId,
      uuid: uuid.trim(),
      noCertificado: ensureDefined(comprobante.NoCertificado, ""),
      serie: ensureDefined(comprobante.Serie, ""),
      folio: ensureDefined(comprobante.Folio, ""),
      version: ensureDefined(comprobante.Version, "4.0"),
      exportacion: ensureDefined(comprobante.Exportacion, "01"),
      fecha: ensureDefined(fecha, ""),
      fechaTimbrado: "",
      fechaCreacion: now,
      fechaActualizacion: now,
      ejercicioFiscal: ensureDefined(ejercicioFiscal, new Date().getFullYear()),
      mesFiscal,
      rfcEmisor: ensureDefined(rfcEmisor, ""),
      nombreEmisor: ensureDefined(emisor.Nombre, ""),
      regimenFiscal: ensureDefined(emisor.RegimenFiscal, ""),
      lugarExpedicion: ensureDefined(comprobante.LugarExpedicion, ""),
      rfcReceptor: ensureDefined(rfcReceptor, ""),
      nombreReceptor: ensureDefined(receptor.Nombre, ""),
      domicilioFiscalReceptor: ensureDefined(receptor.DomicilioFiscalReceptor, ""),
      regimenFiscalReceptor: ensureDefined(receptor.RegimenFiscalReceptor, ""),
      usoCFDI: ensureDefined(usoCFDI, "G03"),
      tipoDeComprobante: ensureDefined(tipoComprobante, "I"),
      esIngreso,
      esEgreso,
      recibida: esEgreso,
      metodoPago: ensureDefined(comprobante.MetodoPago, "PUE"),
      numCtaPago: ensureDefined(comprobante.NumCtaPago, ""),
      formaPago: ensureDefined(comprobante.FormaPago, "99"),
      condicionesDePago: ensureDefined(comprobante.CondicionesDePago, ""),
      moneda: ensureDefined(moneda, "MXN"),
      tipoCambio: tipoCambioNum,
      totalMXN,
      subTotal: ensureDefined(subTotal, 0),
      impuestosTrasladados: ensureDefined(impuestoTrasladado + iepsTrasladado, 0),
      impuestoTrasladado: ensureDefined(impuestoTrasladado, 0),
      iepsTrasladado: ensureDefined(iepsTrasladado, 0),
      baseIva16: baseIva16 > 0 ? baseIva16 : undefined,
      baseIva8: baseIva8 > 0 ? baseIva8 : undefined,
      ivaTasa0: tasa0 > 0 ? tasa0 : undefined,
      exento: exento > 0 ? exento : undefined,
      impuestoRetenido: ensureDefined(ivaRetenido + isrRetenido, 0),
      ivaRetenido: ensureDefined(ivaRetenido, 0),
      isrRetenido: ensureDefined(isrRetenido, 0),
      descuento: ensureDefined(descuento, 0),
      total: ensureDefined(total, 0),
      estaCancelado: ensureDefined(estaCancelado, false),
      fechaCancelación: ensureDefined(fechaCancelacion, ""),
      conceptos: conceptosArray.length > 0 ? conceptosArray : undefined,
      concepto: ensureDefined(conceptoResumen, ""),
      cfdiRelacionados: cfdiRelacionados.length > 0 ? cfdiRelacionados : undefined,
      docsRelacionadoComplementoPago: ensureDefined(docsRelacionados, []),
      pagos: pagosComplemento.length > 0 ? pagosComplemento : undefined,
      contenidoXml: xmlContent,
      categoria: "",
      esDeducible: undefined,
      mesDeduccion: undefined,
    };
  } catch {
    return null;
  }
}
