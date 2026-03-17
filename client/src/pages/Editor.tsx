import { useEffect } from 'react';
import { useLocation } from 'wouter';
import PDFViewer from '@/components/PDFViewer';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Editor() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Verificar se há dados do PDF no localStorage
    const pdfData = localStorage.getItem('pdfData');
    if (!pdfData) {
      // Se não houver dados, redirecionar para home
      setLocation('/');
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <PDFViewer />
    </div>
  );
}
