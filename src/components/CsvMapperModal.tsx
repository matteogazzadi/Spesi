import type { CsvPreview, CsvColumnMapping } from '../lib/parseGeneric'
import { useTranslation } from '../contexts/LanguageContext'
import { useState } from 'react'

interface Props {
  preview: CsvPreview
  onConfirm: (mapping: CsvColumnMapping) => void
  onCancel: () => void
}

export function CsvMapperModal({ preview, onConfirm, onCancel }: Props) {
  const { t } = useTranslation()
  const { headers, sampleRows } = preview

  const [dateCol, setDateCol] = useState(headers[0] ?? '')
  const [amountCol, setAmountCol] = useState(headers[1] ?? '')
  const [debitsAreNegative, setDebitsAreNegative] = useState(true)

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!dateCol || !amountCol) return
    onConfirm({ dateColumn: dateCol, amountColumn: amountCol, debitsAreNegative })
  }

  return (
    <div className="csvmap-backdrop" onClick={onCancel}>
      <div className="csvmap-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="csvmap-title">{t('csvmap.title')}</h3>
        <p className="csvmap-desc">{t('csvmap.desc')}</p>

        {sampleRows.length > 0 && (
          <>
            <p className="csvmap-section-label">{t('csvmap.preview')}</p>
            <div className="csvmap-preview-wrap">
              <table className="csvmap-preview-table">
                <thead>
                  <tr>
                    {headers.map((h) => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((row, i) => (
                    <tr key={i}>
                      {headers.map((h) => <td key={h}>{row[h] ?? ''}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <form className="csvmap-controls" onSubmit={handleConfirm}>
          <div className="csvmap-selects">
            <div className="form-group">
              <label>{t('csvmap.date_col')}</label>
              <select value={dateCol} onChange={(e) => setDateCol(e.target.value)} required>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{t('csvmap.amount_col')}</label>
              <select value={amountCol} onChange={(e) => setAmountCol(e.target.value)} required>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>{t('csvmap.sign')}</label>
            <div className="csvmap-sign-options">
              <label className="radio-option" style={{ padding: '8px 0' }}>
                <input
                  type="radio"
                  name="sign"
                  checked={debitsAreNegative}
                  onChange={() => setDebitsAreNegative(true)}
                />
                <span>{t('csvmap.negative')}</span>
              </label>
              <label className="radio-option" style={{ padding: '8px 0' }}>
                <input
                  type="radio"
                  name="sign"
                  checked={!debitsAreNegative}
                  onChange={() => setDebitsAreNegative(false)}
                />
                <span>{t('csvmap.positive')}</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" type="submit" style={{ width: 'auto' }}>
              {t('csvmap.confirm')}
            </button>
            <button type="button" className="btn-ghost" onClick={onCancel}>
              {t('csvmap.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
