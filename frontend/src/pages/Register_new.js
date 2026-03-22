import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import PasswordField from '../components/PasswordField';
import { STATES, getCitiesForState } from '../data/indianLocations';
import api from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customCities, setCustomCities] = useState([]);
  const [subCastes, setSubCastes] = useState([]);
  const [presetCities, setPresetCities] = useState([]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();

  const selectedState = watch('state');

  useEffect(() => {
    // Fetch custom cities for the selected state
    const fetchCustomCities = async () => {
      if (!selectedState) {
        setCustomCities([]);
        setPresetCities([]);
        setValue('city', null);
        return;
      }

      try {
        const response = await api.get(`/lookup/cities?state=${selectedState}`);
        const custom = response.data.cities.map(c => c.name);
        const preset = getCitiesForState(selectedState);
        setCustomCities(custom);
        setPresetCities(preset);
        setValue('city', null);
      } catch (err) {
        console.error('Error fetching custom cities:', err);
        setPresetCities(getCitiesForState(selectedState));
      }
    };

    fetchCustomCities();
  }, [selectedState, setValue]);

  useEffect(() => {
    // Fetch all sub castes on mount
    const fetchSubCastes = async () => {
      try {
        const response = await api.get('/lookup/subcastes');
        setSubCastes(response.data.subCastes.map(s => s.name));
      } catch (err) {
        console.error('Error fetching sub castes:', err);
      }
    };

    fetchSubCastes();
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');

    try {
      // If city is custom (new), add it to DB first
      if (data.city && !presetCities.includes(data.city) && selectedState) {
        try {
          await api.post('/lookup/cities', { name: data.city, state: selectedState });
        } catch (err) {
          console.error('Error adding custom city:', err);
          // Continue with registration even if city addition fails
        }
      }

      // If sub caste is custom (new), add it to DB first
      if (data.subCaste && !subCastes.includes(data.subCaste)) {
        try {
          await api.post('/lookup/subcastes', { name: data.subCaste });
        } catch (err) {
          console.error('Error adding custom sub caste:', err);
          // Continue with registration even if sub caste addition fails
        }
      }

      const result = await registerUser({
        ...data,
        dateOfBirth: data.dateOfBirth,
        country: 'India',
        community: 'Boyar'
      });

      if (result.success) {
        toast.success('Registration successful!');
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cityOptions = [...new Set([...presetCities, ...customCities])];

  return (
    <Container maxWidth="sm" style={{ marginTop: '2rem' }}>
      <Paper elevation={3} style={{ padding: '2rem' }}>
        <Typography variant="h4" align="center" gutterBottom style={{ color: '#8B5CF6' }}>
          Register for Vijayalakshmi Boyar Matrimony
        </Typography>
        
        <Typography variant="body2" align="center" color="textSecondary" paragraph>
          Join our community to find your perfect life partner
        </Typography>

        {error && (
          <Alert severity="error" style={{ marginBottom: '1rem' }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Email */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            </Grid>

            {/* Password */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Password *
              </Typography>
              <PasswordField
                name="password"
                register={register('password', { 
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
                    message: 'Password must contain uppercase, lowercase, number, and special character'
                  }
                })}
                error={!!errors.password}
                helperText={errors.password?.message}
                label="Password"
                showGenerator={true}
              />
            </Grid>

            {/* Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                {...register('firstName', { required: 'First name is required' })}
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                {...register('lastName', { required: 'Last name is required' })}
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            </Grid>

            {/* Phone */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number"
                placeholder="+91XXXXXXXXXX"
                {...register('phone', { 
                  required: 'Phone number is required',
                  pattern: {
                    value: /^\+?[1-9]\d{9,14}$/,
                    message: 'Invalid phone number'
                  }
                })}
                error={!!errors.phone}
                helperText={errors.phone?.message}
              />
            </Grid>

            {/* Gender */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined" error={!!errors.gender}>
                <InputLabel id="gender-label">Gender</InputLabel>
                <Select
                  labelId="gender-label"
                  label="Gender"
                  {...register('gender', { required: 'Gender is required' })}
                  defaultValue=""
                >
                  <MenuItem value="">Select Gender</MenuItem>
                  <MenuItem value="MALE">Male</MenuItem>
                  <MenuItem value="FEMALE">Female</MenuItem>
                </Select>
                {errors.gender && (
                  <Typography variant="caption" color="error">
                    {errors.gender.message}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Date of Birth */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                InputLabelProps={{ shrink: true }}
                {...register('dateOfBirth', { required: 'Date of birth is required' })}
                error={!!errors.dateOfBirth}
                helperText={errors.dateOfBirth?.message}
              />
            </Grid>

            {/* Location */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined" error={!!errors.state}>
                <InputLabel id="state-label">State</InputLabel>
                <Select
                  labelId="state-label"
                  label="State"
                  {...register('state', { required: 'State is required' })}
                  defaultValue=""
                >
                  <MenuItem value="">Select State</MenuItem>
                  {STATES.map((st) => (
                    <MenuItem key={st} value={st}>{st}</MenuItem>
                  ))}
                </Select>
                {errors.state && (
                  <Typography variant="caption" color="error">
                    {errors.state.message}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={cityOptions}
                value={watch('city') || null}
                onChange={(e, value) => setValue('city', value || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="City"
                    placeholder="Select or type city..."
                    error={!!errors.city}
                    helperText={errors.city?.message || 'Type a new city if not in list'}
                  />
                )}
              />
              <input type="hidden" {...register('city', { required: 'City is required' })} />
            </Grid>

            {/* Marital Status */}
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined" error={!!errors.maritalStatus}>
                <InputLabel id="marital-label">Marital Status</InputLabel>
                <Select
                  labelId="marital-label"
                  label="Marital Status"
                  {...register('maritalStatus', { required: 'Marital status is required' })}
                  defaultValue=""
                >
                  <MenuItem value="">Select Marital Status</MenuItem>
                  <MenuItem value="SINGLE">Single</MenuItem>
                  <MenuItem value="DIVORCED">Divorced</MenuItem>
                  <MenuItem value="WIDOWED">Widowed</MenuItem>
                  <MenuItem value="SEPARATED">Separated</MenuItem>
                </Select>
                {errors.maritalStatus && (
                  <Typography variant="caption" color="error">
                    {errors.maritalStatus.message}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Sub Caste */}
            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                options={subCastes}
                value={watch('subCaste') || null}
                onChange={(e, value) => setValue('subCaste', value || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Sub Caste (Optional)"
                    placeholder="Select or type sub caste..."
                    helperText="Type a new sub caste if not in list"
                  />
                )}
              />
              <input type="hidden" {...register('subCaste')} />
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={loading}
                  style={{ minWidth: '200px' }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Register'}
                </Button>

                <Typography variant="body2">
                  Already have an account?{' '}
                  <Link to="/login" style={{ color: '#8B5CF6', textDecoration: 'none' }}>
                    Login here
                  </Link>
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default Register;
