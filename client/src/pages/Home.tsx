import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';

export default function Home() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.type.includes('pdf')) {
      toast.error('Por favor, selecione um arquivo PDF válido');
      return;
    }

    const toastId = toast.loading('Carregando PDF...');

    // Converter arquivo para base64 e armazenar no localStorage
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      localStorage.setItem('pdfData', base64);
      localStorage.setItem('pdfName', file.name);
      
      // Fechar mensagem de carregamento
      toast.dismiss(toastId);
      
      // Aguardar um pouco para garantir que o localStorage foi atualizado
      setTimeout(() => {
        // Redirecionar para página de edição usando setLocation do wouter
        setLocation('/editor');
      }, 100);
    };
    reader.onerror = () => {
      toast.dismiss(toastId);
      toast.error('Erro ao ler o arquivo');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Função para teste - simular upload de PDF
  const handleTestUpload = () => {
    // PDF válido com conteúdo suficiente em base64
    const pdfBase64 = 'data:application/pdf;base64,JVBERi0xLjMKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgaHR0cDovL3d3dy5yZXBvcnRsYWIuY29tCjEgMCBvYmoKPDwKL0YxIDIgMCBSCj4+CmVuZG9iCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQ29udGVudHMgNyAwIFIgL01lZGlhQm94IFsgMCAwIDYxMiA3OTIgXSAvUGFyZW50IDYgMCBSIC9SZXNvdXJjZXMgPDwKL0ZvbnQgMSAwIFIgL1Byb2NTZXQKQIAKW1sKL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9QYWdlTW9kZSAvVXNlTm9uZSAvUGFnZXMgNiAwIFIgL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0F1dGhvciAoYW5vbnltb3VzKSAvQ3JlYXRpb25EYXRlIChEOjIwMjYwMzEwMTkyMzE0LTA0JzAwJykgL0NyZWF0b3IgKFJlcG9ydExhYiBQREYgTGlicmFyeSAtIHd3dy5yZXBvcnRsYWIuY29tKSAvS2V5d29yZHMgKCkgL01vZERhdGUgKEQ6MjAyNjAzMTAxOTIzMTQtMDQnMDAnKSAvUHJvZHVjZXIgKFJlcG9ydExhYiBQREYgTGlicmFyeSAtIHd3dy5yZXBvcnRsYWIuY29tKSAKICAvU3ViamVjdCAodW5zcGVjaWZpZWQpIC9UaXRsZSAodW50aXRsZWQpIC9UcmFwcGVkIC9GYWxzZQo+PgplbmRvYmoKNiAwIG9iago8PAovQ291bnQgMSAvS2lkcyBbIDMgMCBSIF0gL1R5cGUgL1BhZ2VzCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDQxMAo+PgpzdHJlYW0KR2F1MSo0YEExaydMZDRwYD8hXENELWxRP2taQTAqNk8vWicoLDxaQE5fO1BRcVdtSS9XbGdOL1ZFUS5YNEJfRjZraWBZYm9WOmFQNG9kNT86RSdBczBGKlxnZTFiKy5jMFdIQF4qPiZMOl9qcEJedGxUaCotUz4lb0RybTYpY1I8PClpZzhVZFdHJVtdU0NjZkgyJnNaTj9QPj5ZYEVxaUcsaWNlTHBmUENdbSYeayYpMTQ5LjgkR0NDUEhLKFk/WVNkWl0iZVNcJ2V0Z2Q1TDFFP1hpOjlMOExMTltRWzE1Yis4RFFsY1FhUkR1V1MmMD87IzVZRSdJa043RmAyWF0iPWFnWERPJHFpRiJXMk1hVCVpUihjZiMsN1YzRVkxXG83NDhiJFJOZipFSnU0PmohYDpaLUV0SlEoPyZCYmxtWShwdWwhQjVpUXU6JWwobi9jVEFEYGdeLV1yc3FBdDI3KVkqajtDUkNNRCk3NWg8WUYtMlM4bVRhO2FNRTtXQlxgMW4nRy03NShyLXJtTWZiWStRWE5Dfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA4CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA3MyAwMDAwMCBuIAowMDAwMDAwMTA0IDAwMDAwIG4gCjAwMDAwMDAyMTEgMDAwMDAgbiAKMDAwMDAwMDQwNCAwMDAwMCBuIAowMDAwMDAwNDcyIDAwMDAwIG4gCjAwMDAwMDA3NjggMDAwMDAgbiAKMDAwMDAwMDgyNyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzxlMjMzMmVlOTNlNTY0Njg0YzkyMzRhOGZiZjc4Y2VmMT48ZTIzMzJlZTkzZTU2NDY4NGM5MjM0YThmYmY3OGNlZjE+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAoaHR0cDovL3d3dy5yZXBvcnRsYWIuY29tKQoKL0luZm8gNSAwIFIKL1Jvb3QgNCAwIFIKL1NpemUgOAo+PgpzdGFydHhyZWYKMTMyNwolJUVPRg==';
    
    localStorage.setItem('pdfData', pdfBase64);
    localStorage.setItem('pdfName', 'test.pdf');
    
    toast.success('PDF de teste carregado no localStorage');
    
    // Redirecionar para página de edição
    setTimeout(() => {
      setLocation('/editor');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 light:from-blue-50 light:via-blue-100 light:to-blue-50 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-sm font-semibold text-blue-400 tracking-widest mb-4">
            PDF TEXT EDITOR
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Adicione textos estilizados
          </h1>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              em qualquer PDF
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Insira, posicione e personalize textos com fontes, cores e sombras. Exporte mantendo todos os estilos aplicados.
          </p>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative mb-12 p-8 rounded-2xl border-2 border-dashed transition-all duration-300 ${
            isDragging
              ? 'border-blue-400 bg-blue-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          <div className="flex flex-col items-center justify-center py-12">
            {/* Upload Icon */}
            <div className="mb-6 p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl">
              <Upload size={40} className="text-white" />
            </div>

            <h3 className="text-xl font-semibold text-white mb-2">
              Arraste seu PDF aqui
            </h3>
            <p className="text-gray-400 mb-6">ou</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              Escolher arquivo
            </Button>
            
            {/* Botão de teste (remover em produção) */}
            <Button
              onClick={handleTestUpload}
              variant="outline"
              className="mt-4 text-gray-400 border-gray-600 hover:border-gray-500"
            >
              Teste (PDF de Exemplo)
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mb-3"></div>
            <p className="text-gray-300 text-sm">38+ fontes</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mb-3"></div>
            <p className="text-gray-300 text-sm">Sombras e estilos</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mb-3"></div>
            <p className="text-gray-300 text-sm">Exporta fiel ao original</p>
          </div>
        </div>
      </div>
    </div>
  );
}
