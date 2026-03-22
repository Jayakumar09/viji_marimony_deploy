/**
 * Lookup Routes for Cloudflare Worker
 * Returns static lookup data for dropdowns
 */

import { Hono } from 'hono';

const lookupRoutes = new Hono();

// Get communities
lookupRoutes.get('/communities', (c) => {
  return c.json({
    communities: ['Boyar', 'Agamudayar', 'Mudaliar', 'Reddi', 'Naidu', 'Kshatriya', 'Brahmin', 'Other']
  });
});

// Get states
lookupRoutes.get('/states', (c) => {
  return c.json({
    states: [
      'Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana',
      'Maharashtra', 'Delhi', 'Kerala', 'Gujarat', 'West Bengal',
      'Other'
    ]
  });
});

// Get education options
lookupRoutes.get('/education', (c) => {
  return c.json({
    education: [
      'High School', 'Intermediate', 'Diploma', 'Under Graduate', 
      'Graduate', 'Post Graduate', 'Doctorate', 'Professional'
    ]
  });
});

// Get professions
lookupRoutes.get('/professions', (c) => {
  return c.json({
    professions: [
      'Government Employee', 'Private Employee', 'Business', 'Self Employed',
      'Doctor', 'Engineer', 'Teacher', 'Lawyer', ' Chartered Accountant',
      'Software Professional', 'Farmer', 'Homemaker', 'Other'
    ]
  });
});

// Get marital status
lookupRoutes.get('/marital-status', (c) => {
  return c.json({
    maritalStatus: ['Never Married', 'Divorced', 'Widowed', 'Separated']
  });
});

// Get body types
lookupRoutes.get('/body-types', (c) => {
  return c.json({
    bodyTypes: ['Slim', 'Average', 'Athletic', 'Heavy']
  });
});

// Get complexions
lookupRoutes.get('/complexions', (c) => {
  return c.json({
    complexions: ['Very Fair', 'Fair', 'Wheatish', 'Brown', 'Dark']
  });
});

// Get diets
lookupRoutes.get('/diets', (c) => {
  return c.json({
    diets: ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan']
  });
});

// Get habits
lookupRoutes.get('/habits', (c) => {
  return c.json({
    habits: ['Never', 'Occasionally', 'Regularly']
  });
});

// Get raasi (moon signs)
lookupRoutes.get('/raasi', (c) => {
  return c.json({
    raasi: [
      'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
      'Tula', 'Vrishchika', 'Dhanus', 'Makara', 'Kumbha', 'Meena'
    ]
  });
});

// Get nakshatras (birth stars)
lookupRoutes.get('/nakshatras', (c) => {
  return c.json({
    nakshatras: [
      'Aswini', 'Bharani', 'Kritika', 'Rohini', 'Mrigashirsha', 'Ardra',
      'Punarvasu', 'Pushya', 'Aslesha', 'Makha', 'Pubba', 'Uttara',
      'Hasta', 'Chitta', 'Swati', 'Vishakha', 'Anuradha', 'Jyesta',
      'Mula', 'Purvashada', 'Uttarashada', 'Shravana', 'Dhanishta',
      'Satabhisha', 'Purvabhadra', 'Uttarabhadra', 'Revati'
    ]
  });
});

// Get all lookup data
lookupRoutes.get('/all', (c) => {
  return c.json({
    communities: ['Boyar', 'Agamudayar', 'Mudaliar', 'Reddi', 'Naidu', 'Kshatriya', 'Brahmin', 'Other'],
    states: ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Delhi', 'Gujarat', 'West Bengal', 'Other'],
    education: ['High School', 'Intermediate', 'Diploma', 'Under Graduate', 'Graduate', 'Post Graduate', 'Doctorate', 'Professional'],
    professions: ['Government Employee', 'Private Employee', 'Business', 'Self Employed', 'Doctor', 'Engineer', 'Teacher', 'Lawyer', 'Chartered Accountant', 'Software Professional', 'Farmer', 'Homemaker', 'Other'],
    maritalStatus: ['Never Married', 'Divorced', 'Widowed', 'Separated'],
    bodyTypes: ['Slim', 'Average', 'Athletic', 'Heavy'],
    complexions: ['Very Fair', 'Fair', 'Wheatish', 'Brown', 'Dark'],
    diets: ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan'],
    habits: ['Never', 'Occasionally', 'Regularly'],
    raasi: ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanus', 'Makara', 'Kumbha', 'Meena'],
    physicalStatus: ['Normal', 'Physically Challenged']
  });
});

export default lookupRoutes;
