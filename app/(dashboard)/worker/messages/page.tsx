"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { 
  Search,
  MessageCircle,
  Clock,
  VolumeX,
  Volume2,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WorkerSidebar, SidebarToggle } from "@/components/layout/worker-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { databases, COLLECTIONS, client } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Message } from "@/lib/types/marketplace";
import { toast } from "sonner";
import { MessageModal } from "@/components/marketplace/message-modal";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ChatInterface } from "@/components/chat/chat-interface";
import { realtimeMessagingService, type Conversation } from "@/lib/realtime-messaging-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Conversation {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  messages: Message[];
  participants: string[];
  participantInfo: {
    [key: string]: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
  };
}

function WorkerMessagesContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const senderId = searchParams.get('sender');
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
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
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [conversationToDelete, setConversationToDelete] = React.useState<Conversation | null>(null);

  const isMobile = useMediaQuery("(max-width: 1023px)");

  React.useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/worker/messages");
      return;
    }
    
    if (user.role !== "worker") {
      router.replace(`/${user.role}`);
      return;
    }

    setupRealtimeMessaging();
  }, [loading, isAuthenticated, user, router]);

  const setupRealtimeMessaging = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      await realtimeMessagingService.initialize(user.$id);
      const userConversations = await realtimeMessagingService.loadUserConversations(user.$id);
      setConversations(userConversations);
      realtimeMessagingService.subscribe('*', (update) => {
        // Update unread count in local state for message_read or conversation_updated
        if (update.type === 'message_read' || update.type === 'conversation_updated') {
          setConversations(prev => prev.map(c =>
            update.conversation && c.id === update.conversation.id
              ? { ...c, unreadCount: update.conversation.unreadCount }
              : c
          ));
        } else {
          const updatedConversations = realtimeMessagingService.getConversations();
          setConversations(updatedConversations);
        }
      });
    } catch (error) {
      console.error('Error setting up real-time messaging:', error);
      toast.error("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle URL parameter to auto-select conversation
  React.useEffect(() => {
    if (senderId && conversations.length > 0 && user) {
      // Find conversation with the sender
      const targetConversation = conversations.find(conv => 
        conv.participants.includes(senderId) && conv.participants.includes(user.$id)
      );
      
      if (targetConversation) {
        handleConversationClick(targetConversation);
        // Clear the URL parameter after selecting
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('sender');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [senderId, conversations, user]);

  const handleConversationClick = async (conversation: Conversation) => {
    if (!user) return;
    const otherParticipant = conversation.participants.find(p => p !== user.$id);
    if (!otherParticipant) return;
    const participantInfo = conversation.participantInfo[otherParticipant];
    setMessageRecipient({
      id: otherParticipant,
      name: participantInfo?.name || 'User',
      email: participantInfo?.email || ''
    });
    setSelectedConversation(conversation);
    if (conversation.unreadCount > 0) {
      setConversations(prev => prev.map(c =>
        c.id === conversation.id ? { ...c, unreadCount: 0 } : c
      ));
      await realtimeMessagingService.markMessagesAsRead(conversation.id, user.$id);
      // Reload conversations from backend to ensure sync
      const updatedConversations = await realtimeMessagingService.loadUserConversations(user.$id);
      setConversations(updatedConversations);
    }
    if (isMobile) {
    setShowMessageModal(true);
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete || !user) return;
    const prevConversations = [...conversations];
    setConversations(conversations.filter(c => c.id !== conversationToDelete.id));
    setDeleteDialogOpen(false);
    try {
      await realtimeMessagingService.deleteConversation(conversationToDelete.id, user.$id);
      toast.success("Conversation deleted");
    } catch (error) {
      setConversations(prevConversations);
      toast.error("Failed to delete conversation");
    } finally {
      setConversationToDelete(null);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    return Object.values(conv.participantInfo).some(participant =>
      participant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  });

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const getParticipantInfo = (conversation: Conversation) => {
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
    <div className="min-h-screen bg-neutral-50 flex">

      <>
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
                  Messages
                </h1>
                <p className="text-neutral-600">
                  Communicate with your clients
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
                        <p className="text-sm">Start messaging with your clients!</p>
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
                                  {/* Delete button */}
                                  <button
                                    className="ml-2 p-1 rounded hover:bg-red-100 text-red-600"
                                    title="Delete conversation"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setConversationToDelete(conversation);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
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
                <CardContent className="h-full p-0">
                  {selectedConversation && !isMobile ? (
                    <ChatInterface
                      recipientId={messageRecipient?.id || ''}
                      recipientName={messageRecipient?.name || 'User'}
                      recipientAvatar={selectedConversation.clientAvatar}
                      recipientEmail={messageRecipient?.email}
                      className="h-[600px]"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-center text-gray-500">
                      <div>
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                    <p>Choose a conversation from the list to start messaging</p>
                  </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </>

      {/* Message Modal */}
      {isMobile && (
      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        worker={null}
        recipientId={messageRecipient?.id}
        recipientName={messageRecipient?.name}
        recipientEmail={messageRecipient?.email}
      />
      )}
      {/* Delete Conversation Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to delete this conversation? This action cannot be undone.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConversation}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function WorkerMessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading messages...</p>
        </div>
      </div>
    }>
      <WorkerMessagesContent />
    </Suspense>
  );
} 