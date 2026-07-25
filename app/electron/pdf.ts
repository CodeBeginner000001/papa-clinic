import fs from 'node:fs'
import path from 'node:path'
import { BrowserWindow, shell } from './electron-api'
import { getAppPaths } from './paths'
import { getSettings } from './db/repos'
import type {
  Bill,
  BillItem,
  ClinicSettings,
  Invoice,
  Patient,
  Payment,
  PrescriptionMedicine,
  Visit,
  VisitVitals,
} from '../shared/types'
import { formatMoney } from '../shared/utils'
import { resolvePaperSize } from '../shared/paper'
import {
  normalizeBillPrintLayout,
  resolveBillVisualStyle,
  type BillPrintBaseStyle,
} from '../shared/bill-print'
import { buildStationeryPreview } from './letterheads'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function clampMm(value: number, fallback = 0): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.min(120, Math.round(n * 10) / 10)
}

function letterhead(settings: ClinicSettings): string {
  if (settings.print_letterhead_mode === 'paper') {
    // Pre-printed stationery: leave the top band empty (sized via print_header_mm)
    return `<div class="letterhead-spacer" aria-hidden="true"></div>`
  }
  return `
    <div class="header">
      <h1>${escapeHtml(settings.clinic_name)}</h1>
      <p>${escapeHtml(settings.doctor_name)}${settings.doctor_degrees ? `, ${escapeHtml(settings.doctor_degrees)}` : ''}</p>
      <p class="muted">${escapeHtml(settings.doctor_specialization || '')}${
        settings.doctor_registration ? ` · Reg: ${escapeHtml(settings.doctor_registration)}` : ''
      }</p>
      <p class="muted">${escapeHtml(settings.clinic_address || '')}${
        settings.clinic_phone ? ` · ${escapeHtml(settings.clinic_phone)}` : ''
      }</p>
    </div>`
}

function printLayoutCss(settings: ClinicSettings): string {
  const headerMm = clampMm(settings.print_header_mm)
  const footerMm = clampMm(settings.print_footer_mm)
  const paper = settings.print_letterhead_mode === 'paper'
  const page = resolvePaperSize(settings.print_paper_size)
  // Digital mode still allows extra top/bottom padding if the doctor sets margins
  const topPad = paper ? headerMm : Math.max(8, headerMm || 8)
  const bottomPad = paper ? footerMm : Math.max(8, footerMm || 8)

  return `
  * { box-sizing: border-box; }
  @page {
    size: ${page.cssSize};
    margin: ${topPad}mm 12mm ${bottomPad}mm 12mm;
  }
  body {
    font-family: Georgia, 'Times New Roman', serif; color: #142424; margin: 0;
    padding: 0; font-size: 13px;
    --print-top: ${topPad}mm;
    --print-bottom: ${bottomPad}mm;
  }
  .print-page {
    position: relative;
    padding: var(--print-top) 12mm var(--print-bottom) 12mm;
    min-height: 100%;
  }
  .header { border-bottom: 2px solid #0F3D3E; padding-bottom: 12px; margin-bottom: 18px; }
  .letterhead-spacer { height: 0; margin: 0; padding: 0; }
  h1 { margin: 0 0 4px; color: #0F3D3E; font-size: 26px; }
  .muted { color: #5A6B6C; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border-bottom: 1px solid #D5E0DF; text-align: left; padding: 8px 6px; vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #5A6B6C; }
  .rx { font-size: 28px; font-weight: 700; color: #1A3A5C; margin: 12px 0; }
  .row { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
  .sig { margin-top: 48px; text-align: right; }
  .sig-line { display: inline-block; min-width: 180px; border-top: 1px solid #142424; padding-top: 6px; text-align: center; }
  .totals { margin-top: 16px; text-align: right; }
  /* Preview-only guides showing reserved heading / footer bands on letterhead paper */
  .print-guide {
    display: none; position: absolute; left: 0; right: 0; pointer-events: none;
    border: 1.5px dashed #94a3b8; background: repeating-linear-gradient(
      -45deg, rgba(148,163,184,.12), rgba(148,163,184,.12) 6px, transparent 6px, transparent 12px
    );
    color: #64748b; font: 600 11px -apple-system, 'Segoe UI', sans-serif;
    align-items: center; justify-content: center; letter-spacing: 0.02em;
  }
  .print-guide.top { top: 0; height: var(--print-top); }
  .print-guide.bottom { bottom: 0; height: var(--print-bottom); }
`
}

function wrapDocument(bodyInner: string, settings: ClinicSettings, extraCss = ''): string {
  const headerMm = clampMm(settings.print_header_mm)
  const footerMm = clampMm(settings.print_footer_mm)
  const showGuides = settings.print_letterhead_mode === 'paper' && (headerMm > 0 || footerMm > 0)
  const guides = showGuides
    ? `${headerMm > 0 ? `<div class="print-guide top">Reserved for printed letterhead (${headerMm} mm)</div>` : ''}
       ${footerMm > 0 ? `<div class="print-guide bottom">Reserved for printed footer (${footerMm} mm)</div>` : ''}`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${printLayoutCss(settings)}${extraCss}</style></head>
  <body>
    <div class="print-page">
      ${guides}
      ${bodyInner}
    </div>
  </body></html>`
}

export function buildPrescriptionHtml(input: {
  patient: Patient
  date: string
  diagnosis?: string | null
  advice?: string | null
  testsAdvised?: string | null
  followUpDate?: string | null
  medicines: PrescriptionMedicine[]
}): string {
  const settings = getSettings()
  const ageGender = [input.patient.age != null ? `${input.patient.age}y` : null, input.patient.gender]
    .filter(Boolean)
    .join(' / ')
  const rows = input.medicines
    .map(
      (m, i) => `<tr>
      <td>${i + 1}</td>
      <td><strong>${escapeHtml(m.medicine_name_snapshot)}</strong>${
        m.strength_snapshot ? ` ${escapeHtml(m.strength_snapshot)}` : ''
      }${m.dosage_form_snapshot ? ` (${escapeHtml(m.dosage_form_snapshot)})` : ''}</td>
      <td>${escapeHtml(m.dose || '-')}</td>
      <td>${escapeHtml(m.frequency || '-')}</td>
      <td>${escapeHtml(m.duration || '-')}</td>
      <td>${escapeHtml([m.timing_instruction, m.special_instructions].filter(Boolean).join(' · ') || '-')}</td>
    </tr>`,
    )
    .join('')

  return wrapDocument(
    `${letterhead(settings)}
    <div class="row">
      <div>
        <div class="muted">Patient</div>
        <div><strong>${escapeHtml(input.patient.full_name)}</strong> (${escapeHtml(input.patient.patient_code)})${
          ageGender ? ` · ${escapeHtml(ageGender)}` : ''
        }</div>
      </div>
      <div>
        <div class="muted">Date</div>
        <div>${escapeHtml(input.date)}</div>
      </div>
    </div>
    ${input.diagnosis ? `<p><span class="muted">Diagnosis:</span> ${escapeHtml(input.diagnosis)}</p>` : ''}
    <div class="rx">℞</div>
    <table>
      <thead><tr><th>#</th><th>Medicine</th><th>Dose</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">No medicines</td></tr>'}</tbody>
    </table>
    ${input.testsAdvised ? `<p><span class="muted">Tests advised:</span> ${escapeHtml(input.testsAdvised)}</p>` : ''}
    ${input.advice ? `<p><span class="muted">Advice:</span> ${escapeHtml(input.advice)}</p>` : ''}
    ${input.followUpDate ? `<p><span class="muted">Follow-up:</span> ${escapeHtml(input.followUpDate)}</p>` : ''}
    <div class="sig"><div class="sig-line">${escapeHtml(settings.doctor_name)}<br/><span class="muted">Signature</span></div></div>`,
    settings,
  )
}

export function buildVisitHtml(input: {
  patient: Patient
  visit: Visit
  vitals?: VisitVitals | null
}): string {
  const settings = getSettings()
  const ageGender = [input.patient.age != null ? `${input.patient.age}y` : null, input.patient.gender]
    .filter(Boolean)
    .join(' / ')
  const v = input.vitals
  const bp =
    v?.systolic_bp || v?.diastolic_bp
      ? `${v.systolic_bp || '—'}/${v.diastolic_bp || '—'}`
      : null
  const vitalsRows = [
    ['Temperature', v?.temperature ? `${escapeHtml(v.temperature)} °F` : null],
    ['Blood pressure', bp ? escapeHtml(bp) + ' mmHg' : null],
    ['Heart rate', v?.pulse ? `${escapeHtml(v.pulse)} bpm` : null],
    ['Respiratory rate', v?.respiratory_rate ? escapeHtml(v.respiratory_rate) : null],
    ['SpO₂', v?.oxygen_saturation ? `${escapeHtml(v.oxygen_saturation)} %` : null],
    ['Weight', v?.weight ? `${escapeHtml(v.weight)} kg` : null],
    ['Blood sugar', v?.blood_sugar ? `${escapeHtml(v.blood_sugar)} mg/dL` : null],
  ].filter(([, val]) => val)

  const vitalsHtml =
    vitalsRows.length > 0
      ? `<table><thead><tr><th>Vital</th><th>Value</th></tr></thead><tbody>${vitalsRows
          .map(([k, val]) => `<tr><td>${k}</td><td>${val}</td></tr>`)
          .join('')}</tbody></table>`
      : ''

  const line = (label: string, value?: string | null) =>
    value && value.trim()
      ? `<p><span class="muted">${escapeHtml(label)}:</span> ${escapeHtml(value)}</p>`
      : ''

  return wrapDocument(
    `${letterhead(settings)}
    <h2 style="margin:0 0 12px;color:#0F3D3E;font-size:20px;">Visit summary</h2>
    <div class="row">
      <div>
        <div class="muted">Patient</div>
        <div><strong>${escapeHtml(input.patient.full_name)}</strong> (${escapeHtml(input.patient.patient_code)})${
          ageGender ? ` · ${escapeHtml(ageGender)}` : ''
        }</div>
      </div>
      <div>
        <div class="muted">Visit</div>
        <div>${escapeHtml(input.visit.visit_code)}</div>
        <div class="muted">${escapeHtml(input.visit.visit_date)}${
          input.visit.visit_time ? ` · ${escapeHtml(input.visit.visit_time)}` : ''
        }</div>
        <div class="muted">${escapeHtml(String(input.visit.visit_type || ''))}</div>
      </div>
    </div>
    ${line('Chief complaint', input.visit.chief_complaints)}
    ${line('Symptoms', input.visit.symptoms)}
    ${line('Duration', input.visit.symptom_duration)}
    ${vitalsHtml}
    ${line('Examination', input.visit.examination_findings)}
    ${line('Provisional diagnosis', input.visit.provisional_diagnosis)}
    ${line('Final diagnosis', input.visit.final_diagnosis)}
    ${line('Advice / plan', input.visit.advice)}
    ${line('Notes', input.visit.doctor_notes)}
    ${line('Follow-up', input.visit.follow_up_date)}
    <div class="sig"><div class="sig-line">${escapeHtml(settings.doctor_name)}<br/><span class="muted">Signature</span></div></div>`,
    settings,
  )
}

function billDiscountAmount(bill: Bill): number {
  if (bill.discount_type === 'none' || !bill.discount_value) return 0
  if (bill.discount_type === 'percent') return (bill.subtotal * bill.discount_value) / 100
  return bill.discount_value
}

function billPrintCss(style: BillPrintBaseStyle): string {
  const compact = style === 'compact'
  const modern = style === 'modern'
  return `
  .bill { font-family: ${modern ? "-apple-system, 'Segoe UI', Roboto, sans-serif" : "Georgia, 'Times New Roman', serif"}; }
  .bill-title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin: ${compact ? '8px 0 12px' : '4px 0 18px'}; }
  .bill-badge {
    display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #0F3D3E; border: 1.5px solid #0F3D3E;
    padding: 4px 10px; border-radius: 4px;
  }
  .bill-doc-title { margin: 6px 0 2px; font-size: ${compact ? '20px' : '24px'}; color: #0F3D3E; }
  .bill-meta { text-align: right; font-size: 12.5px; line-height: 1.55; }
  .bill-meta strong { font-size: 14px; }
  .bill-status {
    display: inline-block; margin-top: 6px; padding: 3px 8px; border-radius: 99px;
    font-size: 11px; font-weight: 700;
  }
  .bill-status.paid { background: #dcfce7; color: #14532d; }
  .bill-status.partial { background: #fef3e2; color: #b45309; }
  .bill-status.unpaid { background: #fdecec; color: #b91c1c; }
  .bill-parties {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
    margin-bottom: ${compact ? '10px' : '16px'};
  }
  .bill-party {
    ${modern ? 'background: #f4f8f5; border-radius: 10px; padding: 12px 14px;' : 'padding: 2px 0;'}
  }
  .bill-party .lbl {
    font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em;
    color: #5A6B6C; font-weight: 700; margin-bottom: 4px;
  }
  .bill-party .nm { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .bill-party .dt { font-size: 12.5px; color: #5A6B6C; line-height: 1.45; }
  .bill table { margin-top: ${compact ? '6px' : '10px'}; }
  .bill th { background: ${modern ? '#0F3D3E' : 'transparent'}; color: ${modern ? '#fff' : '#5A6B6C'};
    ${modern ? 'padding: 9px 8px; border-bottom: none;' : ''} }
  .bill td.num, .bill th.num { text-align: right; white-space: nowrap; }
  .bill td.center, .bill th.center { text-align: center; }
  .bill-summary {
    margin-top: ${compact ? '10px' : '14px'};
    display: flex; justify-content: flex-end;
  }
  .bill-summary-box {
    width: ${compact ? '240px' : '280px'};
    ${modern ? 'background: #f4f8f5; border-radius: 10px; padding: 12px 14px;' : ''}
  }
  .bill-sum-row {
    display: flex; justify-content: space-between; gap: 24px;
    padding: ${compact ? '3px 0' : '5px 0'}; font-size: 13px;
  }
  .bill-sum-row.total {
    border-top: 2px solid #0F3D3E; margin-top: 6px; padding-top: 8px;
    font-size: 15px; font-weight: 700; color: #0F3D3E;
  }
  .bill-sum-row.due { color: #b91c1c; font-weight: 700; }
  .bill-sum-row.paid { color: #14532d; }
  .bill-notes {
    margin-top: 16px; padding: 10px 12px; background: #f8faf9;
    border-left: 3px solid #16a34a; font-size: 12.5px; color: #3d5248;
  }
  .bill-notes .lbl { font-weight: 700; color: #0F3D3E; margin-bottom: 2px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
  .bill-footer-note {
    margin-top: ${compact ? '18px' : '28px'}; text-align: center;
    font-size: 12px; color: #5A6B6C; border-top: 1px dashed #D5E0DF; padding-top: 12px;
  }
  .bill .sig { margin-top: ${compact ? '28px' : '40px'}; }
  .bill-modern-band {
    ${modern ? 'background: #0F3D3E; color: #fff; padding: 14px 16px; border-radius: 10px; margin-bottom: 16px;' : 'display:none;'}
  }
  .bill-modern-band h2 { margin: 0; color: #fff; font-size: 22px; }
  .bill-modern-band .sub { opacity: 0.85; font-size: 12.5px; margin-top: 4px; }
  `
}

export function buildBillHtml(input: {
  patient: Patient
  bill: Bill
  items: BillItem[]
}): string {
  const settings = getSettings()
  const layout = normalizeBillPrintLayout(settings.bill_print_layout)
  const style = resolveBillVisualStyle(layout, settings.bill_print_base_style)
  const isCustom = layout === 'custom'
  const hasBillFile = isCustom && !!(settings.bill_print_file_name || '').trim()
  const billFileKind = settings.bill_print_file_kind
  const billFilePreview =
    hasBillFile && (billFileKind === 'image' || billFileKind === 'pdf')
      ? buildStationeryPreview(settings.bill_print_file_name, billFileKind, 'bill')
      : null
  const useImageBackground = billFilePreview?.kind === 'image'
  // Uploaded stationery replaces the digital clinic heading on custom bills
  const letterheadHtml =
    hasBillFile || settings.print_letterhead_mode === 'paper'
      ? `<div class="letterhead-spacer" aria-hidden="true"></div>`
      : letterhead(settings)

  const stationeryBgCss = useImageBackground
    ? `
  .bill-stationery-bg {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: fill; z-index: 0; pointer-events: none;
  }
  .bill { position: relative; z-index: 1; }
  `
    : ''
  const stationeryBgHtml = useImageBackground
    ? `<img class="bill-stationery-bg" src="${billFilePreview!.dataUrl}" alt="" />`
    : ''

  const docTitle = isCustom
    ? (settings.bill_print_title || 'Invoice').trim() || 'Invoice'
    : style === 'modern'
      ? 'Tax Invoice'
      : 'Invoice'
  const billToLabel = isCustom
    ? (settings.bill_print_bill_to_label || 'Bill to').trim() || 'Bill to'
    : 'Bill to'
  const detailsLabel = isCustom
    ? (settings.bill_print_details_label || 'Invoice details').trim() || 'Invoice details'
    : 'Invoice details'
  const showType = settings.bill_print_show_item_type !== '0'
  const showQty = !isCustom || settings.bill_print_show_qty !== '0'
  const showRate = !isCustom || settings.bill_print_show_rate !== '0'
  const showPatientDetails = settings.bill_print_show_patient_details !== '0'
  const showNotes = settings.bill_print_show_notes !== '0'
  const showSignature = settings.bill_print_show_signature !== '0'
  const showPayment = settings.bill_print_show_payment_summary !== '0'
  const footerNote = (settings.bill_print_footer_note || '').trim()
  const discount = billDiscountAmount(input.bill)
  const currency = settings.currency
  const ageGender = [input.patient.age != null ? `${input.patient.age}y` : null, input.patient.gender]
    .filter(Boolean)
    .join(' · ')

  const statusClass =
    input.bill.payment_status === 'Paid'
      ? 'paid'
      : input.bill.payment_status === 'Partially paid'
        ? 'partial'
        : 'unpaid'
  const statusLabel =
    input.bill.status === 'cancelled'
      ? 'Cancelled'
      : input.bill.payment_status === 'Paid'
        ? 'Paid'
        : input.bill.payment_status === 'Partially paid'
          ? 'Partially paid'
          : 'Unpaid'

  const colSpan =
    2 + (showType ? 1 : 0) + (showQty ? 1 : 0) + (showRate ? 1 : 0) + 1 /* amount */
  const rows = input.items
    .map(
      (item, i) => `<tr>
      <td class="center">${i + 1}</td>
      <td>${escapeHtml(item.item_name)}</td>
      ${showType ? `<td>${escapeHtml(item.item_type)}</td>` : ''}
      ${showQty ? `<td class="center">${item.quantity}</td>` : ''}
      ${showRate ? `<td class="num">${formatMoney(item.unit_price, currency)}</td>` : ''}
      <td class="num">${formatMoney(item.total, currency)}</td>
    </tr>`,
    )
    .join('')

  const patientDetails = showPatientDetails
    ? `<div class="dt">${[
        ageGender || null,
        input.patient.mobile ? `Mob: ${escapeHtml(input.patient.mobile)}` : null,
        input.patient.address ? escapeHtml(input.patient.address) : null,
      ]
        .filter(Boolean)
        .join('<br/>')}</div>`
    : ''

  const titleBlock =
    style === 'modern'
      ? `<div class="bill-modern-band">
          <h2>${escapeHtml(docTitle.toUpperCase())}</h2>
          <div class="sub">${escapeHtml(input.bill.bill_number)} · ${escapeHtml(input.bill.bill_date)}</div>
        </div>`
      : `<div class="bill-title-row">
          <div>
            <span class="bill-badge">${escapeHtml(docTitle)}</span>
            <h2 class="bill-doc-title">${escapeHtml(input.bill.bill_number)}</h2>
            <div class="muted">Date: ${escapeHtml(input.bill.bill_date)}</div>
          </div>
          <div class="bill-meta">
            <div><strong>${escapeHtml(statusLabel)}</strong></div>
            <span class="bill-status ${statusClass}">${escapeHtml(input.bill.payment_status)}</span>
          </div>
        </div>`

  const summary = `<div class="bill-summary"><div class="bill-summary-box">
    <div class="bill-sum-row"><span>Subtotal</span><span>${formatMoney(input.bill.subtotal, currency)}</span></div>
    ${
      discount > 0
        ? `<div class="bill-sum-row"><span>Discount${
            input.bill.discount_type === 'percent' ? ` (${input.bill.discount_value}%)` : ''
          }</span><span>− ${formatMoney(discount, currency)}</span></div>`
        : ''
    }
    ${
      input.bill.tax_amount > 0
        ? `<div class="bill-sum-row"><span>Tax</span><span>${formatMoney(input.bill.tax_amount, currency)}</span></div>`
        : ''
    }
    <div class="bill-sum-row total"><span>Total</span><span>${formatMoney(input.bill.total_amount, currency)}</span></div>
    ${
      showPayment
        ? `<div class="bill-sum-row paid"><span>Paid</span><span>${formatMoney(input.bill.amount_paid, currency)}</span></div>
           ${
             input.bill.outstanding_amount > 0
               ? `<div class="bill-sum-row due"><span>Outstanding</span><span>${formatMoney(input.bill.outstanding_amount, currency)}</span></div>`
               : `<div class="bill-sum-row paid"><span>Balance</span><span>Nil</span></div>`
           }`
        : ''
    }
  </div></div>`

  const body = `
  <div class="bill bill-${style}${isCustom ? ' bill-custom' : ''}">
    ${stationeryBgHtml}
    ${letterheadHtml}
    ${titleBlock}
    <div class="bill-parties">
      <div class="bill-party">
        <div class="lbl">${escapeHtml(billToLabel)}</div>
        <div class="nm">${escapeHtml(input.patient.full_name)}</div>
        <div class="dt">${escapeHtml(input.patient.patient_code)}</div>
        ${patientDetails}
      </div>
      <div class="bill-party">
        <div class="lbl">${escapeHtml(detailsLabel)}</div>
        <div class="dt">
          <strong>${escapeHtml(input.bill.bill_number)}</strong><br/>
          Date: ${escapeHtml(input.bill.bill_date)}<br/>
          Status: ${escapeHtml(statusLabel)}
          ${style === 'modern' ? `<br/><span class="bill-status ${statusClass}">${escapeHtml(input.bill.payment_status)}</span>` : ''}
        </div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th class="center" style="width:36px">#</th>
          <th>Particulars</th>
          ${showType ? '<th>Type</th>' : ''}
          ${showQty ? '<th class="center" style="width:48px">Qty</th>' : ''}
          ${showRate ? '<th class="num">Rate</th>' : ''}
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="${colSpan}" style="text-align:center;color:#5A6B6C">No items</td></tr>`}
      </tbody>
    </table>
    ${summary}
    ${
      showNotes && input.bill.notes
        ? `<div class="bill-notes"><div class="lbl">Notes</div>${escapeHtml(input.bill.notes)}</div>`
        : ''
    }
    ${
      showSignature
        ? `<div class="sig"><div class="sig-line">${escapeHtml(settings.doctor_name)}<br/><span class="muted">Authorized signature</span></div></div>`
        : ''
    }
    ${footerNote ? `<div class="bill-footer-note">${escapeHtml(footerNote)}</div>` : ''}
  </div>`

  return wrapDocument(body, settings, billPrintCss(style) + stationeryBgCss)
}

export function buildInvoiceHtml(input: {
  patient: Patient
  bill: Bill
  invoice: Invoice
  payment: Payment
}): string {
  const settings = getSettings()
  const money = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: settings.currency || 'INR',
      maximumFractionDigits: 2,
    }).format(n)

  const body = `
  <div class="bill classic">
    <div class="bill-top">
      <div>
        <div class="eyebrow">Payment invoice</div>
        <h1 class="bill-doc-title">${escapeHtml(input.invoice.invoice_number)}</h1>
        <div class="sub">Against bill ${escapeHtml(input.bill.bill_number)}</div>
      </div>
      <div class="right">
        <div><strong>Date</strong> ${escapeHtml(input.invoice.invoice_date)}</div>
        <div><strong>Mode</strong> ${escapeHtml(input.invoice.payment_mode)}</div>
        <div><strong>Receipt</strong> ${escapeHtml(input.payment.payment_code)}</div>
      </div>
    </div>
    <div class="bill-parties">
      <div class="bill-party">
        <div class="lbl">${escapeHtml(settings.bill_print_bill_to_label || 'Bill to')}</div>
        <div class="nm">${escapeHtml(input.patient.full_name)}</div>
        <div class="dt">${escapeHtml(input.patient.patient_code)}${input.patient.mobile ? ` · ${escapeHtml(input.patient.mobile)}` : ''}</div>
      </div>
      <div class="bill-party">
        <div class="lbl">Amount received</div>
        <div class="nm">${escapeHtml(money(input.invoice.amount))}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Payment towards bill ${escapeHtml(input.bill.bill_number)} (total ${escapeHtml(money(input.bill.total_amount))})</td>
          <td class="num">${escapeHtml(money(input.invoice.amount))}</td>
        </tr>
      </tbody>
    </table>
    <div class="bill-summary"><div class="bill-summary-box">
      <div class="bill-sum-row"><span>Bill total</span><span>${escapeHtml(money(input.bill.total_amount))}</span></div>
      <div class="bill-sum-row paid"><span>Total paid</span><span>${escapeHtml(money(input.bill.amount_paid))}</span></div>
      <div class="bill-sum-row total"><span>Outstanding</span><span>${escapeHtml(money(input.bill.outstanding_amount))}</span></div>
    </div></div>
    ${
      input.invoice.reference_number
        ? `<div class="bill-notes"><div class="lbl">Reference</div>${escapeHtml(input.invoice.reference_number)}</div>`
        : ''
    }
    ${
      input.invoice.notes
        ? `<div class="bill-notes"><div class="lbl">Notes</div>${escapeHtml(input.invoice.notes)}</div>`
        : ''
    }
    <div class="sig"><div class="sig-line">${escapeHtml(settings.doctor_name)}<br/><span class="muted">Authorized signature</span></div></div>
  </div>`

  return wrapDocument(body, settings, billPrintCss('classic'))
}

/* ------------------------------------------------------------------ */
/* Native OS print + archive copy                                       */
/*                                                                      */
/* Opens the system print dialog (no custom preview window).            */
/* Every print also saves a PDF copy under the clinic data folder.      */
/* ------------------------------------------------------------------ */

function archiveFolderForName(fileName: string): 'prescriptions' | 'bills' | 'prints' {
  const lower = fileName.toLowerCase()
  if (lower.startsWith('prescription') || lower.startsWith('visit')) return 'prescriptions'
  if (lower.startsWith('bill') || lower.startsWith('invoice')) return 'bills'
  return 'prints'
}

async function savePdfCopy(
  html: string,
  folder: 'prescriptions' | 'bills' | 'prints',
  fileName: string,
  reveal = false,
): Promise<string> {
  const paths = getAppPaths()
  const dest = path.join(paths[folder], fileName)
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true },
  })
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    const page = resolvePaperSize(getSettings().print_paper_size)
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: page.electronSize,
    })
    fs.writeFileSync(dest, pdf)
  } finally {
    if (!win.isDestroyed()) win.close()
  }
  if (reveal) shell.showItemInFolder(dest)
  return dest
}

/** Show the native print dialog once for HTML (Cmd+P equivalent). */
async function printWithSystemDialog(html: string, title: string): Promise<void> {
  const parent = BrowserWindow.getFocusedWindow() ?? undefined
  const win = new BrowserWindow({
    width: 900,
    height: 1000,
    // Off-screen so only the system print dialog is visible (not a second app window).
    x: -10000,
    y: -10000,
    show: false,
    autoHideMenuBar: true,
    title,
    parent,
    webPreferences: { sandbox: true },
  })

  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    win.showInactive()

    await new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        resolve()
      }

      win.once('closed', finish)

      win.webContents
        .executeJavaScript(
          `new Promise((resolve) => {
            const done = () => resolve(true);
            window.addEventListener('afterprint', done, { once: true });
            window.print();
          })`,
          true,
        )
        .then(finish)
        .catch(finish)

      // Safety: never leave the UI stuck if afterprint never fires
      setTimeout(finish, 5 * 60 * 1000)
    })
  } finally {
    if (!win.isDestroyed()) win.close()
  }
}

export async function printHtml(
  html: string,
  title = 'Print',
  pdfName = 'document.pdf',
): Promise<{ archived: string }> {
  const folder = archiveFolderForName(pdfName)
  const archived = await savePdfCopy(html, folder, pdfName, false)
  await printWithSystemDialog(html, title)
  return { archived }
}

export async function exportPdf(
  html: string,
  folder: 'prescriptions' | 'bills' | 'prints',
  fileName: string,
): Promise<string> {
  return savePdfCopy(html, folder, fileName, true)
}
