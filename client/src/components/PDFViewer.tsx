'use client';

import { useRef, useState, useEffect } from 'react';
// @ts-ignore - pdfjs-dist/build/pdf não tem tipos
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { PDFDocument, rgb, PDFFont } from 'pdf-lib';
// @ts-ignore - fontkit será importado dinamicamente
let fontkit: any = null;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Download, Upload, Trash2, Copy, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

// Configurar PDF.js para funcionar com worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  } catch (e) {
    console.warn('Erro ao configurar worker do PDF.js:', e);
  }
}

interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  pageNum: number;
  shadow?: string;
  shadowColor?: string;
  shadowIntensity?: number;
  shadowOpacity?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  stroke?: string;
  strokeColor?: string;
  strokeThickness?: number;
  strokeOpacity?: number;
  fontFamily?: string;
}

const AVAILABLE_FONTS = [
  { name: 'Sistema', value: 'system-ui' },
  { name: 'Impact', value: 'Impact' },
  { name: 'Alek Bold', value: 'Alek Bold' },
  { name: 'Amarillo', value: 'Amarillo' },
  { name: 'Bubblegum', value: 'Bubblegum' },
  { name: 'Bulgaria Dreams', value: 'Bulgaria Dreams' },
  { name: 'Campana Script', value: 'Campana Script' },
  { name: 'Cream Cake', value: 'Cream Cake' },
  { name: 'Golden Hills', value: 'Golden Hills' },
  { name: 'Hello Valentina', value: 'Hello Valentina' },
  { name: 'Lobster', value: 'Lobster' },
  { name: 'Palina Script', value: 'Palina Script' },
  { name: 'Natomp', value: 'Natomp' },
];

export default function PDFViewer() {
  // Log para diagnosticar se o componente está sendo renderizado
  if (typeof window !== 'undefined') {
    console.log('[PDFViewer] Componente renderizado');
  }
  
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState('#000000');
  const [shadowEffect, setShadowEffect] = useState('none');
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowIntensity, setShadowIntensity] = useState(5);
  const [shadowOpacity, setShadowOpacity] = useState(1);
  const [shadowOffsetX, setShadowOffsetX] = useState(0);
  const [shadowOffsetY, setShadowOffsetY] = useState(0);
  const [strokeEffect, setStrokeEffect] = useState('none');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeThickness, setStrokeThickness] = useState(2);
  const [strokeOpacity, setStrokeOpacity] = useState(1);
  const [fontFamily, setFontFamily] = useState('system-ui');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const renderTaskRef = useRef<any>(null);
  const draggingRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  // Carregar PDF do localStorage ao montar
  useEffect(() => {
    console.log('[PDFViewer] useEffect: Tentando carregar PDF do localStorage');
    const pdfData = localStorage.getItem('pdfData');
    console.log('[PDFViewer] pdfData existe:', !!pdfData, 'tamanho:', pdfData ? pdfData.length : 0);
    
    if (pdfData) {
      try {
        console.log('[PDFViewer] Convertendo data URL para Blob...');
        // Converter data URL para Blob
        const arr = pdfData.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        console.log('[PDFViewer] MIME type:', mime);
        
        const bstr = atob(arr[1]);
        const n = bstr.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          u8arr[i] = bstr.charCodeAt(i);
        }
        const blob = new Blob([u8arr], { type: mime });
        const pdfName = localStorage.getItem('pdfName') || 'document.pdf';
        console.log('[PDFViewer] Criando File:', pdfName, 'tamanho:', blob.size);
        
        const file = new File([blob], pdfName, { type: 'application/pdf' });
        console.log('[PDFViewer] Chamando processPDF...');
        processPDF(file);
        // Não limpar localStorage aqui - deixar persistir para outros usos
      } catch (err) {
        console.error('[PDFViewer] Erro ao carregar PDF:', err);
        toast.error('Erro ao carregar PDF');
      }
    } else {
      console.log('[PDFViewer] Nenhum pdfData no localStorage');
    }
  }, []);

  // Processar arquivo PDF
  const processPDF = async (file: File) => {
    console.log('[processPDF] Iniciando processamento:', file.name, 'tamanho:', file.size);
    
    const fileSizeInMB = file.size / (1024 * 1024);
    console.log('[processPDF] Tamanho em MB:', fileSizeInMB);
    console.log('[processPDF] Verificando tamanho do arquivo...');
    
    if (fileSizeInMB > 20) {
      console.log('[processPDF] Arquivo muito grande');
      toast.error(`O arquivo deve ter no máximo 20MB. Tamanho atual: ${fileSizeInMB.toFixed(2)}MB`);
      return;
    }
    if (fileSizeInMB < 0.001) {
      console.log('[processPDF] Arquivo vazio');
      toast.error('O arquivo está vazio');
      return;
    }
    if (file.type !== 'application/pdf') {
      console.log('[processPDF] Tipo de arquivo inválido:', file.type);
      toast.error('Por favor, selecione um arquivo PDF válido');
      return;
    }

    console.log('[processPDF] Todas as validações passaram, iniciando carregamento...');
    setIsLoading(true);
    try {
      console.log('[processPDF] Definindo pdfFile...');
      setPdfFile(file);
      
      console.log('[processPDF] Convertendo para arrayBuffer...');
      const arrayBuffer = await file.arrayBuffer();
      console.log('[processPDF] arrayBuffer criado, tamanho:', arrayBuffer.byteLength);
      
      console.log('[processPDF] Carregando documento PDF.js...');
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer } as any).promise;
      console.log('[processPDF] PDF carregado sem disableWorker, páginas:', pdf.numPages);
      
      console.log('[processPDF] Atualizando estado...');
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setTextElements([]);
      setSelectedElement(null);
      console.log('[processPDF] Estado atualizado com sucesso');
      toast.success('PDF carregado com sucesso!');
    } catch (error) {
      console.error('[processPDF] Erro ao processar PDF:', error);
      toast.error('Erro ao processar PDF. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizar página do PDF
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (error) {
        if ((error as any).name !== 'RenderingCancelledError') {
          console.error('Erro ao renderizar página:', error);
        }
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  // Adicionar novo texto
  const addTextElement = () => {
    const newElement: TextElement = {
      id: Date.now().toString(),
      x: 50,
      y: 50,
      text: '',
      fontSize,
      color: textColor,
      pageNum: currentPage,
      shadow: shadowEffect === 'none' ? undefined : shadowEffect,
      shadowColor: shadowColor,
      shadowIntensity: shadowIntensity,
      shadowOpacity: shadowOpacity,
      shadowOffsetX: shadowOffsetX,
      shadowOffsetY: shadowOffsetY,
      stroke: strokeEffect === 'none' ? undefined : strokeEffect,
      strokeColor: strokeColor,
      strokeThickness: strokeThickness,
      strokeOpacity: strokeOpacity,
      fontFamily: fontFamily,
    };

    setTextElements([...textElements, newElement]);
    setSelectedElement(newElement.id);
    setTextInput('');
    toast.success('Novo texto adicionado! Digite no campo acima.');
  };

  // Atualizar elemento de texto selecionado
  const updateSelectedElement = (updates: Partial<TextElement>) => {
    setTextElements(textElements.map(el =>
      el.id === selectedElement ? { ...el, ...updates } : el
    ));
  };

  // Deletar elemento selecionado
  const deleteSelectedElement = () => {
    setTextElements(textElements.filter(el => el.id !== selectedElement));
    setSelectedElement(null);
    toast.success('Texto deletado');
  };

  // Duplicar elemento selecionado
  const duplicateSelectedElement = () => {
    const element = textElements.find(el => el.id === selectedElement);
    if (!element) return;

    const newElement: TextElement = {
      ...element,
      id: Date.now().toString(),
      x: element.x + 20,
      y: element.y + 20,
    };

    setTextElements([...textElements, newElement]);
    setSelectedElement(newElement.id);
    toast.success('Texto duplicado');
  };

  // Atualizar texto selecionado
  useEffect(() => {
    if (!selectedElement) return;
    const element = textElements.find(el => el.id === selectedElement);
    if (element) {
      setTextInput(element.text);
      setFontSize(element.fontSize);
      setTextColor(element.color);
      setShadowEffect(element.shadow || 'none');
      setShadowColor(element.shadowColor || '#000000');
      setShadowIntensity(element.shadowIntensity || 5);
      setShadowOpacity(element.shadowOpacity || 1);
      setShadowOffsetX(element.shadowOffsetX || 0);
      setShadowOffsetY(element.shadowOffsetY || 0);
      setStrokeEffect(element.stroke || 'none');
      setStrokeColor(element.strokeColor || '#000000');
      setStrokeThickness(element.strokeThickness || 2);
      setStrokeOpacity(element.strokeOpacity || 1);
      setFontFamily(element.fontFamily || 'system-ui');
    }
  }, [selectedElement, textElements]);

  // Drag and drop
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
    if (files.length > 0 && files[0].type === 'application/pdf') {
      processPDF(files[0]);
    }
  };

  // Estilos de texto
  const getTextStyles = (el: TextElement) => {
    const styles: React.CSSProperties = {
      position: 'absolute',
      left: `${el.x}px`,
      top: `${el.y}px`,
      fontSize: `${el.fontSize}px`,
      color: el.color,
      fontFamily: el.fontFamily || 'system-ui',
      cursor: 'move',
      userSelect: 'none',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      border: selectedElement === el.id ? '2px solid blue' : 'none',
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: selectedElement === el.id ? 'rgba(0, 0, 255, 0.1)' : 'transparent',
      zIndex: selectedElement === el.id ? 10 : 1,
      pointerEvents: 'auto',
    };

    if (el.shadow === 'suave') {
      styles.textShadow = `${el.shadowOffsetX || 1.5}px ${-(el.shadowOffsetY || 1.5)}px ${el.shadowIntensity || 3}px rgba(0, 0, 0, ${el.shadowOpacity || 0.5})`;
    } else if (el.shadow === 'brilho') {
      styles.textShadow = `${el.shadowOffsetX || -0.5}px ${el.shadowOffsetY || 0.5}px ${el.shadowIntensity || 2}px rgba(0, 0, 0, ${el.shadowOpacity || 0.5})`;
    }

    if (el.stroke === 'borda') {
      const thickness = el.strokeThickness || 2;
      styles.WebkitTextStroke = `${thickness * 0.5}px ${el.strokeColor || '#000000'}`;
    }

    return styles;
  };

  // Drag de texto
  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    setSelectedElement(elementId);
    const element = textElements.find(el => el.id === elementId);
    if (!element) return;

    const rect = textLayerRef.current?.getBoundingClientRect();
    if (!rect) return;

    draggingRef.current = {
      id: elementId,
      offsetX: e.clientX - rect.left - element.x,
      offsetY: e.clientY - rect.top - element.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current || !textLayerRef.current) return;

    const rect = textLayerRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - draggingRef.current.offsetX;
    const newY = e.clientY - rect.top - draggingRef.current.offsetY;

    updateSelectedElement({
      x: Math.max(0, newX),
      y: Math.max(0, newY),
    });
  };

  const handleMouseUp = () => {
    draggingRef.current = null;
  };

  // Função auxiliar para converter cor hex para RGB normalizado (0-1)
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0, 0, 0];
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  };

  // Mapa de fontes carregadas para evitar carregar múltiplas vezes
  const fontCacheRef = useRef<Map<string, any>>(new Map());
  const fontKitRegisteredRef = useRef(false);

  // Função para carregar fonte WOFF2 e incorporar no PDF com fontkit
  const embedFontInPDF = async (pdfDoc: any, fontFamily: string): Promise<any> => {
    // Verificar cache
    if (fontCacheRef.current.has(fontFamily)) {
      return fontCacheRef.current.get(fontFamily)!;
    }

    try {
      // Se for sistema padrão, usar Helvetica
      if (fontFamily === 'system-ui') {
        const embeddedFont = await pdfDoc.embedFont('Helvetica');
        fontCacheRef.current.set(fontFamily, embeddedFont);
        return embeddedFont;
      }

      // Mapear nome da fonte para arquivo WOFF2
      const fontFileMap: { [key: string]: string } = {
        'Impact': 'impact.woff2',
        'Alek Bold': 'AlekBold-Italic.woff2',
        'Amarillo': 'Amarillo_0.woff2',
        'Bubblegum': 'Bubblegum.woff2',
        'Bulgaria Dreams': 'Bulgaria Dreams Regular.woff2',
        'Campana Script': 'CampanaScript.woff2',
        'Cream Cake': 'Cream Cake.woff2',
        'Golden Hills': 'GoldenHills.woff2',
        'Hello Valentina': 'Hello Valentina.woff2',
        'Lobster': 'Lobster 1.4.woff2',
        'Palina Script': 'Palina Script.woff2',
        'Natomp': 'natompro-regular.woff2',
      };

      const fontFile = fontFileMap[fontFamily];
      if (!fontFile) {
        // Se não encontrar, usar Helvetica como fallback
        const embeddedFont = await pdfDoc.embedFont('Helvetica');
        fontCacheRef.current.set(fontFamily, embeddedFont);
        return embeddedFont;
      }

      // Registrar fontkit uma única vez
      if (!fontKitRegisteredRef.current) {
        try {
          pdfDoc.registerFontkit((fontkit as any).default || fontkit);
          fontKitRegisteredRef.current = true;
        } catch (e) {
          console.warn('fontkit já registrado ou erro ao registrar');
        }
      }

      // Carregar o arquivo WOFF2
      const fontResponse = await fetch(`/fonts/${fontFile}`);
      if (!fontResponse.ok) {
        console.warn(`Falha ao carregar fonte: ${fontFile}, usando Helvetica`);
        const fallbackFont = await pdfDoc.embedFont('Helvetica');
        fontCacheRef.current.set(fontFamily, fallbackFont);
        return fallbackFont;
      }
      const fontBytes = await fontResponse.arrayBuffer();
      
      // Incorporar a fonte no PDF usando fontkit
      const embeddedFont = await pdfDoc.embedFont(fontBytes, { subset: true });
      
      // Armazenar em cache
      fontCacheRef.current.set(fontFamily, embeddedFont);
      
      return embeddedFont;
    } catch (error) {
      console.error(`Erro ao carregar fonte ${fontFamily}:`, error);
      // Retornar Helvetica como fallback em caso de erro
      try {
        const fallbackFont = await pdfDoc.embedFont('Helvetica');
        fontCacheRef.current.set(fontFamily, fallbackFont);
        return fallbackFont;
      } catch (e) {
        console.error('Erro ao usar fallback Helvetica:', e);
        throw e;
      }
    }
  };

  // Calcular offsets dinâmicos para borda baseado na espessura
  const calculateBorderOffsets = (thickness: number): Array<[number, number]> => {
    if (thickness === 0) return [];
    
    const offsets: Array<[number, number]> = [];
    const step = Math.max(1, Math.floor(thickness / 2));
    
    for (let x = -thickness; x <= thickness; x += step) {
      for (let y = -thickness; y <= thickness; y += step) {
        if (x !== 0 || y !== 0) {
          offsets.push([x, y]);
        }
      }
    }
    
    return offsets;
  };

  // Download PDF com exportação vetorial usando pdf-lib com fontkit
  const downloadPDF = async () => {
    if (!pdfFile || !canvasRef.current || textElements.length === 0) return;

    try {
      setIsLoading(true);
      toast.loading('Gerando PDF vetorial...');

      // Carregar o PDF original
      const pdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      const pages = pdfDoc.getPages();

      // Obter dimensões do canvas para cálculo de escala
      const canvasWidth = canvasRef.current.width;
      const canvasHeight = canvasRef.current.height;

      // Processar cada página
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex];
        const pageNum = pageIndex + 1;
        const pageTexts = textElements.filter(el => el.pageNum === pageNum);

        if (pageTexts.length === 0) continue;

        // Obter dimensões reais da página PDF
        const { width: pageWidth, height: pageHeight } = page.getSize();

        // Calcular escala: proporção entre tamanho real do PDF e tamanho renderizado no canvas
        const scaleX = pageWidth / canvasWidth;
        const scaleY = pageHeight / canvasHeight;

        // Desenhar cada texto na página
        for (const textEl of pageTexts) {
          // Converter coordenadas da tela para coordenadas reais do PDF
          // Y precisa ser invertido porque PDF tem origem no canto inferior esquerdo
          const pdfX = textEl.x * scaleX;
          const pdfY = pageHeight - (textEl.y * scaleY) - (textEl.fontSize * scaleY);

          const textColor = hexToRgb(textEl.color);
          const shadowColor = textEl.shadowColor ? hexToRgb(textEl.shadowColor) : undefined;
          const strokeColor = textEl.strokeColor ? hexToRgb(textEl.strokeColor) : undefined;
          const fontSize = textEl.fontSize * scaleY;

          // Carregar e incorporar a fonte
          const embeddedFont = await embedFontInPDF(pdfDoc, textEl.fontFamily || 'system-ui');

          // Desenhar borda primeiro (se houver) - para ficar atrás do texto
          if (textEl.stroke && strokeColor) {
            const thickness = textEl.strokeThickness || 2;
            const borderOffsets = calculateBorderOffsets(thickness);
            
            borderOffsets.forEach(([ox, oy]) => {
              page.drawText(textEl.text, {
                x: pdfX + ox * 0.5,
                y: pdfY + oy * 0.5,
                size: fontSize,
                font: embeddedFont,
                color: rgb(strokeColor[0], strokeColor[1], strokeColor[2]),
              });
            });
          }

          // Desenhar sombra (se houver)
          if (textEl.shadow && shadowColor) {
            const intensity = textEl.shadowIntensity || 5;
            const offsetX = (textEl.shadowOffsetX || 1.5) * scaleX;
            const offsetY = (textEl.shadowOffsetY || 1.5) * scaleY;
            
            page.drawText(textEl.text, {
              x: pdfX + offsetX,
              y: pdfY - offsetY,
              size: fontSize,
              font: embeddedFont,
              color: rgb(shadowColor[0], shadowColor[1], shadowColor[2]),
            });
          }

          // Desenhar texto principal (por último, para ficar no topo)
          page.drawText(textEl.text, {
            x: pdfX,
            y: pdfY,
            size: fontSize,
            font: embeddedFont,
            color: rgb(textColor[0], textColor[1], textColor[2]),
          });
        }
      }

      // Salvar PDF
      const pdfBytesOutput = await pdfDoc.save();
      const blob = new Blob([pdfBytesOutput], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfFile.name.replace('.pdf', '_editado.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF vetorial baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!pdfDoc) {
    console.log('[PDFViewer] pdfDoc é nulo, exibindo mensagem de erro');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Nenhum PDF carregado</h2>
          <p className="text-gray-600 mb-6">Retorne à página inicial para carregar um PDF</p>

          <Button
            onClick={() => setLocation('/')}
            className="w-full"
          >
            <ArrowLeft size={18} className="mr-2" />
            Voltar para Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Área de edição */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Editor de PDF</h1>
                  <p className="text-gray-600 dark:text-gray-400">Página {currentPage} de {totalPages}</p>
                </div>
                <Button
                  onClick={() => setLocation('/')}
                  variant="outline"
                  size="sm"
                >
                  <ArrowLeft size={18} className="mr-2" />
                  Voltar
                </Button>
              </div>

              <div className="flex gap-3 mb-6">
                <Button
                  onClick={downloadPDF}
                  disabled={textElements.length === 0 || isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Download size={18} className="mr-2" />
                  Baixar PDF
                </Button>
              </div>

              {/* Canvas do PDF */}
              <div
                ref={containerRef}
                className="relative bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 mb-6"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <canvas
                  ref={canvasRef}
                  className="block w-full h-auto"
                />
                <div
                  ref={textLayerRef}
                  className="absolute top-0 left-0"
                  style={{
                    width: canvasRef.current?.width || '100%',
                    height: canvasRef.current?.height || '100%',
                    pointerEvents: 'auto',
                  }}
                >
                  {textElements
                    .filter(el => el.pageNum === currentPage)
                    .map(el => (
                      <div
                        key={el.id}
                        style={getTextStyles(el)}
                        onClick={() => setSelectedElement(el.id)}
                        onMouseDown={(e) => handleMouseDown(e, el.id)}
                      >
                        {el.text}
                      </div>
                    ))}
                </div>
              </div>

              {/* Navegação de páginas */}
              {totalPages > 1 && (
                <div className="flex gap-3 items-center justify-center">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                  >
                    Anterior
                  </Button>
                  <span className="text-sm font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Painel de controles */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Adicionar Texto</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Texto</label>
                  <Input
                    value={textInput}
                    onChange={(e) => {
                      setTextInput(e.target.value);
                      if (selectedElement) {
                        updateSelectedElement({ text: e.target.value });
                      }
                    }}
                    placeholder="Digite o texto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tamanho: {fontSize}px</label>
                  <input
                    type="range"
                    min="8"
                    max="72"
                    value={fontSize}
                    onChange={(e) => {
                      const size = parseInt(e.target.value);
                      setFontSize(size);
                      if (selectedElement) {
                        updateSelectedElement({ fontSize: size });
                      }
                    }}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Cor</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      if (selectedElement) {
                        updateSelectedElement({ color: e.target.value });
                      }
                    }}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Fonte</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => {
                      setFontFamily(e.target.value);
                      if (selectedElement) {
                        updateSelectedElement({ fontFamily: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700"
                  >
                    {AVAILABLE_FONTS.map(font => (
                      <option key={font.value} value={font.value}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Controles de Sombra */}
                <div className="border-t dark:border-slate-700 pt-4">
                  <label className="block text-sm font-medium mb-2">Sombra</label>
                  <select
                    value={shadowEffect}
                    onChange={(e) => {
                      setShadowEffect(e.target.value);
                      if (selectedElement) {
                        updateSelectedElement({ shadow: e.target.value === 'none' ? undefined : e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 mb-3"
                  >
                    <option value="none">Nenhuma</option>
                    <option value="suave">Sombra Suave</option>
                    <option value="brilho">Brilho</option>
                  </select>

                  {shadowEffect !== 'none' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">Cor da Sombra</label>
                        <input
                          type="color"
                          value={shadowColor}
                          onChange={(e) => {
                            setShadowColor(e.target.value);
                            if (selectedElement) {
                              updateSelectedElement({ shadowColor: e.target.value });
                            }
                          }}
                          className="w-full h-10 rounded cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Intensidade: {shadowIntensity}</label>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={shadowIntensity}
                          onChange={(e) => {
                            const intensity = parseInt(e.target.value);
                            setShadowIntensity(intensity);
                            if (selectedElement) {
                              updateSelectedElement({ shadowIntensity: intensity });
                            }
                          }}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Opacidade: {(shadowOpacity * 100).toFixed(0)}%</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={shadowOpacity}
                          onChange={(e) => {
                            const opacity = parseFloat(e.target.value);
                            setShadowOpacity(opacity);
                            if (selectedElement) {
                              updateSelectedElement({ shadowOpacity: opacity });
                            }
                          }}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Offset X: {shadowOffsetX}</label>
                        <input
                          type="range"
                          min="-10"
                          max="10"
                          value={shadowOffsetX}
                          onChange={(e) => {
                            const offset = parseInt(e.target.value);
                            setShadowOffsetX(offset);
                            if (selectedElement) {
                              updateSelectedElement({ shadowOffsetX: offset });
                            }
                          }}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Offset Y: {shadowOffsetY}</label>
                        <input
                          type="range"
                          min="-10"
                          max="10"
                          value={shadowOffsetY}
                          onChange={(e) => {
                            const offset = parseInt(e.target.value);
                            setShadowOffsetY(offset);
                            if (selectedElement) {
                              updateSelectedElement({ shadowOffsetY: offset });
                            }
                          }}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Controles de Borda */}
                <div className="border-t dark:border-slate-700 pt-4">
                  <label className="block text-sm font-medium mb-2">Borda</label>
                  <select
                    value={strokeEffect}
                    onChange={(e) => {
                      setStrokeEffect(e.target.value);
                      if (selectedElement) {
                        updateSelectedElement({ stroke: e.target.value === 'none' ? undefined : e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 mb-3"
                  >
                    <option value="none">Nenhuma</option>
                    <option value="borda">Borda Customizável</option>
                  </select>

                  {strokeEffect !== 'none' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">Cor da Borda</label>
                        <input
                          type="color"
                          value={strokeColor}
                          onChange={(e) => {
                            setStrokeColor(e.target.value);
                            if (selectedElement) {
                              updateSelectedElement({ strokeColor: e.target.value });
                            }
                          }}
                          className="w-full h-10 rounded cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Espessura: {strokeThickness}</label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={strokeThickness}
                          onChange={(e) => {
                            const thickness = parseInt(e.target.value);
                            setStrokeThickness(thickness);
                            if (selectedElement) {
                              updateSelectedElement({ strokeThickness: thickness });
                            }
                          }}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Opacidade: {(strokeOpacity * 100).toFixed(0)}%</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={strokeOpacity}
                          onChange={(e) => {
                            const opacity = parseFloat(e.target.value);
                            setStrokeOpacity(opacity);
                            if (selectedElement) {
                              updateSelectedElement({ strokeOpacity: opacity });
                            }
                          }}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Botões de ação */}
                <div className="border-t dark:border-slate-700 pt-4 space-y-2">
                  <Button onClick={addTextElement} className="w-full">
                    <Upload size={18} className="mr-2" />
                    + Novo Texto
                  </Button>

                  {selectedElement && (
                    <>
                      <Button
                        onClick={duplicateSelectedElement}
                        variant="outline"
                        className="w-full"
                      >
                        <Copy size={18} className="mr-2" />
                        Duplicar
                      </Button>
                      <Button
                        onClick={deleteSelectedElement}
                        variant="destructive"
                        className="w-full"
                      >
                        <Trash2 size={18} className="mr-2" />
                        Deletar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
