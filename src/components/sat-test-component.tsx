import React from "react";
import { Button } from "@/components/ui/button";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/services/firebase"; // Update this import path

interface SatTestComponentProps {
  clientRfc: string;
}

export default function SatTestComponent({ clientRfc }: SatTestComponentProps) {
  const handleTestRequest = async () => {
    try {
      console.log("Iniciando prueba de solicitud al SAT...");

      // Preparar llamada
      const functions = getFunctions(app);
      const autenticarSAT = httpsCallable(functions, "autenticarSAT");

      // Mandar la solicitud, pasando el RFC en un objeto { rfc }
      const result = await autenticarSAT({ rfc: clientRfc });

      console.log("Respuesta de autenticarSAT:", result.data);
      alert(`Solicitud exitosa. RFC: ${clientRfc}. Revisa la consola para más detalles.`);
    } catch (error) {
      console.error("Error al solicitar autenticación SAT:", error);
      alert("Ocurrió un error al contactar al SAT. Ver consola.");
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-md shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Componente de Prueba SAT</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        Este es un componente de prueba para realizar solicitudes al SAT.
      </p>
      <Button onClick={handleTestRequest}>Probar Solicitud SAT</Button>
    </div>
  );
}
