import { useEffect, useState } from 'react';

import { gcalApi } from '../services/client';

/** Status & aksi integrasi Google Calendar untuk halaman Pengaturan. */
export function useGoogleCalendar(pushToast) {
  const [gcal, setGcal] = useState({
    loading: false,
    connecting: false,
    connected: false,
    email: null,
    error: null,
    notConfigured: false,
  });

  const refreshGcalStatus = async () => {
    setGcal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const s = await gcalApi.status();
      setGcal({
        loading: false,
        connecting: false,
        connected: !!s.connected,
        email: s.email || null,
        calendarId: s.calendar_id || null,
        error: null,
        notConfigured: false,
      });
    } catch (e) {
      setGcal((prev) => ({
        ...prev,
        loading: false,
        error: e.message === 'NETWORK_ERROR' ? 'Tidak dapat menghubungi server.' : e.message,
      }));
    }
  };

  // Pergi ke halaman consent Google; balikannya lewat ?gcal=connected / ?gcal=error
  const connectGoogleCalendar = async () => {
    setGcal((prev) => ({ ...prev, connecting: true, error: null }));
    try {
      const { url } = await gcalApi.login(window.location.origin);
      window.location.href = url;
    } catch (e) {
      const notConfigured = e.message.includes('belum di-set');
      setGcal((prev) => ({
        ...prev,
        connecting: false,
        notConfigured,
        error: notConfigured ? null : `Gagal memulai: ${e.message}`,
      }));
    }
  };

  const disconnectGoogleCalendar = async () => {
    try {
      await gcalApi.disconnect();
      setGcal((prev) => ({ ...prev, connected: false, email: null }));
      pushToast({
        message: 'Google Calendar diputus. Event yang sudah terlanjur dikirim tetap tersimpan di Google.',
        duration: 4500,
      });
    } catch (e) {
      pushToast({ message: `Gagal memutus koneksi: ${e.message}`, duration: 3500, tone: 'danger' });
    }
  };

  // Hasil OAuth Google: ?gcal=connected atau ?gcal=error&reason=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('gcal');
    if (!result) return;
    const reason = params.get('reason');
    params.delete('gcal');
    params.delete('reason');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);

    if (result === 'connected') {
      pushToast({
        message: 'Google Calendar tersambung. Agenda & tagihan otomatis ikut ter-push.',
        duration: 4500,
      });
    } else {
      pushToast({
        message: `Gagal menyambungkan Google Calendar${reason ? ` (${reason})` : ''}. Coba lagi dari menu Pengaturan.`,
        duration: 5500,
        tone: 'danger',
      });
    }
    refreshGcalStatus();
  }, []);

  return { gcal, refreshGcalStatus, connectGoogleCalendar, disconnectGoogleCalendar };
}
