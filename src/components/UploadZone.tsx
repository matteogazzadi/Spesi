import { useRef, useState } from 'react'
import { importFromBuffer } from '../lib/importService'
import type { ExclusionSuggestion } from '../lib/importService'
import { isBancaSella, parseExcelFile } from '../lib/parseExcel'
import { previewFile, parseWithMapping } from '../lib/parseGeneric'
import type { CsvPreview, CsvColumnMapping } from '../lib/parseGeneric'
import { CsvMapperModal } from './CsvMapperModal'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../contexts/LanguageContext'

interface Props {
  userId: string
  onImported: () => void
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target!.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export function UploadZone({ userId, onImported }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<ExclusionSuggestion[]>([])
  const [dismissed, setDismissed] = useState(false)

  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null)
  const [pendingBuffer, setPendingBuffer] = useState<ArrayBuffer | null>(null)

  async function runImport(buffer: ArrayBuffer, transactions: ReturnType<typeof parseExcelFile>) {
    setLoading(true)
    try {
      const { monthsImported, suggestions: s } = await importFromBuffer(buffer, transactions, userId, supabase)
      setResult(`Imported ${monthsImported.length} month${monthsImported.length !== 1 ? 's' : ''}: ${monthsImported.join(', ')}`)
      setSuggestions(s)
      setDismissed(false)
      onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xls|xlsx|csv)$/i)) {
      setError('Please upload an Excel (.xls, .xlsx) or CSV file')
      return
    }
    setError(null); setResult(null); setSuggestions([]); setDismissed(false)

    const buffer = await readFileAsArrayBuffer(file)

    if (isBancaSella(buffer)) {
      const transactions = parseExcelFile(buffer)
      await runImport(buffer, transactions)
    } else {
      // Generic CSV/Excel — show mapper
      try {
        const preview = previewFile(buffer)
        if (preview.headers.length < 2) {
          setError('Could not read columns from file. Make sure the first row contains headers.')
          return
        }
        setPendingBuffer(buffer)
        setCsvPreview(preview)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not read file')
      }
    }
  }

  async function handleMappingConfirmed(mapping: CsvColumnMapping) {
    if (!pendingBuffer) return
    setCsvPreview(null)
    const transactions = parseWithMapping(pendingBuffer, mapping)
    await runImport(pendingBuffer, transactions)
    setPendingBuffer(null)
  }

  function cancelMapper() {
    setCsvPreview(null)
    setPendingBuffer(null)
  }

  async function excludeSuggestion(desc: string) {
    await supabase.from('exclusion_rules').insert({
      user_id: userId,
      pattern: desc,
      match_type: 'exact',
      active: true,
    })
    setSuggestions((prev) => prev.filter((s) => s.description !== desc))
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <>
      {csvPreview && (
        <CsvMapperModal
          preview={csvPreview}
          onConfirm={handleMappingConfirmed}
          onCancel={cancelMapper}
        />
      )}

      <div className="card">
        <div className="card-title">Import statement</div>

        {error && <div className="msg msg-error" style={{ marginBottom: 12 }}>{error}</div>}
        {result && <div className="msg msg-success" style={{ marginBottom: 12 }}>{result}</div>}

        {suggestions.length > 0 && !dismissed && (
          <div className="suggest-banner">
            <div className="suggest-header">
              <strong>{t('suggest.title')}</strong>
              <button className="btn-ghost suggest-dismiss" onClick={() => setDismissed(true)}>
                {t('suggest.dismiss')}
              </button>
            </div>
            <p className="suggest-desc">{t('suggest.desc')}</p>
            <ul className="suggest-list">
              {suggestions.map((s) => (
                <li key={s.description} className="suggest-item">
                  <span className="suggest-desc-text">{s.description}</span>
                  <span className="suggest-amount">€{Math.round(s.amount).toLocaleString()}</span>
                  <button
                    className="suggest-exclude-btn"
                    onClick={() => excludeSuggestion(s.description)}
                  >
                    {t('suggest.exclude')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          className={`upload-zone${dragOver ? ' drag-over' : ''}`}
          onClick={() => !loading && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx,.csv"
            style={{ display: 'none' }}
            onChange={onInputChange}
          />
          {loading ? (
            <>
              <div className="spinner" style={{ margin: '0 auto' }} />
              <p>Importing…</p>
            </>
          ) : (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)', margin: '0 auto' }}>
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 0L8 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>Drop your bank statement here, or click to select (Excel / CSV)</p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
