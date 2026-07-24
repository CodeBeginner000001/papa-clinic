import fs from 'node:fs'
import path from 'node:path'
import { app, dialog, ipcMain, shell } from './electron-api'
import * as repos from './db/repos'
import { createBackup, chooseBackupPath, chooseRestoreFile, restoreBackup } from './backup'
import { buildBillHtml, buildInvoiceHtml, buildPrescriptionHtml, buildVisitHtml, exportPdf, printHtml } from './pdf'
import { exportReportExcel } from './export'
import { appendLog, getAppPaths } from './paths'
import { saveConfig } from './config'
import { closeDatabase, getDb } from './db/database'
import {
  buildLetterheadPreview,
  buildStationeryPreview,
  pickAndStoreLetterhead,
  pickAndStoreStationery,
  removeLetterheadFile,
  removeStationeryFile,
} from './letterheads'

function handle<T>(channel: string, fn: (...args: any[]) => T | Promise<T>) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      appendLog(`IPC ${channel} failed: ${message}`)
      throw new Error(message)
    }
  })
}

export function registerIpc(): void {
  handle('settings:get', () => repos.getSettings())
  handle('settings:save', (settings) => repos.saveSettings(settings))

  handle('templates:list', () => repos.listPrintTemplates())
  handle('templates:get', (id: number) => repos.getPrintTemplate(id))
  handle('templates:active', () => repos.getActivePrintTemplate())
  handle('templates:save', (input) => {
    const before = input?.id ? repos.getPrintTemplate(Number(input.id)) : null
    const saved = repos.savePrintTemplate(input)
    // Drop orphaned letterhead file after clear/replace
    if (before?.file_name && before.file_name !== saved.file_name) {
      const stillUsed = repos
        .listPrintTemplates()
        .some((t) => t.file_name === before.file_name)
      if (!stillUsed) removeLetterheadFile(before.file_name)
    }
    return saved
  })
  handle('templates:setActive', (id: number) => repos.setActivePrintTemplate(id))
  handle('templates:delete', (id: number) => {
    const { removedFile } = repos.deletePrintTemplate(id)
    if (removedFile) removeLetterheadFile(removedFile)
    return true
  })
  handle('templates:pickFile', () => pickAndStoreLetterhead())
  handle('templates:preview', (fileName: string, fileKind: 'pdf' | 'image' | 'word' | null) =>
    buildLetterheadPreview(fileName, fileKind),
  )
  handle('templates:pickBillFile', () => pickAndStoreStationery('bill'))
  handle(
    'templates:billPreview',
    (fileName: string, fileKind: 'pdf' | 'image' | 'word' | null) =>
      buildStationeryPreview(fileName, fileKind, 'bill'),
  )
  handle('templates:clearBillFile', (fileName: string | null) => {
    if (fileName) removeStationeryFile(fileName, 'bill')
    return true
  })

  handle('dashboard:get', () => repos.getDashboard())
  handle('reports:get', (input) => repos.getReports(input))
  handle('reports:export', (kind, from, to) => exportReportExcel(kind, from, to))
  handle('search:global', (query) => repos.globalSearch(query))

  handle('patients:list', (query) => repos.listPatients(query))
  handle('patients:get', (id) => repos.getPatient(id))
  handle('patients:duplicates', (input) => repos.findDuplicatePatients(input))
  handle('patients:create', (input) => repos.createPatient(input))
  handle('patients:update', (id, input) => repos.updatePatient(id, input))
  handle('patients:archive', (id) => repos.archivePatient(id))
  handle('patients:dashboard', (id) => repos.getPatientDashboard(id))

  handle('visits:list', (query) => repos.listVisits(query))
  handle('prescriptions:list', (query) => repos.listPrescriptions(query))
  handle('bills:list', (query) => repos.listBills(query))
  handle('payments:list', (query) => repos.listPayments(query))

  handle('visits:get', (id) => repos.getVisit(id))
  handle('visits:create', (input) => repos.createVisit(input))
  handle('visits:update', (id, input) => repos.updateVisit(id, input))
  handle('visits:delete', (id) => repos.softDeleteVisit(id))
  handle('visits:vitals', (id) => repos.getVitals(id))
  handle('visits:print', async (visitId: number) => {
    const visit = repos.getVisit(visitId)
    if (!visit) throw new Error('Visit not found')
    const patient = repos.getPatient(visit.patient_id)
    if (!patient) throw new Error('Patient not found')
    const vitals = repos.getVitals(visitId)
    await printHtml(
      buildVisitHtml({ patient, visit, vitals }),
      `Visit — ${patient.full_name}`,
      `Visit_${visit.visit_code}.pdf`,
    )
    return true
  })
  handle('visits:setTests', (visitId, items) => {
    const tests = repos.setVisitTests(visitId, items)
    const { sync, billing } = repos.applyVisitTestBilling(visitId)
    return { tests, sync, billing }
  })
  handle('visits:leftoverBillItems', (visitId: number) => repos.getVisitLeftoverBillItems(visitId))
  handle('visits:billingSummary', (visitId: number) => repos.getVisitBillingSummary(visitId))
  handle('visits:setProcedures', (visitId, items) => {
    const procedures = repos.setVisitProcedures(visitId, items)
    const { sync, billing } = repos.applyVisitProcedureBilling(visitId)
    return { procedures, sync, billing }
  })
  handle('visits:getTests', (visitId) => repos.getVisitTests(visitId))
  handle('visits:getProcedures', (visitId) => repos.getVisitProcedures(visitId))
  handle('tests:isPaid', (id: number) => repos.isVisitTestPaid(id))
  handle('tests:refund', (id: number) => repos.refundVisitTest(id))
  handle('procedures:isPaid', (id: number) => repos.isVisitProcedurePaid(id))
  handle('procedures:refund', (id: number) => repos.refundVisitProcedure(id))

  handle('symptoms:search', (query) => repos.searchSymptoms(query))
  handle('tests:listAll', (query) => repos.listAllTests(query))
  handle('tests:updateResult', (id, input) => repos.updateVisitTestResult(id, input))
  handle('tests:schedule', (id: number, scheduledAt: string) => repos.scheduleVisitTest(id, scheduledAt))
  handle('tests:setWorkflowStatus', (id: number, status: 'Completed' | 'Cancelled') => {
    const test = repos.setVisitTestWorkflowStatus(id, status)
    const { sync, billing } = repos.applyVisitTestBilling(test.visit_id)
    return { test, sync, billing }
  })
  handle('tests:uploadReport', async (id: number) => {
    const existing = repos.getVisitTest(id)
    if (!existing) throw new Error('Test not found')
    if (existing.status !== 'Completed' && existing.status !== 'Result received') {
      throw new Error('Upload a report only after the test is completed')
    }
    const { pickAndStoreTestReport, removeTestReportFile } = await import('./test-reports')
    const picked = await pickAndStoreTestReport()
    if (!picked) return null
    const { test, previousFileName } = repos.saveVisitTestReport(id, picked)
    if (previousFileName && previousFileName !== picked.fileName) removeTestReportFile(previousFileName)
    return test
  })
  handle('tests:openReport', async (id: number) => {
    const fileName = repos.getVisitTestReportFileName(id)
    if (!fileName) throw new Error('No report uploaded for this test')
    const { openTestReportFile } = await import('./test-reports')
    return openTestReportFile(fileName)
  })
  handle('options:list', (category) => repos.listOptions(category))
  handle('options:add', (category, name) => repos.addOption(category, name))
  handle('options:update', (id, name) => repos.updateOption(id, name))
  handle('options:delete', (id) => repos.deleteOption(id))
  handle('medicines:search', (query) => repos.searchMedicines(query))
  handle('medicines:list', (query) => repos.listMedicines(query))
  handle('medicines:create', (input) => repos.getOrCreateMedicine(input))
  handle('medicines:update', (id, input) => repos.updateMedicine(id, input))
  handle('medicines:deactivate', (id) => repos.deactivateMedicine(id))

  handle('prescriptions:getByVisit', (visitId) => {
    const rx = repos.getPrescriptionByVisit(visitId)
    if (!rx) return null
    return { ...rx, medicines: repos.getPrescriptionMedicines(rx.id) }
  })
  handle('prescriptions:save', (input) => {
    const rx = repos.savePrescription(input)
    return { ...rx, medicines: repos.getPrescriptionMedicines(rx.id) }
  })
  handle('prescriptions:print', async (visitId: number) => {
    const rx = repos.getPrescriptionByVisit(visitId)
    if (!rx) throw new Error('Prescription not found')
    const patient = repos.getPatient(rx.patient_id)
    if (!patient) throw new Error('Patient not found')
    const medicines = repos.getPrescriptionMedicines(rx.id)
    const html = buildPrescriptionHtml({
      patient,
      date: rx.prescription_date,
      diagnosis: rx.diagnosis,
      advice: rx.advice,
      testsAdvised: rx.tests_advised,
      followUpDate: rx.follow_up_date,
      medicines,
    })
    await printHtml(
      html,
      `Prescription — ${patient.full_name}`,
      `Prescription_${patient.patient_code}_${rx.prescription_date}.pdf`,
    )
    return true
  })
  handle('prescriptions:pdf', async (visitId: number) => {
    const rx = repos.getPrescriptionByVisit(visitId)
    if (!rx) throw new Error('Prescription not found')
    const patient = repos.getPatient(rx.patient_id)
    if (!patient) throw new Error('Patient not found')
    const medicines = repos.getPrescriptionMedicines(rx.id)
    const html = buildPrescriptionHtml({
      patient,
      date: rx.prescription_date,
      diagnosis: rx.diagnosis,
      advice: rx.advice,
      testsAdvised: rx.tests_advised,
      followUpDate: rx.follow_up_date,
      medicines,
    })
    const file = await exportPdf(
      html,
      'prescriptions',
      `Prescription_${patient.patient_code}_${rx.prescription_date}.pdf`,
    )
    return file
  })

  handle('tests:list', (query) => repos.listTests(query))
  handle('tests:upsert', (input) => repos.upsertTest(input))
  handle('procedures:list', (query) => repos.listProcedures(query))
  handle('procedures:upsert', (input) => repos.upsertProcedure(input))

  handle('bills:get', (id) => {
    const bill = repos.getBill(id)
    if (!bill) return null
    return { ...bill, items: repos.getBillItems(id) }
  })
  handle('bills:getByVisit', (visitId: number) => repos.listBillsForVisit(visitId))
  handle('bills:save', (input) => {
    const bill = repos.saveBill(input)
    return { ...bill, items: repos.getBillItems(bill.id) }
  })
  handle('bills:cancel', (id) => repos.cancelBill(id))
  handle('bills:pay', (input) => repos.recordPayment(input))
  handle('invoices:listByBill', (billId: number) => repos.listInvoicesForBill(billId))
  handle('invoices:get', (id: number) => repos.getInvoice(id))
  handle('invoices:print', async (invoiceId: number) => {
    const invoice = repos.getInvoice(invoiceId)
    if (!invoice) throw new Error('Invoice not found')
    const bill = repos.getBill(invoice.bill_id)
    if (!bill) throw new Error('Bill not found')
    const patient = repos.getPatient(bill.patient_id)
    if (!patient) throw new Error('Patient not found')
    const payment = repos.getPayment(invoice.payment_id)
    if (!payment) throw new Error('Payment not found')
    await printHtml(
      buildInvoiceHtml({ patient, bill, invoice, payment }),
      `Invoice ${invoice.invoice_number} — ${patient.full_name}`,
      `Invoice_${invoice.invoice_number}.pdf`,
    )
    return true
  })
  handle('invoices:pdf', async (invoiceId: number) => {
    const invoice = repos.getInvoice(invoiceId)
    if (!invoice) throw new Error('Invoice not found')
    const bill = repos.getBill(invoice.bill_id)
    if (!bill) throw new Error('Bill not found')
    const patient = repos.getPatient(bill.patient_id)
    if (!patient) throw new Error('Patient not found')
    const payment = repos.getPayment(invoice.payment_id)
    if (!payment) throw new Error('Payment not found')
    return exportPdf(
      buildInvoiceHtml({ patient, bill, invoice, payment }),
      'bills',
      `Invoice_${invoice.invoice_number}.pdf`,
    )
  })
  handle('bills:print', async (billId: number) => {
    const bill = repos.getBill(billId)
    if (!bill) throw new Error('Bill not found')
    const patient = repos.getPatient(bill.patient_id)
    if (!patient) throw new Error('Patient not found')
    const items = repos.getBillItems(billId)
    await printHtml(
      buildBillHtml({ patient, bill, items }),
      `Invoice ${bill.bill_number} — ${patient.full_name}`,
      `Bill_${bill.bill_number}.pdf`,
    )
    return true
  })
  handle('bills:pdf', async (billId: number) => {
    const bill = repos.getBill(billId)
    if (!bill) throw new Error('Bill not found')
    const patient = repos.getPatient(bill.patient_id)
    if (!patient) throw new Error('Patient not found')
    const items = repos.getBillItems(billId)
    return exportPdf(buildBillHtml({ patient, bill, items }), 'bills', `Bill_${bill.bill_number}.pdf`)
  })

  handle('backup:create', async () => {
    const chosen = await chooseBackupPath()
    return createBackup(chosen || undefined)
  })
  handle('backup:restore', async () => {
    const file = await chooseRestoreFile()
    if (!file) return null
    await restoreBackup(file)
    return file
  })
  handle('app:paths', () => getAppPaths())
  handle('app:openPath', (p: string) => shell.showItemInFolder(p))
  handle('app:info', () => ({
    version: app.getVersion(),
    dataDir: getAppPaths().root,
  }))
  handle('app:changeDataDir', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choose new data folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || !result.filePaths[0]) return null
    const newDir = result.filePaths[0]
    const current = getAppPaths()
    if (path.resolve(newDir) === path.resolve(current.root)) return null
    // Move the database to the new folder if it does not already contain one
    const targetDb = path.join(newDir, 'clinic.db')
    if (!fs.existsSync(targetDb) && fs.existsSync(current.db)) {
      try {
        // Flush pending WAL writes into the main db file before copying
        getDb().pragma('wal_checkpoint(FULL)')
      } catch {
        // db may already be closed; proceed with the copy
      }
      closeDatabase()
      fs.mkdirSync(newDir, { recursive: true })
      fs.copyFileSync(current.db, targetDb)
    }
    saveConfig({ dataDir: newDir })
    appendLog(`Data folder changed to ${newDir}; relaunching`)
    app.relaunch()
    app.exit(0)
    return newDir
  })
}
