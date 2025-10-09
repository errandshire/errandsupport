import { account } from './appwrite';
import { toast } from 'sonner';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResult {
  success: boolean;
  message: string;
}

export class PasswordService {
  /**
   * Change user password
   */
  static async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResult> {
    try {
      // Validate inputs
      const validation = this.validatePasswordChange(data);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.error || 'Invalid password data'
        };
      }

      // Update password using Appwrite
      await account.updatePassword(data.newPassword, data.currentPassword);

      return {
        success: true,
        message: 'Password updated successfully'
      };

    } catch (error: any) {
      console.error('Error changing password:', error);
      
      // Handle specific Appwrite errors
      if (error.code === 401) {
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      } else if (error.code === 400) {
        return {
          success: false,
          message: 'New password does not meet requirements'
        };
      } else {
        return {
          success: false,
          message: error.message || 'Failed to update password'
        };
      }
    }
  }

  /**
   * Validate password change request
   */
  private static validatePasswordChange(data: ChangePasswordRequest): { isValid: boolean; error?: string } {
    // Check if passwords match
    if (data.newPassword !== data.confirmPassword) {
      return {
        isValid: false,
        error: 'New passwords do not match'
      };
    }

    // Check if new password is different from current
    if (data.currentPassword === data.newPassword) {
      return {
        isValid: false,
        error: 'New password must be different from current password'
      };
    }

    // Check password strength
    const passwordStrength = this.checkPasswordStrength(data.newPassword);
    if (!passwordStrength.isStrong) {
      return {
        isValid: false,
        error: passwordStrength.error
      };
    }

    return { isValid: true };
  }

  /**
   * Check password strength
   */
  private static checkPasswordStrength(password: string): { isStrong: boolean; error?: string } {
    if (password.length < 8) {
      return {
        isStrong: false,
        error: 'Password must be at least 8 characters long'
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        isStrong: false,
        error: 'Password must contain at least one uppercase letter'
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        isStrong: false,
        error: 'Password must contain at least one lowercase letter'
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        isStrong: false,
        error: 'Password must contain at least one number'
      };
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return {
        isStrong: false,
        error: 'Password must contain at least one special character'
      };
    }

    return { isStrong: true };
  }

  /**
   * Get password strength indicator
   */
  static getPasswordStrength(password: string): {
    score: number;
    label: string;
    color: string;
    requirements: {
      length: boolean;
      uppercase: boolean;
      lowercase: boolean;
      number: boolean;
      special: boolean;
    };
  } {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    const score = Object.values(requirements).filter(Boolean).length;
    
    let label = 'Very Weak';
    let color = 'text-red-500';

    if (score >= 5) {
      label = 'Very Strong';
      color = 'text-green-500';
    } else if (score >= 4) {
      label = 'Strong';
      color = 'text-green-600';
    } else if (score >= 3) {
      label = 'Medium';
      color = 'text-yellow-500';
    } else if (score >= 2) {
      label = 'Weak';
      color = 'text-orange-500';
    }

    return {
      score,
      label,
      color,
      requirements
    };
  }
}
