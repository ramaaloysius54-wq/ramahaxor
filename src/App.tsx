import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Layouts
import DashboardLayout from './layouts/DashboardLayout'; // HRD
import EmployeeLayout from './layouts/EmployeeLayout'; // Karyawan

// Auth
import Login from './features/auth/Login';

// HRD Features
import HRDashboard from './features/dashboard/HRDashboard';
import EmployeeList from './features/employees/EmployeeList';
import EmployeeForm from './features/employees/EmployeeForm';
import LeaveManagement from './features/leave-requests/LeaveManagement';
import RecruitmentBoard from './features/recruitment/RecruitmentBoard';
import AnnouncementForm from './features/announcements/AnnouncementForm';
import PayrollDashboard from './features/payroll/PayrollDashboard';
import ManageAccounts from './features/accounts/ManageAccounts';
import HRAttendanceList from './features/attendance/HRAttendanceList'; 
import WarningLetter from './features/employees/WarningLetter'; // <-- TAMBAHAN IMPORT SURAT SP

// Employee Features
import EmployeeDashboard from './features/dashboard/EmployeeDashboard';
import AttendanceCheckIn from './features/attendance/AttendanceCheckIn'; 
import LeaveRequestForm from './features/leave-requests/LeaveRequestForm'; 
import EmployeeProfile from './features/profile/EmployeeProfile'; 
import EmployeePayslips from './features/employees/EmployeePayslips';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rute Publik */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* ============================== */}
        {/* RUTE HRD (Dashboard Desktop)   */}
        {/* ============================== */}
        <Route element={<ProtectedRoute allowedRole="hrd" />}>
          <Route element={<DashboardLayout />}>
            <Route path="/hrd/dashboard" element={<HRDashboard />} />
            <Route path="/hrd/employees" element={<EmployeeList />} />
            <Route path="/hrd/employees/new" element={<EmployeeForm />} />
            <Route path="/hrd/employees/edit/:id" element={<EmployeeForm />} /> 
            
            <Route path="/hrd/leaves" element={<LeaveManagement />} />
            <Route path="/hrd/recruitment" element={<RecruitmentBoard />} />
            <Route path="/hrd/announcements/new" element={<AnnouncementForm />} />
            <Route path="/hrd/payroll" element={<PayrollDashboard />} />
            
            <Route path="/hrd/manage-accounts" element={<ManageAccounts />} />
            <Route path="/hrd/warning-letters" element={<WarningLetter />} /> {/* <-- TAMBAHAN RUTE SURAT SP */}
            <Route path="/hrd/attendance" element={<HRAttendanceList />} /> 
          </Route>
        </Route>

        {/* ============================== */}
        {/* RUTE KARYAWAN (Bottom Nav)     */}
        {/* ============================== */}
        <Route element={<ProtectedRoute allowedRole="employee" />}>
          <Route element={<EmployeeLayout />}>
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            
            <Route path="/employee/attendance" element={
               <div className="p-4"><AttendanceCheckIn session={{ user: { id: 'auto-handled-by-hook' } }} /></div>
            } />
            
            <Route path="/employee/leaves" element={
              <div className="p-4"><LeaveRequestForm session={{ user: { id: 'auto-handled-by-hook' } }} /></div>
            } />
            
            <Route path="/employee/profile" element={<EmployeeProfile />} />
            <Route path="/employee/payslips" element={<EmployeePayslips />} />
            
          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}
