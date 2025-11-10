"use client";

import * as React from "react";
import { Send, Image, Paperclip, Smile, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { realtimeMessagingService } from '@/lib/realtime-messaging-service';

interface ChatInterfaceProps {
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  recipientEmail?: string;
  className?: string;
}

export function ChatInterface({ 
  recipientId,
  recipientName,
  recipientAvatar,
  recipientEmail,
  className = ""
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const [message, setMessage] = React.useState("");
  const [messages, setMessages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [recipientRole, setRecipientRole] = React.useState<string>('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const conversationId = React.useMemo(() => {
    if (!user || !recipientId) return '';
    return [user.$id, recipientId].sort().join('_');
  }, [user, recipientId]);

  // Fetch recipient role
  React.useEffect(() => {
    const fetchRecipientRole = async () => {
      if (!recipientId) return;
      try {
        const { databases, COLLECTIONS } = await import('@/lib/appwrite');
        const recipient = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USERS,
          recipientId
        );
        setRecipientRole(recipient.role);
      } catch (error) {
        console.error('Error fetching recipient role:', error);
      }
    };
    fetchRecipientRole();
  }, [recipientId]);

  // Load messages and setup real-time updates
  React.useEffect(() => {
    if (!user || !conversationId) return;

    let unsubscribe: (() => void) | null = null;

    const setupRealtime = async () => {
      try {
        setLoading(true);
        
        // Initialize messaging service for this user
        await realtimeMessagingService.initialize(user.$id);
        
        // Get existing messages
        const conversationMessages = realtimeMessagingService.getConversationMessages(conversationId);
        setMessages(conversationMessages);
        
        // Subscribe to updates for this conversation
        unsubscribe = realtimeMessagingService.subscribe(conversationId, (update) => {
          if (update.type === 'message_created') {
            setMessages(prev => {
              // Prevent duplicates
              const exists = prev.some(m => m.id === update.message?.id);
              if (exists) return prev;
              
              return [...prev, update.message!].sort((a, b) => 
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
            });
          }
          
          if (update.type === 'message_read') {
            setMessages(prev => prev.map(m => 
              m.id === update.message?.id ? { ...m, isRead: true } : m
            ));
          }
        });
        
        // Mark messages as read when opening conversation
        if (conversationMessages.length > 0) {
          await realtimeMessagingService.markMessagesAsRead(conversationId, user.$id);
        }
        
      } catch (error) {
        console.error('Error setting up real-time messaging:', error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    setupRealtime();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, conversationId]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !user || !recipientId || sending) return;

    try {
      setSending(true);
      
      // Validate recipient ID format
      if (recipientId === 'client' || recipientId.length < 10) {
        console.error('Invalid recipient ID format:', recipientId);
        toast.error("Cannot send message - invalid recipient ID");
        return;
      }

      const success = await realtimeMessagingService.sendMessage(
        message.trim(),
        recipientId,
        user.$id
      );

      if (success) {
        setMessage("");
        toast.success("Message sent successfully");
      } else {
        toast.error("Failed to send message. Please try again.");
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={recipientAvatar} />
            <AvatarFallback>
              {recipientName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{recipientName}</h3>
              {recipientRole === 'admin' && (
                <Badge className="bg-red-100 text-red-800 border-red-300">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {loading ? 'Loading...' : recipientEmail || 'No email available'}
            </p>
          </div>
          {user?.role === 'admin' && (
            <Badge className="bg-blue-100 text-blue-800 border-blue-300">
              <Shield className="h-3 w-3 mr-1" />
              You are Admin
            </Badge>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isMine = msg.senderId === user?.$id;
              const isAdminMessage = (isMine && user?.role === 'admin') || (!isMine && recipientRole === 'admin');
              return (
                <div
                  key={msg.id || index}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      isMine
                        ? isAdminMessage
                          ? 'bg-red-500 text-white'
                          : 'bg-blue-500 text-white'
                        : isAdminMessage
                          ? 'bg-red-50 text-gray-900 border-2 border-red-200'
                          : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {isAdminMessage && !isMine && (
                      <div className="flex items-center gap-1 mb-1">
                        <Badge className="bg-red-100 text-red-800 border-red-300 text-xs px-1.5 py-0">
                          <Shield className="h-2.5 w-2.5 mr-0.5" />
                          Admin
                        </Badge>
                      </div>
                    )}
                    <p className="text-sm">{msg.content}</p>
                    <div className={`flex items-center justify-between mt-1 ${
                      isMine
                        ? isAdminMessage ? 'text-red-100' : 'text-blue-100'
                        : 'text-gray-500'
                    }`}>
                      <p className="text-xs">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                      {isMine && (
                        <span className="text-xs ml-2">
                          {msg.isRead ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" disabled>
            <Image className="h-5 w-5 text-gray-500" />
          </Button>
          <Button variant="ghost" size="icon" disabled>
            <Paperclip className="h-5 w-5 text-gray-500" />
          </Button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1"
            disabled={sending}
          />
          <Button variant="ghost" size="icon" disabled>
            <Smile className="h-5 w-5 text-gray-500" />
          </Button>
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim() || sending}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 