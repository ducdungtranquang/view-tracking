import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Phone, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../config';

interface Notification {
  id: string;
  videoId: string;
  videoTitle: string;
  type: 'email' | 'zalo' | 'sms';
  recipient: string;
  alertLevel: 'warning' | 'emergency';
  message: string;
  status: 'delivered' | 'failed';
  timestamp: string;
  viewsPerMinute: number;
  threshold: number;
}

const NotificationHistory = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    type: 'all',
    status: 'all',
    alertLevel: 'all'
  });
  
  useEffect(() => {
    fetchNotifications();
  }, []);
  
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/notifications/history`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notification history');
    } finally {
      setLoading(false);
    }
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'zalo':
        return <MessageSquare className="h-5 w-5" />;
      case 'sms':
        return <Phone className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };
  
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'bg-blue-900 text-blue-200';
      case 'zalo':
        return 'bg-indigo-900 text-indigo-200';
      case 'sms':
        return 'bg-purple-900 text-purple-200';
      default:
        return 'bg-gray-800 text-gray-300';
    }
  };
  
  const filteredNotifications = notifications.filter(notification => {
    return (
      (filter.type === 'all' || notification.type === filter.type) &&
      (filter.status === 'all' || notification.status === filter.status) &&
      (filter.alertLevel === 'all' || notification.alertLevel === filter.alertLevel)
    );
  });
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Notification History</h3>
        
        <div className="flex space-x-4">
          <select
            value={filter.type}
            onChange={e => setFilter({ ...filter, type: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="email">Email</option>
            <option value="zalo">Zalo</option>
            <option value="sms">SMS</option>
          </select>
          
          <select
            value={filter.status}
            onChange={e => setFilter({ ...filter, status: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
          
          <select
            value={filter.alertLevel}
            onChange={e => setFilter({ ...filter, alertLevel: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="warning">Warning</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
      </div>
      
      {filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-400">
            No notification history found matching the current filters.
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Video
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Alert Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Views/Min
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredNotifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(notification.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="line-clamp-1" title={notification.videoTitle}>
                        {notification.videoTitle}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                        <span className="ml-1 capitalize">{notification.type}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {notification.recipient}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        notification.alertLevel === 'emergency' 
                          ? 'bg-red-900 text-red-200' 
                          : 'bg-yellow-900 text-yellow-200'
                      }`}>
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        <span className="capitalize">{notification.alertLevel}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <span className={notification.alertLevel === 'emergency' ? 'text-red-500' : 'text-yellow-500'}>
                          {notification.viewsPerMinute}
                        </span>
                        <span className="mx-1 text-gray-500">/</span>
                        <span className="text-gray-400">{notification.threshold}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        notification.status === 'delivered' 
                          ? 'bg-green-900 text-green-200' 
                          : 'bg-red-900 text-red-200'
                      }`}>
                        {notification.status === 'delivered' 
                          ? <CheckCircle2 className="h-3 w-3 mr-1" /> 
                          : <XCircle className="h-3 w-3 mr-1" />}
                        <span className="capitalize">{notification.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationHistory;