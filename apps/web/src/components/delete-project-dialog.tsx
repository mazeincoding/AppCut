import { SimpleDialog } from "@/components/simple-dialog";

export function DeleteProjectDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
      title="Delete Project"
      description="Are you sure you want to delete this project? This action cannot be undone."
    >
      <div className="flex flex-row gap-4 mt-4 justify-center">
        <button
          onClick={() => onOpenChange(false)}
          style={{
            backgroundColor: 'black', 
            color: 'white',
            height: '40px',
            borderRadius: '6px',
            fontSize: '14px',
            paddingLeft: '16px',
            paddingRight: '16px',
            border: 'none',
            cursor: 'pointer',
            opacity: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '120px',
            margin: '0'
          }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#333'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'black'}
        >
          Cancel
        </button>
        <button 
          onClick={onConfirm}
          style={{
            backgroundColor: '#dc2626', 
            color: 'white',
            height: '40px',
            borderRadius: '6px',
            fontSize: '14px',
            paddingLeft: '16px',
            paddingRight: '16px',
            border: 'none',
            cursor: 'pointer',
            opacity: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '120px',
            margin: '0'
          }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#b91c1c'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626'}
        >
          Delete
        </button>
      </div>
    </SimpleDialog>
  );
}
