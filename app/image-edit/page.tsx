'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2, Download, Copy, Plus, Sparkles, Image as ImageIcon, X, ZoomIn, Upload, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// --- Available Models ---
const AVAILABLE_MODELS = [
  { value: 'qwen-image-edit-plus', label: 'qwen-image-edit-plus (推荐)' },
  { value: 'qwen-image-edit', label: 'qwen-image-edit' },
  { value: 'qwen-image-edit-plus-2025-12-15', label: 'qwen-image-edit-plus-2025-12-15' },
  { value: 'qwen-image-edit-plus-2025-10-30', label: 'qwen-image-edit-plus-2025-10-30' },
];

// --- Lightbox Component ---
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 cursor-zoom-out" onClick={onClose}>
      <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20 h-10 w-10" onClick={onClose}>
        <X className="h-6 w-6" />
      </Button>
      <img src={src} alt="放大预览" className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

// --- Helper: compute simple hash for File ---
async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Image Upload Card ---
function ImageUploadCard({ index, currentUrl, onUpdate, onRemove, canRemove }: {
  index: number;
  currentUrl: string;
  onUpdate: (url: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [preview, setPreview] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Sync preview with external URL changes (e.g., from Ctrl+V paste)
  useEffect(() => {
    if (currentUrl && currentUrl !== preview) {
      setPreview(currentUrl);
    }
  }, [currentUrl]);

  const uploadFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) setPreview(ev.target.result as string); };
    reader.readAsDataURL(file);

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        onUpdate(data.url);
        toast.success('图片上传成功');
      } else {
        toast.error(`上传失败: ${data.error || '未知错误'}`);
        setPreview('');
        onUpdate('');
      }
    } catch {
      toast.error('上传出错');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  return (
    <div 
      className={`relative group rounded-lg border overflow-hidden flex-shrink-0 w-[60px] aspect-[3/4] ${
        isDragOver ? 'border-violet-500 bg-violet-500/10' : 'border-zinc-700/50 bg-zinc-800/50'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {preview ? (
        <img src={preview} alt={`图片 ${index + 1}`} className="w-full h-full object-cover" />
      ) : (
        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-700/50 transition-colors">
          {uploading ? (
            <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 text-zinc-500" />
          )}
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
        </label>
      )}
      
      {/* Upload overlay for replacing */}
      {preview && !uploading && (
        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-10">
          <span className="text-white text-[10px]">更换</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
      )}
      
      {/* Remove button - must be after overlay for higher z-index */}
      {canRemove && (
        <button 
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }}
          className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}

      {/* Index badge */}
      <div className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[10px] px-1 rounded">
        {index + 1}
      </div>
    </div>
  );
}

// --- Main Page Component ---
export default function Home() {
  const [imageInputs, setImageInputs] = useState<{ id: string; url: string }[]>([{ id: '1', url: '' }, { id: '2', url: '' }]);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [numImages, setNumImages] = useState(1);
  const [watermark, setWatermark] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].value);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  
  // Track uploaded file hashes to prevent duplicates
  const uploadedHashesRef = useRef<Set<string>>(new Set());

  const addImageInput = () => setImageInputs([...imageInputs, { id: Date.now().toString(), url: '' }]);
  const removeImageInput = (index: number) => {
    const newInputs = [...imageInputs];
    newInputs.splice(index, 1);
    setImageInputs(newInputs);
  };
  const updateImageUrl = (index: number, url: string) => {
    const newInputs = [...imageInputs];
    newInputs[index].url = url;
    setImageInputs(newInputs);
  };

  // Handle paste from clipboard
  const handlePaste = async (file: File) => {
    const hash = await computeFileHash(file);
    
    // Check for duplicate
    if (uploadedHashesRef.current.has(hash)) {
      toast.info('该图片已上传，已忽略重复');
      return;
    }
    
    uploadedHashesRef.current.add(hash);
    
    // Find first empty slot or add new
    const emptyIndex = imageInputs.findIndex(i => !i.url.trim());
    
    // Create preview and upload
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        if (emptyIndex >= 0) {
          updateImageUrl(emptyIndex, data.url);
        } else {
          setImageInputs(prev => [...prev, { id: Date.now().toString(), url: data.url }]);
        }
        toast.success('图片粘贴上传成功');
      } else {
        toast.error(`上传失败: ${data.error || '未知错误'}`);
        uploadedHashesRef.current.delete(hash);
      }
    } catch {
      toast.error('上传出错');
      uploadedHashesRef.current.delete(hash);
    }
  };

  // Global paste event listener - only when prompt textarea is focused
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // Only handle paste when prompt textarea is focused
      if (document.activeElement !== textareaRef.current) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handlePaste(file);
            return;
          }
        }
      }
    };
    
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [imageInputs]);

  const copyImageToClipboard = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success('图片已复制到剪贴板');
    } catch {
      await navigator.clipboard.writeText(url);
      toast.info('已复制图片链接');
    }
  };

  const handleGenerate = async () => {
    const validUrls = imageInputs.map(i => i.url.trim()).filter(u => u);
    if (validUrls.length === 0) { toast.error('请至少添加一张图片'); return; }
    if (!prompt.trim()) { toast.error('请输入编辑指令'); return; }

    setLoading(true);
    setResults([]);
    toast.info('开始生成图片...');

    try {
      const content: ({ image: string } | { text: string })[] = validUrls.map(url => ({ image: url }));
      content.push({ text: prompt });

      const body = {
        model: selectedModel,
        input: { messages: [{ role: "user", content }] },
        parameters: { n: numImages, negative_prompt: negativePrompt || undefined, watermark }
      };

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || '生成失败');
      
      if (data.output?.choices) {
        const images = data.output.choices.flatMap((c: any) => 
          c.message?.content?.filter((i: any) => i.image).map((i: any) => i.image) || []
        );
        if (images.length > 0) {
          setResults(images);
          toast.success(`成功生成 ${images.length} 张图片`);
        } else {
          toast.error('响应中没有图片');
        }
      } else {
        toast.error('响应格式异常');
      }
    } catch (err: any) {
      toast.error(`错误: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col">
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold">AI 图片编辑器</h1>
              <p className="text-xs text-zinc-500">Qwen-Image-Edit-Plus</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content - Top: Results, Bottom: Controls */}
      <main className="flex-1 flex flex-col">
        
        {/* Top Section: Result Display */}
        <section className="flex-1 min-h-[200px] p-4 overflow-y-auto flex items-center justify-center">
          {loading ? (
            <div className="text-center">
              <div className="h-16 w-16 rounded-full border-4 border-zinc-700 border-t-violet-500 animate-spin mx-auto" />
              <p className="mt-4 text-zinc-400">AI 正在创作中...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-wrap gap-4 justify-center">
              {results.map((url, i) => (
                <div key={i} className="group relative rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 shadow-xl cursor-pointer" onClick={() => setLightboxSrc(url)}>
                  <img src={url} alt={`结果 ${i + 1}`} className="max-h-[60vh] max-w-[80vw] object-contain" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); window.open(url, '_blank'); }}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); copyImageToClipboard(url); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-zinc-500">
              <ImageIcon className="h-20 w-20 mx-auto mb-4 opacity-30" />
              <p className="text-lg">生成的图片将显示在这里</p>
              <p className="text-sm mt-1 text-zinc-600">上传图片并输入编辑指令后点击生成</p>
            </div>
          )}
        </section>

        {/* Bottom Section: Controls */}
        <section className="border-t border-zinc-700/50 bg-zinc-900/95 backdrop-blur-md px-6 py-4">
          <div className="max-w-5xl mx-auto space-y-3">
            
            {/* Row 1: Image Inputs */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {imageInputs.map((input, index) => (
                <ImageUploadCard
                  key={input.id}
                  index={index}
                  currentUrl={input.url}
                  onUpdate={(url) => updateImageUrl(index, url)}
                  onRemove={() => removeImageInput(index)}
                  canRemove={true}
                />
              ))}
              <button 
                onClick={addImageInput}
                className="w-[60px] aspect-[3/4] flex-shrink-0 rounded-lg border-2 border-dashed border-zinc-700 hover:border-violet-500 hover:bg-zinc-800/50 flex items-center justify-center text-zinc-500 hover:text-violet-400 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Row 2: Prompt */}
            <div className="flex gap-4">
            <Textarea
                ref={textareaRef}
                placeholder="描述如何编辑这张图片... (回车生成 | Shift+回车换行 | Ctrl+V粘贴图片)"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none h-20 text-sm"
              />
            </div>

            {/* Row 3: Settings + Generate Button */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Model Select */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-zinc-500">模型</Label>
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="h-9 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  {AVAILABLE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              {/* Negative Prompt */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-zinc-500">负向提示</Label>
                <Input 
                  placeholder="低质量, 模糊..." 
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className="w-40 h-9 bg-zinc-800 border-zinc-700 text-white text-sm"
                />
              </div>

              {/* Count */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-zinc-500">数量</Label>
                <Input 
                  type="number" min={1} max={4} value={numImages}
                  onChange={(e) => setNumImages(parseInt(e.target.value) || 1)}
                  className="w-16 h-9 bg-zinc-800 border-zinc-700 text-white text-sm text-center"
                />
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Generate Button */}
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={loading}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 shadow-lg shadow-violet-500/25"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {loading ? '生成中...' : '开始生成'}
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
