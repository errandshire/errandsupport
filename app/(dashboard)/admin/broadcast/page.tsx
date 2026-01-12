"use client";

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Send, Users, Mail, MessageSquare, Smartphone, Eye, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BroadcastService } from '@/lib/broadcast-service';

export default function AdminBroadcastPage() {
  const { user } = useAuth();

  // Message state
  const [title, setTitle] = React.useState('');
  const [htmlContent, setHtmlContent] = React.useState('');

  // Filters state
  const [userRole, setUserRole] = React.useState<'worker' | 'client' | 'all'>('all');
  const [verifiedOnly, setVerifiedOnly] = React.useState(false);
  const [activeOnly, setActiveOnly] = React.useState(false);
  const [registrationFilter, setRegistrationFilter] = React.useState('all');

  // Channels state
  const [emailEnabled, setEmailEnabled] = React.useState(false);
  const [smsEnabled, setSmsEnabled] = React.useState(false);
  const [inAppEnabled, setInAppEnabled] = React.useState(false);

  // UI state
  const [recipientCount, setRecipientCount] = React.useState(0);
  const [estimatedCost, setEstimatedCost] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [sendingStatus, setSendingStatus] = React.useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // Calculate date range for registration filter
  const getDateRange = () => {
    const now = new Date();
    const ranges: Record<string, { from: string; to: string } | undefined> = {
      '7days': {
        from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        to: now.toISOString()
      },
      '30days': {
        from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: now.toISOString()
      },
      '90days': {
        from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        to: now.toISOString()
      },
      'all': undefined
    };
    return ranges[registrationFilter];
  };

  // Fetch recipient count when filters change
  React.useEffect(() => {
    const fetchRecipientCount = async () => {
      try {
        const filters = {
          role: userRole,
          verificationStatus: verifiedOnly && userRole === 'worker' ? ['verified'] : undefined,
          isActive: activeOnly ? true : undefined,
          registrationDate: getDateRange(),
        };

        const users = await BroadcastService.getTargetedUsers(filters);
        setRecipientCount(users.length);

        // Calculate cost if SMS is enabled
        if (smsEnabled) {
          setEstimatedCost(BroadcastService.calculateSMSCost(users.length));
        } else {
          setEstimatedCost(0);
        }
      } catch (error) {
        console.error('Error fetching recipient count:', error);
        setRecipientCount(0);
      }
    };

    fetchRecipientCount();
  }, [userRole, verifiedOnly, activeOnly, registrationFilter, smsEnabled]);

  // Handle preview
  const handlePreview = () => {
    if (!title || !htmlContent) {
      toast.error('Please enter a title and message');
      return;
    }

    if (!emailEnabled && !smsEnabled && !inAppEnabled) {
      toast.error('Please select at least one channel');
      return;
    }

    if (recipientCount === 0) {
      toast.error('No recipients match your filters');
      return;
    }

    setShowPreview(true);
  };

  // Handle send broadcast
  const handleSend = async () => {
    if (!user?.$id) {
      toast.error('Admin authentication required');
      return;
    }

    setLoading(true);
    setSendingStatus('sending');
    setShowPreview(false);

    try {
      const filters = {
        role: userRole,
        verificationStatus: verifiedOnly && userRole === 'worker' ? ['verified'] : undefined,
        isActive: activeOnly ? true : undefined,
        registrationDate: getDateRange(),
      };

      const response = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.$id,
          message: {
            title,
            content: BroadcastService.htmlToPlainText(htmlContent),
            htmlContent,
          },
          channels: {
            email: emailEnabled,
            sms: smsEnabled,
            inApp: inAppEnabled,
          },
          filters,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSendingStatus('success');
        toast.success(
          `Broadcast sent successfully! ${result.stats.emailsSent + result.stats.smsSent + result.stats.inAppSent} messages delivered.`
        );

        // Reset form
        setTimeout(() => {
          setTitle('');
          setHtmlContent('');
          setEmailEnabled(false);
          setSmsEnabled(false);
          setInAppEnabled(false);
          setSendingStatus('idle');
        }, 3000);
      } else {
        setSendingStatus('error');
        toast.error(result.message || 'Failed to send broadcast');
      }
    } catch (error) {
      console.error('Error sending broadcast:', error);
      setSendingStatus('error');
      toast.error('Failed to send broadcast');
    } finally {
      setLoading(false);
    }
  };

  const preview = htmlContent ? BroadcastService.generatePreview({
    title,
    content: BroadcastService.htmlToPlainText(htmlContent),
    htmlContent,
  }) : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Broadcast Messages</h1>
        <p className="text-gray-600 mt-2">
          Send customized messages to workers, clients, or all users via email, SMS, and in-app notifications
        </p>
      </div>

      {/* Success/Error Status */}
      {sendingStatus === 'success' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Broadcast sent successfully! Check the history tab for detailed statistics.
          </AlertDescription>
        </Alert>
      )}

      {sendingStatus === 'error' && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to send broadcast. Please try again or contact support.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Filters */}
        <div className="lg:col-span-1 space-y-6">
          {/* Step 1: Select Recipients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Step 1: Select Recipients
              </CardTitle>
              <CardDescription>Choose who will receive the message</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Role */}
              <div className="space-y-2">
                <Label>User Type</Label>
                <RadioGroup value={userRole} onValueChange={(v) => setUserRole(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="worker" id="worker" />
                    <Label htmlFor="worker" className="font-normal cursor-pointer">Workers</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="client" id="client" />
                    <Label htmlFor="client" className="font-normal cursor-pointer">Clients</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="font-normal cursor-pointer">All Users</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Filters */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm font-medium">Filters</Label>

                {userRole === 'worker' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verified"
                      checked={verifiedOnly}
                      onCheckedChange={(checked) => setVerifiedOnly(checked as boolean)}
                    />
                    <Label htmlFor="verified" className="font-normal cursor-pointer">
                      Verified workers only
                    </Label>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="active"
                    checked={activeOnly}
                    onCheckedChange={(checked) => setActiveOnly(checked as boolean)}
                  />
                  <Label htmlFor="active" className="font-normal cursor-pointer">
                    Active users only
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registration" className="text-sm">Registration Date</Label>
                  <Select value={registrationFilter} onValueChange={setRegistrationFilter}>
                    <SelectTrigger id="registration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All time</SelectItem>
                      <SelectItem value="7days">Last 7 days</SelectItem>
                      <SelectItem value="30days">Last 30 days</SelectItem>
                      <SelectItem value="90days">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recipient Count */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Recipients:</span>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {recipientCount} users
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Select Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Step 3: Select Channels
              </CardTitle>
              <CardDescription>Choose how to deliver the message</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email"
                  checked={emailEnabled}
                  onCheckedChange={(checked) => setEmailEnabled(checked as boolean)}
                />
                <Label htmlFor="email" className="font-normal cursor-pointer flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sms"
                  checked={smsEnabled}
                  onCheckedChange={(checked) => setSmsEnabled(checked as boolean)}
                />
                <Label htmlFor="sms" className="font-normal cursor-pointer flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  SMS {smsEnabled && estimatedCost > 0 && (
                    <span className="text-orange-600 font-medium">(Est. ₦{estimatedCost.toLocaleString()})</span>
                  )}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inapp"
                  checked={inAppEnabled}
                  onCheckedChange={(checked) => setInAppEnabled(checked as boolean)}
                />
                <Label htmlFor="inapp" className="font-normal cursor-pointer flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  In-App Notification
                </Label>
              </div>

              {smsEnabled && estimatedCost > 0 && (
                <Alert className="mt-4">
                  <AlertDescription className="text-sm">
                    <strong>SMS Cost:</strong> ₦8 per message × {recipientCount} recipients = ₦{estimatedCost.toLocaleString()}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Message Composer */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Step 2: Compose Message
              </CardTitle>
              <CardDescription>Write your message with rich text formatting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Subject/Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter message title (e.g., 'Welcome to ErrandWork')"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Rich Text Editor */}
              <div className="space-y-2">
                <Label>Message Content *</Label>
                <RichTextEditor
                  content={htmlContent}
                  onChange={setHtmlContent}
                  placeholder="Type your message here..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handlePreview}
                  variant="outline"
                  disabled={loading || !title || !htmlContent || recipientCount === 0}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={loading || !title || !htmlContent || recipientCount === 0 || (!emailEnabled && !smsEnabled && !inAppEnabled)}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send to {recipientCount} Users
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Message</DialogTitle>
            <DialogDescription>
              Review how your message will appear in each channel before sending
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Email Preview */}
            {emailEnabled && preview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded p-4 bg-white">
                    <div className="border-b pb-2 mb-3">
                      <p className="text-sm text-gray-600">Subject:</p>
                      <p className="font-semibold">{title}</p>
                    </div>
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: preview.email }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SMS Preview */}
            {smsEnabled && preview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    SMS Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm">
                    <p className="font-semibold mb-2">ErrandWork: {title}</p>
                    <p className="whitespace-pre-wrap">{preview.sms}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {preview.sms.length} characters
                    {preview.sms.length > 160 && ' (Multiple SMS messages)'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* In-App Preview */}
            {inAppEnabled && preview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    In-App Notification Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <p className="font-semibold text-blue-900">{title}</p>
                    <p className="text-sm text-blue-800 mt-1">{preview.inApp}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  <p><strong>Recipients:</strong> {recipientCount} users</p>
                  <p><strong>Channels:</strong> {[emailEnabled && 'Email', smsEnabled && 'SMS', inAppEnabled && 'In-App'].filter(Boolean).join(', ')}</p>
                  {smsEnabled && <p><strong>Estimated Cost:</strong> ₦{estimatedCost.toLocaleString()}</p>}
                </div>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Edit Message
            </Button>
            <Button onClick={handleSend} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirm & Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
