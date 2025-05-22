import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertTriangle, ExternalLink, Play, Pause, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../config';
import VideoStatusBadge from '../components/VideoStatusBadge';

interface VideoDetails {
  id: string;
  title: string;
  thumbnail: string;
  status: 'active' | 'paused';
  alertLevel: 'normal' | 'warning' | 'emergency';
  currentViews: number;
  viewsPerMinute: number;
  warningThreshold: number;
  emergencyThreshold: number;
  viewHistory: {
    timestamp: string;
    views: number;
    viewsPerMinute: number;
  }[];
  notifications: {
    emails: string[];
    zaloIds: string[];
    phoneNumbers: string[];
  };
}

const VideoDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (id) {
      fetchVideoDetails(id);
    }
  }, [id]);
  
  const fetchVideoDetails = async (videoId: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/videos/${videoId}`);
      setVideo(response.data);
    } catch (error) {
      console.error('Error fetching video details:', error);
      toast.error('Failed to load video details');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleVideoStatus = async () => {
    if (!video) return;
    
    try {
      const newStatus = video.status === 'active' ? 'paused' : 'active';
      await axios.patch(`${API_URL}/videos/${video.id}/status`, { status: newStatus });
      
      // Update local state
      setVideo(prev => prev ? { ...prev, status: newStatus as 'active' | 'paused' } : null);
      
      toast.success(`Video ${newStatus === 'active' ? 'resumed' : 'paused'} successfully`);
    } catch (error) {
      console.error('Error toggling video status:', error);
      toast.error('Failed to update video status');
    }
  };
  
  const deleteVideo = async () => {
    if (!video || !confirm('Are you sure you want to delete this video tracking?')) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/videos/${video.id}`);
      toast.success('Video tracking deleted successfully');
      navigate('/');
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video tracking');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!video) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center">
          <h3 className="text-xl font-semibold mb-4">Video Not Found</h3>
          <p className="text-gray-400 mb-6">
            The video you're looking for could not be found.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  // Process chart data
  const chartData = video.viewHistory.map(entry => ({
    time: new Date(entry.timestamp).toLocaleTimeString(),
    viewsPerMinute: entry.viewsPerMinute,
    totalViews: entry.views
  }));
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-semibold">Video Details</h2>
          <VideoStatusBadge status={video.status} alertLevel={video.alertLevel} />
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={toggleVideoStatus}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center"
          >
            {video.status === 'active' ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause Tracking
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume Tracking
              </>
            )}
          </button>
          
          <button
            onClick={deleteVideo}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg transition-colors flex items-center"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Tracking
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <div className="relative">
              <img 
                src={video.thumbnail} 
                alt={video.title} 
                className="w-full h-auto object-cover"
              />
              
              <a 
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2 right-2 bg-black bg-opacity-70 p-2 rounded-full hover:bg-opacity-90 transition-opacity"
              >
                <ExternalLink className="h-5 w-5 text-white" />
              </a>
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-4">{video.title}</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current Views:</span>
                  <span className="font-medium">{video.currentViews.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Views/Minute:</span>
                  <span className={`font-medium ${
                    video.alertLevel === 'emergency' 
                      ? 'text-red-500' 
                      : video.alertLevel === 'warning' 
                        ? 'text-yellow-500' 
                        : 'text-white'
                  }`}>
                    {video.viewsPerMinute}/min
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Warning at:</span>
                  <span className="font-medium text-yellow-500">{video.warningThreshold}/min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Emergency at:</span>
                  <span className="font-medium text-red-500">{video.emergencyThreshold}/min</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <h3 className="font-semibold text-lg mb-4">Notification Recipients</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Email Notifications</h4>
                {video.notifications.emails.length > 0 ? (
                  <ul className="space-y-1">
                    {video.notifications.emails.map((email, index) => (
                      <li key={index} className="text-sm">{email}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No email recipients configured</p>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Zalo Notifications</h4>
                {video.notifications.zaloIds.length > 0 ? (
                  <ul className="space-y-1">
                    {video.notifications.zaloIds.map((zaloId, index) => (
                      <li key={index} className="text-sm">{zaloId}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No Zalo recipients configured</p>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">SMS Notifications</h4>
                {video.notifications.phoneNumbers.length > 0 ? (
                  <ul className="space-y-1">
                    {video.notifications.phoneNumbers.map((phone, index) => (
                      <li key={index} className="text-sm">{phone}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No SMS recipients configured</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg h-full">
            <h3 className="font-semibold text-lg mb-6">Views per Minute History</h3>
            
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-400">
                  No historical data available yet. Data will appear after tracking for a few minutes.
                </p>
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#888" 
                      tick={{ fill: '#ccc' }}
                      tickMargin={10}
                    />
                    <YAxis 
                      stroke="#888" 
                      tick={{ fill: '#ccc' }}
                      tickMargin={10}
                      label={{ 
                        value: 'Views per Minute', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fill: '#ccc' }
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        borderColor: '#374151',
                        color: 'white'
                      }} 
                    />
                    <ReferenceLine 
                      y={video.warningThreshold} 
                      stroke="#eab308" 
                      strokeDasharray="3 3" 
                      label={{ 
                        value: 'Warning', 
                        position: 'right', 
                        fill: '#eab308'
                      }} 
                    />
                    <ReferenceLine 
                      y={video.emergencyThreshold} 
                      stroke="#ef4444" 
                      strokeDasharray="3 3" 
                      label={{ 
                        value: 'Emergency', 
                        position: 'right', 
                        fill: '#ef4444'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="viewsPerMinute" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#3b82f6' }}
                      activeDot={{ r: 6, fill: '#60a5fa' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            
            <div className="mt-8">
              <h3 className="font-semibold text-lg mb-6">Total Views History</h3>
              
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-400">
                    No historical data available yet. Data will appear after tracking for a few minutes.
                  </p>
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#888" 
                        tick={{ fill: '#ccc' }}
                        tickMargin={10}
                      />
                      <YAxis 
                        stroke="#888" 
                        tick={{ fill: '#ccc' }}
                        tickMargin={10}
                        label={{ 
                          value: 'Total Views', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { fill: '#ccc' }
                        }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          borderColor: '#374151',
                          color: 'white'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalViews" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#10b981' }}
                        activeDot={{ r: 6, fill: '#34d399' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetails;