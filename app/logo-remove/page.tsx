'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Copy, Sparkles, Image as ImageIcon, X, ZoomIn, Upload, Zap } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// --- Logo Type Presets ---
const LOGO_PRESETS = [
  { 
    id: 'generic', 
    name: '通用', 
    prompt: '去除图片右下角的 logo',
    color: 'from-zinc-500 to-zinc-600'
  },
  { 
    id: 'jimeng', 
    name: '即梦', 
    prompt: '去除图片右下角的 logo 标志，包括一个陀螺和即梦 AI 的信息，都祛除掉',
    color: 'from-pink-500 to-rose-500'
  },
  { 
    id: 'kling', 
    name: '可灵', 
    prompt: '去除图片右下角的 logo，包括可灵 AI 的文字还有一个小图标，这些内容都祛除掉',
    color: 'from-blue-500 to-cyan-500'
  },
  { 
    id: 'gemini', 
    name: 'Gemini', 
    prompt: '去除图片右下角的 logo，是一个小星星的标志，将这个标志祛除掉',
    color: 'from-violet-500 to-purple-500'
  },
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

// --- Available Models ---
const AVAILABLE_MODELS = [
  { value: 'qwen-image-edit-plus', label: 'qwen-image-edit-plus (推荐)' },
  { value: 'qwen-image-edit', label: 'qwen-image-edit' },
  { value: 'qwen-image-edit-plus-2025-12-15', label: 'qwen-image-edit-plus-2025-12-15' },
  { value: 'qwen-image-edit-plus-2025-10-30', label: 'qwen-image-edit-plus-2025-10-30' },
];

// --- Main Page Component ---
export default function LogoRemovePage() {
  const [imageData, setImageData] = useState<string>(''); // Base64 data URL
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(() => {
    // 从 localStorage 读取用户设置的默认模型
    if (typeof window !== 'undefined') {
      return localStorage.getItem('defaultModel') || 'qwen-image-edit-plus';
    }
    return 'qwen-image-edit-plus';
  });

  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const processFile = (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setPreview(dataUrl);
        setImageData(dataUrl); // Store the Base64 data URL directly
        toast.success('图片已加载');
      }
      setLoading(false);
    };
    reader.onerror = () => {
      toast.error('读取图片失败');
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  // Global paste handler
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processFile(file);
            return;
          }
        }
      }
    };
    
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

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

  const clearImage = () => {
    setPreview('');
    setImageData('');
    setResults([]);
  };

  const handleGenerate = async (presetId: string) => {
    const preset = LOGO_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    if (!imageData) {
      toast.error('请先上传一张图片');
      return;
    }

    // 从 localStorage 读取 API Key
    const apiKey = localStorage.getItem('dashscopeApiKey');
    if (!apiKey) {
      toast.error('请先在设置页面配置 API Key');
      return;
    }

    setSelectedPreset(presetId);
    setGenerating(true);
    setResults([]);
    toast.info(`开始去除 ${preset.name} Logo...`);

    try {
      // Use Base64 data URL directly
      const content: ({ image: string } | { text: string })[] = [{ image: imageData }, { text: preset.prompt }];

      const body = {
        model: selectedModel,  // 使用用户选择的模型
        input: { messages: [{ role: "user", content }] },
        parameters: { n: 1 },
        apiKey // 传递 API Key
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
          toast.success(`成功去除 ${preset.name} Logo`);
        } else {
          toast.error('响应中没有图片');
        }
      } else {
        toast.error('响应格式异常');
      }
    } catch (err: any) {
      toast.error(`错误: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col">
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Logo 去除工具</h1>
              <p className="text-xs text-zinc-500">一键去除 AI 生成图片水印</p>
            </div>
          </Link>
          <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
            返回首页
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-6">
        <div className="flex-1 flex gap-6 max-w-6xl mx-auto w-full">
          
          {/* Left: Upload Area */}
          <div className="flex-1 flex flex-col">
            <h2 className="text-sm text-zinc-400 mb-3">原始图片</h2>
            <div 
              className={`flex-1 rounded-xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden ${
                isDragOver 
                  ? 'border-violet-500 bg-violet-500/10' 
                  : preview 
                    ? 'border-zinc-700 bg-zinc-800/50' 
                    : 'border-zinc-700 bg-zinc-800/30 hover:border-zinc-600 hover:bg-zinc-800/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {preview ? (
                <div className="relative w-full h-full group">
                  <img src={preview} alt="上传的图片" className="w-full h-full object-contain" />
                  <button
                    onClick={clearImage}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer text-center p-8">
                  {loading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-12 w-12 text-zinc-400 animate-spin mb-4" />
                      <p className="text-zinc-400">加载中...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-12 w-12 text-zinc-500 mb-4" />
                      <p className="text-zinc-400 text-lg mb-2">拖拽图片到这里</p>
                      <p className="text-zinc-500 text-sm">或点击选择文件 · 支持 Ctrl+V 粘贴</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={loading} />
                </label>
              )}
            </div>
          </div>

          {/* Right: Result Area */}
          <div className="flex-1 flex flex-col">
            <h2 className="text-sm text-zinc-400 mb-3">处理结果</h2>
            <div className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/30 flex items-center justify-center overflow-hidden">
              {generating ? (
                <div className="text-center">
                  <div className="h-12 w-12 rounded-full border-4 border-zinc-700 border-t-violet-500 animate-spin mx-auto" />
                  <p className="mt-4 text-zinc-400">正在去除 Logo...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="relative w-full h-full group cursor-pointer" onClick={() => setLightboxSrc(results[0])}>
                  <img src={results[0]} alt="处理结果" className="w-full h-full object-contain" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); window.open(results[0], '_blank'); }}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); copyImageToClipboard(results[0]); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-zinc-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>处理结果将显示在这里</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Model Selector + Logo Type Buttons */}
        <div className="flex flex-col items-center gap-4 mt-6">
          {/* Model Selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">模型：</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="h-9 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              {AVAILABLE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* Logo Type Buttons */}
          <div className="flex items-center justify-center gap-4">
            {LOGO_PRESETS.map(preset => (
              <Button
                key={preset.id}
                onClick={() => handleGenerate(preset.id)}
                disabled={generating || !imageData}
                className={`bg-gradient-to-r ${preset.color} hover:opacity-90 text-white px-8 py-6 text-lg shadow-lg transition-all disabled:opacity-50 ${
                  generating && selectedPreset === preset.id ? 'opacity-70' : ''
                }`}
              >
                {generating && selectedPreset === preset.id ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-5 w-5" />
                )}
                去除 {preset.name} Logo
              </Button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
