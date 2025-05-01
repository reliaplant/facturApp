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
import { readFileSync, writeFileSync, unlinkSync } from "fs";
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

      const fielPath = `clients/${rfc}/fiel`;
      const bucket = getStorage().bucket();

      // Descargar archivos FIEL
      let cerBuf: Buffer;
      let keyBuf: Buffer;
      let passText: string;
      try {
        [cerBuf] = await bucket.file(`${fielPath}/certificado.cer`).download();
        [keyBuf] = await bucket.file(`${fielPath}/llave.key`).download();
        const [passBuf] = await bucket.file(`${fielPath}/clave.txt`).download();
        passText = passBuf.toString("utf8").trim();
      } catch (e: any) {
        logger.error("Error al descargar archivos FIEL:", e);
        throw new Error("No se pudieron descargar los archivos FIEL");
      }

      // Generar y guardar XML
      // Generar XML SOAP con WS-Security
      const soapXml = generarSoapAutenticacion(cerBuf, keyBuf, passText);

      const xmlPath = `${fielPath}/ultimo_request_${Date.now()}.xml`;
      await bucket.file(xmlPath).save(soapXml).catch((err) => logger.warn(`Failed to save XML: ${err}`));

      // Enviar al SAT
      const response = await axios.post(
        "https://cfdidescargamasivasolicitud.clouda.sat.gob.mx/Autenticacion/Autenticacion.svc",
        soapXml,
        {
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "" // Try empty SOAPAction or completely removing this header
          },
          timeout: 30000
        }
      );

      const respPath = `${fielPath}/ultima_respuesta_${Date.now()}.xml`;
      await bucket.file(respPath).save(response.data).catch((err) => logger.warn(`Failed to save response: ${err}`));

      const token = extraerTokenDeSoap(response.data);
      return {
        success: true,
        token,
        requestXmlPath: xmlPath,
        responseXmlPath: respPath
      };
    } catch (err: any) {
      logger.error("Error en autenticarSAT:", err);
      return { success: false, error: err.message };
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
  // 1. IDs y timestamps
  const correlationId = uuidv4();
  const securityTokenId = `uuid-${uuidv4()}-1`; // Key difference: Add "-1" suffix to security token ID to match pattern in examples
  const timestampId = "_0";
  const now = new Date();
  const created = now.toISOString().replace(/\.\d+Z$/, ""); // Format timestamp exactly like the video example (no Z in time)
  const expires = new Date(now.getTime() + 5 * 60 * 1000).toISOString().replace(/\.\d+Z$/, ""); // Format timestamp exactly like the video example (no Z in time)

  // 2. Certificado en Base64 (sin espacios)
  const certificateBase64 = certificateBuffer.toString("base64").trim();

  // 3. Obtener PEM de la llave privada
  let privateKeyPem: string;
  try {
    const der = forge.util.createBuffer(privateKeyBuffer.toString("binary"));
    const asn1 = forge.asn1.fromDer(der);
    const info = forge.pki.decryptPrivateKeyInfo(asn1, password);
    if (!info) throw new Error();
    privateKeyPem = forge.pki.privateKeyToPem(forge.pki.privateKeyFromAsn1(info));
  } catch {
    // fallback simple
    const tmp = `/tmp/key-${uuidv4()}.pem`;
    writeFileSync(tmp, privateKeyBuffer);
    privateKeyPem = readFileSync(tmp, "utf8");
    unlinkSync(tmp);
  }

  // 4. XML canónico del Timestamp
  const timestampXml = `<u:Timestamp xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" u:Id="${timestampId}"><u:Created>${created}</u:Created><u:Expires>${expires}</u:Expires></u:Timestamp>`;

  // 5. Digest SHA1
  const digestValue = crypto.createHash("sha1").update(timestampXml).digest("base64");

  // 6. SignedInfo canónico
  const signedInfo = `<SignedInfo>
          <CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
          <Reference URI="#${timestampId}">
            <Transforms>
              <Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            </Transforms>
            <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
            <DigestValue>${digestValue}</DigestValue>
          </Reference>
        </SignedInfo>`;

  // 7. Firmar SignedInfo
  const signer = crypto.createSign("RSA-SHA1");
  signer.update(signedInfo);
  const signatureValue = signer.sign(privateKeyPem, "base64");

  // 8. Armar Signature XML
  const signatureXml = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
        ${signedInfo}
        <SignatureValue>
          ${signatureValue}
        </SignatureValue>
        <KeyInfo>
          <o:SecurityTokenReference xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-secext-1.0.xsd">
            <o:Reference ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3"
                         URI="#${securityTokenId}"/>
          </o:SecurityTokenReference>
        </KeyInfo>
      </Signature>`;

  // 9. Retornar sobre completo
  return createSoapEnvelope(
    timestampId,
    created,
    expires,
    securityTokenId,
    certificateBase64,
    signatureXml,
    correlationId
  );
}

/**
 * Construye el sobre SOAP EXACTO al ejemplo del video
 */
function createSoapEnvelope(
  timestampId: string,
  created: string,
  expires: string,
  securityTokenId: string,
  certificateBase64: string,
  signatureXml: string,
  correlationId: string
): string {
  // Modified to match the format from the video example (more minimal)
  return `<?xml version="1.0"?>
<s:Envelope xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"
            xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <o:Security xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
                s:mustUnderstand="1">
      <u:Timestamp u:Id="${timestampId}">
        <u:Created>${created}</u:Created>
        <u:Expires>${expires}</u:Expires>
      </u:Timestamp>
      <o:BinarySecurityToken u:Id="${securityTokenId}"
                             EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary"
                             ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3">
        ${certificateBase64}
      </o:BinarySecurityToken>
      ${signatureXml}
    </o:Security>
  </s:Header>
  <s:Body>
    <Autentica xmlns="http://DescargaMasivaTerceros.gob.mx"/>
  </s:Body>
</s:Envelope>`;
}

/**
 * Extrae el token de la respuesta SOAP
 */
function extraerTokenDeSoap(soapResponse: string): string {
  const m = soapResponse.match(/<AutenticaResult>(.*?)<\/AutenticaResult>/s);
  if (!m) throw new Error("No se encontró AutenticaResult");
  return m[1].trim();
}
