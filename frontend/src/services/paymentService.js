/**
 * Payment Service
 * 
 * Handles all manual payment API calls:
 * - Bank Transfer payments
 * - UPI payments
 * - Payment proof upload
 * - Payment history
 * 
 * @version 2.0.0 - Simplified Manual Payments
 */

import api from './api';

const PAYMENT_URL = '/payments';

// Note: SUBSCRIPTION_PLANS has been moved to frontend/src/config/subscription.js
// Import from '../config/subscription' instead

// Payment methods
export const PAYMENT_METHODS = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  UPI: 'UPI'
};

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
};

/**
 * Get all subscription plans
 */
const getPlans = async () => {
  const response = await api.get(`${PAYMENT_URL}/plans`);
  return response.data;
};

/**
 * Get bank details for manual transfer
 */
const getBankDetails = async () => {
  const response = await api.get(`${PAYMENT_URL}/bank-details`);
  return response.data;
};

/**
 * Get UPI details for payment
 */
const getUPIDetails = async () => {
  const response = await api.get(`${PAYMENT_URL}/upi-details`);
  return response.data;
};

/**
 * Initiate a manual payment
 * @param {string} planId - Plan ID (BASIC, PRO, PREMIUM)
 * @param {string} paymentMethod - Payment method (BANK_TRANSFER, UPI)
 */
const initiatePayment = async (planId, paymentMethod) => {
  const response = await api.post(`${PAYMENT_URL}/initiate`, {
    planId,
    paymentMethod
  });
  return response.data;
};

/**
 * Upload payment proof
 * @param {FormData} formData - Form data with proof file and details
 */
const submitPaymentProof = async (formData) => {
  const response = await api.post(`${PAYMENT_URL}/submit-proof`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Get user's payment history
 */
const getPaymentHistory = async () => {
  const response = await api.get(`${PAYMENT_URL}/history`);
  return response.data;
};

/**
 * Get payment details
 * @param {string} paymentId - Payment ID
 */
const getPaymentDetails = async (paymentId) => {
  const response = await api.get(`${PAYMENT_URL}/${paymentId}`);
  return response.data;
};

/**
 * Cancel a pending payment
 * @param {string} paymentId - Payment ID
 */
const cancelPayment = async (paymentId) => {
  const response = await api.post(`${PAYMENT_URL}/${paymentId}/cancel`);
  return response.data;
};

// ============ ADMIN FUNCTIONS ============

/**
 * Get all payments (Admin)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} status - Filter by status
 */
const getAdminPayments = async (page = 1, limit = 20, status = null) => {
  let url = `${PAYMENT_URL}/admin/all?page=${page}&limit=${limit}`;
  if (status) {
    url += `&status=${status}`;
  }
  const response = await api.get(url);
  return response.data;
};

/**
 * Get payment statistics (Admin)
 */
const getPaymentStats = async () => {
  const response = await api.get(`${PAYMENT_URL}/admin/stats`);
  return response.data;
};

/**
 * Approve payment (Admin)
 * @param {string} paymentId - Payment ID
 * @param {string} notes - Admin notes
 */
const approvePayment = async (paymentId, notes = '') => {
  const response = await api.post(`${PAYMENT_URL}/admin/${paymentId}/approve`, { notes });
  return response.data;
};

/**
 * Reject payment (Admin)
 * @param {string} paymentId - Payment ID
 * @param {string} reason - Rejection reason
 */
const rejectPayment = async (paymentId, reason) => {
  const response = await api.post(`${PAYMENT_URL}/admin/${paymentId}/reject`, { reason });
  return response.data;
};

/**
 * Get admin notifications
 * @param {boolean} unreadOnly - Get only unread notifications
 */
const getAdminNotifications = async (unreadOnly = false) => {
  const response = await api.get(`${PAYMENT_URL}/admin/notifications?unreadOnly=${unreadOnly}`);
  return response.data;
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 */
const markNotificationRead = async (notificationId) => {
  const response = await api.post(`${PAYMENT_URL}/admin/notifications/${notificationId}/read`);
  return response.data;
};

/**
 * Mark all notifications as read
 */
const markAllNotificationsRead = async () => {
  const response = await api.post(`${PAYMENT_URL}/admin/notifications/read-all`);
  return response.data;
};

/**
 * Get payment messages
 * @param {string} paymentId - Payment ID
 */
const getPaymentMessages = async (paymentId) => {
  const response = await api.get(`${PAYMENT_URL}/${paymentId}/messages`);
  return response.data;
};

/**
 * Send payment message (User)
 * @param {string} paymentId - Payment ID
 * @param {string} message - Message content
 */
const sendPaymentMessage = async (paymentId, message) => {
  const response = await api.post(`${PAYMENT_URL}/${paymentId}/messages`, { message });
  return response.data;
};

/**
 * Send admin payment message (Admin)
 * @param {string} paymentId - Payment ID
 * @param {string} message - Message content
 */
const sendAdminPaymentMessage = async (paymentId, message) => {
  const response = await api.post(`${PAYMENT_URL}/admin/${paymentId}/messages`, { message });
  return response.data;
};

/**
 * Get user's payment notifications
 */
const getUserPaymentNotifications = async () => {
  const response = await api.get(`${PAYMENT_URL}/user/notifications`);
  return response.data;
};

export default {
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  getPlans,
  getBankDetails,
  getUPIDetails,
  initiatePayment,
  submitPaymentProof,
  getPaymentHistory,
  getPaymentDetails,
  cancelPayment,
  // Admin
  getAdminPayments,
  getPaymentStats,
  approvePayment,
  rejectPayment,
  // Notifications
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  // Messages
  getPaymentMessages,
  sendPaymentMessage,
  sendAdminPaymentMessage,
  getUserPaymentNotifications
};
