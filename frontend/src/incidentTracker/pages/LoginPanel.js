import React, { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useIncidentAuth } from '../context/AuthContext';

export default function LoginPanel() {
  const { login } = useIncidentAuth();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      username: 'admin-test',
      password: 'admin123',
    },
  });
  const [error, setError] = useState('');

  const onSubmit = async (values) => {
    try {
      setError('');
      await login(values);
    } catch (err) {
      setError(err.response?.data?.message || 'Incident tracker login failed');
    }
  };

  return (
    <Box sx={{ minHeight: '100%', display: 'grid', placeItems: 'center', p: { xs: 0, md: 2 } }}>
      <Card sx={{ width: '100%', maxWidth: 460 }} elevation={0} variant="outlined">
        <CardContent>
          <Typography variant="h4" fontWeight={700} gutterBottom>Incident Tracker</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to the incident tracker module. BSL access and incident access are separate in the current backend setup.
          </Typography>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
              <TextField label="Username" {...register('username')} />
              <TextField label="Password" type="password" {...register('password')} />
              <Button type="submit" variant="contained" size="large">Sign In</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
