import { toast as sonnerToast } from 'sonner-native';

export const toast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const options = {
    action: {
      label: '✕',
      onClick: () => sonnerToast.dismiss(),
    },
    duration: 2000,
  };

  switch (type) {
    case 'success':
      sonnerToast.success(message, options);
      break;
    case 'error':
      sonnerToast.error(message, { ...options, duration: 3000 });
      break;
    case 'info':
    default:
      sonnerToast(message, options);
      break;
  }
};

// Compatible with sonner interface
toast.success = (message: string) => {
  sonnerToast.success(message, {
    action: {
      label: '✕',
      onClick: () => sonnerToast.dismiss(),
    },
    duration: 2000,
  });
};

toast.error = (message: string) => {
  sonnerToast.error(message, {
    action: {
      label: '✕',
      onClick: () => sonnerToast.dismiss(),
    },
    duration: 3000,
  });
};

toast.info = (message: string) => {
  sonnerToast(message, {
    action: {
      label: '✕',
      onClick: () => sonnerToast.dismiss(),
    },
    duration: 2000,
  });
};
