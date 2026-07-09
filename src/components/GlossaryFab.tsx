// Floating glossary opener (desktop; swaps to the header variant ≤640px via
// CSS). Open state = solid cyan, matching the monolith's active FAB style.
import { BookIcon } from './AppHeader';

export function GlossaryFab({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  return (
    <button
      className={`gloss-fab${open ? ' open' : ''}`}
      type="button"
      title="Open glossary"
      onClick={onOpen}
    >
      <BookIcon size={15} />
      GLOSSARY
    </button>
  );
}
