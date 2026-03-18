import type { CellDiff } from '../../core/types';
import { diffFormulaTokens } from '../../core/tokenizer';
import { FormulaTokenDiff } from '../FormulaTokenDiff/FormulaTokenDiff';
import styles from './CellPopover.module.css';

interface CellPopoverProps {
  diff: CellDiff;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  add: 'Added',
  rem: 'Removed',
  mod: 'Modified',
  same: 'Unchanged',
};

const KIND_LABELS: Record<string, string> = {
  VALUE: 'Value changed',
  FORMULA: 'Formula changed',
  FORMAT: 'Format changed',
};

export function CellPopover({ diff, onClose }: CellPopoverProps) {
  const hasFormulaDiff =
    diff.changeKind === 'FORMULA' && diff.oldFormula && diff.newFormula;
  const formulaTokens = hasFormulaDiff
    ? diffFormulaTokens(diff.oldFormula!, diff.newFormula!)
    : null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.popover} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.address}>{diff.address}</span>
          <span className={`${styles.badge} ${styles[`badge_${diff.type}`]}`}>
            {TYPE_LABELS[diff.type]}
          </span>
          {diff.changeKind && (
            <span className={styles.kind}>{KIND_LABELS[diff.changeKind]}</span>
          )}
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Values */}
        <div className={styles.values}>
          {diff.type !== 'add' && (
            <div className={styles.valueRow}>
              <span className={styles.valueLabel}>Before</span>
              <span className={styles.valueOld}>
                {diff.oldFormula ? `=${diff.oldFormula}` : diff.oldValue ?? '(empty)'}
              </span>
            </div>
          )}
          {diff.type !== 'rem' && (
            <div className={styles.valueRow}>
              <span className={styles.valueLabel}>After</span>
              <span className={styles.valueNew}>
                {diff.newFormula ? `=${diff.newFormula}` : diff.newValue ?? '(empty)'}
              </span>
            </div>
          )}
        </div>

        {/* Formula token diff */}
        {formulaTokens && (
          <div className={styles.formulaSection}>
            <div className={styles.sectionLabel}>FORMULA DIFF</div>
            <div className={styles.formulaDiff}>
              <span className={styles.eqSign}>=</span>
              <FormulaTokenDiff tokens={formulaTokens} />
            </div>
          </div>
        )}

        {/* Format info — only show if format actually changed */}
        {diff.oldFormat !== diff.newFormat && (diff.oldFormat || diff.newFormat) && (
          <div className={styles.formatSection}>
            <div className={styles.sectionLabel}>NUMBER FORMAT</div>
            <div className={styles.formatRow}>
              {diff.oldFormat && <span className={styles.formatOld}>{diff.oldFormat}</span>}
              {diff.oldFormat && diff.newFormat && <span className={styles.arrow}>→</span>}
              {diff.newFormat && <span className={styles.formatNew}>{diff.newFormat}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
