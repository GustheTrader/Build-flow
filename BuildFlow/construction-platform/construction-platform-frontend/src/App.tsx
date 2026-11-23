import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import HITLApprovals from './pages/HITLApprovals';
import AIAgentsMonitor from './pages/AIAgentsMonitor';
import Login from './pages/Login';
import { Invoices } from './pages/Invoices';
import { InvoiceDetail } from './pages/InvoiceDetail';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { Vendors } from './pages/Vendors';
import JobWorkspace from './pages/builder/JobWorkspace';
import Leads from './pages/builder/Leads';
import Estimates from './pages/builder/Estimates';
import Portal from './pages/builder/Portal';

// Served inside Bot HQ (under /buildflow/), Bot HQ has already signed the person in and adds the service key.
const EMBEDDED = import.meta.env.VITE_EMBEDDED === '1';
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(EMBEDDED);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(EMBEDDED || !!token);
  }, []);

  // The client portal is public: a homeowner opens their private link without signing in.
  if (window.location.pathname.startsWith(`${BASENAME ?? ''}/portal/`)) {
    return (
      <Router basename={BASENAME}>
        <Routes><Route path="/portal/:token" element={<Portal />} /></Routes>
      </Router>
    );
  }

  if (!isAuthenticated) {
    return (
      <Router basename={BASENAME}>
        <Routes>
          <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router basename={BASENAME}>
      <div className="min-h-screen bg-gray-50">
        <Navbar onLogout={() => setIsAuthenticated(false)} />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<JobWorkspace />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/estimates" element={<Estimates />} />
            <Route path="/hitl-approvals" element={<HITLApprovals />} />
            <Route path="/ai-agents" element={<AIAgentsMonitor />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/invoices/:id/edit" element={<InvoiceDetail />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/purchase-orders/:id" element={<InvoiceDetail />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
