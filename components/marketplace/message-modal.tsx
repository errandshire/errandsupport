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
  const [recipientInfo, setRecipientInfo] = React.useState<any>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Fetch recipient info when modal opens
  React.useEffect(() => {
    if (!isOpen) return;

    const fetchRecipientInfo = async () => {
      try {
        setLoading(true);
        
        // Use provided recipientId first, then fallback to clientId or worker id
        const targetId = recipientId || clientId || (worker?.$id || worker?.id);
        
        if (!targetId) {
          console.error('No recipient ID available');
          return;
        }

        // Check if this is a mock/invalid ID
        if (targetId === 'client' || targetId.length < 10) {
          console.warn('Invalid recipient ID format:', targetId);
          return;
        }

        const response = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USERS,
          targetId
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
  }, [isOpen, recipientId, clientId, worker]);

  // Fetch messages when modal opens
  React.useEffect(() => {
    if (!isOpen || !user) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const targetId = recipientId || clientId || (worker?.$id || worker?.id);
        
        if (!targetId) {
          console.error('No recipient ID available');
          return;
        }

        // Check if this is a mock/invalid ID
        if (targetId === 'client' || targetId.length < 10) {
          console.warn('Invalid recipient ID format:', targetId);
          setMessages([]); // Show empty conversation for demo data
          return;
        }

        const response = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.MESSAGES,
          [
            Query.orderDesc('$createdAt'),
            Query.limit(50)
          ]
        );

        // Filter messages between these two users
        const relevantMessages = response.documents.filter(msg => 
          (msg.senderId === user.$id && msg.recipientId === targetId) ||
          (msg.senderId === targetId && msg.recipientId === user.$id)
        );

        setMessages(relevantMessages.reverse()); // Show oldest first
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error("Failed to load messages");
        setMessages([]); // Show empty on error
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [isOpen, user, recipientId, clientId, worker]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !user) return;

    try {
      const targetId = recipientId || clientId || (worker?.$id || worker?.id);
      
      if (!targetId) {
        console.error('No recipient ID available');
        toast.error("Cannot send message - recipient information missing");
        return;
      }

      // Validate recipient ID format
      if (targetId === 'client' || targetId.length < 10) {
        console.error('Invalid recipient ID format:', targetId);
        toast.error("Cannot send message - invalid recipient ID");
        return;
      }

      const { ID } = await import('appwrite');
      
      const newMessage = {
        id: ID.unique(),
        senderId: user.$id,
        recipientId: targetId,
        content: message.trim(),
        type: 'text',
        isRead: false,
        isDelivered: false,
        conversationId: `${user.$id}_${targetId}`, // Create a consistent conversation ID
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create message
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.MESSAGES,
        newMessage.id,
        newMessage
      );

      // Create notification for recipient
      await notificationService.createNotification({
        userId: targetId,
        title: 'New Message',
        message: `${user.name || 'Someone'} sent you a message: ${message.length > 50 ? message.substring(0, 50) + '...' : message}`,
        type: 'info'
      });

      setMessages(prev => [...prev, newMessage]);
      setMessage("");
      toast.success("Message sent successfully");

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message. Please try again.");
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
                      <p className={`text-xs mt-1 ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
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
            />
            <Button variant="ghost" size="icon" disabled>
              <Smile className="h-5 w-5 text-gray-500" />
            </Button>
            <Button 
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 