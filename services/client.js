/**
 * API Client — wrapper fetch ke backend Cloudflare Worker (api.baytmustaqbal.my.id).
 *
 * Auth: JWT disimpan di localStorage, dikirim via header Authorization.
 * Backend juga menggunakan HttpOnly cookie, tapi header digunakan agar
 * bekerja di dev (Vite proxy) + production (cross-origin subdomain).
 *
 * Response format semua endpoint: { ok, data, error }
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.baytmustaqbal.my.id/api';

const TOKEN_KEY = 'bm-api-token';

/* ---- Token management ----
   "Ingat saya" di halaman login menentukan tempat simpan:
   - dicentang  → localStorage  (tetap login meski browser/aplikasi ditutup)
   - tidak      → sessionStorage (login ulang tiap kali aplikasi dibuka)
   getToken membaca keduanya; clearToken membersihkan keduanya. */
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
};
export const setToken = (token, remember = true) => {
  try {
    // Selalu bersihkan satu sisi dulu supaya tak ada sisa dari sesi sebelumnya.
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    if (remember) localStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* kuota penuh / mode privat */
  }
};
export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* abaikan */
  }
};

/* ---- Core fetch wrapper ---- */
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (e) {
    throw new Error('NETWORK_ERROR');
  }

  if (response.status === 401) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }

  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.error?.message || 'API error');
  }

  return result.data;
}

/* ---- Auth ---- */
export const auth = {
  login: async (username, password, remember = true) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    // data = { token, user: { id, username, nama, role } }
    // remember=false → token hanya di sessionStorage (habis saat ditutup)
    setToken(data.token, remember);
    return data;
  },
  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      /* tetap clear token meski API gagal */
    }
    clearToken();
  },
  me: async () => {
    return apiFetch('/auth/me');
  },
  register: async (username, password, nama, familyRole = 'anak', generasi = 'orangtua', birthDate = null, nickname = null, groupRole = 'anak') => {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username, password, nama,
        family_role: familyRole,
        generasi,
        birth_date: birthDate,
        nickname,
        group_role: groupRole,
      }),
    });
  },
  // Update profil sendiri (nama, panggilan, tanggal lahir, avatar) — PUT /auth/me
  updateProfile: async ({ nama, nickname, birthDate, avatarUrl }) => {
    const body = {};
    if (nama !== undefined) body.nama = nama;
    if (nickname !== undefined) body.nickname = nickname;
    if (birthDate !== undefined) body.birth_date = birthDate;
    if (avatarUrl !== undefined) body.avatar_url = avatarUrl;
    return apiFetch('/auth/me', { method: 'PUT', body: JSON.stringify(body) });
  },
  // Daftar anggota keluarga (semua akun aktif, master disembunyikan backend)
  users: async () => {
    return apiFetch('/auth/users');
  },
};

/* ---- Data transform: Transaction (backend) ↔ Expense/Income (frontend) ---- */
export const txnTransform = {
  // API response → frontend transaction (`type` = 'out' pengeluaran | 'in' pemasukan)
  toTxn: (txn) => ({
    id: txn.id,
    type: txn.type === 'in' ? 'in' : 'out',
    category: txn.category_id || 'lainnya',
    description: txn.description || '',
    amount: Number(txn.amount) || 0,
    date: txn.date,
    bucket: 'auto',
  }),
  // Alias kompatibilitas (bentuk lama tanpa `type`)
  toExpense: (txn) => txnTransform.toTxn(txn),
  // Frontend item → API payload. `type` ikut dari item (default 'out')
  toPayload: (item) => ({
    amount: Number(item.amount) || 0,
    type: item.type === 'in' ? 'in' : 'out',
    date: item.date,
    category_id: item.category,
    description: item.description || null,
  }),
};

/* ---- Data transform: CalendarEvent (backend) ↔ Schedule (frontend) ---- */
export const calTransform = {
  toSchedule: (evt) => ({
    id: evt.id,
    title: evt.title,
    date: evt.date,
    time: evt.time || '',
    member: evt.member_id || '',
    category: evt.category || 'keluarga',
  }),
  toPayload: (item) => ({
    title: item.title,
    date: item.date,
    time: item.time || null,
    category: item.category || null,
    member_id: item.member || null,
    description: item.description || null,
  }),
};

/* ---- Data transform: Note (backend) ↔ Note (frontend) ---- */
export const noteTransform = {
  toNote: (n, currentUser) => ({
    id: n.id,
    title: n.title,
    body: n.content || '',
    category: n.category || 'info',
    pinned: n.important === 1,
    author: currentUser?.name || '',
    updatedAt: (n.updated_at || n.created_at || '').slice(0, 10),
  }),
  toPayload: (item) => ({
    title: item.title,
    content: item.body || null,
    category: item.category || null,
    important: item.pinned ? 1 : 0,
  }),
};

/* ---- API modules ---- */

// Transactions — dua arah: 'out' (pengeluaran) & 'in' (pemasukan).
// Backend menyimpan keduanya di tabel `transactions`; modul ini memisahkannya.
export const txn = {
  // Semua transaksi, dipetakan ke bentuk frontend (ada `type`)
  fetchAll: async () => {
    const results = await apiFetch('/txn');
    return results.map(txnTransform.toTxn);
  },
  fetch: async () => {
    return (await txn.fetchAll()).filter((t) => t.type === 'out');
  },
  fetchIncome: async () => {
    return (await txn.fetchAll()).filter((t) => t.type === 'in');
  },
  create: async (item) => {
    const result = await apiFetch('/txn', {
      method: 'POST',
      body: JSON.stringify(txnTransform.toPayload(item)),
    });
    return txnTransform.toTxn(result);
  },
  update: async (id, item) => {
    const result = await apiFetch(`/txn/${id}`, {
      method: 'PUT',
      body: JSON.stringify(txnTransform.toPayload(item)),
    });
    return txnTransform.toTxn(result);
  },
  delete: async (id) => {
    return apiFetch(`/txn/${id}`, { method: 'DELETE' });
  },
};

// Calendar Events (schedule)
export const cal = {
  fetch: async () => {
    const results = await apiFetch('/cal');
    return results.map(calTransform.toSchedule);
  },
  create: async (item) => {
    const result = await apiFetch('/cal', {
      method: 'POST',
      body: JSON.stringify(calTransform.toPayload(item)),
    });
    return calTransform.toSchedule(result);
  },
  update: async (id, item) => {
    const result = await apiFetch(`/cal/${id}`, {
      method: 'PUT',
      body: JSON.stringify(calTransform.toPayload(item)),
    });
    return calTransform.toSchedule(result);
  },
  delete: async (id) => {
    return apiFetch(`/cal/${id}`, { method: 'DELETE' });
  },
};

// Notes
export const notesApi = {
  fetch: async (currentUser) => {
    const results = await apiFetch('/note');
    return results.map((n) => noteTransform.toNote(n, currentUser));
  },
  create: async (item, currentUser) => {
    const result = await apiFetch('/note', {
      method: 'POST',
      body: JSON.stringify(noteTransform.toPayload(item)),
    });
    return noteTransform.toNote(result, currentUser);
  },
  update: async (id, item, currentUser) => {
    const result = await apiFetch(`/note/${id}`, {
      method: 'PUT',
      body: JSON.stringify(noteTransform.toPayload(item)),
    });
    return noteTransform.toNote(result, currentUser);
  },
  delete: async (id) => {
    return apiFetch(`/note/${id}`, { method: 'DELETE' });
  },
};

// Settings (budget income / ratios / pos)
export const settingsApi = {
  fetchAll: async () => {
    return apiFetch('/settings');
  },
  upsert: async (key, value) => {
    // Try create first; if CONFLICT (key exists), find & update
    try {
      const result = await apiFetch('/settings', {
        method: 'POST',
        body: JSON.stringify({ key, value }),
      });
      return result;
    } catch (e) {
      if (e.message.includes('sudah ada') || e.message.includes('CONFLICT')) {
        // Key exists — fetch all and update
        const all = await apiFetch('/settings');
        const existing = all.find((s) => s.key === key);
        if (existing) {
          return apiFetch(`/settings/${existing.id}`, {
            method: 'PUT',
            body: JSON.stringify({ key, value }),
          });
        }
      }
      throw e;
    }
  },
};
