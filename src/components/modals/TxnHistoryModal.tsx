// Transaction History modal (the account ledger): summary cells, then
// txns newest-first grouped by module. Rows with a qid deep-link back to
// the answered question in the player (jump handled by App).
// Narrow (≤640px) swaps the row DOM to a stacked layout, like the
// monolith's vw-tracked branch.
// Measured spec: docs/monolith-parity-spec.md — "Transaction History".
import { useSyncExternalStore } from 'react';
import type { Txn } from '../../lib/types';
import { ModalShell } from './ModalShell';

const NARROW = '(max-width: 640px)';
const subscribeNarrow = (cb: () => void) => {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const readNarrow = () => window.matchMedia(NARROW).matches;

function fmtTime(ts: number | undefined): string {
  try {
    const d = new Date(ts ?? 0);
    return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
      + ' '
      + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

const kindTag = (t: Txn) =>
  t.kind === 'module'
    ? { label: 'MODULE CLEARED', cls: 'module' }
    : t.correct
      ? { label: 'CORRECT', cls: 'correct' }
      : { label: 'INCORRECT', cls: 'wrong' };

interface TxnHistoryModalProps {
  txns: Txn[];
  symbol: string;
  startingBalance: number;
  eddies: number;
  onJump: (t: Txn) => void;
  onClose: () => void;
}

export function TxnHistoryModal({ txns, symbol, startingBalance, eddies, onJump, onClose }: TxnHistoryModalProps) {
  const narrow = useSyncExternalStore(subscribeNarrow, readNarrow);
  const rows = txns.slice().reverse();
  const earned = txns.filter((t) => (t.delta ?? 0) > 0).reduce((a, t) => a + (t.delta ?? 0), 0);
  const lost = txns.filter((t) => (t.delta ?? 0) < 0).reduce((a, t) => a + Math.abs(t.delta ?? 0), 0);

  // group by module, preserving most-recent-first order
  const groups: { key: string; title: string; items: Txn[] }[] = [];
  const gidx: Record<string, number> = {};
  rows.forEach((t) => {
    const key = t.moduleId || '__none';
    if (gidx[key] === undefined) {
      gidx[key] = groups.length;
      groups.push({ key, title: t.moduleTitle || 'GENERAL', items: [] });
    }
    groups[gidx[key]].items.push(t);
  });

  const cell = (label: string, val: string, color: string) => (
    <div className="txn-cell">
      <div className="txn-cell-label">{label}</div>
      <div className="txn-cell-val" style={{ color }}>{val}</div>
    </div>
  );

  const row = (t: Txn, i: number) => {
    const tag = kindTag(t);
    const jumpable = !!(t.qid && t.moduleId);
    const title = t.kind === 'module' ? `Certified: ${t.moduleTitle || 'Module'}` : (t.qPrompt || 'Knowledge check');
    const deltaEl = (
      <span className="txn-delta" style={{ color: (t.delta ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
        {(t.delta ?? 0) >= 0 ? '+' : '-'}{symbol} {Math.abs(t.delta ?? 0)}
      </span>
    );
    const tagEl = <span className={`txn-tag ${tag.cls}`}>{tag.label}</span>;
    const timeEl = <span className="txn-time">{fmtTime(t.ts)}</span>;
    // the BAL prefix is narrow-only in the monolith; wide rows show bare €$ n
    const balEl = (bal: boolean) => (
      <span className="txn-bal">{bal ? 'BAL ' : ''}{symbol} {t.balanceAfter ?? 0}</span>
    );
    const shared = {
      className: `txn-row${jumpable ? ' jumpable' : ''}`,
      onClick: jumpable ? () => onJump(t) : undefined,
      disabled: !jumpable,
      type: 'button' as const,
    };
    if (narrow) {
      return (
        <button key={t.id || i} {...shared}>
          <span className="txn-row-line">{tagEl}{timeEl}{deltaEl}</span>
          <span className="txn-title">{title}</span>
          <span className="txn-row-line">
            {balEl(true)}
            {jumpable && <span className="txn-jump-hint">↳ JUMP TO ANSWER</span>}
          </span>
        </button>
      );
    }
    return (
      <button key={t.id || i} {...shared}>
        {timeEl}
        {tagEl}
        <span className="txn-main">
          <span className="txn-title">{title}</span>
          {jumpable && <span className="txn-jump-hint">↳ JUMP TO ANSWER</span>}
        </span>
        {deltaEl}
        {balEl(false)}
      </button>
    );
  };

  return (
    <ModalShell
      accent="gold"
      title="TRANSACTION HISTORY"
      sub="// ACCOUNT LEDGER"
      closeLabel="Close transaction history"
      onClose={onClose}
      scrimClass="txn"
    >
      <div className="txn-body">
        <div className="txn-access-line">&gt; ACCESS GRANTED. RENDERING SIGNED LEDGER...</div>
        <div className="txn-summary">
          {cell('OPENING BALANCE', `${symbol} ${startingBalance}`, 'var(--muted)')}
          {cell('EARNED', `+${symbol} ${earned}`, 'var(--success)')}
          {cell('DEDUCTED', `-${symbol} ${lost}`, 'var(--danger)')}
          {cell('CURRENT', `${symbol} ${eddies}`, eddies < 0 ? 'var(--danger)' : 'var(--tertiary)')}
        </div>
        <div className="txn-ledger-line">
          LEDGER <span className="count">[ {txns.length} ]</span>
          <span className="note">GROUPED BY MODULE · NEWEST FIRST</span>
        </div>
        {rows.length ? (
          groups.map((g) => {
            const net = g.items.reduce((a, t) => a + (t.delta ?? 0), 0);
            return (
              <div key={g.key} className="txn-group">
                <div className="txn-group-hdr">
                  <span className="title">{g.title}</span>
                  <span className="count">[{g.items.length}]</span>
                  <span className="net" style={{ color: net >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    NET {net >= 0 ? '+' : '-'}{symbol} {Math.abs(net)}
                  </span>
                </div>
                <div className="txn-rows">{g.items.map((t, i) => row(t, i))}</div>
              </div>
            );
          })
        ) : (
          <div className="modal-empty txn-empty">&gt; NO TRANSACTIONS YET. Answer a knowledge check to open your ledger.</div>
        )}
      </div>
    </ModalShell>
  );
}
