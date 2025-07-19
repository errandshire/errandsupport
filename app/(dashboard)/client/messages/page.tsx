"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  Search,
  MessageCircle,
  Clock,
  VolumeX,
  Volume2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { databases, COLLECTIONS, client } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Message } from "@/lib/types/marketplace";
import { toast } from "sonner";
import { MessageModal } from "@/components/marketplace/message-modal";
import { realtimeMessagingService, type Conversation } from "@/lib/realtime-messaging-service";

export default function ClientMessagesPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = React.useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [showMessageModal, setShowMessageModal] = React.useState(false);
  const [messageRecipient, setMessageRecipient] = React.useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  React.useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/client/messages");
      return;
    }
    
    if (user.role !== "client") {
      router.replace(`/${user.role}`);
      return;
    }

    setupRealtimeMessaging();
  }, [loading, isAuthenticated, user, router]);

  const setupRealtimeMessaging = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Initialize real-time messaging service
      await realtimeMessagingService.initialize(user.$id);
      
      // Load conversations
      const userConversations = await realtimeMessagingService.loadUserConversations(user.$id);
      setConversations(userConversations);
      
      // Subscribe to global conversation updates
      realtimeMessagingService.subscribe('*', (update) => {
        // Refresh conversations when there are updates
        const updatedConversations = realtimeMessagingService.getConversations();
        setConversations(updatedConversations);
      });
      
    } catch (error) {
      console.error('Error setting up real-time messaging:', error);
      toast.error("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    // Get the other participant (not the current user)
    const otherParticipant = conversation.participants.find(p => p !== user?.$id);
    if (!otherParticipant) return;
    
    const participantInfo = conversation.participantInfo[otherParticipant];
    
    setMessageRecipient({
      id: otherParticipant,
      name: participantInfo?.name || 'User',
      email: participantInfo?.email || ''
    });
    setShowMessageModal(true);
    setSelectedConversation(conversation);
    
    // Mark messages as read
    if (conversation.unreadCount > 0) {
      realtimeMessagingService.markMessagesAsRead(conversation.id, user!.$id);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    // Filter by participant names
    return Object.values(conv.participantInfo).some(participant =>
      participant.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const getParticipantInfo = (conversation: Conversation) => {
    // Get the other participant (not the current user)
    const otherParticipantId = conversation.participants.find(p => p !== user?.$id);
    if (!otherParticipantId) return null;
    return conversation.participantInfo[otherParticipantId];
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
                Messages
              </h1>
              <p className="text-neutral-600">
                Chat with your service providers
                {totalUnread > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white">
                    {totalUnread} unread
                  </Badge>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversations List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Conversations</CardTitle>
                <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[500px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No conversations yet</p>
                      <p className="text-sm">Start messaging with service providers!</p>
                    </div>
                  ) : (
                    filteredConversations.map((conversation) => {
                      const participantInfo = getParticipantInfo(conversation);
                      if (!participantInfo) return null;

                      return (
                      <div
                        key={conversation.id}
                        className={cn(
                          "flex items-center space-x-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100",
                          selectedConversation?.id === conversation.id && "bg-primary-50"
                        )}
                        onClick={() => handleConversationClick(conversation)}
                      >
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={participantInfo.avatar} alt={participantInfo.name} />
                          <AvatarFallback>
                              {participantInfo.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 truncate">
                                {participantInfo.name}
                            </h3>
                            <div className="flex items-center space-x-2">
                              {conversation.unreadCount > 0 && (
                                <Badge className="bg-red-500 text-white text-xs">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                  {conversation.lastMessageTime ? new Date(conversation.lastMessageTime).toLocaleString() : ''}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 truncate mt-1">
                              {conversation.lastMessage?.content || 'No messages yet'}
                          </p>
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Message Area */}
            <Card className="lg:col-span-2">
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p>Choose a conversation from the list to start messaging</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      

      {/* Message Modal */}
      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        worker={null}
        recipientId={messageRecipient?.id}
        recipientName={messageRecipient?.name}
        recipientEmail={messageRecipient?.email}
      />
    </div>
  );
} 