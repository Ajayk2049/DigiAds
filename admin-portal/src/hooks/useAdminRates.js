'use client';

import { adminService } from '@/services/adminService';

export default function useAdminRates(token, fetchDashboardData, showNotification) {
  const handleSaveRate = async (rateData) => {
    if (!token) {
      showNotification('Authentication session expired. Please sign in again.', 'error');
      return;
    }

    const amountInPaise = Math.round(parseFloat(rateData.amount) * 100);
    if (isNaN(amountInPaise) || amountInPaise <= 0) {
      showNotification('Please enter a valid rate price in INR.', 'error');
      return;
    }

    const payload = {
      deviceType: rateData.deviceType,
      mediaType: rateData.mediaType || 'video',
      maxVideoLengthSeconds: rateData.maxVideoLengthSeconds ? parseInt(rateData.maxVideoLengthSeconds, 10) : 30,
      durationDays: parseInt(rateData.durationDays, 10),
      frequency: rateData.frequency,
      amount: amountInPaise,
      pricingType: rateData.pricingType || 'per_device'
    };

    try {
      const res = await adminService.saveRate(token, rateData.id, payload);
      if (res.data?.success) {
        showNotification(rateData.id ? 'Rate plan updated successfully!' : 'Rate card created successfully!', 'success');
        await fetchDashboardData(token);
      } else {
        showNotification(res.data?.message || 'Failed to save rate card.', 'error');
      }
    } catch (err) {
      console.error('[useAdminRates] handleSaveRate Error:', err);
      showNotification(err.response?.data?.message || 'Failed to save rate card.', 'error');
    }
  };

  const handleDeleteRate = async (rateId) => {
    if (!token || !rateId) return;

    if (!window.confirm('Are you sure you want to delete this ad rate card?')) {
      return;
    }

    try {
      const res = await adminService.deleteRate(token, rateId);
      if (res.data?.success) {
        showNotification('Rate card deleted successfully!', 'success');
        await fetchDashboardData(token);
      } else {
        showNotification(res.data?.message || 'Failed to delete rate card.', 'error');
      }
    } catch (err) {
      console.error('[useAdminRates] handleDeleteRate Error:', err);
      showNotification(err.response?.data?.message || 'Failed to delete rate card.', 'error');
    }
  };

  return {
    handleSaveRate,
    handleDeleteRate
  };
}
