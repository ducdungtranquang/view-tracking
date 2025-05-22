import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { Youtube, Mail, MessageSquare, Phone, AlertTriangle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../config';

interface FormData {
  videoUrl: string;
  warningThreshold: number;
  emergencyThreshold: number;
  emails: { value: string }[];
  zaloIds: { value: string }[];
  phoneNumbers: { value: string }[];
}

const AddVideo = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [videoPreview, setVideoPreview] = useState<{
    id: string;
    title: string;
    thumbnail: string;
  } | null>(null);
  
  const { 
    register, 
    handleSubmit, 
    control,
    watch,
    formState: { errors },
    setError
  } = useForm<FormData>({
    defaultValues: {
      videoUrl: '',
      warningThreshold: 50,
      emergencyThreshold: 100,
      emails: [{ value: '' }],
      zaloIds: [{ value: '' }],
      phoneNumbers: [{ value: '' }]
    }
  });
  
  const videoUrl = watch('videoUrl');
  
  // Function to extract video ID from YouTube URL
  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  
  const fetchVideoDetails = async () => {
    if (!videoUrl) return;
    
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      setError('videoUrl', {
        type: 'manual',
        message: 'Invalid YouTube URL'
      });
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/videos/preview?id=${videoId}`);
      setVideoPreview(response.data);
    } catch (error) {
      console.error('Error fetching video details:', error);
      toast.error('Could not fetch video details');
    } finally {
      setLoading(false);
    }
  };
  
  const onSubmit = async (data: FormData) => {
    if (!videoPreview) {
      toast.error('Please fetch video details first');
      return;
    }
    
    try {
      setLoading(true);
      
      // Format the data as expected by the API
      const formattedData = {
        videoId: videoPreview.id,
        title: videoPreview.title,
        thumbnail: videoPreview.thumbnail,
        warningThreshold: data.warningThreshold,
        emergencyThreshold: data.emergencyThreshold,
        notifications: {
          emails: data.emails.filter(email => email.value).map(email => email.value),
          zaloIds: data.zaloIds.filter(zalo => zalo.value).map(zalo => zalo.value),
          phoneNumbers: data.phoneNumbers.filter(phone => phone.value).map(phone => phone.value)
        }
      };
      
      await axios.post(`${API_URL}/videos`, formattedData);
      
      toast.success('Video tracking started successfully');
      navigate('/');
    } catch (error) {
      console.error('Error adding video:', error);
      toast.error('Failed to start video tracking');
    } finally {
      setLoading(false);
    }
  };
  
  const testNotification = async (type: 'email' | 'zalo' | 'sms') => {
    const recipients = type === 'email' 
      ? watch('emails').filter(e => e.value).map(e => e.value)
      : type === 'zalo'
        ? watch('zaloIds').filter(z => z.value).map(z => z.value)
        : watch('phoneNumbers').filter(p => p.value).map(p => p.value);
    
    if (recipients.length === 0) {
      toast.error(`No ${type} recipients specified`);
      return;
    }
    
    try {
      setLoading(true);
      await axios.post(`${API_URL}/notifications/test`, {
        type,
        recipients,
        videoInfo: videoPreview || {
          title: 'Test Video',
          id: 'test123',
          viewsPerMinute: 150
        }
      });
      
      toast.success(`Test ${type} notification sent successfully`);
    } catch (error) {
      console.error(`Error sending test ${type}:`, error);
      toast.error(`Failed to send test ${type} notification`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4">Video Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="videoUrl" className="block text-sm font-medium mb-1">
                  YouTube Video URL
                </label>
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Youtube className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="videoUrl"
                      type="text"
                      placeholder="https://www.youtube.com/watch?v=..."
                      {...register('videoUrl', { required: 'Video URL is required' })}
                      className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchVideoDetails}
                    disabled={loading || !videoUrl}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Fetch Details
                  </button>
                </div>
                {errors.videoUrl && (
                  <p className="mt-1 text-sm text-red-500">{errors.videoUrl.message}</p>
                )}
              </div>
              
              {videoPreview && (
                <div className="bg-gray-700 rounded-lg p-4 flex items-start space-x-4">
                  <img 
                    src={videoPreview.thumbnail} 
                    alt={videoPreview.title} 
                    className="w-24 h-auto rounded"
                  />
                  <div>
                    <h4 className="font-medium">{videoPreview.title}</h4>
                    <p className="text-sm text-gray-400 mt-1">ID: {videoPreview.id}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
          
          <section>
            <h3 className="text-lg font-semibold mb-4">Alert Thresholds</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="warningThreshold" className="block text-sm font-medium mb-1">
                  Warning Threshold (views/minute)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <input
                    id="warningThreshold"
                    type="number"
                    min="1"
                    {...register('warningThreshold', { 
                      required: 'Warning threshold is required',
                      min: { value: 1, message: 'Must be at least 1' },
                      valueAsNumber: true
                    })}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                {errors.warningThreshold && (
                  <p className="mt-1 text-sm text-red-500">{errors.warningThreshold.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="emergencyThreshold" className="block text-sm font-medium mb-1">
                  Emergency Threshold (views/minute)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <input
                    id="emergencyThreshold"
                    type="number"
                    min="1"
                    {...register('emergencyThreshold', { 
                      required: 'Emergency threshold is required',
                      min: { value: 1, message: 'Must be at least 1' },
                      validate: value => {
                        const warning = watch('warningThreshold');
                        return value > warning || 'Must be greater than warning threshold';
                      },
                      valueAsNumber: true
                    })}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                {errors.emergencyThreshold && (
                  <p className="mt-1 text-sm text-red-500">{errors.emergencyThreshold.message}</p>
                )}
              </div>
            </div>
          </section>
          
          <section>
            <h3 className="text-lg font-semibold mb-4">Notification Recipients</h3>
            
            <div className="space-y-6">
              {/* Email Recipients */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">
                    Email Recipients (max 2)
                  </label>
                  <button
                    type="button"
                    onClick={() => testNotification('email')}
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                    disabled={loading}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Test Email
                  </button>
                </div>
                
                <Controller
                  control={control}
                  name="emails"
                  render={({ field }) => (
                    <div className="space-y-2">
                      {field.value.map((email, index) => (
                        <div key={index} className="flex space-x-2">
                          <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="email"
                              value={email.value}
                              onChange={(e) => {
                                const newEmails = [...field.value];
                                newEmails[index].value = e.target.value;
                                field.onChange(newEmails);
                              }}
                              placeholder="email@example.com"
                              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          {index === field.value.length - 1 && index < 1 ? (
                            <button
                              type="button"
                              onClick={() => field.onChange([...field.value, { value: '' }])}
                              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                              +
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const newEmails = [...field.value];
                                newEmails.splice(index, 1);
                                field.onChange(newEmails);
                              }}
                              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                              -
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                />
              </div>
              
              {/* Zalo Recipients */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">
                    Zalo Recipients (max 2)
                  </label>
                  <button
                    type="button"
                    onClick={() => testNotification('zalo')}
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                    disabled={loading}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Test Zalo
                  </button>
                </div>
                
                <Controller
                  control={control}
                  name="zaloIds"
                  render={({ field }) => (
                    <div className="space-y-2">
                      {field.value.map((zalo, index) => (
                        <div key={index} className="flex space-x-2">
                          <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MessageSquare className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              value={zalo.value}
                              onChange={(e) => {
                                const newZalos = [...field.value];
                                newZalos[index].value = e.target.value;
                                field.onChange(newZalos);
                              }}
                              placeholder="Zalo ID"
                              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          {index === field.value.length - 1 && index < 1 ? (
                            <button
                              type="button"
                              onClick={() => field.onChange([...field.value, { value: '' }])}
                              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                              +
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const newZalos = [...field.value];
                                newZalos.splice(index, 1);
                                field.onChange(newZalos);
                              }}
                              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                              -
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                />
              </div>
              
              {/* SMS Recipients */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">
                    SMS Recipients (max 2)
                  </label>
                  <button
                    type="button"
                    onClick={() => testNotification('sms')}
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                    disabled={loading}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Test SMS
                  </button>
                </div>
                
                <Controller
                  control={control}
                  name="phoneNumbers"
                  render={({ field }) => (
                    <div className="space-y-2">
                      {field.value.map((phone, index) => (
                        <div key={index} className="flex space-x-2">
                          <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Phone className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="tel"
                              value={phone.value}
                              onChange={(e) => {
                                const newPhones = [...field.value];
                                newPhones[index].value = e.target.value;
                                field.onChange(newPhones);
                              }}
                              placeholder="+1234567890"
                              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          {index === field.value.length - 1 && index < 1 ? (
                            <button
                              type="button"
                              onClick={() => field.onChange([...field.value, { value: '' }])}
                              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                              +
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const newPhones = [...field.value];
                                newPhones.splice(index, 1);
                                field.onChange(newPhones);
                              }}
                              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                              -
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                />
              </div>
            </div>
          </section>
          
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !videoPreview}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Tracking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVideo;