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
  try {
    const filters = typeof broadcast.filters === 'string' ? JSON.parse(broadcast.filters) : broadcast.filters;
    if (filters?._content) content = filters._content;
    if (filters?._htmlContent) htmlContent = filters._htmlContent;
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
    </div>
  );
}
