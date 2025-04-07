import { useState } from 'react';

interface ToastOptions {
  description: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toast, setToast] = useState<ToastOptions | null>(null);

  const showToast = (options: ToastOptions) => {
    setToast(options);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  return {
    toast: showToast,
    currentToast: toast
  };
} 