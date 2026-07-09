// Field certificate (z 9998). Closes via its button only — no click-outside,
// no Escape (matching the monolith). The cert's rank is the TOP course rank
// (last in ranks[]), not the earned one; clearance is earned (max of done).
// Print CSS in cert.css makes #cert-print the whole printed page.
// Measured spec: docs/monolith-parity-spec.md — "Certificate + name prompt".
import type { Course } from '../lib/types';
import { IDENTITY, progressStats, sanitizeName } from '../lib/academy';

interface CertificateOverlayProps {
  course: Course | null;
  moduleDone: Record<string, unknown>;
  operatorName: string;
  onPrint: () => void;
  onEditName: () => void;
  onClose: () => void;
}

export function CertificateOverlay({
  course, moduleDone, operatorName, onPrint, onEditName, onClose,
}: CertificateOverlayProps) {
  const { done } = progressStats(course ?? {}, moduleDone);
  const clearance = done.length ? Math.max(1, ...done.map((m) => m.clearance ?? 1)) : 1;
  const ranks = course?.ranks ?? [];
  const rank = ranks[ranks.length - 1]?.title ?? 'CERTIFIED FIELD OPERATOR';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="cert-scrim">
      <div className="cert-column">
        <div id="cert-print">
          <div className="cert-titlebar">
            <span className="cert-titlebar-org">NIGHT CORP // URBAN PLANNING DIVISION</span>
            <span className="cert-titlebar-terminal">{IDENTITY.terminalId}</span>
          </div>
          <div className="cert-body">
            <div className="cert-grid" />
            <div className="cert-content">
              <img src="/assets/nc-monogram.svg" width={52} height={28} alt="" />
              <div className="cert-kicker">CERTIFICATE OF FIELD CERTIFICATION</div>
              <div className="cert-course-title">{course?.title || 'TRANSMISSION PROTOCOLS'}</div>
              <div className="cert-course-sub">{course?.subtitle || ''}</div>
              <div className="cert-awarded-label">AWARDED TO</div>
              <div className="cert-name">{sanitizeName(operatorName) || 'OPERATOR'}</div>
              <div className="cert-rule" />
              <div className="cert-attained-label">THIS CERTIFIES THAT THE OPERATOR HAS ATTAINED</div>
              <div className="cert-clearance">CLEARANCE LEVEL {clearance} // {rank}</div>
              <div className="cert-stamp">CERTIFIED</div>
              <div className="cert-footer">
                <div>ISSUED <span className="cert-issued">{date}</span></div>
                <div>AUTH <span className="cert-auth">NIGHT CORP // AUTOMATED</span></div>
              </div>
            </div>
          </div>
        </div>
        <div id="cert-controls">
          <button type="button" className="cert-btn solid" onClick={onPrint}>[ PRINT CERTIFICATE ]</button>
          <button type="button" className="cert-btn outline-cyan" onClick={onEditName}>[ EDIT NAME ]</button>
          <button type="button" className="cert-btn outline-gray" onClick={onClose}>[ CLOSE ]</button>
        </div>
      </div>
    </div>
  );
}
