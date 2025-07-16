"use client";

import * as React from "react";
import { 
  CreditCard, 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ArrowRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type PaymentStatus = 'pending' | 'processing' | 'escrowed' | 'released' | 'failed' | 'refunded';

interface PaymentFlowProps {
  bookingId: string;
  amount: number;
  status: PaymentStatus;
  workerName: string;
  serviceName: string;
  paymentReference?: string;
  onStatusChange?: (status: PaymentStatus) => void;
}

interface PaymentStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending' | 'failed';
}

export function PaymentFlow({ 
  bookingId, 
  amount, 
  status, 
  workerName, 
  serviceName, 
  paymentReference,
  onStatusChange 
}: PaymentFlowProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const getPaymentSteps = (): PaymentStep[] => {
    const steps: PaymentStep[] = [
      {
        id: 'payment',
        title: 'Payment Processing',
        description: 'Secure payment via Paystack',
        icon: <CreditCard className="h-5 w-5" />,
        status: 'pending'
      },
      {
        id: 'escrow',
        title: 'Escrow Hold',
        description: 'Payment held securely until completion',
        icon: <Shield className="h-5 w-5" />,
        status: 'pending'
      },
      {
        id: 'completion',
        title: 'Job Completion',
        description: 'Service completed and verified',
        icon: <CheckCircle className="h-5 w-5" />,
        status: 'pending'
      },
      {
        id: 'release',
        title: 'Payment Release',
        description: 'Funds transferred to worker',
        icon: <ArrowRight className="h-5 w-5" />,
        status: 'pending'
      }
    ];

    // Update step statuses based on payment status
    switch (status) {
      case 'pending':
        steps[0].status = 'current';
        break;
      case 'processing':
        steps[0].status = 'current';
        break;
      case 'escrowed':
        steps[0].status = 'completed';
        steps[1].status = 'completed';
        steps[2].status = 'current';
        break;
      case 'released':
        steps.forEach(step => step.status = 'completed');
        break;
      case 'failed':
        steps[0].status = 'failed';
        break;
      case 'refunded':
        steps[0].status = 'completed';
        steps[1].status = 'completed';
        steps[2].status = 'failed';
        break;
    }

    return steps;
  };

  const steps = getPaymentSteps();
  const progressPercentage = (steps.filter(s => s.status === 'completed').length / steps.length) * 100;

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'escrowed':
        return 'bg-green-100 text-green-800';
      case 'released':
        return 'bg-emerald-100 text-emerald-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return 'Payment Pending';
      case 'processing':
        return 'Processing Payment';
      case 'escrowed':
        return 'Payment Secured';
      case 'released':
        return 'Payment Released';
      case 'failed':
        return 'Payment Failed';
      case 'refunded':
        return 'Payment Refunded';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'escrowed':
        return <Shield className="h-4 w-4" />;
      case 'released':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      case 'refunded':
        return <ArrowRight className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleRefund = async () => {
    setIsProcessing(true);
    try {
      // Implement refund logic here
      // This would typically call an API endpoint to process the refund
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      onStatusChange?.('refunded');
    } catch (error) {
      console.error('Refund failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRelease = async () => {
    setIsProcessing(true);
    try {
      // Implement release logic here
      // This would typically call an API endpoint to release payment to worker
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      onStatusChange?.('released');
    } catch (error) {
      console.error('Release failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>Payment Flow</span>
              <Badge className={cn("text-xs", getStatusColor(status))}>
                {getStatusIcon(status)}
                <span className="ml-1">{getStatusText(status)}</span>
              </Badge>
            </CardTitle>
            <CardDescription>
              Service: {serviceName} with {workerName}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">₦{amount.toLocaleString()}</p>
            {paymentReference && (
              <p className="text-xs text-gray-500 font-mono">
                Ref: {paymentReference.substring(0, 12)}...
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}% Complete</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Payment Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start space-x-3">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                step.status === 'completed' && "bg-green-500 border-green-500 text-white",
                step.status === 'current' && "bg-blue-500 border-blue-500 text-white",
                step.status === 'pending' && "bg-gray-100 border-gray-300 text-gray-500",
                step.status === 'failed' && "bg-red-500 border-red-500 text-white"
              )}>
                {step.status === 'completed' && <CheckCircle className="h-4 w-4" />}
                {step.status === 'current' && <Loader2 className="h-4 w-4 animate-spin" />}
                {step.status === 'pending' && step.icon}
                {step.status === 'failed' && <AlertCircle className="h-4 w-4" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={cn(
                    "font-medium",
                    step.status === 'completed' && "text-green-900",
                    step.status === 'current' && "text-blue-900",
                    step.status === 'pending' && "text-gray-600",
                    step.status === 'failed' && "text-red-900"
                  )}>
                    {step.title}
                  </h4>
                  {step.status === 'completed' && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Complete
                    </Badge>
                  )}
                  {step.status === 'current' && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      In Progress
                    </Badge>
                  )}
                  {step.status === 'failed' && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      Failed
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Escrow Protection</p>
            <p className="text-xs text-gray-500">
              Your payment is secure until job completion
            </p>
          </div>
          
          <div className="flex space-x-2">
            {status === 'escrowed' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleRefund}
                  disabled={isProcessing}
                  size="sm"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request Refund'}
                </Button>
                <Button 
                  onClick={handleRelease}
                  disabled={isProcessing}
                  size="sm"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Release Payment'}
                </Button>
              </>
            )}
            
            {status === 'failed' && (
              <Button size="sm" variant="outline">
                Try Again
              </Button>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {status === 'escrowed' && (
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Payment Secured</p>
                <p className="text-sm text-green-700">
                  Your payment is held safely in escrow. It will be released to the worker once you confirm job completion.
                </p>
              </div>
            </div>
          </div>
        )}

        {status === 'released' && (
          <div className="bg-emerald-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-900">Payment Released</p>
                <p className="text-sm text-emerald-700">
                  Payment has been successfully transferred to {workerName}. Transaction complete!
                </p>
              </div>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">Payment Failed</p>
                <p className="text-sm text-red-700">
                  There was an issue processing your payment. Please try again or contact support.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 