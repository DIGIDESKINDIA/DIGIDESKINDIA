export type SigningMode = 'self' | 'request';
export type SignatureMethod = 'typed' | 'drawn' | 'upload';
export type FieldType = 'signature' | 'initials' | 'name' | 'date' | 'text' | 'input' | 'company-stamp';
export type LinkedPageMode = 'single' | 'all' | 'all-but-last' | 'last' | 'range';

export type PdfField = {
  id: string;
  type: FieldType;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value?: string;
  imageData?: string;
  signerId?: string | null;
  label?: string;
  color?: string;
  fontSize?: number;
  required?: boolean;
  linkedMode?: LinkedPageMode;
  linkedRange?: [number, number];
  assignment?: 'all' | 'selected' | 'unassigned';
};

export type Signer = {
  id: string;
  name: string;
  email: string;
  role?: string;
  color?: string;
  status?: 'pending' | 'opened' | 'signing' | 'signed' | 'rejected' | 'expired';
};

export type RequestSettings = {
  signingMode: 'sequential' | 'parallel';
  expirationDays?: number;
  remindersEnabled?: boolean;
  reminderFrequency?: number;
  emailNotifications?: boolean;
  language?: string;
  customMessage?: string;
  allowAccessCode?: boolean;
};

export type SignPdfRequestPayload = {
  title: string;
  signers: Signer[];
  fields: PdfField[];
  settings: RequestSettings;
};
