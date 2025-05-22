import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const { logout } = useAuth();
  
  return (
    <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col">
      <div className="flex items-center mb-8">
        <div className="flex items-center space-x-2">
          <span className="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xl">YT</span>
          </span>
          <h1 className="text-xl font-bold">ViewTracker</h1>
        </div>
      </div>
      
      <nav className="flex-1">
        <ul className="space-y-2">
          <li>
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                `flex items-center p-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              <Home className="mr-3 h-5 w-5" />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/add-video" 
              className={({ isActive }) => 
                `flex items-center p-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              <PlusCircle className="mr-3 h-5 w-5" />
              <span>Add Video</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/notifications" 
              className={({ isActive }) => 
                `flex items-center p-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              <Bell className="mr-3 h-5 w-5" />
              <span>Notifications</span>
            </NavLink>
          </li>
        </ul>
      </nav>
      
      <div className="mt-auto pt-4 border-t border-gray-700">
        <button 
          onClick={logout}
          className="w-full flex items-center p-3 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;