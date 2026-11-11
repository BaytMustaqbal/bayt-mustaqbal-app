/* Album foto keluarga — situs terpisah (repo bayt-mustaqbal-moment).
   Berisi masonry + lightbox; data foto & timeline disimpan di repo itu,
   bukan di app ini. Satu-satunya kontak app ke album adalah URL ini. */
export const ALBUM_URL = 'https://album.baytmustaqbal.my.id';

/** Buka album di tab baru ( situs terpisah, bukan halaman dalam app). */
export function openAlbum() {
  window.open(ALBUM_URL, '_blank', 'noopener,noreferrer');
}
