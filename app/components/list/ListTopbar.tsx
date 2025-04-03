import React from 'react';

interface ListTopbarProps {
  children?: React.ReactNode;
}

export const ListTopbar: React.FC<ListTopbarProps> = ({ children }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      {children}
    </div>
  );
}; 