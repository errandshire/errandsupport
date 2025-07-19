import { databases, COLLECTIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { EscrowService } from '@/lib/escrow-service';
import { EscrowUtils, ESCROW_STATUS, BOOKING_STATUS } from '@/lib/escrow-utils';
import type { EscrowTransaction, Booking } from '@/lib/types';

/**
 * Auto-Release Service - Phase 2
 * Handles automated escrow releases based on configurable rules
 */

export interface AutoReleaseRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: 'time_based' | 'status_based' | 'hybrid';
  conditions: {
    // Time-based conditions
    autoReleaseAfterHours?: number; // Auto-release after X hours from job completion
    maxHoldDuration?: number; // Max hours to hold payment regardless of status
    
    // Status-based conditions
    requiredStatus?: string; // Booking status required for release
    requireClientConfirmation?: boolean; // Whether client confirmation is needed
    
    // Hybrid conditions
    gracePeriodHours?: number; // Grace period before auto-release after completion
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
  };
}

export interface AutoReleaseLog {
  id: string;
  bookingId: string;
  escrowTransactionId: string;
  ruleId: string;
  action: 'released' | 'scheduled' | 'cancelled' | 'failed';
  reason: string;
  scheduledAt?: string;
  executedAt?: string;
  error?: string;
  metadata: {
    originalRule: AutoReleaseRule;
    bookingStatus: string;
    escrowStatus: string;
    autoReleaseTriggeredBy: 'cron' | 'manual' | 'status_change';
  };
}

export class AutoReleaseService {
  
  // Default auto-release rules
  private static DEFAULT_RULES: Partial<AutoReleaseRule>[] = [
    {
      id: 'standard_completion',
      name: 'Standard Job Completion',
      description: 'Release payment 24 hours after job is marked as completed',
      enabled: true,
      trigger: 'hybrid',
      conditions: {
        requiredStatus: BOOKING_STATUS.COMPLETED,
        autoReleaseAfterHours: 24,
        gracePeriodHours: 2
      }
    },
    {
      id: 'emergency_release',
      name: 'Emergency Auto-Release',
      description: 'Force release payment after 7 days regardless of status (dispute protection)',
      enabled: true,
      trigger: 'time_based',
      conditions: {
        maxHoldDuration: 168 // 7 days
      }
    },
    {
      id: 'client_confirmed',
      name: 'Client Confirmed Completion',
      description: 'Immediate release when client confirms job completion',
      enabled: true,
      trigger: 'status_based',
      conditions: {
        requiredStatus: BOOKING_STATUS.COMPLETED,
        requireClientConfirmation: true,
        autoReleaseAfterHours: 0 // Immediate
      }
    }
  ];

  /**
   * Initialize default auto-release rules
   */
  static async initializeDefaultRules(): Promise<void> {
    try {
      console.log('🚀 Initializing auto-release rules...');
      
      for (const ruleData of this.DEFAULT_RULES) {
        const existingRules = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.AUTO_RELEASE_RULES,
          [Query.equal('id', ruleData.id!)]
        );

        if (existingRules.documents.length === 0) {
          const fullRule: AutoReleaseRule = {
            ...ruleData,
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'system'
            }
          } as AutoReleaseRule;

          await databases.createDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.AUTO_RELEASE_RULES,
            ruleData.id!,
            fullRule
          );

          console.log(`✅ Created auto-release rule: ${ruleData.name}`);
        }
      }
    } catch (error) {
      console.error('❌ Error initializing auto-release rules:', error);
    }
  }

  /**
   * Process eligible escrow transactions for auto-release
   */
  static async processAutoReleases(): Promise<AutoReleaseLog[]> {
    console.log('🔄 Processing auto-releases...');
    const logs: AutoReleaseLog[] = [];

    try {
      // Get all active auto-release rules
      const rulesResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.AUTO_RELEASE_RULES,
        [Query.equal('enabled', true)]
      );

      const activeRules = rulesResponse.documents as unknown as AutoReleaseRule[];

      // Get all held escrow transactions
      const escrowResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.ESCROW_TRANSACTIONS,
        [
          Query.equal('status', ESCROW_STATUS.HELD),
          Query.orderAsc('createdAt'),
          Query.limit(100)
        ]
      );

      const heldEscrows = escrowResponse.documents as unknown as EscrowTransaction[];

      console.log(`📊 Found ${heldEscrows.length} held escrow transactions`);
      console.log(`📋 Processing with ${activeRules.length} active rules`);

      // Process each escrow transaction against all rules
      for (const escrow of heldEscrows) {
        for (const rule of activeRules) {
          const log = await this.evaluateEscrowAgainstRule(escrow, rule);
          if (log) {
            logs.push(log);
          }
        }
      }

      console.log(`✅ Auto-release processing complete. ${logs.length} actions taken.`);
    } catch (error) {
      console.error('❌ Error processing auto-releases:', error);
    }

    return logs;
  }

  /**
   * Evaluate a specific escrow transaction against an auto-release rule
   */
  private static async evaluateEscrowAgainstRule(
    escrow: EscrowTransaction, 
    rule: AutoReleaseRule
  ): Promise<AutoReleaseLog | null> {
    try {
      // Get associated booking
      const booking = await this.getBookingForEscrow(escrow.bookingId);
      if (!booking) {
        console.warn(`⚠️ Booking not found for escrow ${escrow.$id}`);
        return null;
      }

      // Check if this escrow is eligible for this rule
      const eligibility = await this.checkEligibility(escrow, booking, rule);
      
      if (!eligibility.isEligible) {
        // Not eligible, but log for debugging if it's close
        if (eligibility.reason?.includes('hours remaining')) {
          console.log(`⏳ Escrow ${escrow.$id}: ${eligibility.reason}`);
        }
        return null;
      }

      console.log(`🎯 Escrow ${escrow.$id} eligible for rule "${rule.name}": ${eligibility.reason}`);

      // Execute auto-release
      const log = await this.executeAutoRelease(escrow, booking, rule, eligibility.reason!);
      
      return log;

    } catch (error) {
      console.error(`❌ Error evaluating escrow ${escrow.$id} against rule ${rule.id}:`, error);
      
      return this.createErrorLog(escrow, rule, error);
    }
  }

  /**
   * Check if an escrow transaction is eligible for auto-release under a specific rule
   */
  private static async checkEligibility(
    escrow: EscrowTransaction,
    booking: Booking,
    rule: AutoReleaseRule
  ): Promise<{ isEligible: boolean; reason?: string }> {
    const now = new Date();
    const escrowCreated = new Date(escrow.createdAt);
    const hoursHeld = (now.getTime() - escrowCreated.getTime()) / (1000 * 60 * 60);

    switch (rule.trigger) {
      case 'time_based':
        if (rule.conditions.maxHoldDuration) {
          if (hoursHeld >= rule.conditions.maxHoldDuration) {
            return {
              isEligible: true,
              reason: `Maximum hold duration exceeded (${hoursHeld.toFixed(1)}h >= ${rule.conditions.maxHoldDuration}h)`
            };
          } else {
            return {
              isEligible: false,
              reason: `${(rule.conditions.maxHoldDuration - hoursHeld).toFixed(1)} hours remaining until max hold duration`
            };
          }
        }
        break;

      case 'status_based':
        if (rule.conditions.requiredStatus && booking.status !== rule.conditions.requiredStatus) {
          return {
            isEligible: false,
            reason: `Booking status is ${booking.status}, required: ${rule.conditions.requiredStatus}`
          };
        }

        if (rule.conditions.requireClientConfirmation) {
          // Check if client has confirmed completion (would be in booking metadata or a separate confirmation system)
          const hasClientConfirmation = booking.completedAt && booking.status === BOOKING_STATUS.COMPLETED;
          if (!hasClientConfirmation) {
            return {
              isEligible: false,
              reason: 'Client confirmation required but not received'
            };
          }
        }

        if (rule.conditions.autoReleaseAfterHours === 0) {
          return {
            isEligible: true,
            reason: 'Immediate release conditions met'
          };
        }
        break;

      case 'hybrid':
        // Check status requirements first
        if (rule.conditions.requiredStatus && booking.status !== rule.conditions.requiredStatus) {
          return {
            isEligible: false,
            reason: `Booking status is ${booking.status}, required: ${rule.conditions.requiredStatus}`
          };
        }

        // Check time requirements
        if (rule.conditions.autoReleaseAfterHours) {
          const completedAt = booking.completedAt ? new Date(booking.completedAt) : null;
          if (!completedAt) {
            return {
              isEligible: false,
              reason: 'Job not yet marked as completed'
            };
          }

          const hoursAfterCompletion = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);
          if (hoursAfterCompletion < rule.conditions.autoReleaseAfterHours) {
            const remaining = rule.conditions.autoReleaseAfterHours - hoursAfterCompletion;
            return {
              isEligible: false,
              reason: `${remaining.toFixed(1)} hours remaining after completion`
            };
          }

          return {
            isEligible: true,
            reason: `${hoursAfterCompletion.toFixed(1)} hours elapsed since completion (>= ${rule.conditions.autoReleaseAfterHours}h required)`
          };
        }
        break;
    }

    return {
      isEligible: false,
      reason: 'No eligible conditions met'
    };
  }

  /**
   * Execute auto-release for an eligible escrow transaction
   */
  private static async executeAutoRelease(
    escrow: EscrowTransaction,
    booking: Booking,
    rule: AutoReleaseRule,
    reason: string
  ): Promise<AutoReleaseLog> {
    const now = new Date().toISOString();
    
    try {
      // Release the escrow payment
      await EscrowService.releaseEscrowPayment(
        escrow.bookingId,
        'system_auto_release',
        `Auto-release via rule "${rule.name}": ${reason}`
      );

      console.log(`✅ Auto-released escrow payment for booking ${escrow.bookingId}`);

      // Create success log
      const log: AutoReleaseLog = {
        id: EscrowUtils.generateTransactionReference('auto_release', escrow.bookingId),
        bookingId: escrow.bookingId,
        escrowTransactionId: escrow.$id,
        ruleId: rule.id,
        action: 'released',
        reason,
        executedAt: now,
        metadata: {
          originalRule: rule,
          bookingStatus: booking.status,
          escrowStatus: escrow.status,
          autoReleaseTriggeredBy: 'cron'
        }
      };

      // Store the log
      await this.storeAutoReleaseLog(log);

      return log;

    } catch (error) {
      console.error(`❌ Failed to auto-release escrow ${escrow.$id}:`, error);
      
      // Create failure log
      const log: AutoReleaseLog = {
        id: EscrowUtils.generateTransactionReference('auto_release_fail', escrow.bookingId),
        bookingId: escrow.bookingId,
        escrowTransactionId: escrow.$id,
        ruleId: rule.id,
        action: 'failed',
        reason,
        executedAt: now,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          originalRule: rule,
          bookingStatus: booking.status,
          escrowStatus: escrow.status,
          autoReleaseTriggeredBy: 'cron'
        }
      };

      await this.storeAutoReleaseLog(log);
      
      return log;
    }
  }

  /**
   * Create error log for failed evaluations
   */
  private static createErrorLog(
    escrow: EscrowTransaction,
    rule: AutoReleaseRule,
    error: any
  ): AutoReleaseLog {
    return {
      id: EscrowUtils.generateTransactionReference('auto_release_error', escrow.bookingId),
      bookingId: escrow.bookingId,
      escrowTransactionId: escrow.$id,
      ruleId: rule.id,
      action: 'failed',
      reason: 'Evaluation error',
      executedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        originalRule: rule,
        bookingStatus: 'unknown',
        escrowStatus: escrow.status,
        autoReleaseTriggeredBy: 'cron'
      }
    };
  }

  /**
   * Get booking associated with an escrow transaction
   */
  private static async getBookingForEscrow(bookingId: string): Promise<Booking | null> {
    try {
      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );
      return booking as unknown as Booking;
    } catch (error) {
      console.error(`Error fetching booking ${bookingId}:`, error);
      return null;
    }
  }

  /**
   * Store auto-release log
   */
  private static async storeAutoReleaseLog(log: AutoReleaseLog): Promise<void> {
    try {
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.AUTO_RELEASE_LOGS,
        log.id,
        log
      );
    } catch (error) {
      console.error('Error storing auto-release log:', error);
      // Don't throw - logging failure shouldn't break the release
    }
  }

  /**
   * Get auto-release logs for admin dashboard
   */
  static async getAutoReleaseLogs(limit: number = 50): Promise<AutoReleaseLog[]> {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.AUTO_RELEASE_LOGS,
        [
          Query.orderDesc('executedAt'),
          Query.limit(limit)
        ]
      );
      return response.documents as unknown as AutoReleaseLog[];
    } catch (error) {
      console.error('Error fetching auto-release logs:', error);
      return [];
    }
  }

  /**
   * Get active auto-release rules
   */
  static async getActiveRules(): Promise<AutoReleaseRule[]> {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.AUTO_RELEASE_RULES,
        [Query.equal('enabled', true)]
      );
      return response.documents as unknown as AutoReleaseRule[];
    } catch (error) {
      console.error('Error fetching auto-release rules:', error);
      return [];
    }
  }

  /**
   * Manual trigger for auto-release (admin use)
   */
  static async triggerManualAutoRelease(bookingId: string, ruleId: string): Promise<AutoReleaseLog | null> {
    try {
      // Get escrow and rule
      const escrowResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.ESCROW_TRANSACTIONS,
        [Query.equal('bookingId', bookingId)]
      );

      if (escrowResponse.documents.length === 0) {
        throw new Error('Escrow transaction not found');
      }

      const rule = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.AUTO_RELEASE_RULES,
        ruleId
      );

      const escrow = escrowResponse.documents[0] as unknown as EscrowTransaction;
      const booking = await this.getBookingForEscrow(bookingId);

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Execute manual release
      const log = await this.executeAutoRelease(
        escrow, 
        booking, 
        rule as unknown as AutoReleaseRule,
        'Manual admin trigger'
      );

      log.metadata.autoReleaseTriggeredBy = 'manual';
      
      return log;

    } catch (error) {
      console.error('Error in manual auto-release:', error);
      throw error;
    }
  }
}

// Constants for collections (will need to be added to appwrite.ts)
export const AUTO_RELEASE_COLLECTIONS = {
  AUTO_RELEASE_RULES: 'auto_release_rules',
  AUTO_RELEASE_LOGS: 'auto_release_logs'
} as const; 