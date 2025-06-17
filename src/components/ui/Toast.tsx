import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Box, Stack } from '@chakra-ui/react';

// Toast types
export type ToastStatus = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  title?: string;
  description: string;
  status: ToastStatus;
  duration?: number;
  isClosable?: boolean;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextType {
  toast: (options: ToastOptions) => void;
}

// Create context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast colors
const toastColors = {
  info: {
    bg: 'blue.50',
    border: 'blue.400',
    title: 'blue.700',
    text: 'blue.600',
  },
  success: {
    bg: 'green.50',
    border: 'green.400',
    title: 'green.700',
    text: 'green.600',
  },
  warning: {
    bg: 'orange.50',
    border: 'orange.400',
    title: 'orange.700',
    text: 'orange.600',
  },
  error: {
    bg: 'red.50',
    border: 'red.400',
    title: 'red.700',
    text: 'red.600',
  },
};

// Toast component
const ToastItem: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
  const colors = toastColors[toast.status];
  
  React.useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onClose();
      }, toast.duration || 5000);
      
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onClose]);
  
  return (
    <Box
      p={4}
      bg={colors.bg}
      borderRadius="md"
      borderLeft="4px solid"
      borderColor={colors.border}
      boxShadow="md"
      position="relative"
      onClick={toast.isClosable ? onClose : undefined}
      cursor={toast.isClosable ? 'pointer' : 'default'}
      role="alert"
    >
      {toast.title && (
        <Box fontWeight="bold" color={colors.title} mb={1}>
          {toast.title}
        </Box>
      )}
      <Box color={colors.text}>
        {toast.description}
      </Box>
      
      {toast.isClosable && (
        <Box
          position="absolute"
          top={2}
          right={2}
          fontSize="sm"
          color={colors.text}
          cursor="pointer"
          onClick={onClose}
        >
          ✕
        </Box>
      )}
    </Box>
  );
};

// Toast provider
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  const addToast = (options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...options, id }]);
  };
  
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };
  
  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <Box
        position="fixed"
        bottom={4}
        right={4}
        zIndex={9999}
      >
        <Stack gap={2} maxW="sm">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </Stack>
      </Box>
    </ToastContext.Provider>
  );
};

// Hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};

export default useToast;
