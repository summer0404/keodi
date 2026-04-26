import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import OwnerRegistrationForm from './components/owner-registration/OwnerRegistrationForm'

function App() {
  return (
    <Router>
      <main className="app bg-[#fafafa]">
        <Routes>
          <Route path="/registration" element={<OwnerRegistrationForm />} />
          <Route path="/" element={<Navigate to="/registration" replace />} />
        </Routes>
      </main>
    </Router>
  )
}

export default App
