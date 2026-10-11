export function formatRupiah(num: number | null | undefined): string {
  if (num === null || num === undefined || num === '') return '-';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  return Number(num).toLocaleString('id-ID');
}

export function formatPercent(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  return Math.round(num) + '%';
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return formatDate(dateStr) + ' ' + new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function escapeHtml(str: string | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.substring(0, max - 3) + '...' : str;
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getColorForIndex(index: number): string {
  const colors = ['#4285f4','#ea4335','#fbbc04','#34a853','#ff6d01','#46bdc6','#7baaf9','#f07b72','#fcd04f','#57bb8a','#ff8f6b','#8e7cc3'];
  return colors[index % colors.length];
}

export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getTomorrow(): string {
  const t = new Date(); t.setDate(t.getDate() + 1); return t.toISOString().split('T')[0];
}

export function getCurrentPeriod(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}