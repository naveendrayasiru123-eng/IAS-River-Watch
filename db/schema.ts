import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
export const iasReports = sqliteTable('ias_reports', {
  requestId: text('request_id').primaryKey(),
  receivedAt: text('received_at').notNull(),
  species: text('species').notNull(),
  basin: text('basin').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  observedDate: text('observed_date').notNull(),
  abundance: text('abundance'),
  habitat: text('habitat'),
  degradation: text('degradation'),
  notes: text('notes'),
  photoKey: text('photo_key'),
  reviewStatus: text('review_status').notNull(),
  reviewNote: text('review_note'),
  reviewedAt: text('reviewed_at'),
  requestDigest: text('request_digest').notNull(),
});
export const adminLoginAttempts = sqliteTable('admin_login_attempts', {
  ipHash: text('ip_hash').primaryKey(),
  attempts: real('attempts').notNull(),
  windowStart: real('window_start').notNull(),
});
export const sampleVerifications = sqliteTable('sample_verifications', {
  sampleId: real('sample_id').primaryKey(),
  observedDate: text('observed_date').notNull(),
  verificationNote: text('verification_note').notNull(),
  verifiedAt: text('verified_at').notNull(),
});
