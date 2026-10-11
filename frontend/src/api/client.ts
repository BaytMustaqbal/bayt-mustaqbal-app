// frontend/src/api/client.ts
// Frontend API client for Cloudflare Worker backend

const API_BASE = '/api'; // Cloudflare Pages proxies /api/* to Worker

interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; details?: any };
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('auth_token', token);
    else localStorage.removeItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include'
    });

    const result = await response.json();
    
    if (!result.ok) {
      // Handle auth errors
      if (result.error?.code === 'UNAUTHENTICATED') {
        this.setToken(null);
        window.location.href = '/login';
      }
      throw new Error(result.error?.message || 'API Error');
    }

    return result;
  }

  // Auth
  async login(email: string, password: string) {
    const result = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (result.data?.token) this.setToken(result.data.token);
    return result.data;
  }

  async me() {
    return this.request<{ user: any }>('/auth/me');
  }

  // Transactions
  async listTransactions(params: Record<string, any> = {}) {
    const search = new URLSearchParams(params).toString();
    return this.request(`/txn/list?${search}`);
  }

  async createTransaction(data: any) {
    return this.request('/txn/create', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateTransaction(data: any) {
    return this.request('/txn/update', { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteTransaction(txnId: string, rev: number) {
    return this.request(`/txn/delete?txn_id=${txnId}&rev=${rev}`, { method: 'DELETE' });
  }

  // Bills
  async listBills(params: Record<string, any> = {}) {
    const search = new URLSearchParams(params).toString();
    return this.request(`/bill/list?${search}`);
  }

  async createBill(data: any) {
    return this.request('/bill/create', { method: 'POST', body: JSON.stringify(data) });
  }

  async payBill(data: any) {
    return this.request('/bill/pay', { method: 'POST', body: JSON.stringify(data) });
  }

  async generateBills(periode: string, force = false) {
    return this.request('/bill/generate', { method: 'POST', body: JSON.stringify({ periode, force }) });
  }

  // Categories
  async listCategories() {
    return this.request('/categories/list');
  }

  async createCategory(data: any) {
    return this.request('/categories/create', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateCategory(data: any) {
    return this.request('/categories/update', { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteCategory(categoryId: string, rev: number) {
    return this.request(`/categories/delete?category_id=${categoryId}&rev=${rev}`, { method: 'DELETE' });
  }

  async reorderCategories(orders: { category_id: string; urutan: number }[]) {
    return this.request('/categories/reorder', { method: 'PUT', body: JSON.stringify({ orders }) });
  }

  // Settings (Admin)
  async getSettings() {
    return this.request('/settings/get');
  }

  async setSetting(key: string, value: string) {
    return this.request('/settings/set', { method: 'POST', body: JSON.stringify({ key, value }) });
  }

  async testWA() {
    return this.request('/settings/test-wa', { method: 'POST' });
  }

  async getStats() {
    return this.request('/settings/stats');
  }

  // Users (Admin)
  async listUsers() {
    return this.request('/auth/users');
  }

  async createUser(data: any) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateUser(data: any) {
    return this.request('/auth/users', { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteUser(userId: string, rev: number) {
    return this.request(`/auth/users/${userId}?rev=${rev}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

// React hook for auth state
export function useAuth() {
  const token = localStorage.getItem('auth_token');
  return { isAuthenticated: !!token, token };
}