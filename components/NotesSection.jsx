import { Icon } from './Icon';
import { SectionHeader, EmptyState } from './ui';
import { NoteList } from './NoteList';
import { NOTES_FILTERS } from './categories';

/** Section Catatan: pencarian, filter dari navigasi, dan daftar catatan. */
export function NotesSection({
  filteredNotes,
  totalNonShopping,
  noteFilter,
  noteQuery,
  setNoteQuery,
  canWrite,
  onAdd,
  onEdit,
  onDelete,
  onRetry,
  onDiscard,
}) {
  const activeMeta = NOTES_FILTERS.find((c) => c.id === noteFilter) || NOTES_FILTERS[0];
  const searching = noteQuery.trim().length > 0;

  return (
    <section className="app-fade-in">
      <SectionHeader
        icon={activeMeta.icon}
        title={activeMeta.label}
        subtitle={`${filteredNotes.length} dari ${totalNonShopping} catatan`}
        actionLabel={canWrite ? 'Tambah' : undefined}
        onAction={onAdd}
      />

      {/* Pencarian catatan (judul + isi): kotak cari 48px, ikon di kiri */}
      <div className="relative mb-4">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mutedfg" aria-hidden="true">
          <Icon name="search" size={17} />
        </span>
        <input
          type="search"
          value={noteQuery}
          onChange={(e) => setNoteQuery(e.target.value)}
          placeholder="Cari judul atau isi catatan..."
          aria-label="Cari catatan"
          className="input-field min-h-[48px] w-full rounded-xl border border-line bg-canvas py-2 pl-11 pr-12 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand"
        />
        {searching && (
          <button
            type="button"
            onClick={() => setNoteQuery('')}
            aria-label="Bersihkan pencarian"
            className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-muted hover:text-ink"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      {filteredNotes.length === 0 ? (
        <EmptyState
          icon={searching ? 'search' : 'note'}
          title={searching ? 'Catatan tidak ditemukan' : 'Tidak ada catatan di filter ini'}
          message={
            searching
              ? `Tidak ada catatan yang cocok dengan "${noteQuery.trim()}". Coba kata kunci lain.`
              : 'Ubah filter, atau tambahkan catatan baru.'
          }
        />
      ) : (
        <NoteList
          notes={filteredNotes}
          onEdit={onEdit}
          onDelete={onDelete}
          onRetry={onRetry}
          onDiscard={onDiscard}
          readOnly={!canWrite}
        />
      )}
    </section>
  );
}
