import { Link } from 'react-router-dom';
import { Building2, LayoutDashboard, FolderKanban, CheckSquare, Activity, LogOut, DollarSign, FileText, ShoppingCart, Users } from 'lucide-react';
import { auth } from '../lib/api';

interface NavbarProps {
  onLogout: () => void;
}

export default function Navbar({ onLogout }: NavbarProps) {
  const handleLogout = () => {
    auth.logout();
    onLogout();
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                BuildFlow AI
              </span>
            </div>
            
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              <NavLink to="/" icon={<LayoutDashboard className="h-5 w-5" />} text="Dashboard" />
              <NavLink to="/projects" icon={<FolderKanban className="h-5 w-5" />} text="Projects" />
              <NavLink to="/invoices" icon={<FileText className="h-5 w-5" />} text="Invoices" />
              <NavLink to="/purchase-orders" icon={<ShoppingCart className="h-5 w-5" />} text="Purchase Orders" />
              <NavLink to="/vendors" icon={<Users className="h-5 w-5" />} text="Vendors" />
              <NavLink to="/hitl-approvals" icon={<CheckSquare className="h-5 w-5" />} text="HITL Approvals" />
              <NavLink to="/ai-agents" icon={<Activity className="h-5 w-5" />} text="AI Agents" />
            </div>
          </div>

          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="flex items-center text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, icon, text }: { to: string; icon: React.ReactNode; text: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
    >
      {icon}
      <span className="ml-2">{text}</span>
    </Link>
  );
}
