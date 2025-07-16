"use client";

import * as React from "react";
import { Send, X, Paperclip, Image, File, Download, Eye, MoreHorizontal, VolumeX, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WorkerProfile, Message } from "@/lib/types/marketplace";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { databases, COLLECTIONS, client } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { fileUploadService } from "@/lib/file-upload";
import { notificationService } from "@/lib/notification-service";

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerProfile | null;
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
}

export function MessageModal({ 
  isOpen, 
  onClose, 
  worker, 
  recipientId, 
  recipientName, 
  recipientEmail 
}: MessageModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [newMessage, setNewMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isTyping, setIsTyping] = React.useState(false);
  const [otherUserTyping, setOtherUserTyping] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [unsubscribe, setUnsubscribe] = React.useState<(() => void) | null>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Create a conversation ID based on user IDs
  const conversationId = React.useMemo(() => {
    if (!user) return null;
    const otherUserId = worker?.userId || recipientId;
    if (!otherUserId) return null;
    const ids = [user.$id, otherUserId].sort();
    return `${ids[0]}_${ids[1]}`;
  }, [user, worker, recipientId]);

  // Get recipient info
  const recipient = React.useMemo(() => {
    if (worker) {
      return {
        id: worker.userId,
        name: worker.displayName,
        email: recipientEmail || '',
        avatar: ''
      };
    }
    return {
      id: recipientId || '',
      name: recipientName || '',
      email: recipientEmail || '',
      avatar: ''
    };
  }, [worker, recipientId, recipientName, recipientEmail]);

  // Fetch messages and setup real-time subscription when modal opens
  React.useEffect(() => {
    if (isOpen && conversationId) {
      fetchMessages();
      setupRealtimeSubscription();
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isOpen, conversationId]);

  // Setup real-time subscription for messages
  const setupRealtimeSubscription = () => {
    if (!conversationId) return;

    const unsubscribeFn = client.subscribe(
      `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
      (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          const newMessage = response.payload as Message;
          if (newMessage.conversationId === conversationId) {
            setMessages(prev => [...prev, newMessage]);
            
            // Mark as read if it's from the other user
            if (newMessage.senderId !== user?.$id) {
              markMessageAsRead(newMessage.id);
            }
          }
        }
        
        if (response.events.includes('databases.*.collections.*.documents.*.update')) {
          const updatedMessage = response.payload as Message;
          if (updatedMessage.conversationId === conversationId) {
            setMessages(prev => prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            ));
            
            // Handle typing indicators
            if (updatedMessage.isTyping && updatedMessage.senderId !== user?.$id) {
              setOtherUserTyping(true);
              setTimeout(() => setOtherUserTyping(false), 3000);
            }
          }
        }
      }
    );

    setUnsubscribe(() => unsubscribeFn);
  };

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!conversationId) return;
    
    try {
      setIsLoading(true);
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.MESSAGES || 'messages',
        [
          Query.equal('conversationId', conversationId),
          Query.orderAsc('createdAt'),
          Query.limit(100)
        ]
      );
      
      setMessages(response.documents as unknown as Message[]);
      
      // Mark unread messages as read
      const unreadMessages = response.documents.filter(
        (msg: any) => msg.senderId !== user?.$id && !msg.isRead
      );
      
      for (const msg of unreadMessages) {
        await markMessageAsRead(msg.$id);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  };

  // Mark message as read
  const markMessageAsRead = async (messageId: string) => {
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.MESSAGES,
        messageId,
        {
          isRead: true,
          readAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Handle typing indicators
  const handleTyping = async () => {
    if (!conversationId || !user) return;
    
    setIsTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
    
    // Update typing status in database (optional - for real-time typing indicators)
    try {
      // You could implement a separate typing collection or use a temporary field
      // For now, we'll just use local state
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  const sendMessage = async (fileData?: any) => {
    if ((!newMessage.trim() && !fileData) || !user || !conversationId) return;

    try {
      setIsSending(true);
      
      const messageData = {
        id: ID.unique(),
        conversationId,
        senderId: user.$id,
        recipientId: recipient.id,
        content: fileData ? (fileData.fileName || 'File attachment') : newMessage.trim(),
        type: fileData ? 'file' : 'text',
        isRead: false,
        isDelivered: true,
        deliveredAt: new Date().toISOString(),
        // File attachment data (flat structure)
        attachmentUrl: fileData?.fileUrl,
        attachmentName: fileData?.fileName,
        attachmentType: fileData?.fileType,
        attachmentSize: fileData?.fileSize,
        thumbnailUrl: fileData?.thumbnailUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.MESSAGES,
        messageData.id,
        messageData
      );

      setMessages(prev => [...prev, messageData as Message]);
      setNewMessage("");
      
      // Send notifications
      if (fileData) {
        await notificationService.handleFileSharedNotification(
          recipient.id,
          recipient.email,
          user.name,
          fileData.fileName,
          fileData.fileType,
          conversationId
        );
      } else {
        await notificationService.handleNewMessageNotification(
          recipient.id,
          recipient.email,
          user.name,
          newMessage.trim(),
          conversationId
        );
      }
      
      toast.success(fileData ? "File sent!" : "Message sent!");
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !conversationId) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const uploadResult = await fileUploadService.uploadFile(file, conversationId);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Send file message
      await sendMessage(uploadResult);
      
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Toggle conversation mute
  const toggleMute = async () => {
    try {
      setIsMuted(!isMuted);
      // In a real implementation, you'd update the user's muted conversations
      toast.success(isMuted ? "Conversation unmuted" : "Conversation muted");
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast.error("Failed to update mute status");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      handleTyping();
    }
  };

  // File preview component
  const FilePreview = ({ message }: { message: Message }) => {
    if (!message.attachmentUrl) return null;

    const isImage = message.attachmentType?.startsWith('image/');
    const isPdf = message.attachmentType === 'application/pdf';
    
    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isImage ? (
              <Image className="h-4 w-4 text-blue-500" />
            ) : (
              <File className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm font-medium truncate max-w-[150px]">
              {message.attachmentName}
            </span>
            <Badge variant="secondary" className="text-xs">
              {message.attachmentSize ? `${Math.round(message.attachmentSize / 1024)}KB` : ''}
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            {(isImage || isPdf) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(message.attachmentUrl, '_blank')}
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const link = document.createElement('a');
                link.href = message.attachmentUrl!;
                link.download = message.attachmentName || 'file';
                link.click();
              }}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {isImage && message.thumbnailUrl && (
          <div className="mt-2">
            <img 
              src={message.thumbnailUrl} 
              alt={message.attachmentName}
              className="max-w-[200px] max-h-[150px] rounded cursor-pointer"
              onClick={() => window.open(message.attachmentUrl, '_blank')}
            />
          </div>
        )}
      </div>
    );
  };

  if (!recipient.id) return null;

      return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={recipient.avatar} alt={recipient.name} />
                  <AvatarFallback>
                    {recipient.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-semibold">Message {recipient.name}</h2>
                  <p className="text-sm text-gray-600">
                    {otherUserTyping ? 'Typing...' : 'Chat about your service'}
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={toggleMute}>
                    {isMuted ? (
                      <>
                        <Volume2 className="h-4 w-4 mr-2" />
                        Unmute conversation
                      </>
                    ) : (
                      <>
                        <VolumeX className="h-4 w-4 mr-2" />
                        Mute conversation
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </DialogTitle>
          </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Area */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No messages yet. Start a conversation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwnMessage = message.senderId === user?.$id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          isOwnMessage
                            ? 'bg-[#16a34a] hover:bg-[#15803d] text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        
                        {/* File attachment preview */}
                        {message.attachmentUrl && (
                          <FilePreview message={message} />
                        )}
                        
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-xs ${
                            isOwnMessage ? 'text-primary-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </p>
                          {isOwnMessage && (
                            <div className="flex items-center space-x-1">
                              {message.isDelivered && (
                                <div className="w-2 h-2 bg-white rounded-full opacity-70" />
                              )}
                              {message.isRead && (
                                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Typing indicator */}
                {otherUserTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-2 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Upload Progress */}
          {isUploading && (
            <div className="px-4 py-2 bg-gray-50 border-t">
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Uploading file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="flex items-center space-x-2 mt-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar"
              className="hidden"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSending}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isSending || isUploading}
              className="flex-1"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={(!newMessage.trim() || isSending || isUploading) && !isUploading}
              size="sm"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 