import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

// Interface for verification request params
export interface CFDIVerificationParams {
  uuid: string;      // UUID/Folio of the CFDI
  rfcEmisor: string; // RFC of the issuer
  rfcReceptor: string; // RFC of the receiver
  total: number;     // Total amount (with specific formatting requirements)
}

// Response interface based on SAT documentation
export interface CFDIVerificationResult {
  valid: boolean;           // If response was successful and CFDI is valid
  status: string;           // "Vigente"|"Cancelado" - Active or Canceled
  cancellationDate?: string; // Only present if status is "Cancelado"
  cancellationReason?: string; // Only present if status is "Cancelado" and reason exists
  errorMessage?: string;    // Error message if verification failed
  rawResponse?: any;        // Raw response data for debugging
  requestTimestamp: string; // When verification was performed
}

export const satVerificationService = {
  /**
   * Verifies a CFDI with the SAT web service
   * 
   * @param params The verification parameters
   * @returns Verification result
   */
  async verifyCFDI(params: CFDIVerificationParams): Promise<CFDIVerificationResult> {
    try {
      // Format total according to SAT specifications (fixed 2 decimal places, no commas)
      const formattedTotal = params.total.toFixed(2).replace(',', '');
      
      // Create SOAP envelope
      const soapEnvelope = `
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
          <soapenv:Header/>
          <soapenv:Body>
            <tem:Consulta>
              <!--Optional:-->
              <tem:expresionImpresa>
                <![CDATA[?re=${params.rfcEmisor}&rr=${params.rfcReceptor}&tt=${formattedTotal}&id=${params.uuid}]]>
              </tem:expresionImpresa>
            </tem:Consulta>
          </soapenv:Body>
        </soapenv:Envelope>
      `;
      
      // SAT's web service endpoint
      const endpoint = 'https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc';
      
      console.log('Verifying CFDI with SAT:', {
        uuid: params.uuid,
        rfcEmisor: params.rfcEmisor,
        rfcReceptor: params.rfcReceptor,
        total: formattedTotal
      });
      
      // Make SOAP request
      const response = await axios.post(endpoint, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'http://tempuri.org/IConsultaCFDIService/Consulta'
        },
        timeout: 10000 // 10 second timeout
      });
      
      // Parse XML response
      const parser = new XMLParser({ ignoreAttributes: false });
      const parsedResponse = parser.parse(response.data);
      
      // Extract verification result from SOAP response
      const consultaResult = parsedResponse['s:Envelope']?.['s:Body']?.
        ['ConsultaResponse']?.['ConsultaResult'] || {};
      
      // Map to our result format
      const result: CFDIVerificationResult = {
        valid: consultaResult['a:Estado'] === 'Vigente',
        status: consultaResult['a:Estado'] || 'Unknown',
        requestTimestamp: new Date().toISOString(),
        rawResponse: consultaResult
      };
      
      // Add cancellation info if available
      if (result.status === 'Cancelado') {
        result.cancellationDate = consultaResult['a:FechaCancelacion'] || undefined;
        result.cancellationReason = consultaResult['a:EstatusCancelacion'] || undefined;
      }
      
      return result;
    } catch (error) {
      console.error('Error verifying CFDI with SAT:', error);
      return {
        valid: false,
        status: 'Error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error verifying CFDI',
        requestTimestamp: new Date().toISOString()
      };
    }
  }
};
