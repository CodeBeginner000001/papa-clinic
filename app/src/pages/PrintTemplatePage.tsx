import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Field, Loading, Modal, useSettings, useToast } from '../components/ui'
import { RowMenu, menuCoordsFromEvent } from '../components/RowMenu'
import { IBill, IPrint } from '../components/icons'
import type { PrintTemplate } from '@shared/types'
import { PAPER_SIZE_OPTIONS, resolvePaperSize, type PaperSizeId } from '@shared/paper'
import BillTemplateSection from './BillTemplateSection'

type Draft = {
  id?: number
  name: string
  letterheadMode: 'digital' | 'paper'
  headerMm: number
  footerMm: number
  paperSize: PaperSizeId
  fileName: string | null
  fileKind: 'pdf' | 'image' | 'word' | null
  originalName: string | null
  clearFile: boolean
  setActive: boolean
}

type Preview = { kind: 'pdf' | 'image'; dataUrl: string } | null

function emptyDraft(): Draft {
  return {
    name: '',
    letterheadMode: 'paper',
    headerMm: 40,
    footerMm: 25,
    paperSize: 'A4',
    fileName: null,
    fileKind: null,
    originalName: null,
    clearFile: false,
    setActive: true,
  }
}

function draftFromTemplate(t: PrintTemplate): Draft {
  return {
    id: t.id,
    name: t.name,
    letterheadMode: t.letterhead_mode === 'paper' ? 'paper' : 'digital',
    headerMm: Number(t.header_mm) || 0,
    footerMm: Number(t.footer_mm) || 0,
    paperSize: resolvePaperSize(t.paper_size).id,
    fileName: t.file_name,
    fileKind: t.file_kind,
    originalName: t.original_name,
    clearFile: false,
    setActive: !!t.is_active,
  }
}

function LetterheadPreview({
  draft,
  preview,
}: {
  draft: Draft
  preview: Preview
}) {
  const page = resolvePaperSize(draft.paperSize)
  const headerPct = Math.min(45, (Math.max(0, draft.headerMm) / page.heightMm) * 100)
  const footerPct = Math.min(45, (Math.max(0, draft.footerMm) / page.heightMm) * 100)
  const paper = draft.letterheadMode === 'paper'

  // Scale from real mm so A5 is smaller and Legal is taller (not just same aspect ratio).
  const PX_PER_MM = 1.15
  const widthPx = Math.round(page.widthMm * PX_PER_MM)
  const heightPx = Math.round(page.heightMm * PX_PER_MM)
  const usableMm = Math.max(0, Math.round(page.heightMm - draft.headerMm - draft.footerMm))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '0.02em',
        }}
      >
        {page.id}{' '}
        <span style={{ fontWeight: 500, color: 'var(--muted)' }}>
          {Math.round(page.widthMm)} × {Math.round(page.heightMm)} mm
        </span>
      </div>

      <div
        style={{
          width: widthPx,
          height: heightPx,
          maxWidth: '100%',
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: '0 8px 24px rgba(20,60,35,0.08)',
          position: 'relative',
          flexShrink: 0,
          transition: 'width 0.2s ease, height 0.2s ease',
        }}
        aria-hidden
      >
        {/* Uploaded letterhead visual */}
        {preview?.kind === 'image' ? (
          <img
            src={preview.dataUrl}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
          />
        ) : preview?.kind === 'pdf' ? (
          <iframe
            title="Letterhead PDF"
            src={preview.dataUrl}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
          />
        ) : draft.fileKind === 'word' && draft.fileName && !draft.clearFile ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--muted)',
              background: '#f8faf9',
            }}
          >
            Word file saved. Export as PDF or PNG to see margins over the printed letterhead.
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: paper
                ? 'linear-gradient(180deg, #f1f5f4 0%, #fff 18%, #fff 82%, #f1f5f4 100%)'
                : '#fff',
            }}
          />
        )}

        {/* Margin guides — % of this paper's height */}
        {headerPct > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: `${headerPct}%`,
              borderBottom: '1.5px dashed #64748b',
              background:
                'repeating-linear-gradient(-45deg, rgba(15,61,62,.14), rgba(15,61,62,.14) 5px, transparent 5px, transparent 10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: '#0F3D3E',
              textShadow: '0 0 4px #fff',
              zIndex: 2,
            }}
          >
            Header · {draft.headerMm} mm
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            top: `${headerPct}%`,
            bottom: `${footerPct}%`,
            left: '7%',
            right: '7%',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid #d5e0df',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 10,
              color: 'var(--muted)',
              textAlign: 'center',
              maxWidth: 170,
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>Print content</div>
            ~{usableMm} mm on {page.id}
          </div>
        </div>
        {footerPct > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${footerPct}%`,
              borderTop: '1.5px dashed #64748b',
              background:
                'repeating-linear-gradient(-45deg, rgba(15,61,62,.14), rgba(15,61,62,.14) 5px, transparent 5px, transparent 10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: '#0F3D3E',
              textShadow: '0 0 4px #fff',
              zIndex: 2,
            }}
          >
            Footer · {draft.footerMm} mm
          </div>
        )}
      </div>
    </div>
  )
}

export default function PrintTemplatePage() {
  const { reload: reloadSettings } = useSettings()
  const toast = useToast()
  const [templates, setTemplates] = useState<PrintTemplate[] | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [preview, setPreview] = useState<Preview>(null)
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState(false)
  const [menu, setMenu] = useState<{ id: number; top: number; left: number } | null>(null)

  const load = useCallback(async () => {
    const list = await api.listPrintTemplates()
    setTemplates(list)
  }, [])

  useEffect(() => {
    load().catch((err) => toast(err instanceof Error ? err.message : 'Failed to load templates', 'error'))
  }, [load, toast])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!draft.fileName || draft.clearFile || !draft.fileKind || draft.fileKind === 'word') {
        if (!cancelled) setPreview(null)
        return
      }
      try {
        const p = await api.letterheadPreview(draft.fileName, draft.fileKind)
        if (!cancelled) setPreview(p)
      } catch {
        if (!cancelled) setPreview(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [draft.fileName, draft.fileKind, draft.clearFile])

  const openCreate = () => {
    setDraft(emptyDraft())
    setPreview(null)
    setEditorOpen(true)
  }

  const openEdit = (t: PrintTemplate) => {
    setDraft(draftFromTemplate(t))
    setMenu(null)
    setEditorOpen(true)
  }

  const pickFile = async () => {
    setPicking(true)
    try {
      const picked = await api.pickLetterheadFile()
      if (!picked) return
      setDraft((d) => ({
        ...d,
        fileName: picked.fileName,
        fileKind: picked.fileKind,
        originalName: picked.originalName,
        clearFile: false,
        letterheadMode: d.letterheadMode === 'digital' ? 'paper' : d.letterheadMode,
        headerMm: d.headerMm > 0 ? d.headerMm : 40,
        footerMm: d.footerMm > 0 ? d.footerMm : 25,
      }))
      setPreview(picked.preview?.kind === 'word' ? null : picked.preview)
      toast('Letterhead file attached')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not upload file', 'error')
    } finally {
      setPicking(false)
    }
  }

  const save = async () => {
    if (!draft.name.trim()) {
      toast('Enter a template name', 'error')
      return
    }
    setSaving(true)
    try {
      await api.savePrintTemplate({
        id: draft.id,
        name: draft.name.trim(),
        letterheadMode: draft.letterheadMode,
        headerMm: draft.headerMm,
        footerMm: draft.footerMm,
        paperSize: draft.paperSize,
        fileName: draft.clearFile ? null : draft.fileName,
        fileKind: draft.clearFile ? null : draft.fileKind,
        originalName: draft.clearFile ? null : draft.originalName,
        clearFile: draft.clearFile,
        setActive: draft.setActive,
      })
      await load()
      reloadSettings()
      setEditorOpen(false)
      toast(draft.id ? 'Template updated' : 'Template saved')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const setActive = async (id: number) => {
    setMenu(null)
    try {
      await api.setActivePrintTemplate(id)
      await load()
      reloadSettings()
      toast('Active print template updated')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not activate', 'error')
    }
  }

  const remove = async (id: number) => {
    setMenu(null)
    if (!window.confirm('Delete this print template?')) return
    try {
      await api.deletePrintTemplate(id)
      await load()
      reloadSettings()
      toast('Template deleted')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete', 'error')
    }
  }

  const [tab, setTab] = useState<'letterhead' | 'bill'>('letterhead')

  if (!templates) return <Loading />

  return (
    <div>
      <div className="page-head">
        <div className="titles">
          <h1 className="page-title">Print Template</h1>
          <p className="page-sub">
            Set letterhead paper and margins for all prints, and design the invoice layout used when bills are printed.
          </p>
        </div>
        {tab === 'letterhead' && (
          <div className="page-actions">
            <button className="btn btn-primary" onClick={openCreate}>
              + New template
            </button>
          </div>
        )}
      </div>

      <div className="catalog-tabs" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className={`catalog-tab${tab === 'letterhead' ? ' on' : ''}`}
          onClick={() => setTab('letterhead')}
        >
          <IPrint size={15} /> Letterhead
        </button>
        <button type="button" className={`catalog-tab${tab === 'bill' ? ' on' : ''}`} onClick={() => setTab('bill')}>
          <IBill size={15} /> Bill invoice
        </button>
      </div>

      {tab === 'bill' ? (
        <BillTemplateSection />
      ) : (
        <>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 56 }}>S.No</th>
              <th>Name</th>
              <th>Paper</th>
              <th>Size</th>
              <th>Margins</th>
              <th>Letterhead file</th>
              <th>Status</th>
              <th style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 28 }}>
                  No templates yet. Create one to get started.
                </td>
              </tr>
            ) : (
              templates.map((t, i) => (
                <tr key={t.id}>
                  <td>{i + 1}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      style={{
                        background: 'none',
                        border: 0,
                        padding: 0,
                        color: 'var(--green-800)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        font: 'inherit',
                      }}
                    >
                      {t.name}
                    </button>
                  </td>
                  <td>{t.letterhead_mode === 'paper' ? 'Letterhead' : 'Blank'}</td>
                  <td>{resolvePaperSize(t.paper_size).id}</td>
                  <td>
                    {t.header_mm} / {t.footer_mm} mm
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    {t.original_name || (t.file_name ? t.file_name : '—')}
                  </td>
                  <td>
                    {t.is_active ? (
                      <span className="badge green">Active</span>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => setActive(t.id)}>
                        Set active
                      </button>
                    )}
                  </td>
                  <td>
                    <button
                      className="more-btn"
                      aria-label="More"
                      onClick={(e) => {
                        e.stopPropagation()
                        const coords = menuCoordsFromEvent(e)
                        setMenu(menu?.id === t.id ? null : { id: t.id, ...coords })
                      }}
                    >
                      ⋮
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {menu && (
        <RowMenu open top={menu.top} left={menu.left} onClose={() => setMenu(null)}>
          <button type="button" onClick={() => openEdit(templates.find((x) => x.id === menu.id)!)}>
            Edit
          </button>
          {!templates.find((x) => x.id === menu.id)?.is_active && (
            <button type="button" onClick={() => setActive(menu.id)}>
              Set active
            </button>
          )}
          <button type="button" className="danger" onClick={() => remove(menu.id)}>
            Delete
          </button>
        </RowMenu>
      )}

      {editorOpen && (
        <Modal
          onClose={() => !saving && setEditorOpen(false)}
          title={draft.id ? 'Edit print template' : 'New print template'}
          wide
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setEditorOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save template'}
              </button>
            </>
          }
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(200px, auto)',
              gap: 24,
              alignItems: 'start',
            }}
          >
            <div className="form-grid" style={{ gap: 12 }}>
              <div className="form-section-title" style={{ margin: 0 }}>
                <IPrint size={17} /> Template
              </div>

              <Field label="Template name">
                <input
                  className="input"
                  value={draft.name}
                  placeholder="e.g. Clinic letterhead A4"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>

              <Field label="Paper type">
                <select
                  className="select"
                  value={draft.letterheadMode}
                  onChange={(e) => {
                    const paper = e.target.value === 'paper'
                    setDraft({
                      ...draft,
                      letterheadMode: paper ? 'paper' : 'digital',
                      ...(paper && draft.headerMm <= 0
                        ? { headerMm: 40, footerMm: draft.footerMm > 0 ? draft.footerMm : 25 }
                        : {}),
                    })
                  }}
                >
                  <option value="digital">Blank paper — print clinic heading</option>
                  <option value="paper">Letterhead paper — leave space for printed heading/footer</option>
                </select>
              </Field>

              <Field label="Paper size">
                <select
                  className="select"
                  value={draft.paperSize}
                  onChange={(e) => setDraft({ ...draft, paperSize: e.target.value as PaperSizeId })}
                >
                  {PAPER_SIZE_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="form-grid g2" style={{ gap: 12 }}>
                <Field label="Header space (mm)">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={120}
                    step={1}
                    value={draft.headerMm}
                    onChange={(e) => setDraft({ ...draft, headerMm: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Footer space (mm)">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={120}
                    step={1}
                    value={draft.footerMm}
                    onChange={(e) => setDraft({ ...draft, footerMm: Number(e.target.value) })}
                  />
                </Field>
              </div>

              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                {(() => {
                  const page = resolvePaperSize(draft.paperSize)
                  const usable = Math.max(0, Math.round(page.heightMm - draft.headerMm - draft.footerMm))
                  return draft.letterheadMode === 'paper' ? (
                    <>
                      On {page.id} ({page.heightMm} mm tall), {draft.headerMm} mm header + {draft.footerMm} mm footer
                      leave about {usable} mm for content.
                    </>
                  ) : (
                    <>
                      Clinic heading prints at the top of {page.id}. Extra header/footer space still applies (
                      {usable} mm content height).
                    </>
                  )
                })()}
              </div>

              <div className="form-section-title" style={{ margin: '4px 0 0' }}>
                Uploaded letterhead
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45, marginTop: -4 }}>
                Upload a PDF, image, or Word scan of your stationery. Match the dashed bands to the printed header and
                footer.
              </div>

              {draft.fileName && !draft.clearFile ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                    padding: '10px 12px',
                    background: 'var(--green-50)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 120 }}>
                    {draft.originalName || draft.fileName}
                    {draft.fileKind ? (
                      <span className="badge gray" style={{ marginLeft: 8 }}>
                        {draft.fileKind}
                      </span>
                    ) : null}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={pickFile} disabled={picking}>
                    Replace
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        clearFile: true,
                        fileName: null,
                        fileKind: null,
                        originalName: null,
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button className="btn btn-outline" onClick={pickFile} disabled={picking} style={{ justifySelf: 'start' }}>
                  {picking ? 'Opening…' : 'Upload PDF / Word / image'}
                </button>
              )}

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  marginTop: 2,
                }}
              >
                <input
                  type="checkbox"
                  checked={draft.setActive}
                  onChange={(e) => setDraft({ ...draft, setActive: e.target.checked })}
                />
                Set as active template (used for prescriptions & bills)
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <div className="form-section-title" style={{ margin: 0, alignSelf: 'stretch' }}>
                Margin preview
              </div>
              <LetterheadPreview draft={draft} preview={preview} />
            </div>
          </div>
        </Modal>
      )}
        </>
      )}
    </div>
  )
}
