import mongoose, { Schema, Document } from 'mongoose';
import type { AttackCategory, FirewallDecision, SourceType, SeverityLevel } from '../types/firewall.js';

export interface IEvidenceSubDoc {
  category: AttackCategory;
  severity: SeverityLevel;
  matchedPattern: string;
  snippet: string;
  explanation: string;
}

export interface IScanDocument extends Document {
  scanId: string;
  sourceType: SourceType;
  sourceMetadata?: {
    filename?: string;
    fileSizeBytes?: number;
    url?: string;
    domain?: string;
    charCount?: number;
  };
  decision: FirewallDecision;
  riskScore: number;
  confidenceScore: number;
  attackCategories: AttackCategory[];
  detectionMethods: string[];
  explanation: string;
  remediation: string;
  evidence: IEvidenceSubDoc[];
  processingDurationMs: number;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceSchema = new Schema<IEvidenceSubDoc>(
  {
    category: { type: String, required: true },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
    matchedPattern: { type: String, required: true },
    snippet: { type: String, required: true, maxlength: 500 }, // Cap snippet length for privacy/security
    explanation: { type: String, required: true },
  },
  { _id: false }
);

const ScanSchema = new Schema<IScanDocument>(
  {
    scanId: { type: String, required: true, unique: true, index: true },
    sourceType: { type: String, enum: ['text', 'pasted', 'pdf', 'url'], required: true, index: true },
    sourceMetadata: {
      filename: { type: String },
      fileSizeBytes: { type: Number },
      url: { type: String },
      domain: { type: String },
      charCount: { type: Number },
    },
    decision: { type: String, enum: ['ALLOW', 'BLOCK', 'QUARANTINE', 'REVIEW'], required: true, index: true },
    riskScore: { type: Number, required: true, min: 0, max: 100, index: true },
    confidenceScore: { type: Number, required: true, min: 0, max: 100 },
    attackCategories: [{ type: String, index: true }],
    detectionMethods: [{ type: String }],
    explanation: { type: String, required: true },
    remediation: { type: String, required: true },
    evidence: [EvidenceSchema],
    processingDurationMs: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

// Helpful compound indexes for dashboard queries and filtered pagination
ScanSchema.index({ createdAt: -1 });
ScanSchema.index({ decision: 1, createdAt: -1 });
ScanSchema.index({ riskScore: -1, createdAt: -1 });

export const ScanModel = mongoose.model<IScanDocument>('Scan', ScanSchema);
