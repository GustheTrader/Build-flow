const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : '/api');

let authToken: string | null = localStorage.getItem('auth_token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || response.statusText);
  }

  return response.json();
};

export const auth = {
  login: async (email: string, password: string) => {
    const data = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  register: async (userData: any) => {
    const data = await fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    setAuthToken(data.token);
    return data;
  },

  logout: () => {
    setAuthToken(null);
  },
};

export const projects = {
  list: (params?: any) => fetchAPI(`/projects${params ? `?${new URLSearchParams(params)}` : ''}`),
  get: (id: string) => fetchAPI(`/projects/${id}`),
  create: (data: any) => fetchAPI('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchAPI(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/projects/${id}`, { method: 'DELETE' }),
  getMetrics: (id: string) => fetchAPI(`/projects/${id}/metrics`),
  getTasks: (id: string) => fetchAPI(`/projects/${id}/tasks`),
  addTask: (id: string, task: any) => fetchAPI(`/projects/${id}/tasks`, { method: 'POST', body: JSON.stringify(task) }),
};

export const aiAgents = {
  execute: (agentType: string, input: any, projectId?: string) =>
    fetchAPI('/ai-agents/execute', {
      method: 'POST',
      body: JSON.stringify({ agentType, input, projectId }),
    }),

  orchestrate: (workflow: string, context: any, projectId?: string) =>
    fetchAPI('/ai-agents/orchestrate', {
      method: 'POST',
      body: JSON.stringify({ workflow, context, projectId }),
    }),

  getMetrics: () => fetchAPI('/ai-agents'),
  getHealth: () => fetchAPI('/ai-agents'),
  
  getHITLRequests: (status?: string) =>
    fetchAPI(`/hitl-requests${status ? `?status=${status}` : ''}`),

  approveHITL: (id: string, notes?: string) =>
    fetchAPI(`/hitl-requests`, {
      method: 'POST',
      body: JSON.stringify({ requestId: id, decision: 'approved', notes }),
    }),

  rejectHITL: (id: string, notes?: string) =>
    fetchAPI(`/hitl-requests`, {
      method: 'POST',
      body: JSON.stringify({ requestId: id, decision: 'rejected', notes }),
    }),
};

export const payments = {
  createPaymentIntent: (data: any) =>
    fetchAPI('/payments/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createInvoice: (data: any) =>
    fetchAPI('/payments/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getInvoice: (id: string) => fetchAPI(`/payments/invoices/${id}`),
  
  getProjectInvoices: (projectId: string) =>
    fetchAPI(`/payments/projects/${projectId}/invoices`),

  getProjectPayments: (projectId: string) =>
    fetchAPI(`/payments/projects/${projectId}/payments`),

  getPayment: (paymentIntentId: string) =>
    fetchAPI(`/payments/payments/${paymentIntentId}`),

  getConfig: () => fetchAPI('/payments/config'),
};

export const dashboard = {
  getMetrics: () => fetchAPI('/dashboard'),
};

// ============================================================================
// FINANCIAL MANAGEMENT API
// ============================================================================

export const invoices = {
  list: (params?: any) => fetchAPI(`/invoices${params ? `?${new URLSearchParams(params)}` : ''}`),
  get: (id: string) => fetchAPI(`/invoices/${id}`),
  create: (data: any) => fetchAPI('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchAPI(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/invoices/${id}`, { method: 'DELETE' }),
  send: (id: string) => fetchAPI(`/invoices/${id}/send`, { method: 'POST' }),
  getStats: (projectId?: string) => fetchAPI(`/invoices/stats/summary${projectId ? `?projectId=${projectId}` : ''}`),
};

export const purchaseOrders = {
  list: (params?: any) => fetchAPI(`/purchase-orders${params ? `?${new URLSearchParams(params)}` : ''}`),
  get: (id: string) => fetchAPI(`/purchase-orders/${id}`),
  create: (data: any) => fetchAPI('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchAPI(`/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/purchase-orders/${id}`, { method: 'DELETE' }),
  send: (id: string) => fetchAPI(`/purchase-orders/${id}/send`, { method: 'POST' }),
  receiveItems: (id: string, data: any) => fetchAPI(`/purchase-orders/${id}/receive`, { method: 'POST', body: JSON.stringify(data) }),
  getStats: (projectId?: string) => fetchAPI(`/purchase-orders/stats/summary${projectId ? `?projectId=${projectId}` : ''}`),
};

export const vendors = {
  list: (params?: any) => fetchAPI(`/vendors${params ? `?${new URLSearchParams(params)}` : ''}`),
  get: (id: string) => fetchAPI(`/vendors/${id}`),
  create: (data: any) => fetchAPI('/vendors', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchAPI(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/vendors/${id}`, { method: 'DELETE' }),
  getCategories: () => fetchAPI('/vendors/categories/list'),
};

export const financialPayments = {
  list: (params?: any) => fetchAPI(`/payments${params ? `?${new URLSearchParams(params)}` : ''}`),
  get: (id: string) => fetchAPI(`/payments/${id}`),
  create: (data: any) => fetchAPI('/payments', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/payments/${id}`, { method: 'DELETE' }),
  getStats: (projectId?: string) => fetchAPI(`/payments/stats/summary${projectId ? `?projectId=${projectId}` : ''}`),
};
