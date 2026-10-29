"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ApiService } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';

export default function BroadcastDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [broadcast, setBroadcast] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadBroadcast();
  }, [id]);

  const loadBroadcast = async () => {
    try {
      const response = await ApiService.request(`/broadcast_messages/${id}`);
      setBroadcast(response);
    } catch (error) {
      console.error('Failed to load broadcast:', error);
      toast.error('Failed to load broadcast message');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (!broadcast) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Message not found</div>
      </div>
    );
  }

  // Parse content from filters if stored as JSON
  let content = broadcast.content || '';
  let htmlContent = broadcast.htmlContent || '';
  let failures: { to: string; channel: string; reason: string }[] = [];
  try {
    const filters = typeof broadcast.filters === 'string' ? JSON.parse(broadcast.filters) : broadcast.filters;
    if (filters?._content) content = filters._content;
    if (filters?._htmlContent) htmlContent = filters._htmlContent;
    if (Array.isArray(filters?._failures)) failures = filters._failures;
  } catch (e) {
    // Use raw content if parsing fails
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Broadcast Message</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{broadcast.title}</CardTitle>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(broadcast.sentAt || broadcast.createdAt).toLocaleString()}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {htmlContent ? (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : (
            <p className="whitespace-pre-wrap">{content}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery results</CardTitle>
          <p className="text-sm text-gray-600">
            Status: {broadcast.status || 'unknown'} · {broadcast.recipientCount || 0} recipients targeted
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Emails sent', value: broadcast.emailsSent || 0, bad: broadcast.emailsFailed || 0 },
              { label: 'SMS sent', value: broadcast.smsSent || 0, bad: broadcast.smsFailed || 0 },
              { label: 'In-app', value: broadcast.inAppSent || 0, bad: 0 },
              { label: 'Push sent', value: broadcast.pushSent || 0, bad: broadcast.pushFailed || 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border p-3">
                <div className="text-xs text-gray-500">{item.label}</div>
                <div className="text-2xl font-semibold">{item.value}</div>
                {item.bad > 0 && <div className="text-xs text-red-600">{item.bad} failed</div>}
              </div>
            ))}
          </div>

          {failures.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Failed deliveries ({failures.length}{failures.length >= 300 ? '+' : ''})</h3>
              <div className="max-h-72 overflow-y-auto rounded-lg border divide-y text-sm">
                {failures.map((f, i) => (
                  <div key={i} className="p-2 flex gap-3">
                    <span className="uppercase text-xs font-semibold text-gray-500 w-14 shrink-0">{f.channel}</span>
                    <span className="font-mono text-xs break-all">{f.to}</span>
                    <span className="text-red-600 text-xs ml-auto text-right">{f.reason}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Email addresses that Resend has suppressed after a bounce or complaint are accepted by Resend but never delivered, so they do not appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
