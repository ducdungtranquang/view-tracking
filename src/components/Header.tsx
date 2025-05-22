import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';

const pageNames: { [key: string]: string } = {
  '/': 'Dashboard',
  '/add-video': 'Add New Video',
  '/notifications': 'Notification History',
};

const Header = () => {
  const location = useLocation();
  const path = location.pathname.split('/')[1];
  const basePath = path ? `/${path}` : '/';
  const pageName = pageNames[basePath] || 'Video Details';
  
  return (
    <header className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
      <h2 className="text-xl font-semibold">{pageName}</h2>
      
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full hover:bg-gray-700 transition-colors relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full"></span>
        </button>
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">AD</span>
          </div>
          <span className="text-sm font-medium">Admin</span>
        </div>
      </div>
    </header>
  );
};

export default Header;