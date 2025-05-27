// Interface for the 69B list entries
interface Listado69BEntry {
  RFC: string;
  Situacion: string;
}

// Cache for the 69B list to avoid reloading
let cachedList69B: Listado69BEntry[] | null = null;

/**
 * Service to handle the Listado 69B (blacklisted companies in Mexico)
 */
export const listado69bService = {
  /**
   * Load the Listado 69B from the JSON file
   */
  loadListado69B: async (): Promise<Listado69BEntry[]> => {
    // Return cached list if available
    if (cachedList69B) return cachedList69B;

    try {
      // Fetch the JSON file
      const response = await fetch('/listado69b.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch listado69b.json: ${response.status}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      // Ensure we have an array of entries
      if (Array.isArray(data)) {
        cachedList69B = data;
        console.log(`✅ Listado 69B loaded with ${data.length} entries`);
        return data;
      } else {
        console.error("Listado 69B data is not an array:", data);
        return [];
      }
    } catch (error) {
      console.error("Error loading Listado 69B:", error);
      return [];
    }
  },

  /**
   * Check if an RFC is in the Listado 69B
   * @returns Object with 'found' boolean and 'situacion' string (if found)
   */
  checkRFC: async (rfc: string): Promise<{ found: boolean; situacion?: string }> => {
    if (!rfc) return { found: false };
    
    const normalizedRFC = rfc.trim().toUpperCase();
    const list = await listado69bService.loadListado69B();
    
    // Find the entry matching the RFC
    const entry = list.find(item => item.RFC === normalizedRFC);
    
    if (entry) {
      console.log(`⚠️ RFC ${normalizedRFC} found in Listado 69B: ${entry.Situacion}`);
      return { found: true, situacion: entry.Situacion };
    }
    
    return { found: false };
  },
  
  /**
   * Check multiple RFCs against the Listado 69B
   * @returns Map of RFCs to their 69B status
   */
  checkMultipleRFCs: async (rfcList: string[]): Promise<Map<string, { found: boolean; situacion?: string }>> => {
    const results = new Map<string, { found: boolean; situacion?: string }>();
    const list = await listado69bService.loadListado69B();
    
    console.log(`Checking ${rfcList.length} RFCs against Listado 69B (${list.length} entries)`);
    
    // Create a map for faster lookups
    const rfcMap = new Map<string, string>();
    list.forEach(entry => {
      rfcMap.set(entry.RFC, entry.Situacion);
    });
    
    // Check each RFC
    for (const rfc of rfcList) {
      if (!rfc) {
        results.set(rfc, { found: false });
        continue;
      }
      
      const normalizedRFC = rfc.trim().toUpperCase();
      const situacion = rfcMap.get(normalizedRFC);
      
      if (situacion) {
        console.log(`⚠️ RFC ${normalizedRFC} found in Listado 69B: ${situacion}`);
        results.set(rfc, { found: true, situacion });
      } else {
        results.set(rfc, { found: false });
      }
    }
    
    // Log summary
    const foundCount = Array.from(results.values()).filter(r => r.found).length;
    console.log(`Found ${foundCount} RFCs in Listado 69B out of ${rfcList.length} checked`);
    
    return results;
  }
};
