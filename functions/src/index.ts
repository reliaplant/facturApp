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
import axios from "axios";
import { SignedXml } from "xml-crypto";
import { readFileSync, writeFileSync, unlinkSync } from "fs"; // Import fs functions properly
import { v4 as uuidv4 } from "uuid";
import * as forge from "node-forge";
import * as crypto from "crypto";


initializeApp();

/**
 * Función que autentica con el SAT usando el estándar WS-Security
 */
export const autenticarSAT = onCall(
  { timeoutSeconds: 60 },
  async (request) => {
    try {
      const rfc = request.data.rfc;
      if (!rfc || typeof rfc !== "string") {
        throw new Error("RFC inválido");
      }
      logger.info(`Iniciando autenticación SAT para RFC: ${rfc}`);

      // Obtener archivos FIEL de Storage
      const fielPath = `clients/${rfc}/fiel`;
      logger.info(`Buscando archivos en ruta: ${fielPath}`);

      const bucket = getStorage().bucket();

      // Descargar certificado, llave privada y contraseña
      let cerBuf;
      let keyBuf;
      let passText;

      try {
        [cerBuf] = await bucket.file(`${fielPath}/certificado.cer`).download();
        logger.info(`Certificado recuperado: ${cerBuf.length} bytes`);
      } catch (error) {
        logger.error("Error al recuperar certificado:", error);
        throw new Error("No se pudo recuperar el archivo de certificado");
      }

      try {
        [keyBuf] = await bucket.file(`${fielPath}/llave.key`).download();
        logger.info(`Llave recuperada: ${keyBuf.length} bytes`);
      } catch (error) {
        logger.error("Error al recuperar llave:", error);
        throw new Error("No se pudo recuperar el archivo de llave");
      }

      try {
        const [passBuf] = await bucket.file(`${fielPath}/clave.txt`).download();
        passText = passBuf.toString("utf8").trim();
        logger.info("Clave recuperada correctamente");
      } catch (error) {
        logger.error("Error al recuperar clave:", error);
        throw new Error("No se pudo recuperar el archivo de clave");
      }

      // Generar el XML SOAP para autenticación
      const soapXml = generarSoapAutenticacion(cerBuf, keyBuf, passText);
      logger.info("XML SOAP generado correctamente");

      // Guardar el XML generado para depuración
      const xmlPath = `${fielPath}/ultimo_request_${new Date().toISOString().replace(/[:.]/g, "-")}.xml`;
      try {
        await bucket.file(xmlPath).save(soapXml);
        logger.info(`XML guardado en: ${xmlPath}`);
      } catch (error) {
        logger.warn("No se pudo guardar el XML para depuración:", error);
      }

      // Enviar petición al servicio de autenticación
      logger.info("Enviando solicitud de autenticación al SAT...");
      const response = await axios.post(
        "https://cfdidescargamasivasolicitud.clouda.sat.gob.mx/Autenticacion/Autenticacion.svc",
        soapXml,
        {
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "http://DescargaMasivaTerceros.sat.gob.mx/IAutenticacion/Autentica"
          },
          timeout: 30000 // 30 segundos timeout
        }
      );

      logger.info("Respuesta recibida del SAT");

      // Guardar respuesta para depuración
      const respPath = `${fielPath}/ultima_respuesta_${new Date().toISOString().replace(/[:.]/g, "-")}.xml`;
      try {
        await bucket.file(respPath).save(response.data);
        logger.info(`Respuesta guardada en: ${respPath}`);
      } catch (error) {
        logger.warn("No se pudo guardar la respuesta para depuración:", error);
      }

      // Extraer token de autenticación de la respuesta SOAP
      const token = extraerTokenDeSoap(response.data);
      logger.info("Token de autenticación extraído correctamente");

      return {
        success: true,
        token: token,
        message: "Autenticación exitosa con el SAT",
        requestXmlPath: xmlPath,
        responseXmlPath: respPath
      };
    } catch (err: any) {
      logger.error("Error en autenticarSAT:", err);
      return {
        success: false,
        error: err.message || "Error desconocido",
        stack: err.stack
      };
    }
  }
);

/**
 * Genera el XML SOAP con WS-Security para autenticación SAT
 */
function generarSoapAutenticacion(
  certificateBuffer: Buffer,
  privateKeyBuffer: Buffer,
  password: string
): string {
  try {
    // 1. Convertir certificado a Base64
    const certificateBase64 = certificateBuffer.toString("base64");
    logger.info(`Certificado convertido a Base64 (longitud: ${certificateBase64.length})`);

    // 2. Convertir la llave privada a formato PEM utilizando node-forge
    logger.info("Convirtiendo llave privada a PEM usando forge...");

    let privateKeyPem;
    try {
      // Convert DER to ASN.1
      const derKey = forge.util.createBuffer(privateKeyBuffer.toString("binary"));
      const asn1 = forge.asn1.fromDer(derKey);

      // FIXED: Proper handling of ASN.1 conversion to private key
      const decryptedInfo = forge.pki.decryptPrivateKeyInfo(asn1, password);
      if (!decryptedInfo) {
        throw new Error("No se pudo desencriptar la llave privada");
      }
      const privateKey = forge.pki.privateKeyFromAsn1(decryptedInfo);
      privateKeyPem = forge.pki.privateKeyToPem(privateKey);

      logger.info("Llave privada convertida a PEM correctamente");
    } catch (error) {
      logger.error("Error al convertir llave a PEM con forge:", error);

      // Use the properly imported fs functions instead of require
      try {
        // Write to temp file to get proper PEM encoding
        const tempFilePath = `/tmp/key-${uuidv4()}.pem`;
        writeFileSync(tempFilePath, privateKeyBuffer);
        privateKeyPem = readFileSync(tempFilePath, "utf8");
        unlinkSync(tempFilePath); // Delete the temp file
        logger.info("Llave privada recuperada usando método alternativo");
      } catch (fsError) {
        logger.error("Error en método alternativo:", fsError);
        throw new Error("No se pudo procesar la llave privada después de múltiples intentos");
      }
    }

    // Verificar que tengamos una llave privada válida en formato PEM
    if (!privateKeyPem || !privateKeyPem.includes("-----BEGIN")) {
      throw new Error("La llave privada no está en formato PEM válido");
    }

    logger.info(`PEM generado (primeros 40 chars): ${privateKeyPem.substring(0, 40)}...`);

    // Add the missing code to convert key to OpenSSL format
    // CRITICAL: Convert to OpenSSL compatible format
    let opensslKeyFormat = privateKeyPem;

    // Force to a specific format to ensure compatibility
    if (opensslKeyFormat.includes("RSA PRIVATE KEY")) {
      logger.info("Llave en formato RSA PRIVATE KEY, intentando con formato simple...");

      try {
        // Extract the key from headers
        const keyBase64 = opensslKeyFormat
          .replace("-----BEGIN RSA PRIVATE KEY-----", "")
          .replace("-----END RSA PRIVATE KEY-----", "")
          .replace(/\n/g, "")
          .trim();

        // Reformat as PKCS#8
        opensslKeyFormat =
          "-----BEGIN PRIVATE KEY-----\n" +
          keyBase64.match(/.{1,64}/g)!.join("\n") +
          "\n-----END PRIVATE KEY-----\n";

        logger.info("Llave reformateada como PRIVATE KEY");
      } catch (err) {
        logger.warn("Error reformateando llave:", err);
      }
    }

    // Log both formats for comparison
    logger.info("Llave original:\n" + privateKeyPem.substring(0, 100) + "...");
    logger.info("Llave reformateada:\n" + opensslKeyFormat.substring(0, 100) + "...");

    // 4. Generar IDs únicos para los elementos de seguridad
    const securityTokenId = `uuid-${uuidv4()}`;
    const timestampId = "_0";

    // 5. Generar timestamps (creado y expiración)
    const now = new Date();
    const expiration = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos
    const created = now.toISOString();
    const expires = expiration.toISOString();

    // 6. Construir el XML del timestamp (que será firmado)
    const timestampXml = `<u:Timestamp xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" u:Id="${timestampId}">
      <u:Created>${created}</u:Created>
      <u:Expires>${expires}</u:Expires>
    </u:Timestamp>`;

    // 7. FIXED: Initialize SignedXml properly with all parameters
    logger.info("Creando objeto SignedXml con enfoque corregido...");

    // Initialize with a proper configuration object
    const sig: any = new SignedXml({
      canonicalizationAlgorithm: "http://www.w3.org/2001/10/xml-exc-c14n#",
      signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1"
    });

    // Set the key
    sig.signingKey = opensslKeyFormat;

    // Ensure properties are explicitly set (sometimes needed even with constructor options)
    sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";
    sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";

    // Add reference
    sig.addReference({
      xpath: "//*[local-name(.)='Timestamp']",
      transforms: [
        "http://www.w3.org/2001/10/xml-exc-c14n#"
      ],
      digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
      uri: `#${timestampId}`
    });

    // Set key info provider
    sig.keyInfoProvider = {
      getKeyInfo: () => {
        return `<o:SecurityTokenReference xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-secext-1.0.xsd">
          <o:Reference URI="#${securityTokenId}" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" />
        </o:SecurityTokenReference>`;
      }
    };

    // 8. Try an alternative approach that doesn't require xml-crypto
    try {
      logger.info("Intentando método directo sin xml-crypto...");

      // Create a basic SOAP signature manually
      // This skips the xml-crypto library entirely
      const digestSha1 = crypto.createHash("sha1")
        .update(timestampXml.trim())
        .digest("base64");

      // Try to sign using raw key in PEM format
      try {
        // Prepare a key in the simplest possible format
        const simpleKey = privateKeyPem.trim();

        // Create signature of canonicalized SignedInfo
        const signedInfoXml = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
          <CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
          <Reference URI="#${timestampId}">
            <Transforms>
              <Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            </Transforms>
            <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
            <DigestValue>${digestSha1}</DigestValue>
          </Reference>
        </SignedInfo>`;

        // Sign the SignedInfo
        const signer = crypto.createSign("RSA-SHA1");
        signer.update(signedInfoXml);
        const signatureValue = signer.sign(simpleKey, "base64");

        // Manually construct the full signature XML
        const signatureXml = `
        <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
          ${signedInfoXml}
          <SignatureValue>${signatureValue}</SignatureValue>
          <KeyInfo>
            <o:SecurityTokenReference xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-secext-1.0.xsd">
              <o:Reference URI="#${securityTokenId}" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3"/>
            </o:SecurityTokenReference>
          </KeyInfo>
        </Signature>`;

        logger.info("Firma creada con método directo exitosamente");

        // Return the full SOAP envelope with our manually created signature
        return createSoapEnvelope(
          timestampId,
          created,
          expires,
          securityTokenId,
          certificateBase64,
          signatureXml
        );
      } catch (error) {
        logger.error("Error en firma directa:", error);
        throw error;
      }
    } catch (directError) {
      logger.error("Error en método directo, intentando con xml-crypto:", directError);

      // Fall back to xml-crypto as a last resort
      try {
        logger.info("Intentando con xml-crypto una vez más...");
        sig.computeSignature(timestampXml);
        const signatureXml = sig.getSignatureXml();

        return createSoapEnvelope(
          timestampId,
          created,
          expires,
          securityTokenId,
          certificateBase64,
          signatureXml
        );
      } catch (xmlCryptoError) {
        logger.error("Error final con xml-crypto:", xmlCryptoError);
        throw xmlCryptoError;
      }
    }
  } catch (error: any) {
    logger.error("Error generando SOAP:", error);
    throw new Error(`Error generando XML SOAP: ${error.message}`);
  }
}

/**
 * Helper function to create the SOAP envelope
 */
function createSoapEnvelope(
  timestampId: string,
  created: string,
  expires: string,
  securityTokenId: string,
  certificateBase64: string,
  signatureXml: string
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" 
  xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <s:Header>
    <o:Security s:mustUnderstand="1" xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-secext-1.0.xsd">
      <u:Timestamp u:Id="${timestampId}">
        <u:Created>${created}</u:Created>
        <u:Expires>${expires}</u:Expires>
      </u:Timestamp>
      <o:BinarySecurityToken u:Id="${securityTokenId}" 
        ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" 
        EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">
        ${certificateBase64}
      </o:BinarySecurityToken>
      ${signatureXml}
    </o:Security>
    <Action s:mustUnderstand="1" xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">
      http://DescargaMasivaTerceros.sat.gob.mx/IAutenticacion/Autentica
    </Action>
  </s:Header>
  <s:Body>
    <Autentica xmlns="http://DescargaMasivaTerceros.sat.gob.mx" />
  </s:Body>
</s:Envelope>`;
}

/**
 * Extrae el token de autenticación de la respuesta SOAP del SAT
 */
function extraerTokenDeSoap(soapResponse: string): string {
  try {
    // Buscar el valor dentro de las etiquetas AutenticaResult
    const match = soapResponse.match(/<AutenticaResult>(.*?)<\/AutenticaResult>/s);
    if (!match || !match[1]) {
      throw new Error("No se encontró el token en la respuesta del SAT");
    }
    return match[1].trim();
  } catch (error: any) {
    logger.error("Error extrayendo token:", error);
    throw new Error(`No se pudo extraer el token: ${error.message}`);
  }
}

