export interface Client {
  id: string;
  name: string;
  rfc: string;
  curp?: string;
  email?: string;
  phone?: string;
  lastAccess?: string;
  isActive?: boolean;
  inactiveDate?: string;
  inactiveReason?: string;
  address?: {
    street?: string;
    exteriorNumber?: string;
    interiorNumber?: string;
    colony?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  fiscalInfo?: {
    regime?: string;
    economicActivity?: string;
    registrationDate?: string;
    lastUpdateDate?: string;
    status?: string;
    obligations?: string[];
  };
  serviceInfo?: {
    clientSince?: string;
    plan?: string;
    planDescription?: string;
    lastInvoice?: string;
    nextRenewal?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClientData {
  name: string;
  rfc: string;
  curp?: string;
  email?: string;
  phone?: string;
  // Other optional fields can be added as needed
}

export interface UpdateClientData {
  name?: string;
  rfc?: string;
  curp?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  inactiveDate?: string;
  inactiveReason?: string;
  // Other optional fields can be added as needed
}
