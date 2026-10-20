# Spec: Frontend → Backend Integration

## Objective
Replace `mockData` in `App.jsx` with real API calls to `https://api.baytmustaqbal.my.id/api/*`.
Auth via JWT (HttpOnly cookie + Authorization header). Online-first with localStorage cache
for offline fallback.

## Scope Decisions (confirmed by Kakang)
1. **Selective integration** — integrate only features that have backend tables.
   Keep unmapped data (tasks, family profiles, familyMedical, familyDocuments,
   familyContacts, monthlyTrend, weekly, budget.pos) on localStorage.
2. **Login only** — replace WelcomeGate with login screen (username+password).
   No register; Kakang registers users manually.
3. **Online-first** — fetch from API when online; fallback to localStorage cache
   when offline. CRUD attempts API call first.

## Data Model Mapping

| Frontend (`mockData`) | Backend Table | Notes |
|---|---|---|
| `expenses[]` | `transactions` (type='out') | frontend `category` string → backend `category_id` TEXT |
| `schedule[]` | `calendar_events` | frontend `member` string → backend `member_id` TEXT |
| `notes[]` | `notes` | `body`→`content`, `pinned`→`important(0/1)` |
| `budget.income` | `settings` key='budget_income' | store as string value |
| `budget.ratios` | `settings` key='budget_ratios' | store as JSON string |
| `budget.pos` | localStorage (NO backend table) | keep local |
| `monthlyTrend[]` | computed from transactions | derive on load + on expense change |
| `weekly[]` | computed from transactions | derive on load + on expense change |
| `categories[]` | computed from expenses | derive on load + on expense change |
| `users[]` | backend `users` (auth only) | keep profiles local; auth uses username+password |
| `tasks[]` | NO backend table | keep local |
| `family[]` | backend `users` (partial) | backend users lack birthDate/blood/allergy — keep local |
| `familyMedical/Documents/Contacts` | NO backend table | keep local |

## API Client (`services/client.js`)

### Auth
- `login(username, password)` → POST `/auth/login` → returns `{ token, user }`, stores token in localStorage
- `logout()` → POST `/auth/logout`, clears token
- Token sent via `Authorization: Bearer <token>` header

### Data Modules
- `calendarEvents`: fetch(), create(item), update(id, item), delete(id)
- `transactions`: fetch() (filters type='out'), create(item), update(id, item), delete(id)
- `notesApi`: fetch(), create(item), update(id, item), delete(id)
- `settingsApi`: fetchAll(), upsert(key, value), update(id, key, value)

### Response Format (all endpoints)
```json
{ "ok": true, "data": ..., "error": null }
```

## App.jsx Changes
- Replace `mockData` import with API client import
- `loadInitialData()` → `loadFromAPI()` (async; merges API data + localStorage-only)
- `saveData()` remains for local state, but CRUD calls API first
- `addItem()`, `updateItem()`, `deleteItem()` become async API calls
- `WelcomeGate` → `LoginScreen`
- `AccountModal`: logout button calls `auth.logout()`
- `persist()` → `cacheData()` (localStorage cache of merged data)

## Login Flow
1. App starts → check localStorage token
2. If token → call `/auth/me` to verify → if valid, load data from API
3. If no token/invalid → show LoginScreen
4. Login success → store token → load data from API → hide LoginScreen

## Offline Behavior
- Detect `navigator.onLine` / `online`/`offline` events
- When offline: load from localStorage cache, disable API-dependent UI states
- When online: fetch fresh data from API, merge with localStorage-only data
- CRUD while offline: toast "offline" (optimistic local update + cache)
