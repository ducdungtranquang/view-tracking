import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, Trash2, ExternalLink, AlertTriangle, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../config';
import VideoStatusBadge from '../components/VideoStatusBadge';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  status: 'active' | 'paused';
  alertLevel: 'normal' | 'warning' | 'emergency';
  currentViews: number;
  viewsPerMinute: number;
  warningThreshold: number;
  emergencyThreshold: number;
}

const Dashboard = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/videos`);
      setVideos(response.data);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const toggleVideoStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await axios.patch(`${API_URL}/videos/${id}/status`, { status: newStatus });
      
      // Update local state
      setVideos(prevVideos => 
        prevVideos.map(video => 
          video.id === id ? { ...video, status: newStatus as 'active' | 'paused' } : video
        )
      );
      
      toast.success(`Video ${newStatus === 'active' ? 'resumed' : 'paused'} successfully`);
    } catch (error) {
      console.error('Error toggling video status:', error);
      toast.error('Failed to update video status');
    }
  };

  const deleteVideo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video tracking?')) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/videos/${id}`);
      
      // Update local state
      setVideos(prevVideos => prevVideos.filter(video => video.id !== id));
      
      toast.success('Video tracking deleted successfully');
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

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md">
          <h3 className="text-xl font-semibold mb-4">No Videos Being Tracked</h3>
          <p className="text-gray-400 mb-6">
            Start tracking YouTube videos by adding your first video to monitor.
          </p>
          <Link
            to="/add-video"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Add Your First Video
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Currently Tracking</h3>
        <Link
          to="/add-video"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Track New Video
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <div 
            key={video.id}
            className={`bg-gray-800 rounded-lg overflow-hidden shadow-lg border-l-4 ${
              video.alertLevel === 'emergency' 
                ? 'border-red-500' 
                : video.alertLevel === 'warning' 
                  ? 'border-yellow-500' 
                  : 'border-green-500'
            }`}
          >
            <div className="relative">
              <img 
                src={video.thumbnail} 
                alt={video.title} 
                className="w-full h-40 object-cover"
              />
              <div className="absolute top-2 right-2">
                <VideoStatusBadge status={video.status} alertLevel={video.alertLevel} />
              </div>
              {video.alertLevel !== 'normal' && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 p-1.5 rounded-full">
                  <AlertTriangle className={`h-5 w-5 ${
                    video.alertLevel === 'emergency' ? 'text-red-500' : 'text-yellow-500'
                  }`} />
                </div>
              )}
            </div>
            
            <div className="p-4">
              <h4 className="font-semibold text-lg mb-2 line-clamp-1" title={video.title}>
                {video.title}
              </h4>
              
              <div className="space-y-3 mb-4">
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
              
              <div className="flex mt-4 space-x-2">
                <Link 
                  to={`/video/${video.id}`}
                  className="flex-1 flex justify-center items-center py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  <span>Details</span>
                </Link>
                
                <button 
                  onClick={() => toggleVideoStatus(video.id, video.status)}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  title={video.status === 'active' ? 'Pause tracking' : 'Resume tracking'}
                >
                  {video.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                
                <button 
                  onClick={() => deleteVideo(video.id)}
                  className="p-2 bg-gray-700 hover:bg-red-600 rounded-lg transition-colors"
                  title="Delete tracking"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;