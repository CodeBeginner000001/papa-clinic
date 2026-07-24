import { Route, Routes } from 'react-router-dom'
import Shell from './components/Shell'
import { SettingsProvider, ToastProvider } from './components/ui'
import DashboardPage from './pages/DashboardPage'
import PatientsPage from './pages/PatientsPage'
import PatientFormPage from './pages/PatientFormPage'
import PatientDetailPage from './pages/PatientDetailPage'
import VisitsPage from './pages/VisitsPage'
import VisitFormPage from './pages/VisitFormPage'
import VisitDetailPage from './pages/VisitDetailPage'
import VisitBillingPage from './pages/VisitBillingPage'
import PrescriptionsPage from './pages/PrescriptionsPage'
import PrescriptionFormPage from './pages/PrescriptionFormPage'
import TestsPage from './pages/TestsPage'
import BillingPage from './pages/BillingPage'
import BillFormPage from './pages/BillFormPage'
import BillViewPage from './pages/BillViewPage'
import ReportsPage from './pages/ReportsPage'
import CatalogPage from './pages/CatalogPage'
import PrintTemplatePage from './pages/PrintTemplatePage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <Shell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/new" element={<PatientFormPage />} />
            <Route path="/patients/:id/edit" element={<PatientFormPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
            <Route path="/visits" element={<VisitsPage />} />
            <Route path="/visits/new" element={<VisitFormPage />} />
            <Route path="/patients/:patientId/visits/new" element={<VisitFormPage />} />
            <Route path="/visits/:visitId/edit" element={<VisitFormPage />} />
            <Route path="/visits/:visitId" element={<VisitDetailPage />} />
            <Route path="/visits/:visitId/billing" element={<VisitBillingPage />} />
            <Route path="/visits/:visitId/prescription" element={<PrescriptionFormPage />} />
            <Route path="/prescriptions" element={<PrescriptionsPage />} />
            <Route path="/tests" element={<TestsPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/bills/new" element={<BillFormPage />} />
            <Route path="/bills/:billId/edit" element={<BillFormPage />} />
            <Route path="/bills/:billId" element={<BillViewPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/medicines" element={<CatalogPage />} />
            <Route path="/print-template" element={<PrintTemplatePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Shell>
      </ToastProvider>
    </SettingsProvider>
  )
}
