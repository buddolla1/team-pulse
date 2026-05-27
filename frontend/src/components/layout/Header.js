import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { LockReset, Visibility, VisibilityOff } from '@mui/icons-material';
import { toast } from 'react-toastify';
import authService from '../../services/authService';
import SynchronyLogo from '../../assets/SynchronyLogo';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();
  const [anchorEl, setAnchorEl] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const open = Boolean(anchorEl);

  const handleLogout = async () => {
    setAnchorEl(null);
    await authService.logout();
    navigate('/');
  };

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setLoadingProfile(true);
    setProfileError('');

    try {
      const response = await authService.getProfile();
      const data = response?.data || response;
      setProfile(data || null);
    } catch (error) {
      setProfileError(error.response?.data?.message || 'Failed to load profile.');
    } finally {
      setLoadingProfile(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (open && !profile && isAuthenticated) {
      loadProfile();
    }
  }, [open, profile, isAuthenticated, loadProfile]);

  const handleOpenProfile = (event) => {
    setAnchorEl(event.currentTarget);
    setPasswordError('');
  };

  const handleCloseProfile = () => {
    setAnchorEl(null);
    setPasswordError('');
    resetPasswordForm();
  };

  const handlePasswordChange = (field) => (event) => {
    setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmitPassword = async (event) => {
    event.preventDefault();
    setPasswordError('');

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password must match.');
      return;
    }

    try {
      setChangingPassword(true);
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Password updated. Please sign in again.');
      resetPasswordForm();
      setAnchorEl(null);
      await authService.logout();
      navigate('/');
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Unable to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Get user initials from full name
  const getInitials = (fullName) => {
    if (!fullName) return 'U';
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    const firstInitial = names[0].charAt(0).toUpperCase();
    const lastInitial = names[names.length - 1].charAt(0).toUpperCase();
    return firstInitial + lastInitial;
  };

  const accessList = useMemo(() => {
    const accesses = profile?.accesses || profile?.permissions || [];
    return Array.isArray(accesses) ? accesses : [];
  }, [profile]);

  // Don't show header on admin login page
  if (location.pathname === '/') {
    return null;
  }

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-brand">
          <SynchronyLogo width="180" height="40" />
        </div>
        {isAuthenticated && (
          <div className="header-user-section">
            <button type="button" onClick={handleOpenProfile} className="header-user-info header-user-button">
              <div className="header-user-avatar">
                {getInitials(currentUser?.full_name)}
              </div>
              <span className="header-user-name">{currentUser?.full_name}</span>
            </button>
            <button onClick={handleLogout} className="header-logout-btn">
              Logout
            </button>
          </div>
        )}
      </div>

      <Dialog
        open={open}
        onClose={handleCloseProfile}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          className: 'user-profile-dialog-paper'
        }}
      >
        <DialogTitle className="user-profile-dialog-title">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box className="user-profile-dialog-avatar">
              {getInitials(profile?.full_name || currentUser?.full_name)}
            </Box>
            <Box className="user-profile-dialog-identity">
              <Typography variant="subtitle1" fontWeight={700} noWrap className="user-profile-dialog-name">
                {profile?.full_name || currentUser?.full_name || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap className="user-profile-dialog-username">
                {profile?.username || currentUser?.username || '-'}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers className="user-profile-dialog-content">
          <Stack spacing={1.5}>
            {loadingProfile && (
              <Typography variant="body2" color="text.secondary">
                Loading profile...
              </Typography>
            )}

            {profileError && <Alert severity="error">{profileError}</Alert>}

            {!loadingProfile && !profileError && (
              <>
                <Divider />
                <Stack spacing={1}>
                  <Typography variant="overline" color="text.secondary">
                    Profile
                  </Typography>
                  <Stack spacing={0.75}>
                    <Typography variant="body2">
                      <strong>Username:</strong> {profile?.username || currentUser?.username || '-'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Role:</strong> {profile?.role_display_name || profile?.role_name || currentUser?.role_display_name || currentUser?.role_name || '-'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Email:</strong> {profile?.email || currentUser?.email || '-'}
                    </Typography>
                  </Stack>
                </Stack>

                <Stack spacing={1}>
                  <Typography variant="overline" color="text.secondary">
                    Accesses
                  </Typography>
                  {accessList.length > 0 ? (
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                      {accessList.map((access) => (
                        <Chip
                          key={access}
                          label={access}
                          size="small"
                          variant="outlined"
                          sx={{ borderRadius: 1 }}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No accesses available.
                    </Typography>
                  )}
                </Stack>

                <Divider />

                <Box component="form" onSubmit={handleSubmitPassword}>
                  <Stack spacing={1.5}>
                    <Typography variant="overline" color="text.secondary">
                      Change Password
                    </Typography>

                    {passwordError && <Alert severity="error">{passwordError}</Alert>}

                    <TextField
                      label="Old Password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange('currentPassword')}
                      size="small"
                      fullWidth
                      autoComplete="current-password"
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            edge="end"
                            onClick={() => setShowCurrentPassword((value) => !value)}
                            onMouseDown={(event) => event.preventDefault()}
                            size="small"
                          >
                            {showCurrentPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        )
                      }}
                    />

                    <TextField
                      label="New Password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange('newPassword')}
                      size="small"
                      fullWidth
                      autoComplete="new-password"
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            edge="end"
                            onClick={() => setShowNewPassword((value) => !value)}
                            onMouseDown={(event) => event.preventDefault()}
                            size="small"
                          >
                            {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        )
                      }}
                    />

                    <TextField
                      label="Re-enter New Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange('confirmPassword')}
                      size="small"
                      fullWidth
                      autoComplete="new-password"
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            edge="end"
                            onClick={() => setShowConfirmPassword((value) => !value)}
                            onMouseDown={(event) => event.preventDefault()}
                            size="small"
                          >
                            {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        )
                      }}
                    />

                    <Stack direction="row" spacing={1} justifyContent="space-between">
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<LockReset />}
                        disabled={changingPassword}
                        sx={{ flex: 1 }}
                      >
                        {changingPassword ? 'Saving...' : 'Update Password'}
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
