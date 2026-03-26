import React from 'react';

export const Spinner = ({ size = 'md', color = 'primary', className = '' }) => {
  const sizeClass = size === 'lg' ? 'spinner-lg' : '';
  const colorClass = color === 'white' ? 'spinner-white' : '';
  
  return <div className={`spinner ${sizeClass} ${colorClass} ${className}`} />;
};

export const LoadingState = ({ message = 'Loading...' }) => (
  <div className="loading-container">
    <Spinner size="lg" />
    <p>{message}</p>
  </div>
);

export default LoadingState;
