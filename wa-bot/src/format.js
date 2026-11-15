export function fmtRp(n) {
  return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
}

export function menuText() {
  return [
    'Halo! Saya Neuro, Asisten Pribadi Keluarga Bayt Mustaqbal 🤖',
    '',
    'Contoh yang bisa saya bantu:',
    '• "catat pengeluaran 50k makan siang"',
    '• "catat pemasukan 5jt gaji ke dompet BCA"',
    '• "ingatkan aku besok jam 9 bayar listrik"',
    '• "cek pengingat"',
    '• "tagihan belum lunas" / "tenggat pembayaran"',
    '• "agenda hari ini"',
    '• "saldo bulan ini"',
    '• "rangkuman bulan ini" / "rangkuman 7 hari"',
    '• "rincian pengeluaran per kategori"',
    '• "progres target tabungan"',
    '',
    'Untuk menyimpan catatan/pengingat, saya akan minta konfirmasi "ya" dulu.',
  ].join('\n');
}

export function formatSummary(rows, title) {
  const total = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const lines = [`📊 *${title}*`, ''];
  if (!rows.length) lines.push('Tidak ada data pengeluaran pada periode ini.');
  else for (const r of rows) lines.push(`• ${r.label}: ${fmtRp(r.total)}`);
  lines.push('', `Total: ${fmtRp(total)}`);
  return lines.join('\n');
}

export function formatSaldo(inMonth, outMonth) {
  const sisa = (Number(inMonth) || 0) - (Number(outMonth) || 0);
  return [
    '💰 *Saldo Bulan Ini*',
    '',
    `Pemasukan: ${fmtRp(inMonth)}`,
    `Pengeluaran: ${fmtRp(outMonth)}`,
    '',
    `Sisa: ${fmtRp(sisa)}`,
  ].join('\n');
}

export function formatAgenda(rows, todayLabel) {
  const lines = ['📅 *Agenda Hari Ini*', '', todayLabel, ''];
  if (!rows.length) lines.push('Tidak ada agenda hari ini. 🎉');
  else for (const r of rows) lines.push(`• ${r.time ? String(r.time).slice(0, 5) + ' ' : ''}${r.title}`);
  return lines.join('\n');
}

export function formatBills(rows) {
  const lines = ['🧾 *Tagihan Belum Lunas*', ''];
  if (!rows.length) {
    lines.push('Alhamdulillah, tidak ada tagihan yang belum lunas. 🎉');
  } else {
    const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    for (const r of rows) {
      lines.push(`• ${r.name}: ${fmtRp(r.amount)}`);
      if (r.due_date) lines.push(`  Jatuh tempo: ${r.due_date}`);
    }
    lines.push('', `Total: ${fmtRp(total)}`);
  }
  return lines.join('\n');
}

export function formatGoals(rows) {
  const lines = ['🎯 *Target Tabungan*', ''];
  if (!rows.length) {
    lines.push('Tidak ada target tabungan aktif.');
  } else {
    for (const g of rows) {
      const target = Number(g.target) || 0;
      const current = Number(g.current) || 0;
      const pct = target > 0 ? Math.round((current / target) * 100) : 0;
      const sisa = Math.max(0, target - current);
      lines.push(`• ${g.nama}: ${fmtRp(current)} / ${fmtRp(target)} (${pct}%)`);
      lines.push(g.achieved ? '  ✔ Tercapai' : `  Sisa: ${fmtRp(sisa)}`);
    }
  }
  return lines.join('\n');
}

export function formatCategoryDetail(rows) {
  const lines = ['📂 *Rekap Rinci Per Kategori*', ''];
  if (!rows.length) {
    lines.push('Tidak ada data pengeluaran bulan ini.');
  } else {
    const total = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
    for (const r of rows) lines.push(`• ${r.label}: ${fmtRp(r.total)} (${Number(r.count) || 0}x)`);
    lines.push('', `Total: ${fmtRp(total)}`);
  }
  return lines.join('\n');
}

export function formatReminders(rows) {
  const lines = ['⏰ *Pengingat Aktif*', ''];
  if (!rows.length) lines.push('Tidak ada pengingat aktif.');
  else for (const r of rows) {
    lines.push(`• ${r.message}`);
    lines.push(`  ${r.remind_at}`);
  }
  return lines.join('\n');
}

export function confirmExpense({ amount, note }) {
  return [
    'Saya tangkap pengeluaran ini:',
    `• Nominal: ${fmtRp(amount)}`,
    `• Catatan: ${note || '-'}`,
    '',
    'Balas *ya* untuk simpan, atau *batal* untuk batalkan.',
  ].join('\n');
}

export function confirmIncome({ amount, note, accountName }) {
  return [
    'Saya tangkap pemasukan ini:',
    `• Nominal: ${fmtRp(amount)}`,
    `• Catatan: ${note || '-'}`,
    `• Dompet: ${accountName || 'tanpa dompet'}`,
    '',
    'Balas *ya* untuk simpan, atau *batal* untuk batalkan.',
  ].join('\n');
}

export function confirmReminder({ message, remindAtLabel }) {
  return [
    'Saya tangkap pengingat ini:',
    `• Pesan: ${message}`,
    `• Waktu: ${remindAtLabel}`,
    '',
    'Balas *ya* untuk simpan, atau *batal* untuk batalkan.',
  ].join('\n');
}
