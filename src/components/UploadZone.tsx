import { useRef, useState } from 'react'
import { importFile } from '../lib/importService'
import { supabase } from '../lib/supabase'

interface Props {
  userId: string
  onImported: () => void
}

export function UploadZone({ userId, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xls|xlsx)$/i)) {
      setError('Please upload an Excel file (.xls or .xlsx)')
      return
    }
    setError(null); setResult(null); setLoading(true)
    try {
      const { monthsImported } = await importFile(file, userId, supabase)
      setResult(`Imported ${monthsImported.length} month${monthsImported.length !== 1 ? 's' : ''}: ${monthsImported.join(', ')}`)
      onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
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
    <div className="card">
      <div className="card-title">Import statement</div>

      {error && <div className="msg msg-error" style={{ marginBottom: 12 }}>{error}</div>}
      {result && <div className="msg msg-success" style={{ marginBottom: 12 }}>{result}</div>}

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
          accept=".xls,.xlsx"
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
            <p>Drop your Banca Sella Excel file here, or click to select</p>
          </>
        )}
      </div>
    </div>
  )
}
