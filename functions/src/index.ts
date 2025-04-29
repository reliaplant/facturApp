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

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

// Add the autenticarSAT function that's referenced in the sat-test-component
export const autenticarSAT = onCall((request) => {
  const clientRfc = request.data.rfc;

  logger.info(`Processing SAT authentication for RFC: ${clientRfc}`,
    {structuredData: true});

  // This is a placeholder implementation
  return {
    status: "success",
    message: `Autenticación simulada para RFC: ${clientRfc}`,
    timestamp: new Date().toISOString(),
  };
});
