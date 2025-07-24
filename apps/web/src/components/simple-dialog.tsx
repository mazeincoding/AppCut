"use client";

import { ReactNode } from "react";

interface SimpleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
}

export function SimpleDialog({ isOpen, onClose, children, title, description }: SimpleDialogProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-start justify-center pt-1"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: '99999 !important', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={onClose}
    >
      <div 
        className="relative w-1/3 mx-4"
        style={{
          backgroundColor: '#f3f4f6',
          borderRadius: '12px',
          padding: '24px',
          color: 'black'
        }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        {(title || description) && (
          <div className="mb-6">
            {title && (
              <h2 className="text-lg font-semibold leading-none tracking-tight mb-2">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-gray-600">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}