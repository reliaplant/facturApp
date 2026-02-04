import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    responseLimit: false, // Allow large file downloads
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rfc, packageId } = req.query;

  if (!rfc || !packageId || typeof rfc !== 'string' || typeof packageId !== 'string') {
    return res.status(400).json({ error: 'Missing rfc or packageId' });
  }

  try {
    // Construct the Firebase Storage URL directly
    // This works because we're making the request from the server (no CORS)
    const bucket = 'facturapp-7009f.firebasestorage.app';
    const filePath = encodeURIComponent(`clients/${rfc}/packages/${packageId}.zip`);
    const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${filePath}?alt=media`;

    console.log(`📦 Descargando paquete: ${packageId} para RFC: ${rfc}`);
    
    // Fetch the file from Firebase Storage (server-side, no CORS issues)
    const response = await fetch(storageUrl);
    
    if (!response.ok) {
      console.error(`❌ Error descargando de Storage: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: response.status === 404 ? 'Package not found' : 'Error downloading from storage' 
      });
    }

    // Get the file as a buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`✅ Paquete descargado: ${(buffer.length / 1024).toFixed(2)} KB`);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${packageId}.zip"`);
    res.setHeader('Content-Length', buffer.length);

    // Send the file
    res.send(buffer);
  } catch (error: any) {
    console.error('❌ Error in download-package API:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

