// Floating glossary button (desktop; swaps to the header variant ≤640px via
// CSS). Opens the glossary modal when that slice lands.
import { BookIcon } from './AppHeader';

export function GlossaryFab() {
  return (
    <button className="gloss-fab" type="button" title="Open glossary">
      <BookIcon size={15} />
      GLOSSARY
    </button>
  );
}
