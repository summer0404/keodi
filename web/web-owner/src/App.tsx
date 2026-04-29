import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import OwnerHome from './components/home/OwnerHome'
import OwnerLoginForm from './components/owner-login/OwnerLoginForm'
import OwnerRegistrationForm from './components/owner-registration/OwnerRegistrationForm'

function App() {
  return (
    <Router>
      <main className="app bg-[#fafafa]">
        <Routes>
          <Route path="/home" element={<OwnerHome />} />
          <Route path="/login" element={<OwnerLoginForm />} />
          <Route path="/registration" element={<OwnerRegistrationForm />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </Router>
  )
}

export default App
