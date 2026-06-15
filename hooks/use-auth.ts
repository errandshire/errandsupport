"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { User, LoginFormData, RegisterFormData } from '@/lib/types';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.erandwork.com/api';

export interface AuthError {
  message: string;
  code?: string;
}

export function useAuth() {
  const { user, setUser, setLoading, setAuthenticated, logout: storeLogout, isLoading } = useAuthStore();
  const [loading, setLoadingState] = useState(false);
  const hasInitialized = useRef(false);

  // Initialize auth state on mount, but only once
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    if (user && !isLoading) {
      return;
    }

    const storeState = useAuthStore.getState();
    if (!storeState.isAuthenticated && !storeState.user && !storeState.sessionToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const accountData = await response.json();
        if (accountData) {
          if (!user || user.$id !== accountData.$id) {
            const userProfile = await getUserProfile(accountData.$id);
            setUser(userProfile);
            setAuthenticated(true);
          } else {
            setAuthenticated(true);
          }
        }
      } else {
        setAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [user, isLoading, setUser, setAuthenticated, setLoading]);

  const getUserProfile = async (userId: string): Promise<User> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/user/${userId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const profile = await response.json();
      return profile as User;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      console.log('Error details:', error.message, error.stack);
      throw new Error('Failed to fetch user profile');
    }
  };

  const login = async (data: LoginFormData): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoadingState(true);

      console.log('Attempting login to:', `${API_BASE_URL}/auth/login`);
      console.log('Login data:', { email: data.email });

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      console.log('Login response status:', response.status);
      console.log('Login response ok:', response.ok);

      if (response.ok) {
        const session = await response.json();
        console.log('Login session data:', session);

        // The login endpoint already returns the full user data
        setUser(session as User);
        setAuthenticated(true);

        toast.success('Login successful!');
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Login API error:', errorData);
        return { success: false, error: { message: errorData.error || 'Login failed' } };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Login error details:', JSON.stringify(error, null, 2));
      const errorMessage = error.message || 'An unexpected error occurred';
      toast.error(errorMessage);
      return { success: false, error: { message: errorMessage } };
    } finally {
      setLoadingState(false);
    }
  };

  const register = async (data: RegisterFormData): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoadingState(true);
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          email: data.email, 
          password: data.password, 
          name: data.name, 
          role: data.role,
          phone: data.phone,
        }),
      });
      
      if (response.ok) {
        const account_response = await response.json();

        // Create user profile in database
        await createUserProfile({
          userId: account_response.$id || account_response.userId,
          name: data.name,
          email: data.email,
          role: data.role,
          phone: data.phone,
        });

        toast.success('Account created successfully! Please log in to continue.');
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: { message: errorData.error || 'Registration failed' } };
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.message || 'An unexpected error occurred';
      toast.error(errorMessage);
      return { success: false, error: { message: errorMessage } };
    } finally {
      setLoadingState(false);
    }
  };

  const createUserProfile = async (profileData: {
    userId: string;
    name: string;
    email: string;
    role: 'client' | 'worker';
    phone?: string;
  }): Promise<User> => {
    try {
      // Check if user profile already exists via VPS API
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user/${profileData.userId}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const existingProfile = await response.json();
          return existingProfile as unknown as User;
        }
      } catch (error) {
        // Profile doesn't exist, continue with creation
      }

      // Create profile via VPS API
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: profileData.userId,
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone || '',
          role: profileData.role,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create profile');
      }

      const profile = await response.json();

      // Partner referral tracking (non-blocking)
      try {
        const referralCode = typeof window !== 'undefined'
          ? localStorage.getItem('referral_partner_code')
          : null;

        if (referralCode) {
          // Update profile with referral code via VPS API
          await fetch(`${API_BASE_URL}/auth/user/${profileData.userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ referredByPartnerCode: referralCode }),
          }).catch((err) => console.error('Failed to set referredByPartnerCode:', err));

          // Create referral record via API
          fetch('/api/partners/referral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              partnerCode: referralCode,
              clientId: profileData.userId,
              clientEmail: profileData.email,
            }),
          }).catch((err) => console.error('Referral API error:', err));

          // Clear localStorage after use
          localStorage.removeItem('referral_partner_code');
        }
      } catch (referralError) {
        console.error('Partner referral error (non-blocking):', referralError);
      }

      // Send welcome communications (non-blocking for auth flow)
      try {
        const tasks: Promise<any>[] = [];

        if (profileData.phone) {
          const welcomeMessage = profileData.role === 'client'
            ? `Welcome ${profileData.name}! Find trusted workers on ErrandWork. Start booking now.`
            : `Welcome ${profileData.name}! Start earning on ErrandWork. Complete your profile to get jobs.`;

          const smsTask = fetch('/api/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: profileData.phone,
              message: welcomeMessage
            })
          }).then(async (response) => {
            if (!response.ok) {
              const errorBody = await response.text().catch(() => '');
              throw new Error(`SMS send failed: ${errorBody || response.statusText}`);
            }
            return response.json();
          });

          tasks.push(smsTask);
        }

        const { emailService } = await import('@/lib/email-service');
        tasks.push(
          emailService.sendWelcomeEmail({
            to: profileData.email,
            name: profileData.name,
            role: profileData.role
          })
        );

        await Promise.allSettled(tasks);
      } catch (welcomeError) {
        console.error('Welcome notification error:', welcomeError);
      }
      
      return profile as User;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  };

  const logout = useCallback(async (): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoadingState(true);
      // Clear session cookie
      await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
      // Call VPS logout endpoint
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
      storeLogout();
      hasInitialized.current = false;
      toast.success('Logged out successfully');
      return { success: true };
    } catch (error: any) {
      // Still clear local state even if call failed
      storeLogout();
      hasInitialized.current = false;
      console.error('Logout error:', error);
      toast.success('Logged out successfully');
      return { success: true };
    } finally {
      setLoadingState(false);
    }
  }, [storeLogout]);

  const sendVerificationEmail = async (): Promise<{ success: boolean; error?: AuthError }> => {
    // TODO: Implement with VPS API
    toast.error('Email verification not implemented yet');
    return { success: false, error: { message: 'Not implemented' } };
  };

  const verifyEmail = async (userId: string, secret: string): Promise<{ success: boolean; error?: AuthError }> => {
    // TODO: Implement with VPS API
    toast.error('Email verification not implemented yet');
    return { success: false, error: { message: 'Not implemented' } };
  };

  const sendPasswordReset = async (email: string): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoadingState(true);
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        toast.success('Password reset email sent!');
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: { message: errorData.error || 'Failed to send reset email' } };
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      const errorMessage = error.message || 'An unexpected error occurred';
      toast.error(errorMessage);
      return { success: false, error: { message: errorMessage } };
    } finally {
      setLoadingState(false);
    }
  };


  const updateProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoadingState(true);
      
      if (!user) throw new Error('No user logged in');
      
      const response = await fetch(`${API_BASE_URL}/auth/user/${user.$id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...updates,
          updatedAt: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const updatedProfile = await response.json();
      setUser(updatedProfile as User);
      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error: any) {
      console.error('Profile update error:', error);
      const errorMessage = 'Failed to update profile';
      toast.error(errorMessage);
      return { success: false, error: { message: errorMessage } };
    } finally {
      setLoadingState(false);
    }
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; error?: AuthError }> => {
    // This is now handled by sendPasswordReset
    return sendPasswordReset(email);
  };

  const resetPassword = async (userId: string, secret: string, newPassword: string): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoadingState(true);
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, secret, newPassword }),
      });
      
      if (response.ok) {
        toast.success('Password reset successfully!');
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: { message: errorData.error || 'Failed to reset password' } };
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      const errorMessage = error.message || 'An unexpected error occurred';
      toast.error(errorMessage);
      return { success: false, error: { message: errorMessage } };
    } finally {
      setLoadingState(false);
    }
  };

  const getAuthErrorMessage = (error: any): string => {
    switch (error.code) {
      case 401:
        return 'Invalid email or password';
      case 409:
        return 'Email already registered';
      case 429:
        return 'Too many requests. Please try again later';
      case 400:
        return 'Invalid request. Please check your input';
      case 404:
        return 'User not found';
      case 422:
        return 'Invalid or expired reset link';
      default:
        return error.message || 'An unexpected error occurred';
    }
  };

  return {
    user,
    loading: loading || useAuthStore.getState().isLoading,
    isAuthenticated: useAuthStore.getState().isAuthenticated,
    login,
    register,
    logout,
    sendVerificationEmail,
    verifyEmail,
    forgotPassword,
    resetPassword,
    updateProfile,
    checkAuthStatus,
  };
} 