import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Box,
  Card,
  CardContent,
  CardMedia,
  Avatar,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Pagination,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Badge
} from '@mui/material';
import {
  Person,
  CheckCircle,
  Cancel,
  Send,
  Close,
  VerifiedUser,
  Star,
  LocationOn,
  Work,
  School
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import interestService from '../services/interestService';
import { getImageUrl } from '../utils/imageUrl';

const Interests = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [respondDialog, setRespondDialog] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sentStatusFilter, setSentStatusFilter] = useState('all');

  const tabLabels = ['Received Interests', 'Sent Interests'];

  // Fetch received interests
  const { 
    data: receivedData, 
    isLoading: loadingReceived,
    refetch: refetchReceived
  } = useQuery(
    ['receivedInterests', currentPage],
    () => interestService.getReceivedInterests({ page: currentPage }),
    {
      enabled: activeTab === 0,
      keepPreviousData: true,
      staleTime: 0, // Always fetch fresh data
      cacheTime: 0, // Don't cache
    }
  );

  // Fetch sent interests
  const { 
    data: sentData, 
    isLoading: loadingSent,
    refetch: refetchSent
  } = useQuery(
    ['sentInterests', currentPage, sentStatusFilter],
    () => interestService.getSentInterests({ 
      page: currentPage,
      status: sentStatusFilter !== 'all' ? sentStatusFilter : undefined 
    }),
    {
      enabled: activeTab === 1,
      keepPreviousData: true,
      staleTime: 0, // Always fetch fresh data
      cacheTime: 0, // Don't cache
    }
  );

  // Fetch interest stats
  const { data: stats } = useQuery(
    ['interestStats'],
    interestService.getInterestStats,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Respond to interest mutation
  const respondMutation = useMutation(
    ({ interestId, status }) => interestService.respondToInterest(interestId, status),
    {
      onSuccess: (data) => {
        toast.success(data.message);
        setRespondDialog(false);
        setSelectedInterest(null);
        queryClient.invalidateQueries(['receivedInterests']);
        queryClient.invalidateQueries(['sentInterests']);
        queryClient.invalidateQueries('interestStats');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to respond to interest');
      }
    }
  );

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setCurrentPage(1);
  };

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const handleRespondInterest = (interest, action) => {
    setSelectedInterest(interest);
    setResponseMessage('');
    setRespondDialog(true);
  };

  const confirmResponse = (status) => {
    respondMutation.mutate({
      interestId: selectedInterest.id,
      status,
      message: responseMessage.trim()
    });
  };

  const InterestCard = ({ interest, type }) => {
    const user = type === 'received' ? interest.sender : interest.receiver;
    const isPending = interest.status === 'PENDING';
    const isAccepted = interest.status === 'ACCEPTED';
    const isRejected = interest.status === 'REJECTED';

    return (
      <Card style={{ marginBottom: '1rem', border: isPending ? '2px solid #FF9800' : '1px solid #E0E0E0' }}>
        <CardContent>
          {/* Header Section - Clear indication of who sent/received */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: type === 'received' ? '#E3F2FD' : '#F3E5F5', borderRadius: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold" color={type === 'received' ? '#1565C0' : '#7B1FA2'}>
              {type === 'received' ? (
                <>📥 Interest Received From: <strong>{user.firstName} {user.lastName}</strong></>
              ) : (
                <>📤 Interest Sent To: <strong>{user.firstName} {user.lastName}</strong></>
              )}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Interest ID: {interest.id} • {format(new Date(interest.createdAt), 'MMM dd, yyyy hh:mm a')}
            </Typography>
          </Box>

          <Grid container spacing={2} alignItems="flex-start">
            {/* Profile Photo and Basic Info */}
            <Grid item xs={12} sm={3} sx={{ textAlign: 'center' }}>
              {user.profilePhoto ? (
                <Avatar
                  src={getImageUrl(user.profilePhoto)}
                  alt={`${user.firstName} ${user.lastName}`}
                  style={{ width: 100, height: 100, margin: '0 auto', border: '3px solid #8B5CF6' }}
                />
              ) : (
                <Avatar style={{ width: 100, height: 100, margin: '0 auto', bgcolor: '#8B5CF6' }}>
                  <Person style={{ fontSize: 50 }} />
                </Avatar>
              )}
              <Box mt={1}>
                {user.isVerified && (
                  <Chip icon={<VerifiedUser />} label="Verified" size="small" color="success" sx={{ mr: 0.5 }} />
                )}
                {user.isPremium && (
                  <Chip icon={<Star />} label="Premium" size="small" color="warning" />
                )}
              </Box>
            </Grid>

            {/* Profile Details */}
            <Grid item xs={12} sm={6}>
              <Typography variant="h6" gutterBottom>
                {user.firstName} {user.lastName}
                {user.age && <span style={{ color: '#666', fontWeight: 'normal' }}> • {user.age} years</span>}
                {user.gender && <span style={{ color: '#666', fontWeight: 'normal' }}> • {user.gender}</span>}
              </Typography>
              
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocationOn style={{ fontSize: 18, color: '#8B5CF6' }} />
                    <Typography variant="body2">
                      <strong>Location:</strong> {user.city || 'Not specified'}{user.state ? `, ${user.state}` : ''}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Work style={{ fontSize: 18, color: '#8B5CF6' }} />
                    <Typography variant="body2">
                      <strong>Profession:</strong> {user.profession || 'Not specified'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <School style={{ fontSize: 18, color: '#8B5CF6' }} />
                    <Typography variant="body2">
                      <strong>Education:</strong> {user.education || 'Not specified'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Message */}
              {interest.message && (
                <Box mt={2} p={1.5} bgcolor="#F5F5F5" borderRadius={1}>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Message:</strong> "{interest.message}"
                  </Typography>
                </Box>
              )}
            </Grid>

            {/* Status and Actions */}
            <Grid item xs={12} sm={3}>
              <Box textAlign="center" sx={{ p: 1.5, bgcolor: '#FAFAFA', borderRadius: 1 }}>
                <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                  Status
                </Typography>
                <Chip
                  label={interest.status}
                  color={
                    isPending ? 'warning' :
                    isAccepted ? 'success' : 'error'
                  }
                  size="medium"
                  sx={{ mb: 2, fontWeight: 'bold', fontSize: '0.9rem' }}
                />
                
                {type === 'received' && isPending && (
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => handleRespondInterest(interest, 'accept')}
                      disabled={respondMutation.isLoading}
                      fullWidth
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Cancel />}
                      onClick={() => handleRespondInterest(interest, 'reject')}
                      disabled={respondMutation.isLoading}
                      fullWidth
                    >
                      Decline
                    </Button>
                  </Box>
                )}

                {type === 'sent' && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    {isPending && 'Waiting for response...'}
                    {isAccepted && '🎉 Your interest was accepted!'}
                    {isRejected && 'This interest was declined'}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const currentData = activeTab === 0 ? receivedData : sentData;
  const currentLoading = activeTab === 0 ? loadingReceived : loadingSent;

  return (
    <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
      <Typography variant="h4" gutterBottom style={{ color: '#8B5CF6', fontWeight: 'bold' }}>
        Interests
      </Typography>

      {/* Interest Stats */}
      {stats && (
        <Grid container spacing={2} style={{ marginBottom: '2rem' }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper style={{ padding: '1rem', textAlign: 'center', bgcolor: '#FFF3E0', border: '2px solid #FF9800' }}>
              <Typography variant="h4" color="#FF9800">
                {stats.stats.received.pending}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                📥 Pending Received
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Awaiting your response
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper style={{ padding: '1rem', textAlign: 'center', bgcolor: '#E8F5E9', border: '2px solid #4CAF50' }}>
              <Typography variant="h4" color="#4CAF50">
                {stats.stats.received.accepted}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ✅ Accepted
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Interests you accepted
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper style={{ padding: '1rem', textAlign: 'center', bgcolor: '#FFEBEE', border: '2px solid #F44336' }}>
              <Typography variant="h4" color="#F44336">
                {stats.stats.received.rejected}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ❌ Declined
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Interests you declined
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper style={{ padding: '1rem', textAlign: 'center', bgcolor: '#E3F2FD', border: '2px solid #2196F3' }}>
              <Typography variant="h4" color="#2196F3">
                {stats.stats.sent.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                📤 Sent by You
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Total interests sent
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab 
            icon={<Badge badgeContent={stats?.stats.received.pending || 0} color="error" showZero={false}>
              <Person />
            </Badge>}
            label={`Received Interests (${stats?.stats.received.total || 0})`}
          />
          <Tab 
            icon={<Send />}
            label={`Sent Interests (${stats?.stats.sent.total || 0})`}
          />
        </Tabs>

        {/* Sent Interests Filter */}
        {activeTab === 1 && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Filter by Status:
            </Typography>
            <Box display="flex" gap={1}>
              {['all', 'pending', 'accepted', 'rejected'].map((status) => (
                <Chip
                  key={status}
                  label={status.charAt(0).toUpperCase() + status.slice(1)}
                  onClick={() => {
                    setSentStatusFilter(status);
                    setCurrentPage(1);
                  }}
                  color={sentStatusFilter === status ? 'primary' : 'default'}
                  variant={sentStatusFilter === status ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}

        <div style={{ padding: '2rem' }}>
          {currentLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={60} />
            </Box>
          ) : currentData?.interests?.length > 0 ? (
            <>
              {currentData.interests.map((interest) => (
                <InterestCard
                  key={interest.id}
                  interest={interest}
                  type={activeTab === 0 ? 'received' : 'sent'}
                />
              ))}

              {/* Pagination */}
              {currentData.pagination.totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={currentData.pagination.totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          ) : (
            <Box textAlign="center" py={4}>
              {activeTab === 0 ? (
                <>
                  <Person style={{ fontSize: 80, color: '#E0E0E0' }} />
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    No Received Interests
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    When someone sends you an interest, it will appear here.
                    <br />You can then Accept or Decline their interest.
                  </Typography>
                </>
              ) : (
                <>
                  <Send style={{ fontSize: 80, color: '#E0E0E0' }} />
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    No Sent Interests
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    When you send an interest to someone, it will appear here.
                    <br />Search for profiles and send interests to connect!
                  </Typography>
                </>
              )}
            </Box>
          )}
        </div>
      </Paper>

      {/* Response Dialog */}
      <Dialog 
        open={respondDialog} 
        onClose={() => setRespondDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Respond to Interest
            </Typography>
            <IconButton onClick={() => setRespondDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" paragraph>
            From: <strong>{selectedInterest?.sender?.firstName} {selectedInterest?.sender?.lastName}</strong>
          </Typography>
          
          {selectedInterest?.message && (
            <Typography variant="body2" color="textSecondary" paragraph>
              "{selectedInterest.message}"
            </Typography>
          )}

          <TextField
            fullWidth
            label="Optional Message"
            multiline
            rows={3}
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            placeholder="Add a personal message (optional)"
            variant="outlined"
            style={{ marginTop: '1rem' }}
          />
        </DialogContent>

        <DialogActions>
          <Button 
            onClick={() => setRespondDialog(false)} 
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => confirmResponse('REJECTED')} 
            color="secondary"
            variant="outlined"
            disabled={respondMutation.isLoading}
          >
            Reject
          </Button>
          <Button 
            onClick={() => confirmResponse('ACCEPTED')} 
            color="primary"
            variant="contained"
            disabled={respondMutation.isLoading}
            startIcon={respondMutation.isLoading ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            Accept
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Interests;