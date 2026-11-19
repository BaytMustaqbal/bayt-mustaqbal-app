import { lazy } from 'react';

const SettingsComp = lazy(() => import('./SettingsComp'));

/** Section Pengaturan: integrasi, tema, keamanan akun, dan admin bot. */
export function PengaturanSection({
  gcal,
  onConnect,
  onDisconnect,
  theme,
  onThemeChange,
  onChangePassword,
  users,
  botAdmin,
  currentUserId,
}) {
  return (
    <SettingsComp
      gcal={gcal}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
      theme={theme}
      onThemeChange={onThemeChange}
      onChangePassword={onChangePassword}
      users={users}
      botAdmin={botAdmin}
      currentUserId={currentUserId}
    />
  );
}
