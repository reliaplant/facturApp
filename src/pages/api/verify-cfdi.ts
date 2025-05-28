import type { NextApiRequest, NextApiResponse } from 'next';
import { satVerificationService, CFDIVerificationParams } from '../../services/sat-verification-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const params: CFDIVerificationParams = req.body;
    const result = await satVerificationService.verifyCFDI(params);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}
