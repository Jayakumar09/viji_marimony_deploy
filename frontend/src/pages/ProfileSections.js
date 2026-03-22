// Profile section components - extracted from Profile.js for better organization
import React, { useState, useEffect } from 'react';
import Cropper from 'react-easy-crop';

// Sub Caste options
const SUBCASTE_OPTIONS = [
  'Boyas',
  'Kal Oddars',
  'Sooramari Oddars',
  'Nellorepet Oddars',
  'Mannu Oddars',
  'Other'
];
import {
  Box,
  Typography,
  Avatar,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Tabs,
  Tab,
  Autocomplete
} from '@mui/material';
import {
  Person,
  CameraAlt,
  Edit,
  Delete,
  CloudUpload,
  Star,
  Description,
  CheckCircle
} from '@mui/icons-material';
import { Controller } from 'react-hook-form';
import { getNatchathiramForRasi } from '../data/horoscopeData';
import { getImageUrl } from '../utils/imageUrl';

// Profile photo section component
export const ProfilePhotoSection = ({
  profileData,
  isEditingPhoto,
  photoScale,
  photoPosX,
  photoPosY,
  photoWrapper,
  photoImg,
  uploading,
  isCropDialogOpen,
  imageToCrop,
  crop,
  croppedAreaPixels,
  onPhotoSelect,
  onConfirmCrop,
  onCancelCrop,
  onCropComplete,
  setCrop,
  setImageToCrop,
  setIsCropDialogOpen,
  setPhotoScale,
  setPhotoPosX,
  setPhotoPosY,
  resetPhotoAdjustments,
  savePhotoAdjustments,
  setIsEditingPhoto,
  handleMouseDown,
  handleMouseUp
}) => {
  return (
    <>
      <Box
        ref={photoWrapper}
        sx={{
          position: 'relative',
          width: 200,
          height: 200,
          margin: '0 auto',
          borderRadius: '50%',
          overflow: 'hidden',
          cursor: isEditingPhoto ? 'move' : 'pointer',
          border: '4px solid #8B5CF6',
          boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)'
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {profileData?.profilePhoto ? (
          <img
            ref={photoImg}
            src={getImageUrl(profileData.profilePhoto)}
            alt={profileData.firstName || 'Profile'}
            onError={(e) => {
              console.error('Profile image failed to load:', e.target.src);
              e.target.style.display = 'none';
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              transform: isEditingPhoto 
                ? `scale(${photoScale || 1}) translate(${((photoPosX || 0) / (photoScale || 1))}px, ${((photoPosY || 0) / (photoScale || 1))}px)`
                : 'none',
              transition: 'transform 0.1s ease'
            }}
            draggable={false}
          />
        ) : (
          <Avatar
            style={{ width: '100%', height: '100%', backgroundColor: '#E0E0E0' }}
          >
            <Person style={{ fontSize: '4rem', color: '#757575' }} />
          </Avatar>
        )}
        
        {/* Camera overlay for upload */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0,0,0,0.6)',
            padding: '8px',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          <label htmlFor="photo-upload" style={{ cursor: 'pointer' }}>
            <input
              type="file"
              id="photo-upload"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onPhotoSelect}
            />
            <Button
              component="span"
              size="small"
              sx={{ color: 'white', minWidth: 'auto', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
              disabled={uploading}
            >
              <CameraAlt />
            </Button>
          </label>
        </Box>
      </Box>

      {/* Photo adjustment controls */}
      {isEditingPhoto && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" display="block" gutterBottom>
            Zoom: {(photoScale * 100).toFixed(0)}%
          </Typography>
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={photoScale}
            onChange={(e) => setPhotoScale(parseFloat(e.target.value))}
            style={{ width: '200px' }}
          />
          <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button size="small" onClick={resetPhotoAdjustments}>
              Reset
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={savePhotoAdjustments}
              sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
            >
              Save
            </Button>
            <Button size="small" onClick={() => setIsEditingPhoto(false)}>
              Cancel
            </Button>
          </Box>
        </Box>
      )}

      {/* Crop Dialog */}
      <Dialog open={isCropDialogOpen} onClose={onCancelCrop} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Profile Photo</DialogTitle>
        <DialogContent>
          <Box sx={{ position: 'relative', height: 400, bgcolor: '#1a1a1a', borderRadius: 1, overflow: 'hidden' }}>
            <Cropper
              image={imageToCrop}
              crop={crop}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              cropShape="round"
              showGrid={false}
            />
          </Box>
          <Box sx={{ px: 2, mt: 2 }}>
            <Typography variant="caption" color="textSecondary" display="block" textAlign="center">
              Drag to reposition, then crop
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancelCrop}>Cancel</Button>
          <Button
            onClick={onConfirmCrop}
            variant="contained"
            disabled={uploading}
            sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
          >
            {uploading ? <CircularProgress size={24} color="inherit" /> : 'Save & Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Basic info form section
export const BasicInfoSection = ({ register, errors, editing, control, profileData }) => {
  return (
    <Grid container spacing={2}>
      {/* Email and Phone - Read Only */}
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Email"
          value={profileData?.email || ''}
          disabled
          InputProps={{
            readOnly: true,
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Phone Number"
          value={profileData?.phone || profileData?.mobile || ''}
          disabled
          InputProps={{
            readOnly: true,
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="First Name"
          {...register('firstName', { required: 'First name is required' })}
          error={!!errors.firstName}
          helperText={errors.firstName?.message}
          disabled={!editing}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Last Name"
          {...register('lastName', { required: 'Last name is required' })}
          error={!!errors.lastName}
          helperText={errors.lastName?.message}
          disabled={!editing}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Date of Birth"
          type="date"
          {...register('dateOfBirth')}
          disabled={!editing}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="gender"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Gender</InputLabel>
              <Select
                {...field}
                label="Gender"
                disabled={!editing}
                value={field.value || ''}
              >
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="maritalStatus"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Marital Status</InputLabel>
              <Select
                {...field}
                label="Marital Status"
                disabled={!editing}
                value={field.value || ''}
              >
                <MenuItem value="Never Married">Never Married</MenuItem>
                <MenuItem value="Divorced">Divorced</MenuItem>
                <MenuItem value="Widowed">Widowed</MenuItem>
                <MenuItem value="Separated">Separated</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="community"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Community</InputLabel>
              <Select
                {...field}
                label="Community"
                disabled={!editing}
                value={field.value || ''}
              >
                <MenuItem value="Boyar">Boyar</MenuItem>
                <MenuItem value="Agamudayar">Agamudayar</MenuItem>
                <MenuItem value="Arcot">Arcot</MenuItem>
                <MenuItem value="Muvendar">Muvendar</MenuItem>
                <MenuItem value="Kshatriya">Kshatriya</MenuItem>
                <MenuItem value="Vellalar">Vellalar</MenuItem>
                <MenuItem value="Gounder">Gounder</MenuItem>
                <MenuItem value="Mudaliar">Mudaliar</MenuItem>
                <MenuItem value="Naidu">Naidu</MenuItem>
                <MenuItem value="Reddiar">Reddiar</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="subCaste"
          control={control}
          render={({ field }) => (
            <Autocomplete
              freeSolo
              options={SUBCASTE_OPTIONS}
              value={field.value || ''}
              onChange={(event, newValue) => {
                field.onChange(newValue || '');
              }}
              disabled={!editing}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Sub Caste"
                  variant="outlined"
                />
              )}
            />
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Height"
          {...register('height')}
          disabled={!editing}
          placeholder={'e.g., 5\'6"'}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Weight"
          {...register('weight')}
          disabled={!editing}
          placeholder={'e.g., 65 kg'}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="complexion"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Complexion</InputLabel>
              <Select
                {...field}
                label="Complexion"
                disabled={!editing}
                value={field.value || ''}
              >
                <MenuItem value="Very Fair">Very Fair</MenuItem>
                <MenuItem value="Fair">Fair</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Olive">Olive</MenuItem>
                <MenuItem value="Brown">Brown</MenuItem>
                <MenuItem value="Dark">Dark</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="physicalStatus"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Physical Status</InputLabel>
              <Select
                {...field}
                label="Physical Status"
                disabled={!editing}
                value={field.value || ''}
              >
                <MenuItem value="Normal">Normal</MenuItem>
                <MenuItem value="Physically Challenged">Physically Challenged</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="drinkingHabit"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Drinking Habit</InputLabel>
              <Select
                {...field}
                label="Drinking Habit"
                disabled={!editing}
                value={field.value || ''}
              >
                <MenuItem value="Never">Never</MenuItem>
                <MenuItem value="Occasionally">Occasionally</MenuItem>
                <MenuItem value="Regularly">Regularly</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="smokingHabit"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Smoking Habit</InputLabel>
              <Select
                {...field}
                label="Smoking Habit"
                disabled={!editing}
                value={field.value || ''}
              >
                <MenuItem value="Never">Never</MenuItem>
                <MenuItem value="Occasionally">Occasionally</MenuItem>
                <MenuItem value="Regularly">Regularly</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="diet"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Diet</InputLabel>
              <Select
                {...field}
                label="Diet"
                disabled={!editing}
                value={field.value || ''}
              >
                <MenuItem value="Vegetarian">Vegetarian</MenuItem>
                <MenuItem value="Non-Vegitarian">Non-Vegitarian</MenuItem>
                <MenuItem value="Eggetarian">Eggetarian</MenuItem>
                <MenuItem value="Vegan">Vegan</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>
    </Grid>
  );
};

// Horoscope section
export const HoroscopeSection = ({
  profileData,
  editingHoroscope,
  setEditingHoroscope,
  register,
  control,
  errors,
  watch,
  onSave
}) => {
  const selectedRasi = watch?.('raasi');
  const availableNatchathiram = selectedRasi ? getNatchathiramForRasi(selectedRasi) : [];

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          <Star sx={{ mr: 1, verticalAlign: 'middle', color: '#8B5CF6' }} />
          Horoscope Details
        </Typography>
        {!editingHoroscope && (
          <Button
            startIcon={<Edit />}
            onClick={() => setEditingHoroscope(true)}
            sx={{ color: '#8B5CF6' }}
          >
            Edit
          </Button>
        )}
      </Box>
      
      {editingHoroscope ? (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Controller
              name="raasi"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Raasi</InputLabel>
                  <Select
                    {...field}
                    label="Raasi"
                    value={field.value || ''}
                  >
                    {['Mesham', 'Rishabham', 'Mithunam', 'Kadagam', 'Simmam', 'Kanni', 'Thulam', 'Vrichikam', 'Dhanusu', 'Makaram', 'Kumbam', 'Meenam'].map(rasi => (
                      <MenuItem key={rasi} value={rasi}>{rasi}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="natchathiram"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Natchathiram</InputLabel>
                  <Select
                    {...field}
                    label="Natchathiram"
                    value={field.value || ''}
                  >
                    {availableNatchathiram.map(n => (
                      <MenuItem key={n.value} value={n.value}>{n.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="dhosam"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Dhosam</InputLabel>
                  <Select
                    {...field}
                    label="Dhosam"
                    value={field.value || ''}
                  >
                    <MenuItem value="No">No</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Birth Time"
              type="time"
              {...register('birthTime')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Birth Place"
              {...register('birthPlace')}
            />
          </Grid>
          <Grid item xs={12}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button onClick={() => setEditingHoroscope(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={onSave}
                sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
              >
                Save
              </Button>
            </Box>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">Raasi</Typography>
            <Typography>{profileData?.raasi || 'Not specified'}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">Natchathiram</Typography>
            <Typography>{profileData?.natchathiram || 'Not specified'}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">Dhosam</Typography>
            <Typography>{profileData?.dhosam || 'Not specified'}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">Birth Time</Typography>
            <Typography>{profileData?.birthTime || 'Not specified'}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary">Birth Place</Typography>
            <Typography>{profileData?.birthPlace || 'Not specified'}</Typography>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};

// Family background section
export const FamilySection = ({
  profileData,
  editingFamily,
  setEditingFamily,
  register,
  errors,
  control,
  onSave
}) => {
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          <Person sx={{ mr: 1, verticalAlign: 'middle', color: '#8B5CF6' }} />
          Family Background
        </Typography>
        {!editingFamily && (
          <Button
            startIcon={<Edit />}
            onClick={() => setEditingFamily(true)}
            sx={{ color: '#8B5CF6' }}
          >
            Edit
          </Button>
        )}
      </Box>
      
      {editingFamily ? (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Controller
              name="familyValues"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Family Values</InputLabel>
                  <Select
                    {...field}
                    label="Family Values"
                    value={field.value || ''}
                  >
                    <MenuItem value="Orthodox">Orthodox</MenuItem>
                    <MenuItem value="Traditional">Traditional</MenuItem>
                    <MenuItem value="Moderate">Moderate</MenuItem>
                    <MenuItem value="Liberal">Liberal</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="familyType"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Family Type</InputLabel>
                  <Select
                    {...field}
                    label="Family Type"
                    value={field.value || ''}
                  >
                    <MenuItem value="Joint">Joint Family</MenuItem>
                    <MenuItem value="Nuclear">Nuclear Family</MenuItem>
                    <MenuItem value="Others">Others</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="familyStatus"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Family Status</InputLabel>
                  <Select
                    {...field}
                    label="Family Status"
                    value={field.value || ''}
                  >
                    <MenuItem value="Upper Middle Class">Upper Middle Class</MenuItem>
                    <MenuItem value="Middle Class">Middle Class</MenuItem>
                    <MenuItem value="Lower Middle Class">Lower Middle Class</MenuItem>
                    <MenuItem value="Affluent">Affluent</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
          {/* Father's Details */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Father's Name"
              {...register('fatherName')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="fatherOccupation"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Father's Occupation</InputLabel>
                  <Select
                    {...field}
                    label="Father's Occupation"
                    value={field.value || ''}
                  >
                    <MenuItem value="Government Employee">Government Employee</MenuItem>
                    <MenuItem value="Private Employee">Private Employee</MenuItem>
                    <MenuItem value="Business">Business</MenuItem>
                    <MenuItem value="Self Employed">Self Employed</MenuItem>
                    <MenuItem value="Farmer">Farmer</MenuItem>
                    <MenuItem value="Retired">Retired</MenuItem>
                    <MenuItem value="Not Employed">Not Employed</MenuItem>
                    <MenuItem value="Passed Away">Passed Away</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="fatherCaste"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Father's Caste</InputLabel>
                  <Select
                    {...field}
                    label="Father's Caste"
                    value={field.value || ''}
                  >
                    <MenuItem value="Boya">Boya</MenuItem>
                    <MenuItem value="Kal Oddars">Kal Oddars</MenuItem>
                    <MenuItem value="Sooramari Oddars">Sooramari Oddars</MenuItem>
                    <MenuItem value="Nellorepet Oddars">Nellorepet Oddars</MenuItem>
                    <MenuItem value="Mannu Oddars">Mannu Oddars</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
          {/* Mother's Details */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Mother's Name"
              {...register('motherName')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="motherOccupation"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Mother's Occupation</InputLabel>
                  <Select
                    {...field}
                    label="Mother's Occupation"
                    value={field.value || ''}
                  >
                    <MenuItem value="Government Employee">Government Employee</MenuItem>
                    <MenuItem value="Private Employee">Private Employee</MenuItem>
                    <MenuItem value="Business">Business</MenuItem>
                    <MenuItem value="Self Employed">Self Employed</MenuItem>
                    <MenuItem value="Farmer">Farmer</MenuItem>
                    <MenuItem value="Housewife">Housewife</MenuItem>
                    <MenuItem value="Retired">Retired</MenuItem>
                    <MenuItem value="Not Employed">Not Employed</MenuItem>
                    <MenuItem value="Passed Away">Passed Away</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="motherCaste"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Mother's Caste</InputLabel>
                  <Select
                    {...field}
                    label="Mother's Caste"
                    value={field.value || ''}
                  >
                    <MenuItem value="Boya">Boya</MenuItem>
                    <MenuItem value="Kal Oddars">Kal Oddars</MenuItem>
                    <MenuItem value="Sooramari Oddars">Sooramari Oddars</MenuItem>
                    <MenuItem value="Nellorepet Oddars">Nellorepet Oddars</MenuItem>
                    <MenuItem value="Mannu Oddars">Mannu Oddars</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="About Family"
              {...register('aboutFamily')}
            />
          </Grid>
          <Grid item xs={12}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button onClick={() => setEditingFamily(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={onSave}
                sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
              >
                Save
              </Button>
            </Box>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">Family Values</Typography>
            <Typography>{profileData?.familyValues || 'Not specified'}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">Family Type</Typography>
            <Typography>{profileData?.familyType || 'Not specified'}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">Family Status</Typography>
            <Typography>{profileData?.familyStatus || 'Not specified'}</Typography>
          </Grid>
          {/* Father's Details Display */}
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">Father's Name</Typography>
            <Typography>{profileData?.fatherName || 'Not specified'}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">Father's Occupation</Typography>
            <Typography>{profileData?.fatherOccupation || 'Not specified'}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">Father's Caste</Typography>
            <Typography>{profileData?.fatherCaste || 'Not specified'}</Typography>
          </Grid>
          {/* Mother's Details Display */}
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">Mother's Name</Typography>
            <Typography>{profileData?.motherName || 'Not specified'}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">Mother's Occupation</Typography>
            <Typography>{profileData?.motherOccupation || 'Not specified'}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">Mother's Caste</Typography>
            <Typography>{profileData?.motherCaste || 'Not specified'}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary">About Family</Typography>
            <Typography>{profileData?.aboutFamily || 'Not specified'}</Typography>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};

// Documents section
export const DocumentsSection = ({
  profileData,
  documentDialog,
  setDocumentDialog,
  selectedDocType,
  setSelectedDocType,
  documentUploading,
  documentInputRef,
  onUpload,
  onDelete,
  DOCUMENT_TYPES
}) => {
  const handleUploadClick = (docId) => {
    setSelectedDocType(docId);
    setDocumentDialog(true);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          <Description sx={{ mr: 1, verticalAlign: 'middle', color: '#8B5CF6' }} />
          Documents
        </Typography>
      </Box>
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Document Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {DOCUMENT_TYPES.map((doc) => {
              const uploadedDoc = profileData?.documents?.find(d => d.documentType === doc.id);
              return (
                <TableRow key={doc.id}>
                  <TableCell>
                    {doc.label}
                    {doc.required && <Chip size="small" label="Required" color="error" sx={{ ml: 1 }} />}
                  </TableCell>
                  <TableCell>
                    {uploadedDoc ? (
                      <Box>
                        <Chip 
                          icon={<CheckCircle />} 
                          label={uploadedDoc.status || 'Uploaded'} 
                          color={uploadedDoc.status === 'APPROVED' ? 'success' : uploadedDoc.status === 'REJECTED' ? 'error' : 'warning'} 
                          size="small" 
                          sx={{ mr: 1 }}
                        />
                        {uploadedDoc.fileName && (
                          <Typography variant="caption" display="block" color="textSecondary">
                            {uploadedDoc.fileName}
                          </Typography>
                        )}
                        {uploadedDoc.uploadedAt && (
                          <Typography variant="caption" display="block" color="textSecondary">
                            Uploaded: {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Chip 
                        label={doc.required ? "Pending - Upload Required" : "Not Uploaded"} 
                        color={doc.required ? "warning" : "default"} 
                        size="small" 
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant={uploadedDoc ? "outlined" : "contained"}
                      startIcon={<CloudUpload />}
                      onClick={() => handleUploadClick(doc.id)}
                      sx={{ 
                        bgcolor: uploadedDoc ? 'transparent' : '#8B5CF6', 
                        borderColor: '#8B5CF6',
                        color: uploadedDoc ? '#8B5CF6' : 'white',
                        '&:hover': { 
                          bgcolor: uploadedDoc ? 'rgba(139, 92, 246, 0.1)' : '#7C3AED',
                          borderColor: '#7C3AED'
                        } 
                      }}
                      disabled={documentUploading}
                    >
                      {uploadedDoc ? 'Change' : 'Upload'}
                    </Button>
                    {uploadedDoc && (
                      <IconButton
                        size="small"
                        onClick={() => onDelete(uploadedDoc.id)}
                        color="error"
                        sx={{ ml: 1 }}
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Document Upload Dialog */}
      <Dialog open={documentDialog} onClose={() => setDocumentDialog(false)}>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Document Type</InputLabel>
            <Select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              label="Document Type"
            >
              {DOCUMENT_TYPES.map((doc) => (
                <MenuItem key={doc.id} value={doc.id}>{doc.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <input
            type="file"
            ref={documentInputRef}
            onChange={onUpload}
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
          />
          <Button
            sx={{ mt: 2 }}
            onClick={() => documentInputRef.current?.click()}
            disabled={!selectedDocType || documentUploading}
          >
            {documentUploading ? <CircularProgress size={24} /> : 'Select File'}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

// Gallery section
export const GallerySection = ({
  profileData,
  editing,
  uploading,
  galleryInputRef,
  onUpload,
  onDelete,
  MAX_GALLERY_IMAGES
}) => {
  const photos = profileData?.photos || [];
  
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Gallery ({photos.length}/{MAX_GALLERY_IMAGES})</Typography>
        {photos.length < MAX_GALLERY_IMAGES && (
          <>
            <input
              type="file"
              ref={galleryInputRef}
              onChange={onUpload}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
            />
            <Button
              startIcon={<CloudUpload />}
              onClick={() => galleryInputRef.current?.click()}
              sx={{ color: '#8B5CF6' }}
              disabled={uploading}
            >
              Upload
            </Button>
          </>
        )}
      </Box>
      
      <Grid container spacing={2}>
        {photos.map((photo, index) => (
          <Grid item xs={6} sm={4} md={3} key={index}>
            <Card>
              <CardMedia
                component="img"
                height="140"
                image={photo}
                alt={`Gallery ${index + 1}`}
              />
              {editing && (
                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => onDelete(photo)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </CardActions>
              )}
            </Card>
          </Grid>
        ))}
        {photos.length === 0 && (
          <Grid item xs={12}>
            <Typography color="textSecondary" align="center">
              No photos in gallery yet
            </Typography>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};
