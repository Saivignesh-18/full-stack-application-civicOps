import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Dashboard Pages
import Dashboard from './pages/Dashboard';
import Complaints from './pages/complaints/Complaints';
import NewComplaint from './pages/complaints/NewComplaint';
import ComplaintDetail from './pages/complaints/ComplaintDetail';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Licenses from './pages/Licenses';
import LicenseDetail from './pages/LicenseDetail';
import BuildingPermits from './pages/BuildingPermits';
import BuildingPermitDetail from './pages/BuildingPermitDetail';
import NewBuildingPermit from './pages/NewBuildingPermit';
import Projects from './pages/Projects';
import Chatbot from './pages/Chatbot';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/complaints/new" element={<NewComplaint />} />
          <Route path="/complaints/:id" element={<ComplaintDetail />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />
          <Route path="/licenses" element={<Licenses />} />
          <Route path="/licenses/:id" element={<LicenseDetail />} />
          <Route path="/building-permits" element={<BuildingPermits />} />
          <Route path="/building-permits/new" element={<NewBuildingPermit />} />
          <Route path="/building-permits/:id" element={<BuildingPermitDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/chatbot" element={<Chatbot />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
