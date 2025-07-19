"use client";

import * as React from "react";
import { 
  Clock, 
  Settings, 
  Play, 
  Pause,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Eye,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AutoReleaseService } from "@/lib/auto-release-service";
import type { AutoReleaseRule, AutoReleaseLog } from "@/lib/auto-release-service";
import { toast } from "sonner";

export default function AdminAutoReleasePage() {
  const [rules, setRules] = React.useState<AutoReleaseRule[]>([]);
  const [logs, setLogs] = React.useState<AutoReleaseLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [processingManual, setProcessingManual] = React.useState(false);

  // Fetch data
  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [rulesData, logsData] = await Promise.all([
        AutoReleaseService.getActiveRules(),
        AutoReleaseService.getAutoReleaseLogs(50)
      ]);

      setRules(rulesData);
      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching auto-release data:', error);
      toast.error('Failed to load auto-release data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Manual trigger auto-release process
  const handleManualTrigger = async () => {
    try {
      setProcessingManual(true);
      
      const response = await fetch('/api/cron/auto-release', {
        method: 'GET',
        headers: {
          'x-cron-token': 'admin-manual-trigger' // In production, use proper auth
        }
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Manual auto-release completed: ${result.stats.successCount} releases, ${result.stats.failureCount} failures`);
        await fetchData(); // Refresh data
      } else {
        toast.error(`Manual auto-release failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Manual trigger failed:', error);
      toast.error('Failed to trigger manual auto-release');
    } finally {
      setProcessingManual(false);
    }
  };

  // Initialize default rules
  const handleInitializeRules = async () => {
    try {
      await AutoReleaseService.initializeDefaultRules();
      toast.success('Default auto-release rules initialized');
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize rules:', error);
      toast.error('Failed to initialize default rules');
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'released':
        return <Badge className="bg-green-100 text-green-800">Released</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getTriggerBadge = (trigger: string) => {
    switch (trigger) {
      case 'time_based':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Time-Based</Badge>;
      case 'status_based':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Status-Based</Badge>;
      case 'hybrid':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Hybrid</Badge>;
      default:
        return <Badge variant="outline">{trigger}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
            Auto-Release Management
          </h1>
          <p className="text-neutral-600">
            Configure and monitor automated escrow releases for completed jobs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleInitializeRules}
          >
            <Settings className="h-4 w-4 mr-2" />
            Initialize Rules
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManualTrigger}
            disabled={processingManual}
          >
            {processingManual ? (
              <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Manual Trigger
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{rules.filter(r => r.enabled).length}</div>
              <Settings className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {rules.length} total rules configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Recent Releases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {logs.filter(l => l.action === 'released').length}
              </div>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Failed Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {logs.filter(l => l.action === 'failed').length}
              </div>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">Requiring attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">Auto-Release Rules</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Auto-Release Rules ({rules.length})</CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 mb-4">No auto-release rules configured</p>
                  <Button onClick={handleInitializeRules}>
                    Initialize Default Rules
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div key={rule.id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900">{rule.name}</h3>
                            {getTriggerBadge(rule.trigger)}
                            <Switch 
                              checked={rule.enabled} 
                              disabled // Would implement toggle functionality
                            />
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {rule.conditions.autoReleaseAfterHours !== undefined && (
                              <div>
                                <span className="text-gray-500">Release After:</span>
                                <div className="font-medium">
                                  {rule.conditions.autoReleaseAfterHours === 0 
                                    ? 'Immediate' 
                                    : `${rule.conditions.autoReleaseAfterHours}h`
                                  }
                                </div>
                              </div>
                            )}
                            
                            {rule.conditions.maxHoldDuration && (
                              <div>
                                <span className="text-gray-500">Max Hold:</span>
                                <div className="font-medium">{rule.conditions.maxHoldDuration}h</div>
                              </div>
                            )}
                            
                            {rule.conditions.requiredStatus && (
                              <div>
                                <span className="text-gray-500">Required Status:</span>
                                <div className="font-medium capitalize">{rule.conditions.requiredStatus}</div>
                              </div>
                            )}
                            
                            {rule.conditions.requireClientConfirmation !== undefined && (
                              <div>
                                <span className="text-gray-500">Client Confirmation:</span>
                                <div className="font-medium">
                                  {rule.conditions.requireClientConfirmation ? 'Required' : 'Not Required'}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Release Activity Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">No auto-release activity yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium">Booking #{log.bookingId.slice(-8)}</span>
                            {getActionBadge(log.action)}
                            <span className="text-xs text-gray-500">
                              {new Date(log.executedAt || log.scheduledAt || '').toLocaleString()}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">{log.reason}</p>
                          
                          {log.error && (
                            <Alert className="border-red-200 bg-red-50">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800">
                                {log.error}
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                            <span>Rule: {log.ruleId}</span>
                            <span>Triggered by: {log.metadata.autoReleaseTriggeredBy}</span>
                            <span>Booking Status: {log.metadata.bookingStatus}</span>
                            <span>Escrow Status: {log.metadata.escrowStatus}</span>
                          </div>
                        </div>
                        
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Release System Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Auto-release system is currently running via Vercel Cron (every 30 minutes).
                  Changes to rules take effect on the next cron run.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">System Status</h3>
                    <p className="text-sm text-gray-600">Auto-release cron job status</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Cron Schedule</h3>
                    <p className="text-sm text-gray-600">How often the system checks for eligible releases</p>
                  </div>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">*/30 * * * *</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Last Run</h3>
                    <p className="text-sm text-gray-600">When the system last processed auto-releases</p>
                  </div>
                  <span className="text-sm text-gray-600">
                    {logs.length > 0 
                      ? new Date(logs[0].executedAt || '').toLocaleString() 
                      : 'Never'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
} 