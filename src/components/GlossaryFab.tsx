// Floating glossary opener (desktop; swaps to the header variant ≤640px via
// CSS). Open state = solid cyan, matching the monolith's active FAB style.
// `declassified` carries the transient "+N" badge set when a freshly opened
// module unlocks terms (issue #65).
import { BookIcon } from './AppHeader';

interface GlossaryFabProps {
  open: boolean;
  onOpen: () => void;
  declassified: number | null;
}

export function GlossaryFab({ open, onOpen, declassified }: GlossaryFabProps) {
  const flash = !open && !!declassified;
  return (
    <button
      className={`gloss-fab${open ? ' open' : ''}${flash ? ' declass' : ''}`}
      type="button"
      title={flash ? `${declassified} new term(s) declassified` : 'Open glossary'}
      onClick={onOpen}
    >
      <BookIcon size={15} />
      {flash ? `+${declassified} DECLASSIFIED` : 'GLOSSARY'}
    </button>
  );
}
