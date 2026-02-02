/* eslint-disable
  object-curly-spacing,
  comma-dangle,
  max-len,
  valid-jsdoc,
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unused-vars
*/

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

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

/**
 * Función que valida la FIEL y presenta la consulta al SAT en un solo paso.
 */
export const validarFiel = onCall({ timeoutSeconds: 120 }, async (req) => {
  const rfc = req.data.rfc;
  const downloadType = req.data.downloadType || "issued"; // Default to "issued" if not provided

  // Get and validate date range
  const from = req.data.from || `${new Date().getFullYear()}-01-01 00:00:00`;
  const to = req.data.to || `${new Date().getFullYear()}-12-31 23:59:59`;

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
    throw new HttpsError("internal", "Fallo en la consulta al SAT");
  }

  if (!query.getStatus().isAccepted()) {
    const msg = query.getStatus().getMessage();
    logger.error(`❌ SAT rechazó la petición: ${msg}`);
    throw new HttpsError("failed-precondition", `SAT rechazó: ${msg}`);
  }

  const requestId = query.getRequestId();
  logger.info("✅ Consulta aceptada. RequestId =", requestId);

  // ————— FASE 3: verificar la consulta —————
  let verify;
  try {
    verify = await service.verify(requestId);
  } catch (e: any) {
    logger.error("❌ Error en service.verify:", e);
    throw new HttpsError("internal", "Fallo al verificar la consulta");
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
