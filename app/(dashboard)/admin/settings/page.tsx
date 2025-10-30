"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, DollarSign, Percent, Clock, Loader2 } from "lucide-react";
import { SettingsService } from "@/lib/settings.service";

export default function AdminSettingsPage() {
  const [platformFee, setPlatformFee] = React.useState("5");
  const [clientWithdrawalFee, setClientWithdrawalFee] = React.useState("20");
  const [minWithdrawal, setMinWithdrawal] = React.useState("100");
  const [autoReleaseEnabled, setAutoReleaseEnabled] = React.useState(false);
  const [autoReleaseHours, setAutoReleaseHours] = React.useState("72");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await SettingsService.getSettings();
      setPlatformFee(settings.platformFeePercent.toString());
      setClientWithdrawalFee(settings.clientWithdrawalFeePercent.toString());
      setMinWithdrawal(settings.minWithdrawalAmount.toString());
      setAutoReleaseEnabled(settings.autoReleaseEnabled);
      setAutoReleaseHours(settings.autoReleaseHours.toString());
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await SettingsService.updateSettings({
        platformFeePercent: parseFloat(platformFee),
        clientWithdrawalFeePercent: parseFloat(clientWithdrawalFee),
        minWithdrawalAmount: parseFloat(minWithdrawal),
        autoReleaseEnabled,
        autoReleaseHours: parseInt(autoReleaseHours)
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-2">Manage platform settings and configurations</p>
      </div>

      <div className="space-y-6">
        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <CardTitle>Payment Settings</CardTitle>
            </div>
            <CardDescription>
              Configure fees and payment-related settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="platform-fee">Platform Fee (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="platform-fee"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(e.target.value)}
                  className="max-w-xs"
                />
                <Percent className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">
                Fee charged on each booking (currently: {platformFee}%)
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="client-withdrawal-fee">Client Withdrawal Fee (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="client-withdrawal-fee"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={clientWithdrawalFee}
                  onChange={(e) => setClientWithdrawalFee(e.target.value)}
                  className="max-w-xs"
                />
                <Percent className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">
                Fee deducted when clients withdraw from wallet (currently: {clientWithdrawalFee}%)
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="min-withdrawal">Minimum Withdrawal Amount (₦)</Label>
              <Input
                id="min-withdrawal"
                type="number"
                min="0"
                step="100"
                value={minWithdrawal}
                onChange={(e) => setMinWithdrawal(e.target.value)}
                className="max-w-xs"
              />
              <p className="text-sm text-gray-600">
                Minimum amount users can withdraw
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Auto-Release Settings */}
        {/* <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Auto-Release Settings</CardTitle>
            </div>
            <CardDescription>
              Automatically release payments if client doesn't confirm
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-release">Enable Auto-Release</Label>
                <p className="text-sm text-gray-600">
                  Automatically release payment to worker after specified hours
                </p>
              </div>
              <Switch
                id="auto-release"
                checked={autoReleaseEnabled}
                onCheckedChange={setAutoReleaseEnabled}
              />
            </div>

            {autoReleaseEnabled && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="auto-release-hours">Auto-Release After (hours)</Label>
                  <Input
                    id="auto-release-hours"
                    type="number"
                    min="1"
                    step="1"
                    value={autoReleaseHours}
                    onChange={(e) => setAutoReleaseHours(e.target.value)}
                    className="max-w-xs"
                  />
                  <p className="text-sm text-gray-600">
                    Payment will be released after {autoReleaseHours} hours if client doesn't confirm
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card> */}

        {/* Paystack Integration */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Paystack Integration</CardTitle>
            <CardDescription>
              Payment gateway configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paystack-public">Paystack Public Key</Label>
              <Input
                id="paystack-public"
                type="text"
                value={process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''}
                disabled
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-600">
                Configured via environment variables
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Paystack keys are configured in your .env file.
                Update NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY to change settings.
              </p>
            </div>
          </CardContent>
        </Card> */}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
