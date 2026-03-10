import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const FILE_TYPE_ICONS = {
  image: '🖼️',
  pdf: '📄',
  document: '📝',
}

const FILE_TYPE_COLORS = {
  image: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400',
  pdf: 'from-red-500/20 to-orange-500/10 border-red-500/30 text-red-400',
  document: 'from-green-500/20 to-emerald-500/10 border-green-500/30 text-green-400',
}

function formatBytes(bytes) {
  if (!bytes) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MedicalRecords() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [previewRecord, setPreviewRecord] = useState(null)
  const [uploadForm, setUploadForm] = useState({ title: '', description: '' })
  const [pendingFile, setPendingFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef(null)

  const fetchRecords = useCallback(async () => {
    try {
      const res = await axios.get('/records/my-records')
      setRecords(res.data)
    } catch {
      toast.error('Failed to load records')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleFileSelect = (file) => {
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    if (!allowed.includes(file.type)) {
      toast.error('File type not supported. Use JPEG, PNG, PDF, DOC, or TXT.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large. Max 20MB allowed.')
      return
    }
    setPendingFile(file)
    if (!uploadForm.title) {
      setUploadForm(f => ({ ...f, title: file.name.replace(/\.[^.]+$/, '') }))
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleUpload = async () => {
    if (!pendingFile || !uploadForm.title.trim()) {
      toast.error('Please select a file and enter a title.')
      return
    }
    setUploading(true)
    setUploadProgress(0)
    try {
      const formData = new FormData()
      formData.append('file', pendingFile)
      formData.append('title', uploadForm.title.trim())
      if (uploadForm.description) formData.append('description', uploadForm.description)

      await axios.post('/records/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded * 100) / e.total))
        },
      })
      toast.success('Record uploaded successfully!')
      setPendingFile(null)
      setUploadForm({ title: '', description: '' })
      setUploadProgress(0)
      fetchRecords()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return
    try {
      await axios.delete(`/records/${id}`)
      setRecords(r => r.filter(rec => rec.id !== id))
      toast.success('Record deleted')
    } catch {
      toast.error('Failed to delete record')
    }
  }

  const handleDownload = async (record) => {
    try {
      const res = await axios.get(`/records/${record.id}/download`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = record.original_filename || `record_${record.id}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    }
  }

  const openPreview = (record) => {
    if (record.file_type === 'image') setPreviewRecord(record)
    else handleDownload(record)
  }

  return (
    <div className="min-h-screen pt-24 pb-10 px-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-2xl shadow-lg">
            📁
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Medical Records</h1>
            <p className="text-slate-400 text-sm">Securely upload and manage your hospital documents</p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="card mb-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>⬆️</span> Upload New Record
        </h2>

        {/* Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 mb-4
            ${dragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-600 hover:border-indigo-500/60 hover:bg-slate-800/50'}
            ${pendingFile ? 'border-green-500/60 bg-green-500/5' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
          {pendingFile ? (
            <div className="flex flex-col items-center gap-2">
              <div className="text-5xl">
                {pendingFile.type.startsWith('image/') ? '🖼️' : pendingFile.type === 'application/pdf' ? '📄' : '📝'}
              </div>
              <p className="text-white font-semibold">{pendingFile.name}</p>
              <p className="text-slate-400 text-sm">{formatBytes(pendingFile.size)}</p>
              <button
                onClick={(e) => { e.stopPropagation(); setPendingFile(null); setUploadForm(f => ({ ...f, title: '' })) }}
                className="text-red-400 text-xs hover:text-red-300 mt-1"
              >
                ✕ Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="text-5xl opacity-60">🗂️</div>
              <p className="text-white font-semibold">Drag & drop your file here</p>
              <p className="text-slate-400 text-sm">or <span className="text-indigo-400">click to browse</span></p>
              <p className="text-slate-500 text-xs mt-1">Supports: JPG, PNG, PDF, DOC, TXT · Max 20MB</p>
            </div>
          )}
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              placeholder="e.g. Blood Test Report - March 2025"
              value={uploadForm.title}
              onChange={(e) => setUploadForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Description <span className="text-slate-500">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. Hemoglobin levels, annual checkup"
              value={uploadForm.description}
              onChange={(e) => setUploadForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>
        </div>

        {/* Progress bar */}
        {uploading && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Uploading…</span><span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || !pendingFile}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading…</>
          ) : (
            <><span>⬆️</span> Upload Record</>
          )}
        </button>
      </div>

      {/* Records List */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>📋</span> My Records
          <span className="ml-auto text-sm font-normal text-slate-400">{records.length} file{records.length !== 1 ? 's' : ''}</span>
        </h2>

        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
            Loading records…
          </div>
        ) : records.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4 opacity-40">📂</div>
            <p className="text-white font-semibold">No records yet</p>
            <p className="text-slate-400 text-sm mt-1">Upload your first medical document above</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {records.map((record) => (
              <div
                key={record.id}
                className={`card bg-gradient-to-br ${FILE_TYPE_COLORS[record.file_type] || FILE_TYPE_COLORS.document} hover:scale-[1.01] transition-all duration-200`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl flex-shrink-0">{FILE_TYPE_ICONS[record.file_type] || '📎'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{record.title}</p>
                    {record.description && (
                      <p className="text-slate-400 text-xs mt-0.5 truncate">{record.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-slate-500">{formatBytes(record.file_size)}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-slate-500">
                        {new Date(record.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => openPreview(record)}
                        className="flex-1 text-center py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        {record.file_type === 'image' ? '👁️ Preview' : '⬇️ Download'}
                      </button>
                      <button
                        onClick={() => handleDownload(record)}
                        className="py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        ⬇️
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="py-1.5 px-3 bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs font-medium rounded-lg transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewRecord && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewRecord(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewRecord(null)}
              className="absolute -top-4 -right-4 w-10 h-10 bg-slate-800 border border-slate-600 rounded-full text-white hover:bg-slate-700 flex items-center justify-center z-10"
            >
              ✕
            </button>
            <div className="card p-4">
              <p className="text-white font-semibold mb-3">{previewRecord.title}</p>
              <img
                src={`/records/${previewRecord.id}/download`}
                alt={previewRecord.title}
                className="w-full rounded-xl max-h-[70vh] object-contain"
                onError={(e) => { e.target.src = '' }}
              />
              <button
                onClick={() => handleDownload(previewRecord)}
                className="btn-primary w-full mt-3 py-2.5 flex items-center justify-center gap-2 text-sm"
              >
                ⬇️ Download Full Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
