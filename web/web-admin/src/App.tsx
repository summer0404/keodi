import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLogin from './components/admin-login/AdminLoginForm'
import Dashboard from './components/dashboard/Dashboard'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/dashboard/*" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
