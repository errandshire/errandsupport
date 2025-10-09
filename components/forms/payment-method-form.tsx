"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { PaymentMethodsService, type CreatePaymentMethodRequest } from "@/lib/payment-methods-service";
import { BankSearch } from "@/components/forms/bank-search";
import { toast } from "sonner";
import { Loader2, CreditCard, Smartphone, Wallet } from "lucide-react";

interface PaymentMethodFormProps {
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentMethodForm({ userId, onSuccess, onCancel }: PaymentMethodFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState<CreatePaymentMethodRequest>({
    type: 'bank_account',
    provider: '',
    accountName: '',
    accountNumber: '',
    bankCode: '',
    bankName: '',
    isPrimary: false,
  });

  const mobileProviders = PaymentMethodsService.getMobileMoneyProviders();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = PaymentMethodsService.validatePaymentMethod(formData);
    if (!validation.isValid) {
      toast.error(validation.error || 'Please check your input');
      return;
    }

    try {
      setIsSubmitting(true);
      await PaymentMethodsService.createPaymentMethod(userId, formData);
      toast.success('Payment method added successfully');
      onSuccess?.();
    } catch (error) {
      console.error('Error creating payment method:', error);
      toast.error('Failed to add payment method');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CreatePaymentMethodRequest, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };


  const handleProviderSelect = (providerCode: string) => {
    const provider = mobileProviders.find(p => p.code === providerCode);
    setFormData(prev => ({
      ...prev,
      provider: provider?.name || '',
      bankCode: providerCode,
      bankName: provider?.name || ''
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Payment Method</CardTitle>
        <CardDescription>
          Add a new payment method to receive your earnings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Type */}
          <div className="space-y-3">
            <Label>Payment Type</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value as any)}
              className="flex space-x-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank_account" id="bank" />
                <Label htmlFor="bank" className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Bank Account</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mobile_money" id="mobile" />
                <Label htmlFor="mobile" className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4" />
                  <span>Mobile Money</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Bank/Provider Selection */}
          {formData.type === 'bank_account' && (
            <div className="space-y-2">
              <Label htmlFor="bank-select">Bank</Label>
              <BankSearch
                value={formData.bankCode}
                onValueChange={(bankCode, bankName) => {
                  setFormData(prev => ({
                    ...prev,
                    bankCode,
                    bankName
                  }));
                }}
                placeholder="Search for your bank..."
                disabled={isSubmitting}
              />
            </div>
          )}

          {formData.type === 'mobile_money' && (
            <div className="space-y-2">
              <Label htmlFor="provider-select">Mobile Money Provider</Label>
              <Select onValueChange={handleProviderSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {mobileProviders.map((provider) => (
                    <SelectItem key={provider.code} value={provider.code}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Account Name */}
          <div className="space-y-2">
            <Label htmlFor="account-name">Account Name</Label>
            <Input
              id="account-name"
              value={formData.accountName}
              onChange={(e) => handleInputChange('accountName', e.target.value)}
              placeholder="Enter account holder name"
              required
            />
          </div>

          {/* Account Number */}
          <div className="space-y-2">
            <Label htmlFor="account-number">
              {formData.type === 'bank_account' ? 'Account Number' : 'Phone Number'}
            </Label>
            <Input
              id="account-number"
              value={formData.accountNumber}
              onChange={(e) => handleInputChange('accountNumber', e.target.value)}
              placeholder={
                formData.type === 'bank_account' 
                  ? 'Enter 10-digit account number' 
                  : 'Enter 11-digit phone number (e.g., 08012345678)'
              }
              maxLength={formData.type === 'bank_account' ? 10 : 11}
              required
            />
            <p className="text-xs text-gray-500">
              {formData.type === 'bank_account' 
                ? 'Enter your 10-digit bank account number'
                : 'Enter your phone number starting with 0'
              }
            </p>
          </div>

          {/* Primary Payment Method */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Set as Primary</Label>
              <p className="text-sm text-gray-600">
                This will be your default payment method for withdrawals
              </p>
            </div>
            <Switch
              checked={formData.isPrimary}
              onCheckedChange={(checked) => handleInputChange('isPrimary', checked)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Payment Method'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
