import { databases, client, COLLECTIONS } from './appwrite';
import { Query } from 'appwrite';
import { notificationService } from './notification-service';
import type { Message } from './types/marketplace';

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  lastMessageTime?: string;
  unreadCount: number;
  participantInfo: Record<string, {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  }>;
}

export interface MessageUpdate {
  type: 'message_created' | 'message_read' | 'conversation_updated';
  message?: Message;
  conversation?: Conversation;
  userId: string;
}

class RealtimeMessagingService {
  private conversations = new Map<string, Conversation>();
  private messages = new Map<string, Message[]>();
  private subscribers = new Map<string, Set<(update: MessageUpdate) => void>>();
  private userCache = new Map<string, any>();
  private realtimeSubscription: (() => void) | null = null;
  private sendingMessages = new Set<string>(); // Prevent duplicate sends

  // Initialize real-time connection
  async initialize(userId: string) {
    if (this.realtimeSubscription) {
      this.realtimeSubscription();
    }

    // Subscribe to message collection changes
    this.realtimeSubscription = client.subscribe(
      `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
      (response) => {
        this.handleRealtimeUpdate(response, userId);
      }
    );

    // Load initial data
    await this.loadUserConversations(userId);
  }

  // Handle real-time updates from Appwrite
  private async handleRealtimeUpdate(response: any, currentUserId: string) {
    if (response.events.includes('databases.*.collections.*.documents.*.create')) {
      const newMessage = response.payload as Message;
      
      // Only process messages involving current user
      if (newMessage.senderId === currentUserId || newMessage.recipientId === currentUserId) {
        await this.processNewMessage(newMessage, currentUserId);
      }
    }
    
    if (response.events.includes('databases.*.collections.*.documents.*.update')) {
      const updatedMessage = response.payload as Message;
      
      if (updatedMessage.senderId === currentUserId || updatedMessage.recipientId === currentUserId) {
        await this.processMessageUpdate(updatedMessage, currentUserId);
      }
    }
  }

  // Process new message
  private async processNewMessage(message: Message, currentUserId: string) {
    const conversationId = message.conversationId;
    
    // Add to messages cache
    if (!this.messages.has(conversationId)) {
      this.messages.set(conversationId, []);
    }
    
    const conversationMessages = this.messages.get(conversationId)!;
    
    // Check for duplicates
    const isDuplicate = conversationMessages.some(m => m.id === message.id);
    if (isDuplicate) return;
    
    conversationMessages.push(message);
    conversationMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Update conversation
    await this.updateConversation(conversationId, message, currentUserId);
    
    // Notify subscribers
    this.notifySubscribers(conversationId, {
      type: 'message_created',
      message,
      userId: currentUserId
    });
  }

  // Process message updates (like read status)
  private async processMessageUpdate(message: Message, currentUserId: string) {
    const conversationId = message.conversationId;
    const conversationMessages = this.messages.get(conversationId);
    
    if (conversationMessages) {
      const index = conversationMessages.findIndex(m => m.id === message.id);
      if (index !== -1) {
        conversationMessages[index] = message;
        
        // Update conversation unread count
        await this.updateConversationUnreadCount(conversationId, currentUserId);
        
        this.notifySubscribers(conversationId, {
          type: 'message_read',
          message,
          userId: currentUserId
        });
      }
    }
  }

  // Load user conversations with optimized queries
  async loadUserConversations(userId: string): Promise<Conversation[]> {
    try {
      // Use better query with conversation grouping
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.MESSAGES,
        [
          Query.or([
            Query.equal('senderId', userId),
            Query.equal('recipientId', userId)
          ]),
          Query.orderDesc('createdAt'),
          Query.limit(200) // Increased limit but still reasonable
        ]
      );

      // Map $id to id for all messages
      const messages = response.documents.map((doc: any) => ({ ...doc, id: doc.$id })) as Message[];
      
      // Group by conversation
      const conversationMap = new Map<string, {
        messages: Message[];
        participants: Set<string>;
        lastMessage?: Message;
      }>();

      for (const message of messages) {
        const convId = message.conversationId;
        
        if (!conversationMap.has(convId)) {
          conversationMap.set(convId, {
            messages: [],
            participants: new Set(),
            lastMessage: undefined
          });
        }

        const conv = conversationMap.get(convId)!;
        conv.messages.push(message);
        conv.participants.add(message.senderId);
        conv.participants.add(message.recipientId);
        
        // Track latest message
        if (!conv.lastMessage || new Date(message.createdAt) > new Date(conv.lastMessage.createdAt)) {
          conv.lastMessage = message;
        }
      }

      // Convert to conversations and load participant info
      const conversations: Conversation[] = [];
      
      for (const [convId, data] of conversationMap) {
        const participantInfo: Record<string, any> = {};
        
        // Load participant info (with caching)
        for (const participantId of data.participants) {
          if (participantId !== userId) {
            participantInfo[participantId] = await this.getUserInfo(participantId);
          }
        }

        const unreadCount = data.messages.filter(m => 
          m.recipientId === userId && !m.isRead
        ).length;

        const conversation: Conversation = {
          id: convId,
          participants: Array.from(data.participants),
          lastMessage: data.lastMessage,
          lastMessageTime: data.lastMessage?.createdAt,
          unreadCount,
          participantInfo
        };

        conversations.push(conversation);
        this.conversations.set(convId, conversation);
        this.messages.set(convId, data.messages.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ));
      }

      return conversations.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });

    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  }

  // Get user info with caching
  private async getUserInfo(userId: string) {
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId);
    }

    try {
      const userInfo = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        userId
      );

      const cachedInfo = {
        id: userId,
        name: userInfo.name || userInfo.displayName || 'User',
        avatar: userInfo.avatar || userInfo.profileImage,
        email: userInfo.email
      };

      this.userCache.set(userId, cachedInfo);
      return cachedInfo;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return {
        id: userId,
        name: 'User',
        avatar: null,
        email: null
      };
    }
  }

  // Send message with deduplication
  async sendMessage(content: string, recipientId: string, senderId: string): Promise<boolean> {
    const messageId = `${senderId}_${recipientId}_${Date.now()}`;
    
    // Prevent duplicate sends
    if (this.sendingMessages.has(messageId)) {
      return false;
    }
    
    try {
      this.sendingMessages.add(messageId);
      
      // Validate IDs
      if (!recipientId || !senderId || recipientId === 'client' || recipientId.length < 10) {
        throw new Error('Invalid recipient or sender ID');
      }

      const conversationId = this.generateConversationId(senderId, recipientId);
      
      // Create message document
      const message = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.MESSAGES,
        'unique()',
        {
          conversationId,
          senderId,
          recipientId,
          content,
          isRead: false,
          createdAt: new Date().toISOString()
        }
      );

      // Create notification for recipient
      await this.createMessageNotification(recipientId, senderId, content);

      // Send email notification to recipient
      try {
        const [senderInfo, recipientInfo] = await Promise.all([
          this.getUserInfo(senderId),
          this.getUserInfo(recipientId)
        ]);

        // Import email service dynamically to avoid circular dependencies
        const { emailService } = await import('./email-service');
        
        await emailService.sendMessageNotification({
          sender: {
            id: senderId,
            name: senderInfo.name,
            email: senderInfo.email
          },
          recipient: {
            id: recipientId,
            name: recipientInfo.name,
            email: recipientInfo.email
          },
          messageContent: content,
          conversationUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/messages?conversation=${conversationId}`
        });

        console.log('📧 Email notification sent to:', recipientInfo.email);
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the message sending if email fails
      }

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    } finally {
      this.sendingMessages.delete(messageId);
    }
  }

  // Create notification with deduplication
  private async createMessageNotification(recipientId: string, senderId: string, content: string) {
    try {
      const senderInfo = await this.getUserInfo(senderId);
      
      // Get recipient user info to determine role-based path
      const recipientInfo = await this.getUserInfo(recipientId);
      const messagesPath = recipientInfo.role === 'worker' 
        ? `/worker/messages?sender=${senderId}`
        : `/client/messages?sender=${senderId}`;
      
      await notificationService.createNotification({
        userId: recipientId,
        title: `New message from ${senderInfo.name}`,
        message: content.length > 50 ? `${content.substring(0, 50)}...` : content,
        type: 'info',
        senderId: senderId,
        recipientId: recipientId,
        actionUrl: messagesPath
      });
    } catch (error) {
      console.error('Error creating message notification:', error);
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, userId: string) {
    try {
      const messages = this.messages.get(conversationId) || [];
      const unreadMessages = messages.filter(m => m.recipientId === userId && !m.isRead);

      // Batch update unread messages
      const updatePromises = unreadMessages.map(message =>
        databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.MESSAGES,
          message.id,
          { 
            isRead: true,
            readAt: new Date().toISOString()
          }
        )
      );

      await Promise.all(updatePromises);

      // Update local cache
      unreadMessages.forEach(message => {
        message.isRead = true;
        (message as any).readAt = new Date().toISOString();
      });

      // Update conversation unread count
      await this.updateConversationUnreadCount(conversationId, userId);

    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Update conversation
  private async updateConversation(conversationId: string, message: Message, currentUserId: string) {
    let conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      // Create new conversation
      const otherUserId = message.senderId === currentUserId ? message.recipientId : message.senderId;
      const otherUserInfo = await this.getUserInfo(otherUserId);
      
      conversation = {
        id: conversationId,
        participants: [message.senderId, message.recipientId],
        lastMessage: message,
        lastMessageTime: message.createdAt,
        unreadCount: message.recipientId === currentUserId ? 1 : 0,
        participantInfo: {
          [otherUserId]: otherUserInfo
        }
      };
    } else {
      // Update existing conversation
      conversation.lastMessage = message;
      conversation.lastMessageTime = message.createdAt;
      
      if (message.recipientId === currentUserId && !message.isRead) {
        conversation.unreadCount++;
      }
    }

    this.conversations.set(conversationId, conversation);
  }

  // Update conversation unread count
  private async updateConversationUnreadCount(conversationId: string, userId: string) {
    const conversation = this.conversations.get(conversationId);
    const messages = this.messages.get(conversationId);
    
    if (conversation && messages) {
      conversation.unreadCount = messages.filter(m => 
        m.recipientId === userId && !m.isRead
      ).length;
      
      this.notifySubscribers(conversationId, {
        type: 'conversation_updated',
        conversation,
        userId
      });
    }
  }

  // Generate consistent conversation ID
  private generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  // Subscribe to conversation updates
  subscribe(conversationId: string, callback: (update: MessageUpdate) => void) {
    if (!this.subscribers.has(conversationId)) {
      this.subscribers.set(conversationId, new Set());
    }
    this.subscribers.get(conversationId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(conversationId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(conversationId);
        }
      }
    };
  }

  // Notify subscribers
  private notifySubscribers(conversationId: string, update: MessageUpdate) {
    const subscribers = this.subscribers.get(conversationId);
    if (subscribers) {
      subscribers.forEach(callback => callback(update));
    }

    // Also notify global subscribers (for conversation list updates)
    const globalSubscribers = this.subscribers.get('*');
    if (globalSubscribers) {
      globalSubscribers.forEach(callback => callback(update));
    }
  }

  // Get conversation messages
  getConversationMessages(conversationId: string): Message[] {
    return this.messages.get(conversationId) || [];
  }

  // Get conversations
  getConversations(): Conversation[] {
    return Array.from(this.conversations.values()).sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });
  }

  // Delete a conversation and all its messages
  async deleteConversation(conversationId: string, userId: string) {
    try {
      // Find all messages in the conversation
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.MESSAGES,
        [
          Query.equal('conversationId', conversationId),
          Query.limit(200)
        ]
      );
      // Delete each message document
      const deletePromises = response.documents.map((msg: any) =>
        databases.deleteDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.MESSAGES,
          msg.$id
        )
      );
      await Promise.all(deletePromises);
      // Remove from local cache
      this.conversations.delete(conversationId);
      this.messages.delete(conversationId);
      // Notify global subscribers (for UI update)
      this.notifySubscribers('*', {
        type: 'conversation_updated',
        conversation: undefined,
        userId
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  // Cleanup
  cleanup() {
    if (this.realtimeSubscription) {
      this.realtimeSubscription();
      this.realtimeSubscription = null;
    }
    
    this.conversations.clear();
    this.messages.clear();
    this.subscribers.clear();
    this.userCache.clear();
    this.sendingMessages.clear();
  }
}

export const realtimeMessagingService = new RealtimeMessagingService(); 