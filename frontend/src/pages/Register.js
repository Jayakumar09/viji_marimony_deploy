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
  FormControlLabel,
  Checkbox
  ,Autocomplete } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import PasswordField from '../components/PasswordField';
import { STATES, getCitiesForState } from '../data/indianLocations';
import api from '../services/api';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { InputAdornment } from '@mui/material';

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      phone: '+91'
    }
  });

  const selectedState = watch('state');

  useEffect(() => {
    // Clear city when state changes
    setValue('city', null);
  }, [selectedState, setValue]);

    const DEFAULT_SUBCASTES = [
      'Boyas',
      'Kal Oddars',
      'Sooramari Oddars',
      'Nellorepet Oddars',
      'Mannu Oddars'
    ];
  const [subCastes, setSubCastes] = useState(DEFAULT_SUBCASTES);
  const [customCities, setCustomCities] = useState([]);
  const [presetCities, setPresetCities] = useState([]);
  const [cityInputValue, setCityInputValue] = useState('');
  const [subCasteInputValue, setSubCasteInputValue] = useState('');

  useEffect(() => {
    const fetchCustom = async () => {
      if (!selectedState) {
        setCustomCities([]);
        setPresetCities([]);
        setValue('city', null);
        return;
      }

      try {
        const res = await api.get(`/lookup/cities?state=${encodeURIComponent(selectedState)}`);
        const custom = res.data.cities.map(c => c.name);
        setCustomCities(custom);
      } catch (err) {
        console.error('Failed to fetch custom cities', err);
        setCustomCities([]);
      }

      // always set preset cities from static list
      setPresetCities(getCitiesForState(selectedState));
      setValue('city', null);
      setCityInputValue('');
    };

    fetchCustom();
  }, [selectedState, setValue]);

  const cityOptions = [...new Set([...(presetCities || []), ...(customCities || [])])];
  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await registerUser({
        ...data,
        dateOfBirth: data.dateOfBirth,
        country: 'India',
        community: 'Boyar'
      });

      if (result.success) {
        const msg = result.message || 'Registration successful!';
        toast.success(msg);
        setSuccess(msg);
        // short delay so user sees the toast/alert, then navigate
        setTimeout(() => navigate('/dashboard'), 900);
      } else {
        const err = result.error || 'Registration failed';
        setError(err);
        toast.error(err);
      }
    } catch (error) {
      const errMsg = error?.response?.data?.error || 'Registration failed. Please try again.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

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
        {success && (
          <Alert severity="success" style={{ marginBottom: '1rem' }}>
            {success}
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
                openOnFocus
                options={cityOptions}
                value={watch('city') || null}
                inputValue={cityInputValue}
                onInputChange={(e, newInput) => {
                  setCityInputValue(newInput);
                  // update form value while typing
                  setValue('city', newInput || '');
                }}
                onChange={(e, value) => {
                  setValue('city', value || '');
                  setCityInputValue(value || '');
                }}
                popupIcon={<ArrowDropDownIcon />}
                renderInput={(params) => {
                  const endAdornment = params.InputProps?.endAdornment ?? (
                    <InputAdornment position="end">
                      <ArrowDropDownIcon />
                    </InputAdornment>
                  );

                  return (
                    <TextField
                      {...params}
                      variant="outlined"
                      label="City"
                      placeholder="Select or type city..."
                      error={!!errors.city}
                      helperText={errors.city?.message || 'Type a new city if not in list'}
                      InputProps={{ ...params.InputProps, endAdornment }}
                    />
                  );
                }}
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
                openOnFocus
                options={subCastes}
                value={watch('subCaste') || null}
                inputValue={subCasteInputValue}
                onInputChange={(e, newInput) => {
                  setSubCasteInputValue(newInput);
                  setValue('subCaste', newInput || '');
                }}
                onChange={(e, value) => {
                  setValue('subCaste', value || '');
                  setSubCasteInputValue(value || '');
                }}
                popupIcon={<ArrowDropDownIcon />}
                renderInput={(params) => {
                  const endAdornment = params.InputProps?.endAdornment ?? (
                    <InputAdornment position="end">
                      <ArrowDropDownIcon />
                    </InputAdornment>
                  );

                  return (
                    <TextField
                      {...params}
                      variant="outlined"
                      label="Sub Caste (Optional)"
                      placeholder="Select or type sub caste..."
                      helperText="Type a new sub caste if not in list"
                      InputProps={{ ...params.InputProps, endAdornment }}
                    />
                  );
                }}
              />
              <input type="hidden" {...register('subCaste')} />
            </Grid>

            {/* Terms and Conditions */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    {...register('acceptTerms', { 
                      required: 'You must agree to the terms and conditions' 
                    })}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    I agree to the{' '}
                    <Link to="/terms" style={{ color: '#8B5CF6', textDecoration: 'none' }}>
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" style={{ color: '#8B5CF6', textDecoration: 'none' }}>
                      Privacy Policy
                    </Link>. I also confirm that I am at least 18 years of age and acknowledge that all payments for premium memberships are due on time and are non-refundable as per the Refund Policy.
                  </Typography>
                }
              />
              {errors.acceptTerms && (
                <Typography variant="caption" color="error" display="block" style={{ marginTop: '4px' }}>
                  {errors.acceptTerms.message}
                </Typography>
              )}
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={loading || errors.acceptTerms}
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