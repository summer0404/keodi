import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import OwnerHome from './components/home/OwnerHome'
import OwnerLoginForm from './components/owner-login/OwnerLoginForm'
import OwnerRegistrationForm from './components/owner-registration/OwnerRegistrationForm'
import ClaimPlaceFlow from './components/claim-place/ClaimPlaceFlow'
import AddPlaceForm from './components/add-place/AddPlaceForm'
import ResubmitApplicationForm from './components/resubmit-application/ResubmitApplicationForm'

function App() {
  return (
    <Router>
      <main className="app bg-[#fafafa]">
        <Routes>
          <Route path="/home" element={<OwnerHome />} />
          <Route path="/login" element={<OwnerLoginForm />} />
          <Route path="/registration" element={<OwnerRegistrationForm />} />
          <Route path="/claim-place" element={<ClaimPlaceFlow />} />
          <Route path="/add-place" element={<AddPlaceForm />} />
          <Route path="/resubmit-application" element={<ResubmitApplicationForm />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </Router>
  )
}

export default App
