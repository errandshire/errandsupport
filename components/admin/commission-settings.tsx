"use client";

import * as React from "react";
import { Save, RefreshCw, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { paystack } from "@/lib/paystack";

interface CommissionSettings {
  platformFeePercentage: number;
  minimumCommission: number;
  maximumCommission: number;
  processingFeePercentage: number;
  workerEarningsPercentage: number;
}

export function CommissionSettings() {
  const [settings, setSettings] = React.useState<CommissionSettings>({
    platformFeePercentage: 5,
    minimumCommission: 100,
    maximumCommission: 50000,
    processingFeePercentage: 1.5,
    workerEarningsPercentage: 95
  });
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [previewAmount, setPreviewAmount] = React.useState(10000);

  // Load settings on component mount
  React.useEffect(() => {
    loadSettings();
  }, []);

  // Update worker earnings percentage when platform fee changes
  React.useEffect(() => {
    setSettings(prev => ({
      ...prev,
      workerEarningsPercentage: 100 - prev.platformFeePercentage
    }));
  }, [settings.platformFeePercentage]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      // Load from database or use defaults
      // This would typically fetch from a settings collection
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        'settings', // You'd need to create this collection
        []
      );
      
      if (response.documents.length > 0) {
        const savedSettings = response.documents[0];
        setSettings({
          platformFeePercentage: savedSettings.platformFeePercentage || 5,
          minimumCommission: savedSettings.minimumCommission || 100,
          maximumCommission: savedSettings.maximumCommission || 50000,
          processingFeePercentage: savedSettings.processingFeePercentage || 1.5,
          workerEarningsPercentage: savedSettings.workerEarningsPercentage || 95
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Use default settings if loading fails
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      
      // Save to database
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        'settings',
        'commission_settings',
        {
          ...settings,
          updatedAt: new Date().toISOString()
        }
      );
      
      toast.success('Commission settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      platformFeePercentage: 5,
      minimumCommission: 100,
      maximumCommission: 50000,
      processingFeePercentage: 1.5,
      workerEarningsPercentage: 95
    });
    toast.info('Settings reset to defaults');
  };

  const calculatePreview = () => {
    const platformFee = paystack.calculatePlatformFee(previewAmount, settings.platformFeePercentage);
    const processingFee = Math.round((previewAmount * settings.processingFeePercentage) / 100);
    const totalFees = platformFee + processingFee;
    const workerEarnings = previewAmount - platformFee;
    const netWorkerEarnings = workerEarnings - processingFee;
    
    return {
      platformFee,
      processingFee,
      totalFees,
      workerEarnings,
      netWorkerEarnings
    };
  };

  const preview = calculatePreview();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Commission Settings</h2>
          <p className="text-gray-600">Configure platform fees and commission rates</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={resetToDefaults} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Configuration</CardTitle>
            <CardDescription>
              Adjust platform fees and commission rates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Platform Fee */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="platformFee">Platform Fee</Label>
                <Badge variant="secondary">{settings.platformFeePercentage}%</Badge>
              </div>
              <Slider
                id="platformFee"
                min={1}
                max={20}
                step={0.5}
                value={[settings.platformFeePercentage]}
                onValueChange={(value) => setSettings(prev => ({ 
                  ...prev, 
                  platformFeePercentage: value[0] 
                }))}
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                Percentage of booking amount retained by platform
              </p>
            </div>

            <Separator />

            {/* Processing Fee */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="processingFee">Processing Fee</Label>
                <Badge variant="secondary">{settings.processingFeePercentage}%</Badge>
              </div>
              <Slider
                id="processingFee"
                min={0.5}
                max={5}
                step={0.1}
                value={[settings.processingFeePercentage]}
                onValueChange={(value) => setSettings(prev => ({ 
                  ...prev, 
                  processingFeePercentage: value[0] 
                }))}
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                Payment processing and transaction fees
              </p>
            </div>

            <Separator />

            {/* Commission Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minCommission">Minimum Commission (₦)</Label>
                <Input
                  id="minCommission"
                  type="number"
                  value={settings.minimumCommission}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    minimumCommission: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxCommission">Maximum Commission (₦)</Label>
                <Input
                  id="maxCommission"
                  type="number"
                  value={settings.maximumCommission}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    maximumCommission: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Real-time Preview
            </CardTitle>
            <CardDescription>
              See how fees apply to different booking amounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preview Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="previewAmount">Booking Amount (₦)</Label>
              <Input
                id="previewAmount"
                type="number"
                value={previewAmount}
                onChange={(e) => setPreviewAmount(parseInt(e.target.value) || 0)}
                placeholder="Enter amount to preview"
              />
            </div>

            {/* Fee Breakdown */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-gray-900">Fee Breakdown</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Booking Amount</span>
                  <span className="font-medium">₦{previewAmount.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between text-red-600">
                  <span>Platform Fee ({settings.platformFeePercentage}%)</span>
                  <span>-₦{preview.platformFee.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between text-orange-600">
                  <span>Processing Fee ({settings.processingFeePercentage}%)</span>
                  <span>-₦{preview.processingFee.toLocaleString()}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-medium text-green-600">
                  <span>Worker Earnings</span>
                  <span>₦{preview.netWorkerEarnings.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Worker Percentage</span>
                  <span>{((preview.netWorkerEarnings / previewAmount) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-xs text-blue-600">Platform Revenue</p>
                <p className="font-medium text-blue-900">₦{preview.platformFee.toLocaleString()}</p>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-xs text-green-600">Worker Net</p>
                <p className="font-medium text-green-900">₦{preview.netWorkerEarnings.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 