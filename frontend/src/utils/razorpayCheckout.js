/**
 * Razorpay Checkout Utility
 * Simple, clean implementation for Razorpay payments
 */

// Load Razorpay SDK
export const loadRazorpay = () => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      console.log('Razorpay SDK loaded');
      resolve(window.Razorpay);
    };
    script.onerror = () => {
      reject(new Error('Failed to load Razorpay SDK'));
    };
    document.body.appendChild(script);
  });
};

/**
 * Open Razorpay Checkout
 * @param {Object} params - Checkout parameters
 * @param {string} params.key - Razorpay key ID
 * @param {string} params.orderId - Razorpay order ID
 * @param {number} params.amount - Amount in rupees
 * @param {string} params.currency - Currency (default: INR)
 * @param {Object} params.user - User details
 * @param {Function} params.onSuccess - Success callback
 * @param {Function} params.onFailure - Failure callback
 */
export const openCheckout = async (params) => {
  const { key, orderId, amount, currency = 'INR', user, onSuccess, onFailure } = params;

  try {
    const Razorpay = await loadRazorpay();

    const options = {
      key: key,
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency,
      order_id: orderId,
      name: 'Vijayalakshmi Boyar Matrimony',
      description: 'Subscription Payment',
      prefill: {
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
        email: user.email || '',
        contact: user.phone ? user.phone.replace('+91', '') : ''
      },
      theme: {
        color: '#8B5CF6'
      },
      handler: function (response) {
        console.log('Payment response:', response);
        if (onSuccess) {
          onSuccess({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
        }
      },
      modal: {
        ondismiss: function () {
          if (onFailure) {
            onFailure(new Error('Payment cancelled'));
          }
        }
      }
    };

    console.log('Opening Razorpay with options:', {
      key: options.key,
      amount: options.amount,
      currency: options.currency,
      order_id: options.order_id
    });

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response) {
      console.error('Payment failed:', response.error);
      if (onFailure) {
        onFailure(new Error(response.error.description || 'Payment failed'));
      }
    });
    rzp.open();

  } catch (error) {
    console.error('Razorpay checkout error:', error);
    if (onFailure) {
      onFailure(error);
    }
  }
};

export default {
  loadRazorpay,
  openCheckout
};
