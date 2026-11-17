/**
 * Siapkan foto struk untuk dikirim ke endpoint AI.
 * Foto diperkecil ke sisi terpanjang 1600 px dan diubah ke JPEG,
 * supaya token gambar dan waktu unggah tetap kecil.
 * Mengembalikan base64 tanpa prefix data URL.
 */

const MAX_SIDE = 1600;
const QUALITY = 0.8;

function muatGambar(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Foto tidak bisa dibuka'));
    };
    img.src = url;
  });
}

export async function siapkanGambarStruk(file) {
  const img = await muatGambar(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width || 1, img.height || 1));
  const width = Math.max(1, Math.round((img.width || 1) * scale));
  const height = Math.max(1, Math.round((img.height || 1) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak tersedia');
  // Latar putih: PNG transparan tidak jadi hitam saat diubah ke JPEG.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob) throw new Error('Gagal mengubah foto');

  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('Gagal membaca foto'));
    reader.readAsDataURL(blob);
  });

  return { base64, mime: 'image/jpeg' };
}
