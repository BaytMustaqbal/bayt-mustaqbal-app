import { Icon } from './Icon';
import { Card, SectionHeader, Badge } from './ui';
import { SlideTabs } from './SlideTabs';
import ShoppingList from './ShoppingListComp';
import Service from './ServiceComp';
import SubscriptionsComp from './SubscriptionsComp';
import RecurringTxnPanel from './RecurringTxnPanel';
import TargetTabunganComp from './TargetTabunganComp';
import DebtComp from './DebtComp';
import { subApi, recurringApi, goalsApi } from '../services/client';

const TERJADWAL_TABS = [
  { id: 'berulang', label: 'Berulang', icon: 'repeat' },
  { id: 'pengeluaran', label: 'Pengeluaran', icon: 'receipt' },
  { id: 'service', label: 'Services', icon: 'wrench' },
  { id: 'tabungan', label: 'Whishlist', icon: 'piggyBank' },
  { id: 'belanja', label: 'Belanja', icon: 'shoppingBag' },
  { id: 'langganan', label: 'Langganan', icon: 'card' },
  { id: 'utang', label: 'Utang', icon: 'handCoins' },
];

/** Section Tugas Terjadwal: pengeluaran, wishlist, belanja, service,
    langganan, transaksi berulang, dan utang. */
export function TerjadwalSection({
  data,
  canWrite,
  formatCurrency,
  terjadwalTab,
  setTerjadwalTab,
  recordScheduledExpense,
  openAdd,
  openEdit,
  goals,
  addGoal,
  updateGoal,
  deleteGoal,
  shopping,
  service,
  subs,
  setSubs,
  recurringTxns,
  setRecurringTxns,
  budgetCategoryOptions,
  accounts,
  currentUser,
  pushToast,
}) {
  return (
    <section className="app-fade-in">
      <SectionHeader
        icon="clock"
        title="Tugas Terjadwal"
        subtitle="Semua aktivitas terjadwal keluarga"
      />
      <div className="mb-4 overflow-x-auto rounded-xl bg-muted/50 p-1" role="tablist" aria-label="Jenis tugas terjadwal">
        <SlideTabs
          tabs={TERJADWAL_TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
          active={terjadwalTab}
          onChange={setTerjadwalTab}
        />
      </div>

      {terjadwalTab === 'pengeluaran' && (
        <div className="space-y-3">
          {(() => {
            const now = new Date();
            const y = now.getFullYear();
            const m = now.getMonth() + 1;
            const monthPrefix = `${y}-${String(m).padStart(2, '0')}`;
            const todayStr = `${monthPrefix}-${String(now.getDate()).padStart(2, '0')}`;
            const lastDay = new Date(y, m, 0).getDate();
            const recordedNames = new Set(
              (data.expenses || [])
                .filter((e) => (e.date || '').startsWith(monthPrefix))
                .map((e) => e.description)
            );
            const pending = (data.scheduledExpenses || []).filter((t) => {
              if (t.active === false) return false;
              const d = Math.min(Number(t.day) || 1, lastDay);
              const due = `${monthPrefix}-${String(d).padStart(2, '0')}`;
              return due <= todayStr && !recordedNames.has(t.name);
            });
            if (pending.length === 0) return null;
            return (
              <Card className="border-amber/40 bg-amber/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Icon name="bell" size={16} className="shrink-0 text-toneamberfg" />
                  <h3 className="text-sm font-bold text-ink">Menunggu Konfirmasi ({pending.length})</h3>
                </div>
                <p className="mb-3 text-xs text-mutedfg">
                  Jadwal ini jatuh tempo bulan ini tetapi belum dicatat. Konfirmasi kalau sudah benar-benar dibayar /
                  dilakukan.
                </p>
                <ul className="space-y-2">
                  {pending.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 rounded-xl border border-line bg-canvas p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{t.name}</p>
                        <p className="text-[11px] text-mutedfg">{formatCurrency(t.amount)}</p>
                      </div>
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => recordScheduledExpense(t)}
                          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-semibold text-white transition-colors hover:bg-brand/90"
                        >
                          <Icon name="check" size={14} />
                          Catat
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })()}
          {(!data.scheduledExpenses || data.scheduledExpenses.length === 0) ? (
            <p className="text-sm text-mutedfg">Belum ada pengeluaran terjadwal.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-canvas">
              {data.scheduledExpenses.map((tpl) => (
                <li key={tpl.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brandtint text-brandfg" aria-hidden="true">
                    <Icon name="receipt" size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{tpl.title || tpl.name}</p>
                    <p className="text-[11px] text-mutedfg">
                      {tpl.amount != null ? formatCurrency(tpl.amount) : ''}
                      {tpl.frequency ? ` • ${tpl.frequency}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {tpl.active === false ? <Badge tone="gray">Nonaktif</Badge> : <Badge tone="green">Aktif</Badge>}
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => openEdit('scheduledTemplate', tpl)}
                        aria-label={`Edit ${tpl.name}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-muted hover:text-ink"
                      >
                        <Icon name="edit" size={15} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {canWrite && (
            <button type="button" onClick={() => openAdd('scheduledTemplate')} className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-canvas px-3 text-sm font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink">
              <Icon name="plus" size={15} /> Tambah Pengeluaran Terjadwal
            </button>
          )}
        </div>
      )}

      {terjadwalTab === 'tabungan' && (
        <TargetTabunganComp
          goals={goals}
          canWrite={canWrite}
          onAdd={addGoal}
          onUpdate={updateGoal}
          onDelete={deleteGoal}
          onTransaction={async (id, payload) => goalsApi.addTransaction(id, payload)}
          formatCurrency={formatCurrency}
        />
      )}

      {terjadwalTab === 'belanja' && (
        (() => {
          const period = shopping.shoppingPeriod;
          const title = shopping.shoppingTitleFor(period);
          const state = shopping.displayShoppingState(period);
          const periods = [
            { id: 'mingguan', label: 'Mingguan', icon: 'calendar' },
            { id: 'bulanan', label: 'Bulanan', icon: 'receipt' },
          ];
          return (
            <div className="space-y-3">
              <div className="flex gap-1.5 rounded-xl bg-muted/50 p-1" role="tablist" aria-label="Periode daftar belanja">
                {periods.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={period === p.id}
                    onClick={() => shopping.setShoppingPeriod(p.id)}
                    className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors ${
                      period === p.id ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:bg-muted hover:text-ink'
                    }`}
                  >
                    <Icon name={p.icon} size={15} />
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-mutedfg">{title}</p>
              <ShoppingList
                state={state}
                formatCurrency={formatCurrency}
                canWrite={canWrite}
                onAddItem={(v) => shopping.addShoppingItem(v, period)}
                onToggle={(id) => shopping.toggleShoppingItem(id, period)}
                onRemove={(id) => shopping.removeShoppingItem(id, period)}
                onSaveTemplate={shopping.saveShoppingAsTemplate}
                onFinish={() => shopping.finishShopping(period)}
              />
            </div>
          );
        })()
      )}

      {terjadwalTab === 'service' && (
        <Service
          inventory={service.inventory}
          history={service.history}
          vehicles={data.vehicles}
          formatCurrency={formatCurrency}
          canWrite={canWrite}
          onAddSparepart={service.addSparepart}
          onUpdateSparepart={service.updateSparepart}
          onRemoveSparepart={service.removeSparepart}
          onAddService={service.addServiceRecord}
          onUpdateService={service.updateServiceRecord}
          onRetryRecord={service.retryOutboxOp}
          onDiscardRecord={service.discardOutboxOp}
          onDeleteRecord={service.deleteServiceRecord}
          onAddVehicle={service.addVehicle}
          onUpdateVehicle={service.updateVehicle}
          onRemoveVehicle={service.removeVehicle}
          activeTab={service.activeTab}
          onTabChange={service.setActiveTab}
        />
      )}

      {terjadwalTab === 'langganan' && (
        <SubscriptionsComp
          subs={subs}
          canWrite={canWrite}
          formatCurrency={formatCurrency}
          onSave={async (item) => {
            const saved = item.id
              ? await subApi.update(item.id, item)
              : await subApi.create(item);
            setSubs((prev) => {
              if (item.id) return prev.map((s) => (s.id === item.id ? saved : s));
              return [saved, ...prev];
            });
          }}
          onDelete={async (id) => {
            await subApi.delete(id);
            setSubs((prev) => prev.filter((s) => s.id !== id));
          }}
        />
      )}

      {terjadwalTab === 'berulang' && (
        <RecurringTxnPanel
          items={recurringTxns}
          canWrite={canWrite}
          formatCurrency={formatCurrency}
          categories={budgetCategoryOptions}
          accounts={accounts.filter((a) => a.user_id === currentUser?.id)}
          vehicles={data.vehicles || []}
          onSave={async (item) => {
            const saved = item.id
              ? await recurringApi.update(item.id, item)
              : await recurringApi.create(item);
            setRecurringTxns((prev) => {
              if (item.id) return prev.map((r) => (r.id === item.id ? saved : r));
              return [saved, ...prev];
            });
            pushToast({ message: item.id ? 'Transaksi berulang diperbarui' : 'Transaksi berulang ditambahkan', duration: 2500 });
          }}
          onDelete={async (id) => {
            await recurringApi.remove(id);
            setRecurringTxns((prev) => prev.filter((r) => r.id !== id));
            pushToast({ message: 'Transaksi berulang dihapus', duration: 2500 });
          }}
          onPurchase={async (item, payload) => {
            const res = await recurringApi.purchase(item.id, payload);
            if (res?.template) {
              setRecurringTxns((prev) => prev.map((r) => (r.id === item.id ? res.template : r)));
            }
            pushToast({
              message: res?.intervalDays
                ? `Tercatat. Perkiraan habis berikutnya ${res.nextDue} (pola ${res.intervalDays} hari).`
                : 'Tercatat. Interval belum bisa dihitung, butuh minimal 2 pembelian.',
              duration: 3500,
            });
          }}
        />
      )}

      {terjadwalTab === 'utang' && (
        <DebtComp users={data.family} canWrite={canWrite} formatCurrency={formatCurrency} />
      )}
    </section>
  );
}
