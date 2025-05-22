import React from 'react';

interface VideoStatusBadgeProps {
  status: 'active' | 'paused';
  alertLevel: 'normal' | 'warning' | 'emergency';
}

const VideoStatusBadge = ({ status, alertLevel }: VideoStatusBadgeProps) => {
  let bgColor = '';
  let textColor = '';
  let label = '';
  
  // Determine the badge style based on status and alert level
  if (status === 'paused') {
    bgColor = 'bg-gray-700';
    textColor = 'text-gray-300';
    label = 'Paused';
  } else if (alertLevel === 'emergency') {
    bgColor = 'bg-red-500';
    textColor = 'text-white';
    label = 'Emergency';
  } else if (alertLevel === 'warning') {
    bgColor = 'bg-yellow-500';
    textColor = 'text-gray-900';
    label = 'Warning';
  } else {
    bgColor = 'bg-green-500';
    textColor = 'text-white';
    label = 'Tracking';
  }
  
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${bgColor} ${textColor}`}>
      {label}
    </span>
  );
};

export default VideoStatusBadge;