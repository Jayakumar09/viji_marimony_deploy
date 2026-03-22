import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  CircularProgress,
  Alert,
  Divider,
  Button
} from '@mui/material';
import {
  Send,
  Person,
  ArrowBack,
  CheckCircle
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import messageService from '../services/messageService';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/imageUrl';

const Messages = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [conversations, setConversations] = useState([]);
  const messagesEndRef = useRef(null);
  const initialLoadRef = useRef(true);

  // Fetch conversations
  const { 
    data: conversationsData, 
    isLoading: loadingConversations,
    refetch: refetchConversations
  } = useQuery(
    ['conversations'],
    messageService.getConversations,
    {
      refetchInterval: 30000,
      onSuccess: (data) => {
        setConversations(data.conversations);
        // Auto-select first conversation or matching one on initial load
        if (initialLoadRef.current && data.conversations.length > 0) {
          initialLoadRef.current = false;
          const userParam = searchParams.get('user');
          if (userParam) {
            const matchingConv = data.conversations.find(c => c.userId === userParam);
            setSelectedConversationId(matchingConv?.userId || data.conversations[0].userId);
          } else {
            setSelectedConversationId(data.conversations[0].userId);
          }
        }
      }
    }
  );

  const selectedConversation = conversations.find(c => c.userId === selectedConversationId);

  // Fetch messages for selected conversation
  const { 
    data: messagesData, 
    isLoading: loadingMessages,
    refetch: refetchMessages
  } = useQuery(
    ['messages', selectedConversationId],
    () => selectedConversationId ? messageService.getMessages(selectedConversationId) : null,
    {
      enabled: !!selectedConversationId,
      refetchInterval: 10000,
    }
  );

  // Send message mutation
  const sendMessageMutation = useMutation(
    ({ receiverId, content }) => messageService.sendMessage(receiverId, content),
    {
      onSuccess: (data) => {
        setMessageInput('');
        queryClient.invalidateQueries(['messages', selectedConversationId]);
        queryClient.invalidateQueries('conversations');
        toast.success('Message sent');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to send message');
      }
    }
  );

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  const handleSendMessage = () => {
    if (messageInput.trim() && selectedConversationId) {
      sendMessageMutation.mutate({
        receiverId: selectedConversationId,
        content: messageInput.trim()
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getTotalUnreadCount = () => {
    return conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
  };

  if (loadingConversations) {
    return (
      <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
      <Typography variant="h4" gutterBottom style={{ color: '#8B5CF6', fontWeight: 'bold' }}>
        Messages
        {getTotalUnreadCount() > 0 && (
          <Badge 
            badgeContent={getTotalUnreadCount()} 
            color="secondary" 
            style={{ marginLeft: '1rem' }}
          >
            <span></span>
          </Badge>
        )}
      </Typography>

      <Box height="70vh" display="flex" gap={2}>
        {/* Conversations List */}
        <Paper style={{ width: '350px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Box p={2} borderBottom="1px solid #e0e0e0">
            <Typography variant="h6">Conversations</Typography>
          </Box>
          
          {conversations.length > 0 ? (
            <List style={{ flex: 1, overflow: 'auto', padding: 0 }}>
              {conversations.map((conversation) => (
                <ListItem
                  key={conversation.userId}
                  button
                  selected={selectedConversationId === conversation.userId}
                  onClick={() => setSelectedConversationId(conversation.userId)}
                  style={{
                    backgroundColor: selectedConversationId === conversation.userId ? '#f5f5f5' : 'transparent'
                  }}
                >
                  <ListItemAvatar>
                    <Badge badgeContent={conversation.unreadCount || 0} color="secondary">
                      {conversation.profilePhoto ? (
                        <Avatar src={getImageUrl(conversation.profilePhoto)} />
                      ) : (
                        <Avatar>
                          <Person />
                        </Avatar>
                      )}
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" noWrap>
                          {conversation.firstName} {conversation.lastName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {format(new Date(conversation.lastMessageTime), 'MMM dd')}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" color="textSecondary" noWrap>
                          {conversation.message_type === 'sent' && (
                            <span>You: </span>
                          )}
                          {conversation.lastMessage}
                        </Typography>
                        {conversation.isRead && conversation.message_type === 'sent' && (
                          <CheckCircle style={{ fontSize: 12, color: '#4CAF50' }} />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              justifyContent="center" 
              height="100%"
              p={2}
              textAlign="center"
            >
              <Send style={{ fontSize: 60, color: '#E0E0E0' }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No conversations yet
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Accept interests to start messaging
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => navigate('/interests')}
                style={{ marginTop: '1rem' }}
              >
                View Interests
              </Button>
            </Box>
          )}
        </Paper>

        {/* Messages Area */}
        {selectedConversation ? (
          <Paper style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box p={2} borderBottom="1px solid #e0e0e0" display="flex" alignItems="center" gap={2}>
              {selectedConversation.profilePhoto ? (
                <Avatar src={getImageUrl(selectedConversation.profilePhoto)} />
              ) : (
                <Avatar>
                  <Person />
                </Avatar>
              )}
              <Box>
                <Typography variant="h6">
                  {selectedConversation.firstName} {selectedConversation.lastName}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedConversation.unreadCount > 0 
                    ? `${selectedConversation.unreadCount} unread messages`
                    : 'Active now'
                  }
                </Typography>
              </Box>
            </Box>

            {/* Messages List */}
            <Box flex={1} overflow="auto" p={2}>
              {loadingMessages ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : messagesData?.messages?.length > 0 ? (
                <>
                  {messagesData.messages.map((message) => (
                    <Box key={message.id} mb={2}>
                      <Box
                        display="flex"
                        justifyContent={message.sender.id === selectedConversation.userId ? 'flex-start' : 'flex-end'}
                      >
                        <Box
                          maxWidth="70%"
                          p={1.5}
                          borderRadius={2}
                          bgcolor={
                            message.sender.id === selectedConversation.userId
                              ? '#f0f0f0'
                              : '#8B5CF6'
                          }
                          color={
                            message.sender.id === selectedConversation.userId
                              ? 'text.primary'
                              : 'white'
                          }
                        >
                          <Typography variant="body2">
                            {message.content}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            display="block"
                            style={{
                              marginTop: '4px',
                              opacity: 0.7
                            }}
                          >
                            {format(new Date(message.createdAt), 'hh:mm a')}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <Box 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center" 
                  height="100%"
                  textAlign="center"
                >
                  <Typography variant="body2" color="textSecondary">
                    Start a conversation with {selectedConversation.firstName}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Message Input */}
            <Box p={2} borderTop="1px solid #e0e0e0">
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={sendMessageMutation.isLoading}
                  multiline
                  maxRows={3}
                />
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isLoading || !messageInput.trim()}
                  style={{ alignSelf: 'flex-end' }}
                >
                  {sendMessageMutation.isLoading ? (
                    <CircularProgress size={24} />
                  ) : (
                    <Send />
                  )}
                </IconButton>
              </Box>
            </Box>
          </Paper>
        ) : (
          <Paper 
            style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <Box textAlign="center">
              <Send style={{ fontSize: 80, color: '#E0E0E0' }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Select a conversation
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Choose a conversation from the list to start messaging
              </Typography>
            </Box>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Messages;