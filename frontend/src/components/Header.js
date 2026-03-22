import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Menu, MenuItem, Badge, Chip, Divider } from '@mui/material';
import { AccountCircle, Search, Message, FavoriteBorder, Verified, AdminPanelSettings, WorkspacePremium, Star, Upgrade, Home, Info, ContactMail } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { normalizeTier, getTierBadgeColor, getTierDisplayName, canUpgrade, isPaidTier, TIER_VALUES } from '../utils/subscription';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState(null);

  // Normalize subscription tier from database
  const subscriptionTier = normalizeTier(user?.subscriptionTier || user?.subscription?.plan);
  
  // Check if user is premium (PREMIUM, PRO, ELITE - not BASIC)
  const isPremium = subscriptionTier === TIER_VALUES.PREMIUM || 
                    subscriptionTier === TIER_VALUES.PRO || 
                    subscriptionTier === TIER_VALUES.ELITE;

  // Simple admin check - only vijayalakshmijayakumar45@gmail.com is the admin
  const isAdmin = user?.email === 'vijayalakshmijayakumar45@gmail.com';

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <AppBar position="fixed" style={{ backgroundColor: '#8B5CF6' }}>
      <Toolbar>
        <Typography 
          variant="h6" 
          style={{ flexGrow: 1, cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          💍 Vijayalakshmi Boyar Matrimony
        </Typography>

        {/* Navigation Menu - Available for all users */}
        <Button 
          color="inherit" 
          startIcon={<Home />}
          onClick={() => navigate('/')}
          style={{ backgroundColor: isActive('/') ? 'rgba(255,255,255,0.2)' : 'transparent' }}
        >
          Home
        </Button>
        <Button 
          color="inherit" 
          startIcon={<Search />}
          onClick={() => navigate('/search')}
          style={{ backgroundColor: isActive('/search') ? 'rgba(255,255,255,0.2)' : 'transparent' }}
        >
          Search Profiles
        </Button>
        <Button 
          color="inherit" 
          startIcon={<Info />}
          onClick={() => navigate('/about')}
          style={{ backgroundColor: isActive('/about') ? 'rgba(255,255,255,0.2)' : 'transparent' }}
        >
          About
        </Button>
        <Button 
          color="inherit" 
          startIcon={<ContactMail />}
          onClick={() => navigate('/contact')}
          style={{ backgroundColor: isActive('/contact') ? 'rgba(255,255,255,0.2)' : 'transparent' }}
        >
          Contact
        </Button>

        {user ? (
          <Box display="flex" alignItems="center" gap={2}>
            {/* Plan Badge - Shows for all users */}
            <Chip
              icon={isPaidTier(subscriptionTier) ? <Star style={{ color: getTierBadgeColor(subscriptionTier) }} /> : <WorkspacePremium style={{ color: '#9E9E9E' }} />}
              label={getTierDisplayName(subscriptionTier)}
              size="small"
              style={{ 
                backgroundColor: getTierBadgeColor(subscriptionTier),
                color: subscriptionTier === 'FREE' ? '#fff' : '#000',
                fontWeight: 'bold'
              }}
            />
            {/* Show Upgrade button for users who can upgrade (not ELITE) */}
            {canUpgrade(subscriptionTier) && (
              <Button
                variant="contained"
                size="small"
                startIcon={<Upgrade />}
                onClick={() => navigate('/subscription')}
                style={{ 
                  backgroundColor: '#FFD700',
                  color: '#000',
                  fontWeight: 'bold'
                }}
              >
                Upgrade
              </Button>
            )}
            <Button 
              color="inherit" 
              startIcon={<Search />}
              onClick={() => navigate('/search')}
              style={{ backgroundColor: isActive('/search') ? 'rgba(255,255,255,0.2)' : 'transparent' }}
            >
              Search
            </Button>
            <Button 
              color="inherit" 
              startIcon={<FavoriteBorder />}
              onClick={() => navigate('/interests')}
              style={{ backgroundColor: isActive('/interests') ? 'rgba(255,255,255,0.2)' : 'transparent' }}
            >
              Interests
            </Button>
            <Button 
              color="inherit" 
              startIcon={<Message />}
              onClick={() => navigate('/messages')}
              style={{ backgroundColor: isActive('/messages') ? 'rgba(255,255,255,0.2)' : 'transparent' }}
            >
              Messages
            </Button>
            
            <IconButton 
              color="inherit" 
              onClick={handleMenuOpen}
              style={{ backgroundColor: anchorEl ? 'rgba(255,255,255,0.2)' : 'transparent' }}
            >
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              {/* Current Plan Display in Dropdown */}
              <Box px={2} py={1} display="flex" alignItems="center" gap={1}>
                <WorkspacePremium fontSize="small" style={{ color: getTierBadgeColor(subscriptionTier) }} />
                <Typography variant="body2" style={{ fontWeight: 'bold' }}>
                  Plan: {getTierDisplayName(subscriptionTier)}
                </Typography>
              </Box>
              {!isPremium && (
                <MenuItem onClick={() => { navigate('/subscription'); handleMenuClose(); }}>
                  <Upgrade fontSize="small" style={{ marginRight: 8, color: '#FFD700' }} />
                  Upgrade Plan
                </MenuItem>
              )}
              <Divider />
              <MenuItem onClick={() => { navigate('/dashboard'); handleMenuClose(); }}>
                Dashboard
              </MenuItem>
              <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
                My Profile
              </MenuItem>
              <MenuItem onClick={() => { navigate('/verification'); handleMenuClose(); }}>
                <Verified fontSize="small" style={{ marginRight: 8 }} />
                Verification
              </MenuItem>
              {isAdmin && (
                <MenuItem onClick={() => { navigate('/admin'); handleMenuClose(); }}>
                  <AdminPanelSettings fontSize="small" style={{ marginRight: 8 }} />
                  Admin Panel
                </MenuItem>
              )}
              <MenuItem onClick={handleLogout}>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box>
            <Button color="inherit" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button color="inherit" variant="outlined" onClick={() => navigate('/register')}>
              Register
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;