import mongoose, { Schema, Document } from 'mongoose';
import type { AttackCategory, FirewallDecision, SourceType } from '../types/firewall.js';

export interface IAuditEventDocument extends Document {
  eventId: string;
  scanId: string;
  sourceType: SourceType;
  decision: FirewallDecision;
  riskScore: number;
  attackCategories: AttackCategory[];
  actionTaken: 'PASSED' | 'REJECTED' | 'SANITIZED' | 'FLAGGED_FOR_REVIEW';
  reason: string;
  clientIp?: string;
  createdAt: Date;
}

const AuditEventSchema = new Schema<IAuditEventDocument>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    scanId: { type: String, required: true, index: true },
    sourceType: { type: String, required: true },
    decision: { type: String, enum: ['ALLOW', 'BLOCK', 'QUARANTINE', 'REVIEW'], required: true, index: true },
    riskScore: { type: Number, required: true },
    attackCategories: [{ type: String }],
    actionTaken: {
      type: String,
      enum: ['PASSED', 'REJECTED', 'SANITIZED', 'FLAGGED_FOR_REVIEW'],
      required: true,
      index: true,
    },
    reason: { type: String, required: true },
    clientIp: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditEventSchema.index({ createdAt: -1 });

export const AuditEventModel = mongoose.model<IAuditEventDocument>('AuditEvent', AuditEventSchema);
