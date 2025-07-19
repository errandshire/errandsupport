"use client";

import * as React from "react";
import { X, Send, Image, Paperclip, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { Query } from "appwrite";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { notificationService } from '@/lib/notification-service';
import { realtimeMessagingService } from '@/lib/realtime-messaging-service';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
  worker?: any;
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
}

export function MessageModal({ 
  isOpen, 
  onClose, 
  clientId, 
  clientName,
  worker,
  recipientId,
  recipientName,
  recipientEmail
}: MessageModalProps) {
  const { user } = useAuth();
  const [message, setMessage] = React.useState("");
  const [messages, setMessages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [recipientInfo, setRecipientInfo] = React.useState<any>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Get the actual recipient ID
  const actualRecipientId = recipientId || clientId || (worker?.$id || worker?.id);
  const conversationId = React.useMemo(() => {
    if (!user || !actualRecipientId) return '';
    return [user.$id, actualRecipientId].sort().join('_');
  }, [user, actualRecipientId]);

  // Fetch recipient info when modal opens
  React.useEffect(() => {
    if (!isOpen || !actualRecipientId) return;

    const fetchRecipientInfo = async () => {
      try {
        setLoading(true);
        
        // Check if this is a mock/invalid ID
        if (actualRecipientId === 'client' || actualRecipientId.length < 10) {
          console.warn('Invalid recipient ID format:', actualRecipientId);
          return;
        }

        const response = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USERS,
          actualRecipientId
        );
        setRecipientInfo(response);
      } catch (error) {
        console.error('Error fetching recipient info:', error);
        toast.error("Failed to load recipient information");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipientInfo();
  }, [isOpen, actualRecipientId]);

  // Load messages and setup real-time updates
  React.useEffect(() => {
    if (!isOpen || !user || !conversationId) return;

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
  }, [isOpen, user, conversationId]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !user || !actualRecipientId || sending) return;

    try {
      setSending(true);
      
      // Validate recipient ID format
      if (actualRecipientId === 'client' || actualRecipientId.length < 10) {
        console.error('Invalid recipient ID format:', actualRecipientId);
        toast.error("Cannot send message - invalid recipient ID");
        return;
      }

      const success = await realtimeMessagingService.sendMessage(
        message.trim(),
        actualRecipientId,
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

  const getRecipientName = () => {
    if (recipientName) return recipientName;
    if (recipientInfo) {
      return recipientInfo.name || recipientInfo.displayName || 'User';
    }
    return clientName || worker?.name || worker?.displayName || 'User';
  };

  const getRecipientAvatar = () => {
    if (recipientInfo) {
      return recipientInfo.avatar || recipientInfo.profileImage;
    }
    return worker?.profileImage || worker?.avatar;
  };

  const getRecipientEmail = () => {
    if (recipientEmail) return recipientEmail;
    if (recipientInfo) {
      return recipientInfo.email;
    }
    return worker?.email;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={getRecipientAvatar()} />
                <AvatarFallback>
                  {getRecipientName().charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>{getRecipientName()}</DialogTitle>
                <p className="text-sm text-gray-500">
                  {loading ? 'Loading...' : getRecipientEmail() || 'No email available'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

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
                return (
                  <div
                    key={msg.id || index}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        isMine 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <div className={`flex items-center justify-between mt-1 ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
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
      </DialogContent>
    </Dialog>
  );
} 