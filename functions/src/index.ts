/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest, onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

// Add the autenticarSAT function that's referenced in the sat-test-component
export const autenticarSAT = onCall(async (request) => {
  const clientRfc = request.data.rfc;

  logger.info(`Processing SAT authentication for RFC: ${clientRfc}`,
    {structuredData: true});

  try {
    // Query the client document from Firestore using the RFC
    const clientsRef = db.collection("clients");
    const query = clientsRef.where("rfc", "==", clientRfc);
    const clientSnapshot = await query.get();

    if (clientSnapshot.empty) {
      logger.error(`No client found with RFC: ${clientRfc}`);
      return {
        status: "error",
        message: `No se encontró cliente con RFC: ${clientRfc}`,
      };
    }

    // Get the first matching client
    const clientData = clientSnapshot.docs[0].data();
    const claveFielUrl = clientData.claveFielUrl;

    if (!claveFielUrl) {
      logger.error(`No FIEL key found for client: ${clientRfc}`);
      return {
        status: "error",
        message: "No se encontró clave FIEL para este cliente",
      };
    }

    logger.info(`Using FIEL key URL from Firestore: ${claveFielUrl}`);

    // This is a placeholder implementation
    return {
      status: "success",
      message: `Autenticación simulada para: ${clientRfc}`,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    // Type assertion or check
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error in autenticarSAT: ${errorMessage}`);
    return {
      status: "error",
      message: "Error al procesar la autenticación",
      error: errorMessage,
    };
  }
});
