import mongoose from 'mongoose';
import crypto from 'node:crypto';

const publicId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;

const SigningDocumentSchema = new mongoose.Schema(
  {
    publicDocumentId: { type: String, index: true, unique: true, default: () => publicId('doc') },
    filename: String,
    originalName: String,
    storagePath: String,
    mimeType: String,
    size: Number,
    checksum: String,
    passwordProtected: { type: Boolean, default: false },
    ownerId: String,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const SigningRequestSchema = new mongoose.Schema(
  {
    publicRequestId: { type: String, index: true, unique: true, default: () => publicId('req') },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SigningDocument', default: null },
    finalDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SigningDocument', default: null },
    documentRef: { type: String, default: '' },
    ownerId: { type: String, default: null },
    title: String,
    status: {
      type: String,
      enum: ['draft', 'sent', 'in_progress', 'pending', 'partially_signed', 'completed', 'expired', 'cancelled', 'rejected'],
      default: 'draft',
    },
    signingMode: { type: String, enum: ['sequential', 'parallel'], default: 'sequential' },
    signingOrder: { type: String, default: 'sequential' },
    expirationAt: { type: Date, default: null },
    reminderSettings: { type: mongoose.Schema.Types.Mixed, default: { enabled: true, frequencyHours: 24 } },
    emailSettings: { type: mongoose.Schema.Types.Mixed, default: { notifications: true } },
    verificationSettings: { type: mongoose.Schema.Types.Mixed, default: { qr: true } },
    publicUuid: { type: String, default: () => crypto.randomUUID() },
    completedAt: { type: Date, default: null },
    finalizationInProgress: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    requestHash: { type: String, default: null },
  },
  { timestamps: true }
);

const SigningSignerSchema = new mongoose.Schema(
  {
    publicSignerId: { type: String, index: true, unique: true, default: () => publicId('signer') },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SigningRequest', index: true },
    name: String,
    email: String,
    role: { type: String, default: 'Approver' },
    order: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'opened', 'signing', 'signed', 'rejected', 'expired'],
      default: 'pending',
    },
    tokenHash: { type: String, default: null },
    tokenExpiresAt: { type: Date, default: null },
    accessCodeHash: { type: String, default: null },
    openedAt: { type: Date, default: null },
    signedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    color: { type: String, default: '#10b981' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const SigningFieldSchema = new mongoose.Schema(
  {
    publicFieldId: { type: String, index: true, unique: true, default: () => publicId('field') },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SigningRequest', index: true },
    signerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SigningSigner', default: null },
    pageIndex: { type: Number, default: 0 },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 0.2 },
    height: { type: Number, default: 0.1 },
    rotation: { type: Number, default: 0 },
    type: { type: String, enum: ['signature', 'initials', 'name', 'date', 'text', 'input', 'stamp'], default: 'signature' },
    required: { type: Boolean, default: false },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    style: { type: mongoose.Schema.Types.Mixed, default: {} },
    linkedMode: { type: String, default: 'single' },
    linkedRange: { type: [Number], default: undefined },
    status: { type: String, default: 'pending' },
  },
  { timestamps: true }
);

const SigningEventSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SigningRequest', index: true },
    signerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SigningSigner', default: null },
    publicRequestId: { type: String, default: '' },
    publicSignerId: { type: String, default: '' },
    eventType: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

const SigningVerificationSchema = new mongoose.Schema(
  {
    publicVerificationId: { type: String, index: true, unique: true, default: () => publicId('verify') },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SigningRequest', index: true },
    documentHash: { type: String, default: '' },
    finalPdfHash: { type: String, default: '' },
    verificationStatus: { type: String, default: 'verified' },
    signedAt: { type: Date, default: Date.now },
    signerCount: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const SignatureAssetSchema = new mongoose.Schema(
  {
    publicAssetId: { type: String, index: true, unique: true, default: () => publicId('asset') },
    ownerId: { type: String, default: null },
    type: { type: String, enum: ['signature', 'initials', 'stamp'], default: 'signature' },
    name: String,
    mimeType: String,
    url: String,
    checksum: String,
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const SigningTemplateSchema = new mongoose.Schema(
  {
    publicTemplateId: { type: String, index: true, unique: true, default: () => publicId('tmpl') },
    ownerId: { type: String, default: null },
    name: { type: String, required: true },
    fields: { type: [mongoose.Schema.Types.Mixed], default: [] },
    defaultRequestSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
    signerRoleMap: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const SigningDocument = mongoose.models.SigningDocument || mongoose.model('SigningDocument', SigningDocumentSchema);
export const SigningRequest = mongoose.models.SigningRequest || mongoose.model('SigningRequest', SigningRequestSchema);
export const SigningSigner = mongoose.models.SigningSigner || mongoose.model('SigningSigner', SigningSignerSchema);
export const SigningField = mongoose.models.SigningField || mongoose.model('SigningField', SigningFieldSchema);
export const SigningEvent = mongoose.models.SigningEvent || mongoose.model('SigningEvent', SigningEventSchema);
export const SigningVerification = mongoose.models.SigningVerification || mongoose.model('SigningVerification', SigningVerificationSchema);
export const SignatureAsset = mongoose.models.SignatureAsset || mongoose.model('SignatureAsset', SignatureAssetSchema);
export const SigningTemplate = mongoose.models.SigningTemplate || mongoose.model('SigningTemplate', SigningTemplateSchema);
