/* eslint-disable
  object-curly-spacing,
  comma-dangle,
  max-len,
  valid-jsdoc,
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unused-vars
*/

import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

initializeApp();

/**
 * Función que verifica la existencia y acceso a los archivos FIEL
 */
export const autenticarSAT = onCall(
  { timeoutSeconds: 60 },
  async (request) => {
    try {
      const rfc = request.data.rfc;
      if (!rfc || typeof rfc !== "string") {
        throw new Error("RFC inválido");
      }
      logger.info(`Verificando archivos FIEL para RFC: ${rfc}`);

      // Construir ruta directa a los archivos FIEL
      const fielPath = `clients/${rfc}/fiel`;
      logger.info(`Buscando archivos en ruta: ${fielPath}`);

      const bucket = getStorage().bucket();

      // Intentar descargar los archivos
      let cerFile;
      let keyFile;
      let passFile;

      try {
        [cerFile] = await bucket.file(`${fielPath}/certificado.cer`).download();
        logger.info(`Certificado recuperado: ${cerFile.length} bytes`);
      } catch (error) {
        logger.error("Error al recuperar certificado:", error);
        throw new Error("No se pudo recuperar el archivo de certificado");
      }

      try {
        [keyFile] = await bucket.file(`${fielPath}/llave.key`).download();
        logger.info(`Llave recuperada: ${keyFile.length} bytes`);
      } catch (error) {
        logger.error("Error al recuperar llave:", error);
        throw new Error("No se pudo recuperar el archivo de llave");
      }

      try {
        [passFile] = await bucket.file(`${fielPath}/clave.txt`).download();
        const passwordText = passFile.toString().trim();
        logger.info(`Clave recuperada: "${passwordText}"`);
      } catch (error) {
        logger.error("Error al recuperar clave:", error);
        throw new Error("No se pudo recuperar el archivo de clave");
      }

      return {
        success: true,
        message: "Archivos FIEL recuperados correctamente",
        details: {
          certificadoSize: cerFile.length,
          llaveSize: keyFile.length,
          passwordSize: passFile.length,
          claveRecuperada: true,
          rutaUtilizada: fielPath
        }
      };
    } catch (err: any) {
      logger.error("Error en la verificación FIEL:", err);
      return {
        success: false,
        error: err.message || "Error desconocido"
      };
    }
  }
);
