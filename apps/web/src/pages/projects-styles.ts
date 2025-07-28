// Extracted styles for projects.tsx to improve maintainability

export const projectStyles = {
  button: {
    base: {
      backgroundColor: '#f8f9fa',
      color: 'black',
      height: '40px',
      borderRadius: '6px',
      fontSize: '14px',
      paddingLeft: '16px',
      paddingRight: '16px',
      border: '1px solid #e9ecef',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    hover: {
      backgroundColor: '#e9ecef',
    },
    createButton: {
      backgroundColor: 'white',
      color: 'black',
      height: '32px',
      borderRadius: '6px',
      fontSize: '12px',
      position: 'relative' as const,
      overflow: 'hidden',
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
      paddingLeft: '12px',
      paddingRight: '12px',
    },
  },
  
  projectCard: {
    wrapper: (isSelected: boolean) => ({
      border: '2px solid transparent',
      borderRadius: '24px',
      overflow: 'hidden',
      backgroundImage: isSelected
        ? 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899)'
        : 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(45deg, #e5e7eb, #d1d5db)',
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box',
      boxShadow: isSelected
        ? '0 0 25px rgba(59, 130, 246, 0.4), 0 0 50px rgba(139, 92, 246, 0.2)'
        : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    }),
    hoverState: {
      backgroundImage: 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899)',
      boxShadow: '0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.15)',
    },
    deleteButton: {
      top: '16px',
      opacity: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      color: 'white',
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
    },
    checkbox: {
      top: '16px',
      right: '16px',
      width: '20px',
      height: '20px',
      border: '2px solid #3b82f6',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
  },
  
  icons: {
    small: { width: '14px', height: '14px' },
    margin: { marginRight: '12px' },
  },
} as const;