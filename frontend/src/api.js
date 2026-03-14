const API_BASE = '/api';

export async function fetchJSON(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(err || res.statusText);
    }
    return res.json();
}

export const getDashboardKPIs = () => fetchJSON('/dashboard/kpis');
export const getSpendOverTime = () => fetchJSON('/transactions/spend-over-time');

// Transactions
export const getTransactions = () => fetchJSON('/transactions');
export const getTransaction = (id) => fetchJSON(`/transactions/${id}`);
export const createTransaction = (data) =>
    fetchJSON('/transactions', { method: 'POST', body: JSON.stringify(data) });

// Vendors
export const getVendors = () => fetchJSON('/vendors');

// Categories
export const getCategories = () => fetchJSON('/categories');

// Flags
export const getFlags = () => fetchJSON('/flags');
export const markFlagReviewed = (id) =>
    fetchJSON(`/flags/${id}/review`, { method: 'PATCH' });

// Reports
export const getReports = () => fetchJSON('/reports');

// Agent
export const agentChat = (message) =>
    fetchJSON('/agent/chat', { method: 'POST', body: JSON.stringify({ message }) });
export const agentScan = () =>
    fetchJSON('/agent/scan', { method: 'POST' });
