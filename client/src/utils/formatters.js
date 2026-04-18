/**
 * Global Utility Functions for Formatting Numbers and Currency
 * Centralized here to maintain the DRY (Don't Repeat Yourself) principle.
 */

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat('en-IN');

export const formatCurrency = (value = 0) => currencyFormatter.format(Number(value || 0));

export const formatNumber = (value = 0) => numberFormatter.format(Number(value || 0));

export const formatDate = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

export const formatLastUpdated = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};
