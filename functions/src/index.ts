/* eslint-disable
  object-curly-spacing,
  comma-dangle,
  max-len,
  valid-jsdoc,
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unused-vars
*/

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import {
  Fiel,
  HttpsWebClient,
  FielRequestBuilder,
  Service,
  QueryParameters,
  DateTimePeriod,
  DownloadType,
  RequestType,
  DocumentStatus,
  CfdiPackageReader,
  OpenZipFileException,
} from "@nodecfdi/sat-ws-descarga-masiva";

initializeApp();

// ============================================
// UTILIDADES DE ZONA HORARIA MÉXICO
// ============================================
const MEXICO_TZ = "America/Mexico_City";

/**
 * Obtiene la fecha/hora actual en zona horaria de México
 */
function getMexicoDate(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: MEXICO_TZ }));
}

/**
 * Obtiene el año actual en zona horaria de México
 */
function getMexicoYear(): number {
  return getMexicoDate().getFullYear();
}

/**
 * Función que valida la FIEL y presenta la consulta al SAT en un solo paso.
 */
export const validarFiel = onCall({ timeoutSeconds: 120 }, async (req) => {
  const rfc = req.data.rfc;
  const downloadType = req.data.downloadType || "issued"; // Default to "issued" if not provided

  // Get and validate date range (usando hora de México)
  const from = req.data.from || `${getMexicoYear()}-01-01 00:00:00`;
  const to = req.data.to || `${getMexicoYear()}-12-31 23:59:59`;

  // Log the date range
  logger.info(`📅 Rango de fechas para consulta: ${from} - ${to}`);

  // Validate request parameters
  if (downloadType !== "issued" && downloadType !== "received") {
    throw new HttpsError("invalid-argument", "Tipo de descarga inválido. Usa 'issued' o 'received'.");
  }
  if (!rfc || typeof rfc !== "string") {
    throw new HttpsError("invalid-argument", "Debes enviar un RFC válido");
  }

  logger.info(`🔍 Descargando FIEL para RFC ${rfc} (tipo: ${downloadType})`);
  const bucket = getStorage().bucket();
  let cerBuf: Buffer;
  let keyBuf: Buffer;
  let pwdBuf: Buffer;

  try {
    [cerBuf] = await bucket.file(`clients/${rfc}/fiel/certificado.cer`).download();
    [keyBuf] = await bucket.file(`clients/${rfc}/fiel/llave.key`).download();
    [pwdBuf] = await bucket.file(`clients/${rfc}/fiel/clave.txt`).download();
  } catch (e: any) {
    logger.error("❌ Error al descargar los archivos FIEL:", e);
    throw new HttpsError("not-found", "No se pudieron descargar los archivos FIEL");
  }

  const pass = pwdBuf.toString("utf8").trim();
  let fielObj: Fiel;

  try {
    const cerBin = cerBuf.toString("binary");
    const keyBin = keyBuf.toString("binary");
    fielObj = Fiel.create(cerBin, keyBin, pass);
  } catch (e: any) {
    logger.error("❌ Error al crear el objeto Fiel:", e);
    throw new HttpsError(
      "data-loss",
      "Los archivos FIEL son inválidos o la contraseña no coincide"
    );
  }

  if (!fielObj.isValid()) {
    logger.error("❌ La FIEL no está vigente o es de tipo CSD");
    throw new HttpsError(
      "failed-precondition",
      "La FIEL no está vigente o es de tipo CSD"
    );
  }

  logger.info("✅ FIEL válida. Presentando consulta al SAT...");

  // ———————— FASE 2: presentar la consulta ————————
  // 1️⃣ Web client y builder
  const webClient = new HttpsWebClient();
  const requestBuilder = new FielRequestBuilder(fielObj);

  // 2️⃣ Servicio apuntando a CFDI (v2.0 ya no requiere ServiceEndpoints)
  const service = new Service(
    requestBuilder,
    webClient
  );

  // 3️⃣ Parámetros de la consulta con fechas proporcionadas
  const periodo = DateTimePeriod.createFromValues(from, to);

  // Use the provided downloadType parameter (v2.0 sigue usando constructor)
  const downloadTypeObj = new DownloadType(downloadType); // "issued" or "received"
  const requestType = new RequestType("xml"); // xml
  const documentStatus = new DocumentStatus("active"); // Solo CFDIs vigentes (no cancelados)

  const params = QueryParameters.create(periodo)
    .withDownloadType(downloadTypeObj)
    .withRequestType(requestType)
    .withDocumentStatus(documentStatus);

  // 4️⃣ Lanza la consulta
  let query;
  try {
    query = await service.query(params);
  } catch (e: any) {
    logger.error("❌ Error al llamar a service.query:", e);
    // Detectar errores comunes del SAT
    const errorMsg = e?.message?.toLowerCase() || "";
    if (errorMsg.includes("solicitud") || errorMsg.includes("límite") || errorMsg.includes("limit")) {
      throw new HttpsError("resource-exhausted", "Has alcanzado el límite de solicitudes del SAT. Espera unas horas e intenta de nuevo.");
    }
    throw new HttpsError("internal", `Fallo en la consulta al SAT: ${e?.message || "Error desconocido"}`);
  }

  if (!query.getStatus().isAccepted()) {
    const msg = query.getStatus().getMessage();
    logger.error(`❌ SAT rechazó la petición: ${msg}`);
    // Detectar mensajes de límite de solicitudes
    const msgLower = msg?.toLowerCase() || "";
    if (msgLower.includes("solicitud") || msgLower.includes("límite") || msgLower.includes("máximo") || msgLower.includes("excedido")) {
      throw new HttpsError("resource-exhausted", `SAT: ${msg}. Has alcanzado el límite de solicitudes. Espera unas horas.`);
    }
    throw new HttpsError("failed-precondition", `SAT rechazó: ${msg}`);
  }

  const requestId = query.getRequestId();
  logger.info("✅ Consulta aceptada. RequestId =", requestId);

  // ————— FASE 3: verificar la consulta —————
  let verify;
  try {
    // Esperar un poco antes de verificar (el SAT necesita tiempo)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    verify = await service.verify(requestId);
  } catch (e: any) {
    logger.error("❌ Error en service.verify:", e);
    logger.error("Detalles del error:", JSON.stringify(e, null, 2));
    // En lugar de fallar, devolvemos que está en progreso
    // El cliente puede reintentar la verificación más tarde
    return {
      success: true,
      requestId,
      status: "in_progress",
      message: "La solicitud fue creada pero aún no se puede verificar. Intenta verificar en unos momentos."
    };
  }

  // 3.1 Revisar estado general de la verificación
  if (!verify.getStatus().isAccepted()) {
    const msg = verify.getStatus().getMessage();
    logger.error(`❌ Verificación SAT rechazada: ${msg}`);
    throw new HttpsError("failed-precondition", `Verificación rechazada: ${msg}`);
  }

  // 3.2 Revisar el progreso de generación de paquetes
  const statusReq = verify.getStatusRequest();
  if (
    statusReq.isTypeOf("Expired") ||
    statusReq.isTypeOf("Failure") ||
    statusReq.isTypeOf("Rejected")
  ) {
    logger.error(`❌ Solicitud ${requestId} no se puede completar (status: ${statusReq.constructor.name})`);
    throw new HttpsError("failed-precondition", `La solicitud ${requestId} no se puede completar`);
  }

  if (
    statusReq.isTypeOf("InProgress") ||
    statusReq.isTypeOf("Accepted")
  ) {
    logger.info(`ℹ️ Solicitud ${requestId} aún en proceso`);
    return {
      success: true,
      requestId,
      status: "in_progress"
    };
  }

  // 3.3 Cuando ya está lista
  if (statusReq.isTypeOf("Finished")) {
    const packageIds = verify.getPackageIds();
    logger.info(`✅ Solicitud ${requestId} terminó. Paquetes: ${packageIds.join(", ")}`);
    return {
      success: true,
      requestId,
      status: "finished",
      packageIds
    };
  }

  // Estado inesperado
  logger.error(`❌ Estado inesperado de la solicitud: ${statusReq.constructor.name}`);
  throw new HttpsError("internal", `Estado inesperado: ${statusReq.constructor.name}`);
});

/**
 * Función para verificar el estado de una solicitud
 */
export const verificarSolicitud = onCall({ timeoutSeconds: 60 }, async (req) => {
  const rfc = req.data.rfc;
  const requestId = req.data.requestId;

  if (!rfc || typeof rfc !== "string") {
    throw new HttpsError("invalid-argument", "Debes enviar un RFC válido");
  }

  if (!requestId || typeof requestId !== "string") {
    throw new HttpsError("invalid-argument", "Debes enviar un ID de solicitud válido");
  }

  logger.info(`🔍 Verificando solicitud ${requestId} para RFC ${rfc}`);

  // Obtener FIEL
  const bucket = getStorage().bucket();
  let cerBuf: Buffer;
  let keyBuf: Buffer;
  let pwdBuf: Buffer;

  try {
    [cerBuf] = await bucket.file(`clients/${rfc}/fiel/certificado.cer`).download();
    [keyBuf] = await bucket.file(`clients/${rfc}/fiel/llave.key`).download();
    [pwdBuf] = await bucket.file(`clients/${rfc}/fiel/clave.txt`).download();
  } catch (e: any) {
    logger.error("❌ Error al descargar los archivos FIEL:", e);
    throw new HttpsError("not-found", "No se pudieron descargar los archivos FIEL");
  }

  const pass = pwdBuf.toString("utf8").trim();
  let fielObj: Fiel;

  try {
    const cerBin = cerBuf.toString("binary");
    const keyBin = keyBuf.toString("binary");
    fielObj = Fiel.create(cerBin, keyBin, pass);
  } catch (e: any) {
    logger.error("❌ Error al crear el objeto Fiel:", e);
    throw new HttpsError(
      "data-loss",
      "Los archivos FIEL son inválidos o la contraseña no coincide"
    );
  }

  if (!fielObj.isValid()) {
    logger.error("❌ La FIEL no está vigente o es de tipo CSD");
    throw new HttpsError(
      "failed-precondition",
      "La FIEL no está vigente o es de tipo CSD"
    );
  }

  // Crear el servicio (v2.0 ya no requiere ServiceEndpoints)
  const webClient = new HttpsWebClient();
  const requestBuilder = new FielRequestBuilder(fielObj);
  const service = new Service(
    requestBuilder,
    webClient
  );

  // Verificar la solicitud
  try {
    const verify = await service.verify(requestId);

    if (!verify.getStatus().isAccepted()) {
      const msg = verify.getStatus().getMessage();
      logger.error(`❌ Verificación SAT rechazada: ${msg}`);
      throw new HttpsError("failed-precondition", `Verificación rechazada: ${msg}`);
    }

    const statusReq = verify.getStatusRequest();
    const statusValue = statusReq.getValue();

    if (statusReq.isTypeOf("Expired") ||
        statusReq.isTypeOf("Failure") ||
        statusReq.isTypeOf("Rejected")) {
      logger.warn(`⚠️ Solicitud ${requestId} no se puede completar (status: ${statusValue})`);
      return {
        success: true,
        status: statusValue,
        error: "La solicitud no se puede completar"
      };
    }

    if (statusReq.isTypeOf("InProgress") || statusReq.isTypeOf("Accepted")) {
      logger.info(`ℹ️ Solicitud ${requestId} aún en proceso`);
      return {
        success: true,
        status: statusValue,
        inProgress: true
      };
    }

    if (statusReq.isTypeOf("Finished")) {
      const packageIds = verify.getPackageIds();
      logger.info(`✅ Solicitud ${requestId} terminó. Paquetes: ${packageIds.join(", ")}`);
      return {
        success: true,
        status: statusValue,
        packageIds,
        inProgress: false
      };
    }

    // Estado inesperado
    logger.warn(`⚠️ Estado inesperado: ${statusValue}`);
    return {
      success: true,
      status: statusValue,
      message: "Estado no reconocido"
    };
  } catch (err: any) {
    logger.error("❌ Error verificando solicitud:", err);
    throw new HttpsError("internal", `Error al verificar: ${err.message}`);
  }
});

export const descargarPaquetes = onCall({ timeoutSeconds: 120 }, async (req) => {
  const rfc = req.data.rfc;
  const packageIds = req.data.packageIds as string[];
  if (!rfc || typeof rfc !== "string") {
    throw new HttpsError("invalid-argument", "Debes enviar un RFC válido");
  }
  if (!Array.isArray(packageIds) || packageIds.some((id) => typeof id !== "string")) {
    throw new HttpsError("invalid-argument", "Debes enviar un array de packageIds");
  }

  logger.info(`📥 Descargando paquetes [${packageIds.join(", ")}] para RFC=${rfc}`);

  // Preparar cliente SAT y FIEL
  const bucket = getStorage().bucket();
  let cerBuf: Buffer;
  let keyBuf: Buffer;
  let pwdBuf: Buffer;
  try {
    [cerBuf] = await bucket.file(`clients/${rfc}/fiel/certificado.cer`).download();
    [keyBuf] = await bucket.file(`clients/${rfc}/fiel/llave.key`).download();
    [pwdBuf] = await bucket.file(`clients/${rfc}/fiel/clave.txt`).download();
  } catch (e: any) {
    logger.error("❌ Error al descargar FIEL:", e);
    throw new HttpsError("not-found", "No se pudieron descargar los archivos FIEL");
  }
  const fielObj = Fiel.create(cerBuf.toString("binary"), keyBuf.toString("binary"), pwdBuf.toString("utf8").trim());
  const service = new Service(
    new FielRequestBuilder(fielObj),
    new HttpsWebClient()
  );

  const savedPaths: string[] = [];
  for (const pkgId of packageIds) {
    try {
      const dl = await service.download(pkgId);
      if (!dl.getStatus().isAccepted()) {
        logger.warn(`⚠️ Paquete ${pkgId} rechazado: ${dl.getStatus().getMessage()}`);
        continue;
      }
      const content = Buffer.from(dl.getPackageContent(), "base64");
      const path = `clients/${rfc}/packages/${pkgId}.zip`;
      await bucket.file(path).save(content);
      savedPaths.push(path);
      logger.info(`✅ Paquete ${pkgId} guardado en ${path}`);
    } catch (e: any) {
      logger.error(`❌ Error descargando paquete ${pkgId}:`, e);
    }
  }

  return { success: true, savedPaths };
});

export const procesarPaquete = onCall({ timeoutSeconds: 120 }, async (req) => {
  const rfc = req.data.rfc;
  const packageId = req.data.packageId;

  if (!rfc || typeof rfc !== "string") {
    throw new HttpsError("invalid-argument", "Debes enviar un RFC válido");
  }
  if (!packageId || typeof packageId !== "string") {
    throw new HttpsError("invalid-argument", "Debes enviar un packageId válido");
  }

  logger.info(`📂 Procesando paquete ${packageId} para RFC=${rfc}`);

  const bucket = getStorage().bucket();
  const zipPath = `clients/${rfc}/packages/${packageId}.zip`;
  let zipBuf: Buffer;

  // 1️⃣ Descarga el ZIP
  try {
    [zipBuf] = await bucket.file(zipPath).download();
  } catch (e: any) {
    logger.error("❌ Error al descargar el ZIP:", e);
    throw new HttpsError("not-found", "No se encontró el paquete ZIP");
  }

  // 2️⃣ Crear reader en memoria — ¡pasa Base64, no Buffer!
  let reader: CfdiPackageReader;
  try {
    const zipBase64 = zipBuf.toString("base64");
    reader = await CfdiPackageReader.createFromContents(zipBase64);
  } catch (err: any) {
    const msg = (err as OpenZipFileException).message || err.message;
    logger.error("❌ No se pudo abrir el paquete como ZIP:", msg);
    throw new HttpsError("internal", `ZIP inválido: ${msg}`);
  }

  // 3️⃣ Extraer cada CFDI y guardarlo en Cloud Storage
  const savedPaths: string[] = [];
  for await (const cfdiMap of reader.cfdis()) {
    for (const [name, content] of cfdiMap) {
      const xmlPath = `clients/${rfc}/cfdis/${packageId}/${name}.xml`;
      try {
        // content ya es string UTF-8
        await bucket.file(xmlPath).save(Buffer.from(content, "utf8"));
        savedPaths.push(xmlPath);
        logger.info(`✅ Guardado CFDI ${name} en ${xmlPath}`);
      } catch (e: any) {
        logger.error(`❌ Error guardando ${name}:`, e);
      }
    }
  }

  return { success: true, savedPaths };
});

// ============================================
// FUNCIONES AUTOMÁTICAS (SCHEDULED)
// ============================================

/**
 * Helper para verificar si un cliente tiene FIEL completa y está activo
 */
async function isClientValidForAutoSync(
  clientData: any,
  rfc: string,
  bucket: any
): Promise<{ valid: boolean; reason?: string }> {
  // Verificar que el cliente tenga autoSync habilitado
  if (clientData.autoSync !== true) {
    return { valid: false, reason: "autoSync no está habilitado" };
  }

  // Verificar que el cliente esté activo
  if (clientData.status === "inactive" || clientData.deleted === true) {
    return { valid: false, reason: "Cliente inactivo o eliminado" };
  }

  // Verificar que tenga los 3 URLs de FIEL
  if (!clientData.cerUrl || !clientData.keyCerUrl || !clientData.claveFielUrl) {
    return { valid: false, reason: "FIEL incompleta (faltan URLs)" };
  }

  // Verificar que los archivos existan en Storage
  try {
    const cerFile = bucket.file(`clients/${rfc}/fiel/certificado.cer`);
    const keyFile = bucket.file(`clients/${rfc}/fiel/llave.key`);
    const pwdFile = bucket.file(`clients/${rfc}/fiel/clave.txt`);

    const [cerExists] = await cerFile.exists();
    const [keyExists] = await keyFile.exists();
    const [pwdExists] = await pwdFile.exists();

    if (!cerExists || !keyExists || !pwdExists) {
      return {
        valid: false,
        reason: `Archivos FIEL faltantes: ${!cerExists ? "cer " : ""}${!keyExists ? "key " : ""}${!pwdExists ? "clave" : ""}`,
      };
    }
  } catch (e: any) {
    return { valid: false, reason: `Error verificando archivos: ${e.message}` };
  }

  return { valid: true };
}

/**
 * Verifica automáticamente solicitudes pendientes cada 2 horas
 * Solo procesa solicitudes que NO están completadas ni tienen error
 */
export const autoVerifyPendingRequests = onSchedule({
  schedule: "0 */2 * * *", // Cada 2 horas (minuto 0)
  timeZone: "America/Mexico_City",
  timeoutSeconds: 540, // 9 minutos max
}, async () => {
  logger.info("🔄 Iniciando verificación automática de solicitudes pendientes...");

  const db = getFirestore();
  const bucket = getStorage().bucket();

  // Buscar todos los clientes que tienen FIEL configurada
  const clientsSnapshot = await db.collection("clients")
    .where("cerUrl", "!=", null)
    .get();

  if (clientsSnapshot.empty) {
    logger.info("No hay clientes con FIEL configurada");
    return;
  }

  let totalVerified = 0;
  let totalReady = 0;
  let totalErrors = 0;

  for (const clientDoc of clientsSnapshot.docs) {
    const clientData = clientDoc.data();
    const rfc = clientData.rfc;

    if (!rfc) continue;

    // Verificar que el cliente sea válido para auto-sync
    const validation = await isClientValidForAutoSync(clientData, rfc, bucket);
    if (!validation.valid) {
      logger.info(`⏭️ Saltando ${rfc}: ${validation.reason}`);
      continue;
    }

    // Buscar solicitudes pendientes de este cliente
    const requestsSnapshot = await db
      .collection("clients")
      .doc(rfc)
      .collection("satRequests")
      .where("completed", "==", false)
      .get();

    if (requestsSnapshot.empty) continue;

    // Filtrar solo las que no tienen packagesDownloaded y no tienen error grave
    const pendingRequests = requestsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.packagesDownloaded && !data.error && data.requestId;
    });

    if (pendingRequests.length === 0) continue;

    logger.info(`📋 Cliente ${rfc}: ${pendingRequests.length} solicitudes pendientes de verificar`);

    for (const reqDoc of pendingRequests) {
      const reqData = reqDoc.data();
      const requestId = reqData.requestId;

      try {
        // Cargar FIEL del cliente
        const [cerBuf] = await bucket.file(`clients/${rfc}/fiel/certificado.cer`).download();
        const [keyBuf] = await bucket.file(`clients/${rfc}/fiel/llave.key`).download();
        const [pwdBuf] = await bucket.file(`clients/${rfc}/fiel/clave.txt`).download();

        const fiel = Fiel.create(
          cerBuf.toString("binary"),
          keyBuf.toString("binary"),
          pwdBuf.toString("utf8").trim()
        );

        const webClient = new HttpsWebClient();
        const requestBuilder = new FielRequestBuilder(fiel);
        const service = new Service(requestBuilder, webClient);

        // Verificar solicitud
        const verify = await service.verify(requestId);

        // Verificar si la respuesta fue aceptada
        if (!verify.getStatus().isAccepted()) {
          const msg = verify.getStatus().getMessage();
          logger.warn(`⚠️ ${rfc}/${requestId.substring(0, 8)}: Verificación no aceptada: ${msg}`);

          await reqDoc.ref.update({
            verifyError: msg,
            updatedAt: FieldValue.serverTimestamp(),
            lastAutoVerify: new Date().toISOString()
          });
          continue;
        }

        // Obtener el estado de la solicitud
        const statusReq = verify.getStatusRequest();

        if (statusReq.isTypeOf("InProgress") || statusReq.isTypeOf("Accepted")) {
          // Ya fue aceptada pero aún en proceso
          logger.info(`⏳ ${rfc}/${requestId.substring(0, 8)}: Aún en proceso`);

          await reqDoc.ref.update({
            status: "in_progress",
            updatedAt: FieldValue.serverTimestamp(),
            lastAutoVerify: new Date().toISOString()
          });
        } else if (statusReq.isTypeOf("Finished")) {
          // ¡Lista! Guardar packageIds
          const packageIds = verify.getPackageIds();
          logger.info(`✅ ${rfc}/${requestId.substring(0, 8)}: Terminada con ${packageIds.length} paquetes`);

          await reqDoc.ref.update({
            status: "finished",
            completed: true,
            packageIds,
            updatedAt: FieldValue.serverTimestamp(),
            lastAutoVerify: new Date().toISOString()
          });

          totalReady++;
        } else if (statusReq.isTypeOf("Rejected") || statusReq.isTypeOf("Failure") || statusReq.isTypeOf("Expired")) {
          // Error del SAT
          const statusValue = statusReq.getValue();
          logger.warn(`❌ ${rfc}/${requestId.substring(0, 8)}: Rechazada/Error (${statusValue})`);

          await reqDoc.ref.update({
            error: `SAT: ${statusValue}`,
            updatedAt: FieldValue.serverTimestamp(),
            lastAutoVerify: new Date().toISOString()
          });

          totalErrors++;
        } else {
          // Estado desconocido
          const statusValue = statusReq.getValue();
          logger.info(`❓ ${rfc}/${requestId.substring(0, 8)}: Estado desconocido: ${statusValue}`);

          await reqDoc.ref.update({
            status: statusValue,
            updatedAt: FieldValue.serverTimestamp(),
            lastAutoVerify: new Date().toISOString()
          });
        }

        totalVerified++;

        // Pequeña pausa entre verificaciones para no saturar
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err: any) {
        logger.error(`❌ Error verificando ${rfc}/${requestId}:`, err.message);

        totalErrors++;
      }
    }
  }

  logger.info(`🏁 Verificación automática completada: ${totalVerified} verificadas, ${totalReady} listas, ${totalErrors} errores`);
});

/**
 * Crea solicitudes automáticamente cada día a las 4am (hora de México)
 * Siempre pide exactamente 1 día: AYER. Sin catch-up ni gaps.
 */
export const autoCreateDailyRequests = onSchedule({
  schedule: "0 4 * * *", // Todos los días a las 4:00 AM
  timeZone: "America/Mexico_City",
  timeoutSeconds: 540,
}, async () => {
  logger.info("🌅 Iniciando creación automática de solicitudes diarias...");

  const db = getFirestore();
  const bucket = getStorage().bucket();

  // Buscar clientes con FIEL configurada
  const clientsSnapshot = await db.collection("clients")
    .where("cerUrl", "!=", null)
    .get();

  if (clientsSnapshot.empty) {
    logger.info("No hay clientes con FIEL configurada");
    return;
  }

  // Calcular ayer en zona horaria de México
  const mexicoNow = getMexicoDate();
  const yesterday = new Date(mexicoNow);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const clientDoc of clientsSnapshot.docs) {
    const clientData = clientDoc.data();
    const rfc = clientData.rfc;

    if (!rfc) continue;

    // Verificar que el cliente sea válido para auto-sync
    const validation = await isClientValidForAutoSync(clientData, rfc, bucket);
    if (!validation.valid) {
      logger.info(`⏭️ Saltando ${rfc}: ${validation.reason}`);
      totalSkipped++;
      continue;
    }

    // === EMITIDAS (solo ayer) ===
    try {
      // Verificar si ya existe una solicitud para ayer emitidas
      const existingIssued = await db
        .collection("clients").doc(rfc)
        .collection("satRequests")
        .where("downloadType", "==", "issued")
        .where("from", ">=", `${yesterdayStr} 00:00`)
        .where("from", "<=", `${yesterdayStr} 23:59`)
        .get();

      if (existingIssued.empty) {
        const requestId = await createRequestForClient(rfc, "issued", yesterdayStr, yesterdayStr, bucket, db);
        totalCreated++;
        logger.info(`✅ ${rfc} emitidas ${yesterdayStr} - RequestId: ${requestId}`);
      } else {
        logger.info(`⏭️ ${rfc} emitidas ${yesterdayStr}: ya existe solicitud`);
        totalSkipped++;
      }
    } catch (err: any) {
      logger.error(`❌ Error emitidas ${rfc} ${yesterdayStr}:`, err.message);
    }

    // Pausa entre emitidas y recibidas
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // === RECIBIDAS (solo ayer) ===
    try {
      const existingReceived = await db
        .collection("clients").doc(rfc)
        .collection("satRequests")
        .where("downloadType", "==", "received")
        .where("from", ">=", `${yesterdayStr} 00:00`)
        .where("from", "<=", `${yesterdayStr} 23:59`)
        .get();

      if (existingReceived.empty) {
        const requestId = await createRequestForClient(rfc, "received", yesterdayStr, yesterdayStr, bucket, db);
        totalCreated++;
        logger.info(`✅ ${rfc} recibidas ${yesterdayStr} - RequestId: ${requestId}`);
      } else {
        logger.info(`⏭️ ${rfc} recibidas ${yesterdayStr}: ya existe solicitud`);
        totalSkipped++;
      }
    } catch (err: any) {
      logger.error(`❌ Error recibidas ${rfc} ${yesterdayStr}:`, err.message);
    }

    // Pausa entre clientes
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  logger.info(`🏁 Creación automática completada: ${totalCreated} creadas, ${totalSkipped} saltados`);
});

/**
 * Helper para crear una solicitud para un cliente
 * @returns requestId de la solicitud creada
 */
async function createRequestForClient(
  rfc: string,
  downloadType: "issued" | "received",
  fromDate: string,
  toDate: string,
  bucket: any,
  db: FirebaseFirestore.Firestore
): Promise<string> {
  // Cargar FIEL
  const [cerBuf] = await bucket.file(`clients/${rfc}/fiel/certificado.cer`).download();
  const [keyBuf] = await bucket.file(`clients/${rfc}/fiel/llave.key`).download();
  const [pwdBuf] = await bucket.file(`clients/${rfc}/fiel/clave.txt`).download();

  const fiel = Fiel.create(
    cerBuf.toString("binary"),
    keyBuf.toString("binary"),
    pwdBuf.toString("utf8").trim()
  );

  if (!fiel.isValid()) {
    throw new Error("FIEL inválida o expirada");
  }

  const webClient = new HttpsWebClient();
  const requestBuilder = new FielRequestBuilder(fiel);
  const service = new Service(requestBuilder, webClient);

  // Formatear fechas con segundos aleatorios para simular naturalidad
  const startSec = String(Math.floor(Math.random() * 3)).padStart(2, "0"); // 00, 01, 02
  const endSec = String(57 + Math.floor(Math.random() * 3)).padStart(2, "0"); // 57, 58, 59
  const from = `${fromDate} 00:00:${startSec}`;
  const to = `${toDate} 23:59:${endSec}`;

  // Crear parámetros - usar constructores como en validarFiel
  const period = DateTimePeriod.createFromValues(from, to);
  const downloadTypeObj = new DownloadType(downloadType); // "issued" o "received"
  const requestTypeObj = new RequestType("xml");
  const documentStatus = new DocumentStatus("active");

  const params = QueryParameters.create(period)
    .withDownloadType(downloadTypeObj)
    .withRequestType(requestTypeObj)
    .withDocumentStatus(documentStatus);

  // Enviar solicitud
  const query = await service.query(params);
  const requestId = query.getRequestId();

  if (!requestId) {
    throw new Error("El SAT no devolvió un requestId");
  }

  // Guardar en Firestore
  await db.collection("clients").doc(rfc)
    .collection("satRequests").add({
      rfc,
      requestId,
      status: "pending",
      downloadType,
      from,
      to,
      completed: false,
      packagesDownloaded: false,
      packagesProcessed: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      autoCreated: true // Marca que fue creada automáticamente
    });

  return requestId;
}

/**
 * Función para descargar un paquete ZIP y devolverlo como base64.
 * Esto evita problemas de CORS y permisos de signed URLs.
 */
export const getPackageSignedUrl = onCall({ timeoutSeconds: 120, memory: "512MiB" }, async (req) => {
  const { rfc, packageId } = req.data;

  if (!rfc || !packageId) {
    throw new HttpsError("invalid-argument", "Se requiere rfc y packageId");
  }

  logger.info(`📦 Descargando paquete ${packageId} de RFC ${rfc}`);

  try {
    const bucket = getStorage().bucket();
    const filePath = `clients/${rfc}/packages/${packageId}.zip`;
    const file = bucket.file(filePath);

    // Verificar que el archivo existe
    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpsError("not-found", `No se encontró el paquete ${packageId}`);
    }

    // Descargar el archivo
    const [fileBuffer] = await file.download();

    // Convertir a base64
    const base64Data = fileBuffer.toString("base64");

    logger.info(`✅ Paquete ${packageId} descargado: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
    return { "success": true, "data": base64Data, "size": fileBuffer.length };
  } catch (error: any) {
    logger.error("❌ Error descargando paquete:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message || "Error descargando paquete");
  }
});
