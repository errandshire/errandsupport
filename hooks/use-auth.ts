"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { ID, Models } from 'appwrite';
import { account, databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import { useAuthStore } from '@/store/auth-store';
import { User, LoginFormData, RegisterFormData } from '@/lib/types';
import { toast } from 'sonner';

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
    // Skip if we already have user data and are not loading
    if (user && !isLoading) {
      return;
    }

    try {
      setLoading(true);
      const session = await account.get();
      
      if (session) {
        // Only fetch user profile if we don't already have it or if the userId differs
        if (!user || user.$id !== session.$id) {
          const userProfile = await getUserProfile(session.$id);
          setUser(userProfile);
          setAuthenticated(true);
        } else {
          setAuthenticated(true);
        }
      }
    } catch (error) {
      // No active session
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [user, isLoading, setUser, setAuthenticated, setLoading]);

  const getUserProfile = async (userId: string): Promise<User> => {
    try {
      const profile = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        userId
      );
      return profile as User;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  };

  const login = async (data: LoginFormData): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoadingState(true);
      
      // Check for existing session and delete it first
      try {
        await account.deleteSession('current');
      } catch (error) {
        // No active session to delete, which is fine
      }
      
      console.log('Creating session for:', data.email);
      // Create new session
      const session = await account.createEmailPasswordSession(data.email, data.password);
      console.log('Session created:', session);
      
      if (session) {
        // Fetch user profile
        console.log('Fetching user profile for ID:', session.userId);
        const userProfile = await getUserProfile(session.userId);
        console.log('User profile fetched:', userProfile);
        
        setUser(userProfile);
        setAuthenticated(true);
        
        toast.success('Login successful!');
        return { success: true };
      }
      
      return { success: false, error: { message: 'Failed to create session' } };
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = getAuthErrorMessage(error);
      toast.error(errorMessage);
      return { success: false, error: { message: errorMessage, code: error.code } };
    } finally {
      setLoadingState(false);
    }
  };

  const register = async (data: RegisterFormData): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoadingState(true);
      
      // Create account
      const account_response = await account.create(
        ID.unique(),
        data.email,
        data.password,
      );

      if (account_response) {
        // Create user profile in database
        await createUserProfile({
          userId: account_response.$id,
          name: data.name,
          email: data.email,
          role: data.role,
          phone: data.phone,
        });

        toast.success('Account created successfully! Please log in to continue.');
        return { success: true };
      }
      
      return { success: false, error: { message: 'Failed to create account' } };
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = getAuthErrorMessage(error);
      toast.error(errorMessage);
      return { success: false, error: { message: errorMessage, code: error.code } };
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
      // Check if user profile already exists
      try {
        const existingProfile = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.USERS,
          profileData.userId
        );
        if (existingProfile) {
          console.log('User profile already exists:', profileData.userId);
          return existingProfile as unknown as User;
        }
      } catch (error) {
        // Profile doesn't exist, continue with creation
      }

      const profile = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        profileData.userId,
        {
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone || '',
          role: profileData.role,
          isActive: false,
          isVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
      
      return profile as User;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  };

  const logout = useCallback(async (): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoadingState(true);
      await account.deleteSession('current');
      storeLogout();
      hasInitialized.current = false; // Reset initialization flag
      toast.success('Logged out successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      const errorMessage = 'Failed to logout';
      toast.error(errorMessage);
      return { success: false, error: { message: errorMessage } };
    } finally {
      setLoadingState(false);
    }
  }, [storeLogout]);

  const sendVerificationEmail = async (): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoadingState(true);
      const verification = await account.createVerification(
        `${window.location.origin}/verify-email`
      );
      
      if (verification) {
        toast.success('Verification email sent!');
        return { success: true };
      }
      
      return { success: false, error: { message: 'Failed to send verification email' } };
    } catch (error: any) {
      console.error('Email verification error:', error);
      const errorMessage = getAuthErrorMessage(error);
      toast.error(errorMessage);
      return { success: false, error: { message: errorMessage } };
    } finally {
      setLoadingState(false);
    }
  };

  const verifyEmail = async (userId: string, secret: string): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoadingState(true);
      await account.updateVerification(userId, secret);
      
      // Update user profile
      if (user) {
        const updatedProfile = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.USERS,
          user.$id,
          { emailVerified: true, updatedAt: new Date().toISOString() }
        );
        setUser(updatedProfile as User);
      }
      
      toast.success('Email verified successfully!');
      return { success: true };
    } catch (error: any) {
      console.error('Email verification error:', error);
      const errorMessage = getAuthErrorMessage(error);
      toast.error(errorMessage);
      return { success: false, error: { message: errorMessage } };
    } finally {
      setLoadingState(false);
    }
  };

  const sendPasswordReset = async (email: string): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoadingState(true);
      await account.createRecovery(
        email,
        `${window.location.origin}/reset-password`
      );
      
      toast.success('Password reset email sent!');
      return { success: true };
    } catch (error: any) {
      console.error('Password reset error:', error);
      const errorMessage = getAuthErrorMessage(error);
      toast.error(errorMessage);
      return { success: false, error: { message: errorMessage } };
    } finally {
      setLoadingState(false);
    }
  };

  const resetPassword = async (
    userId: string,
    secret: string,
    password: string
  ): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoadingState(true);
      await account.updateRecovery(userId, secret, password);
      
      toast.success('Password reset successfully!');
      return { success: true };
    } catch (error: any) {
      console.error('Password reset error:', error);
      const errorMessage = getAuthErrorMessage(error);
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
      
      const updatedProfile = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        user.$id,
        {
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      );
      
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
    sendPasswordReset,
    resetPassword,
    updateProfile,
    checkAuthStatus,
  };
} 