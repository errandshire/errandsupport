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
}

export default function WorkerMessagesPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
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

    fetchConversations();
    setupRealtimeSubscription();
  }, [loading, isAuthenticated, user, router]);

  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Fetch all messages where user is either sender or recipient
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.MESSAGES,
        [
          Query.or([
            Query.equal('senderId', user.$id),
            Query.equal('recipientId', user.$id)
          ]),
          Query.orderDesc('createdAt'),
          Query.limit(100)
        ]
      );

      const messages = response.documents as unknown as Message[];
      
      // Group messages by conversation
      const conversationMap = new Map<string, Conversation>();
      
      for (const message of messages) {
        const otherUserId = message.senderId === user.$id ? message.recipientId : message.senderId;
        const conversationId = message.conversationId;
        
        if (!conversationMap.has(conversationId)) {
          // Fetch other user's info
          try {
            const userInfo = await databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              COLLECTIONS.USERS,
              otherUserId
            );
            
            conversationMap.set(conversationId, {
              id: conversationId,
              clientId: otherUserId,
              clientName: userInfo.name,
              clientAvatar: userInfo.avatar || '',
              lastMessage: message.content,
              lastMessageTime: new Date(message.createdAt).toLocaleString(),
              unreadCount: 0,
              isOnline: false, // Would need a separate online status system
              messages: []
            });
          } catch (error) {
            console.error('Error fetching user info:', error);
          }
        }
        
        const conversation = conversationMap.get(conversationId);
        if (conversation) {
          conversation.messages.push(message);
          
          // Update unread count
          if (message.senderId !== user.$id && !message.isRead) {
            conversation.unreadCount++;
          }
          
          // Update last message if this is the most recent
          if (new Date(message.createdAt) > new Date(conversation.lastMessageTime)) {
            conversation.lastMessage = message.content;
            conversation.lastMessageTime = new Date(message.createdAt).toLocaleString();
          }
        }
      }
      
      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const unsubscribe = client.subscribe(
      `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
      (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          const newMessage = response.payload as Message;
          
          // Check if this message involves the current user
          if (newMessage.senderId === user.$id || newMessage.recipientId === user.$id) {
            fetchConversations(); // Refresh conversations
          }
        }
      }
    );

    return () => unsubscribe();
  };

  const handleConversationClick = (conversation: Conversation) => {
    setMessageRecipient({
      id: conversation.clientId,
      name: conversation.clientName,
      email: '' // Email would need to be fetched separately
    });
    setShowMessageModal(true);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      

      <div className="flex-1 flex flex-col lg:ml-0">
        
        
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
              {/* Conversations List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Conversations</CardTitle>
                  <CardDescription>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
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
                      filteredConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={cn(
                            "flex items-center space-x-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100",
                            selectedConversation?.id === conversation.id && "bg-primary-50"
                          )}
                          onClick={() => handleConversationClick(conversation)}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conversation.clientAvatar} alt={conversation.clientName} />
                            <AvatarFallback>
                              {conversation.clientName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-gray-900 truncate">
                                {conversation.clientName}
                              </h3>
                              <div className="flex items-center space-x-2">
                                {conversation.unreadCount > 0 && (
                                  <Badge className="bg-red-500 text-white text-xs">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                                <span className="text-xs text-gray-500">
                                  {conversation.lastMessageTime}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 truncate mt-1">
                              {conversation.lastMessage}
                            </p>
                          </div>
                        </div>
                      ))
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
        
      </div>

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