import { databases, COLLECTIONS } from './appwrite';
import { ID, Query } from 'appwrite';
import type { Partner, Referral, PartnerCommission } from './types';
import {
  PARTNER_COMMISSION_RATE,
  PARTNER_COMMISSION_WINDOW_DAYS,
  PARTNER_CODE_PREFIX,
} from './constants';

/**
 * PARTNER SERVICE
 *
 * Manages the Community Growth Partner (Referral) Program.
 * Partners earn 5% commission on completed jobs from clients they refer,
 * within a 90-day window. The 5% comes from the platform's existing 15%.
 *
 * Server-side operations use serverDatabases via dbClient param.
 */
export class PartnerService {

  /**
   * Generate a unique partner code: EW-NAME3RANDOM
   * e.g. "EW-TOLU8K2"
   */
  static generatePartnerCode(name: string): string {
    const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let random = '';
    for (let i = 0; i < 3; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${PARTNER_CODE_PREFIX}-${cleanName}${random}`;
  }

  /**
   * Create a new partner with a unique code (retries on collision)
   */
  static async createPartner(data: {
    name: string;
    email: string;
    phone?: string;
    experience?: string;
  }, dbClient?: any): Promise<Partner> {
    const db = dbClient || databases;
    const now = new Date().toISOString();

    // Check if email already exists
    const existing = await db.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.PARTNERS,
      [Query.equal('email', data.email), Query.limit(1)]
    );

    if (existing.documents.length > 0) {
      return existing.documents[0] as unknown as Partner;
    }

    // Generate unique partner code with collision retry
    let partnerCode = '';
    let attempts = 0;
    while (attempts < 5) {
      partnerCode = this.generatePartnerCode(data.name);
      try {
        const collision = await db.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.PARTNERS,
          [Query.equal('partnerCode', partnerCode), Query.limit(1)]
        );
        if (collision.documents.length === 0) break;
      } catch {
        break;
      }
      attempts++;
    }

    const partner = await db.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.PARTNERS,
      ID.unique(),
      {
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        partnerCode,
        status: 'active',
        totalReferrals: 0,
        totalEarnings: 0,
        pendingPayout: 0,
        experience: data.experience || '',
        createdAt: now,
        updatedAt: now,
      }
    );

    return partner as unknown as Partner;
  }

  /**
   * Validate that a partner code exists and is active
   */
  static async validatePartnerCode(code: string, dbClient?: any): Promise<{ valid: boolean; partnerName?: string; partnerId?: string }> {
    const db = dbClient || databases;

    try {
      const result = await db.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PARTNERS,
        [Query.equal('partnerCode', code), Query.equal('status', 'active'), Query.limit(1)]
      );

      if (result.documents.length > 0) {
        const partner = result.documents[0];
        return { valid: true, partnerName: partner.name, partnerId: partner.$id };
      }

      return { valid: false };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Create a referral record linking a partner to a new client
   */
  static async createReferral(data: {
    partnerCode: string;
    partnerId: string;
    clientId: string;
    clientEmail: string;
  }, dbClient?: any): Promise<Referral | null> {
    const db = dbClient || databases;
    const now = new Date().toISOString();

    try {
      // Check if client already has a referral
      const existing = await db.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.REFERRALS,
        [Query.equal('clientId', data.clientId), Query.limit(1)]
      );

      if (existing.documents.length > 0) {
        return existing.documents[0] as unknown as Referral;
      }

      const referral = await db.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.REFERRALS,
        ID.unique(),
        {
          partnerCode: data.partnerCode,
          partnerId: data.partnerId,
          clientId: data.clientId,
          clientEmail: data.clientEmail,
          status: 'active',
          totalCommissionEarned: 0,
          jobsCompleted: 0,
          createdAt: now,
          updatedAt: now,
        }
      );

      // Increment partner's totalReferrals
      try {
        const partner = await db.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.PARTNERS,
          data.partnerId
        );
        await db.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.PARTNERS,
          data.partnerId,
          {
            totalReferrals: (partner.totalReferrals || 0) + 1,
            updatedAt: now,
          }
        );
      } catch (error) {
        console.error('Failed to increment partner referral count:', error);
      }

      return referral as unknown as Referral;
    } catch (error) {
      console.error('Failed to create referral:', error);
      return null;
    }
  }

  /**
   * Process commission for a completed booking.
   *
   * Returns commission details if applicable, or null if no commission due.
   * Idempotent via `partner_comm_{bookingId}` document ID.
   */
  static async processCommissionForCompletedBooking(params: {
    bookingId: string;
    clientId: string;
    jobAmountInNaira: number;
  }, dbClient?: any): Promise<{ partnerCommissionAmount: number; partnerId: string } | null> {
    const db = dbClient || databases;
    const now = new Date().toISOString();

    // 1. Look up referral by clientId
    let referral: Referral;
    try {
      const referrals = await db.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.REFERRALS,
        [Query.equal('clientId', params.clientId), Query.equal('status', 'active'), Query.limit(1)]
      );

      if (referrals.documents.length === 0) {
        return null; // No active referral for this client
      }

      referral = referrals.documents[0] as unknown as Referral;
    } catch {
      return null;
    }

    // 2. Check/set commission window
    if (referral.firstCompletedJobAt) {
      // Check if past 90-day window
      const windowEnd = new Date(referral.commissionWindowEndsAt || '');
      if (windowEnd.getTime() < Date.now()) {
        // Expire the referral
        try {
          await db.updateDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.REFERRALS,
            referral.$id,
            { status: 'expired', updatedAt: now }
          );
        } catch {
          // Non-critical
        }
        return null;
      }
    } else {
      // First completed job — set window
      const windowEnd = new Date();
      windowEnd.setDate(windowEnd.getDate() + PARTNER_COMMISSION_WINDOW_DAYS);

      try {
        await db.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.REFERRALS,
          referral.$id,
          {
            firstCompletedJobAt: now,
            commissionWindowEndsAt: windowEnd.toISOString(),
            updatedAt: now,
          }
        );
      } catch {
        // Non-critical, continue
      }
    }

    // 3. Calculate commission
    const commissionAmount = Math.round(params.jobAmountInNaira * PARTNER_COMMISSION_RATE);
    if (commissionAmount <= 0) return null;

    // 4. Create commission record (idempotent via document ID)
    const commissionDocId = `partner_comm_${params.bookingId}`;
    try {
      await db.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PARTNER_COMMISSIONS,
        commissionDocId,
        {
          referralId: referral.$id,
          partnerId: referral.partnerId,
          partnerCode: referral.partnerCode,
          clientId: params.clientId,
          bookingId: params.bookingId,
          jobAmount: params.jobAmountInNaira,
          commissionRate: PARTNER_COMMISSION_RATE,
          commissionAmount,
          status: 'pending',
          payoutMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
          createdAt: now,
        }
      );
    } catch (error: any) {
      if (error.code === 409 || error.message?.includes('already exists')) {
        // Already processed — idempotent
        return { partnerCommissionAmount: commissionAmount, partnerId: referral.partnerId };
      }
      throw error;
    }

    // 5. Update denormalized counters on referral
    try {
      await db.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.REFERRALS,
        referral.$id,
        {
          totalCommissionEarned: (referral.totalCommissionEarned || 0) + commissionAmount,
          jobsCompleted: (referral.jobsCompleted || 0) + 1,
          updatedAt: now,
        }
      );
    } catch {
      // Non-critical
    }

    // 6. Update denormalized counters on partner
    try {
      const partner = await db.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PARTNERS,
        referral.partnerId
      );
      await db.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PARTNERS,
        referral.partnerId,
        {
          totalEarnings: (partner.totalEarnings || 0) + commissionAmount,
          pendingPayout: (partner.pendingPayout || 0) + commissionAmount,
          updatedAt: now,
        }
      );
    } catch {
      // Non-critical
    }

    return { partnerCommissionAmount: commissionAmount, partnerId: referral.partnerId };
  }

  /**
   * List partners with optional filtering (for admin page)
   */
  static async listPartners(filters?: {
    status?: string;
    search?: string;
    limit?: number;
  }, dbClient?: any): Promise<Partner[]> {
    const db = dbClient || databases;
    const queries: any[] = [Query.orderDesc('createdAt'), Query.limit(filters?.limit || 100)];

    if (filters?.status && filters.status !== 'all') {
      queries.push(Query.equal('status', filters.status));
    }

    if (filters?.search) {
      queries.push(Query.search('name', filters.search));
    }

    const result = await db.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.PARTNERS,
      queries
    );

    return result.documents as unknown as Partner[];
  }

  /**
   * Get commissions for a specific partner (for admin detail view)
   */
  static async getPartnerCommissions(partnerId: string, dbClient?: any): Promise<PartnerCommission[]> {
    const db = dbClient || databases;

    const result = await db.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.PARTNER_COMMISSIONS,
      [Query.equal('partnerId', partnerId), Query.orderDesc('createdAt'), Query.limit(100)]
    );

    return result.documents as unknown as PartnerCommission[];
  }

  /**
   * Get referrals for a specific partner
   */
  static async getPartnerReferrals(partnerId: string, dbClient?: any): Promise<Referral[]> {
    const db = dbClient || databases;

    const result = await db.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.REFERRALS,
      [Query.equal('partnerId', partnerId), Query.orderDesc('createdAt'), Query.limit(100)]
    );

    return result.documents as unknown as Referral[];
  }

  /**
   * Update partner status (admin action)
   */
  static async updatePartnerStatus(partnerId: string, status: string, dbClient?: any): Promise<Partner> {
    const db = dbClient || databases;

    const updated = await db.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.PARTNERS,
      partnerId,
      {
        status,
        updatedAt: new Date().toISOString(),
      }
    );

    return updated as unknown as Partner;
  }

  /**
   * Get a single partner by ID
   */
  static async getPartner(partnerId: string, dbClient?: any): Promise<Partner> {
    const db = dbClient || databases;

    const partner = await db.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.PARTNERS,
      partnerId
    );

    return partner as unknown as Partner;
  }
}
