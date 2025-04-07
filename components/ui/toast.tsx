import { useToast } from './use-toast';

export function Toast() {
  const { currentToast } = useToast();

  if (!currentToast) return null;

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
      currentToast.variant === 'destructive' 
        ? 'bg-red-500 text-white' 
        : 'bg-green-500 text-white'
    }`}>
      {currentToast.description}
    </div>
  );
} 