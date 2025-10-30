import { databases, COLLECTIONS } from './appwrite';
import { Query } from 'appwrite';

/**
 * SETTINGS SERVICE
 *
 * Manages platform-wide settings (fees, limits, etc.)
 */

export interface PlatformSettings {
  platformFeePercent: number;
  clientWithdrawalFeePercent: number;
  minWithdrawalAmount: number;
  autoReleaseEnabled: boolean;
  autoReleaseHours: number;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformFeePercent: 5,
  clientWithdrawalFeePercent: 20,
  minWithdrawalAmount: 100,
  autoReleaseEnabled: false,
  autoReleaseHours: 72
};

// Cache settings in memory to avoid frequent database calls
let cachedSettings: PlatformSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds (shorter cache for quicker updates)

export class SettingsService {

  /**
   * Get platform settings (with caching)
   */
  static async getSettings(): Promise<PlatformSettings> {
    try {
      // Return cached settings if still valid
      const now = Date.now();
      if (cachedSettings && (now - cacheTimestamp) < CACHE_DURATION) {
        return cachedSettings;
      }

      // Fetch from database
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.SETTINGS,
        [Query.limit(1)]
      );

      if (response.documents.length > 0) {
        const settings = response.documents[0] as any;
        cachedSettings = {
          platformFeePercent: settings.platformFeePercent || DEFAULT_SETTINGS.platformFeePercent,
          clientWithdrawalFeePercent: settings.clientWithdrawalFeePercent || DEFAULT_SETTINGS.clientWithdrawalFeePercent,
          minWithdrawalAmount: settings.minWithdrawalAmount || DEFAULT_SETTINGS.minWithdrawalAmount,
          autoReleaseEnabled: settings.autoReleaseEnabled || DEFAULT_SETTINGS.autoReleaseEnabled,
          autoReleaseHours: settings.autoReleaseHours || DEFAULT_SETTINGS.autoReleaseHours
        };
        cacheTimestamp = now;
        return cachedSettings;
      }

      // No settings found, create default
      await this.createDefaultSettings();
      return DEFAULT_SETTINGS;

    } catch (error) {
      console.error('Error fetching settings:', error);
      // Return defaults on error
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Update platform settings (admin only)
   */
  static async updateSettings(settings: Partial<PlatformSettings>): Promise<{ success: boolean; message: string }> {
    try {
      // Get existing settings
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.SETTINGS,
        [Query.limit(1)]
      );

      const updateData = {
        ...settings,
        updatedAt: new Date().toISOString()
      };

      if (response.documents.length > 0) {
        // Update existing
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.SETTINGS,
          response.documents[0].$id,
          updateData
        );
      } else {
        // Create new
        const { ID } = await import('appwrite');
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.SETTINGS,
          ID.unique(),
          {
            ...DEFAULT_SETTINGS,
            ...updateData,
            createdAt: new Date().toISOString()
          }
        );
      }

      // Clear cache
      cachedSettings = null;

      return {
        success: true,
        message: 'Settings updated successfully'
      };

    } catch (error) {
      console.error('Error updating settings:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update settings'
      };
    }
  }

  /**
   * Create default settings
   */
  private static async createDefaultSettings() {
    try {
      const { ID } = await import('appwrite');
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.SETTINGS,
        ID.unique(),
        {
          ...DEFAULT_SETTINGS,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  }

  /**
   * Calculate platform fee for a given amount
   */
  static async calculatePlatformFee(amount: number): Promise<number> {
    const settings = await this.getSettings();
    return Math.round(amount * (settings.platformFeePercent / 100));
  }

  /**
   * Calculate client withdrawal fee
   */
  static async calculateWithdrawalFee(amount: number): Promise<{ fee: number; netAmount: number }> {
    const settings = await this.getSettings();
    const fee = amount * (settings.clientWithdrawalFeePercent / 100);
    const netAmount = amount - fee;
    return { fee, netAmount };
  }

  /**
   * Check if amount meets minimum withdrawal requirement
   */
  static async validateWithdrawalAmount(amount: number): Promise<{ valid: boolean; message?: string }> {
    const settings = await this.getSettings();
    if (amount < settings.minWithdrawalAmount) {
      return {
        valid: false,
        message: `Minimum withdrawal amount is ₦${settings.minWithdrawalAmount.toLocaleString()}`
      };
    }
    return { valid: true };
  }

  /**
   * Clear cache (useful after updates)
   */
  static clearCache() {
    cachedSettings = null;
    cacheTimestamp = 0;
  }
}
