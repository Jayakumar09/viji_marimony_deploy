import React, { useState } from 'react';
import { IconButton, InputAdornment, Tooltip, Box, Button, Alert, Switch, FormControlLabel } from '@mui/material';
import { Visibility, VisibilityOff, ContentCopy } from '@mui/icons-material';
import toast from 'react-hot-toast';

const PasswordField = ({ 
  register, 
  error, 
  helperText, 
  label, 
  showGenerator = false,
  ...props 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showGeneratedAlert, setShowGeneratedAlert] = useState(false);
  const [generatorEnabled, setGeneratorEnabled] = useState(false);

  const generateStrongPassword = () => {
    const length = 16;
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let password = '';
    
    // Ensure at least one character from each set
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill remaining characters
    const allChars = lowercase + uppercase + numbers + special;
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setGeneratedPassword(password);
    setShowGeneratedAlert(true);
    
    // Auto-hide alert after 10 seconds
    setTimeout(() => setShowGeneratedAlert(false), 10000);
    
    return password;
  };

  const useGeneratedPassword = () => {
    if (generatedPassword) {
      // Create a synthetic event to set the password value
      const event = {
        target: { 
          name: props.name || 'password', 
          value: generatedPassword 
        }
      };
      
      // Manually trigger onChange if available
      if (props.onChange) {
        props.onChange(event);
      }
      
      toast.success('Password applied successfully!');
      setShowGeneratedAlert(false);
    }
  };

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      toast.success('Password copied to clipboard!');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleGenerator = (e) => {
    const enabled = e.target.checked;
    setGeneratorEnabled(enabled);
    if (enabled) {
      const pw = generateStrongPassword();
      setGeneratedPassword(pw);
      // automatically apply generated password if onChange provided
      if (props.onChange) {
        const event = { target: { name: props.name || 'password', value: pw } };
        props.onChange(event);
      }
    } else {
      setGeneratedPassword('');
      setShowGeneratedAlert(false);
    }
  };

  return (
    <Box>
      {showGeneratedAlert && generatedPassword && (
        <Alert 
          severity="success" 
          style={{ marginBottom: '1rem' }}
          action={
            <Box>
              <Button size="small" onClick={useGeneratedPassword}>
                Use This
              </Button>
              <Button size="small" onClick={copyPassword}>
                Copy
              </Button>
              <IconButton size="small" onClick={() => setShowGeneratedAlert(false)}>
                ×
              </IconButton>
            </Box>
          }
        >
          <strong>Strong Password Generated!</strong><br />
          <code style={{ 
            background: '#f0f0f0', 
            padding: '2px 4px', 
            borderRadius: '3px',
            wordBreak: 'break-all'
          }}>
            {generatedPassword}
          </code>
          <br />
          <small>Click "Use This" to apply or "Copy" to save it.</small>
        </Alert>
      )}
      
      <Box position="relative">
        <input
          {...props}
          {...register}
          type={showPassword ? 'text' : 'password'}
          style={{
            width: '100%',
            padding: '16.5px 14px',
            fontSize: '16px',
            border: error ? '1px solid #f44336' : '1px solid #ccc',
            borderRadius: '4px',
            fontFamily: 'monospace',
            backgroundColor: error ? '#fff9f9' : '#fafafa'
          }}
        />
        
        <InputAdornment position="end" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
          {showGenerator && (
            <FormControlLabel
              control={<Switch size="small" checked={generatorEnabled} onChange={toggleGenerator} color="primary" />}
              label="Generator"
              style={{ marginRight: '8px' }}
            />
          )}
          
          <Tooltip title={showPassword ? 'Hide Password' : 'Show Password'}>
            <IconButton
              onClick={togglePasswordVisibility}
              edge="end"
              size="small"
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </Tooltip>
        </InputAdornment>
      </Box>
      
      {error && (
        <Box color="#f44336" fontSize="0.75rem" mt={0.5} ml={1}>
          {helperText}
        </Box>
      )}
    </Box>
  );
};

export default PasswordField;