'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Download, Copy, Sparkles, Image as ImageIcon, X, ZoomIn, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// --- Available Models ---
const AVAILABLE_MODELS = [
  { value: 'wanx2.1-t2i-turbo', label: 'wanx2.1-t2i-turbo (快速)' },
  { value: 'wan2.6-t2i', label: 'wan2.6-t2i (推荐)' },
  { value: 'wan2.2-t2i-plus', label: 'wan2.2-t2i-plus (高质量)' },
  { value: 'wan2.2-t2i-flash', label: 'wan2.2-t2i-flash (极速)' },
];

// --- Size Presets ---
const SIZE_PRESETS = [
  { value: '1280*1280', label: '1:1 (1280×1280)' },
  { value: '1200*800', label: '3:2 横版 (1200×800)' },
  { value: '800*1200', label: '2:3 竖版 (800×1200)' },
  { value: '1280*960', label: '4:3 横版 (1280×960)' },
  { value: '960*1280', label: '3:4 竖版 (960×1280)' },
  { value: '1280*720', label: '16:9 横版 (1280×720)' },
  { value: '720*1280', label: '9:16 竖版 (720×1280)' },
  { value: '1344*576', label: '21:9 超宽 (1344×576)' },
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

// --- Main Page Component ---
export default function TextToImagePage() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('wan2.6-t2i');
  const [size, setSize] = useState('1280*1280');
  const [numImages, setNumImages] = useState(1);
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const pollTaskStatus = async (taskId: string): Promise<string[]> => {
    const maxAttempts = 120; // 4 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      setProgress(`生成中... (${Math.floor(attempts * 2)}秒)`);
      
      try {
        const res = await fetch(`/api/task/${taskId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to get task status');
        }

        const status = data.output?.task_status;
        
        if (status === 'SUCCEEDED') {
          // Images are in output.choices[].message.content[].image
          const choices = data.output?.choices || [];
          const images: string[] = [];
          
          for (const choice of choices) {
            const content = choice.message?.content || [];
            for (const item of content) {
              if (item.image) {
                images.push(item.image);
              }
            }
          }
          
          return images;
        } else if (status === 'FAILED') {
          throw new Error(data.output?.message || '任务执行失败');
        }
        
        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        throw error;
      }
    }

    throw new Error('任务超时，请重试');
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('请输入图片描述');
      return;
    }

    setLoading(true);
    setResults([]);
    setProgress('提交任务中...');

    try {
      const submitRes = await fetch('/api/text-to-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          negative_prompt: negativePrompt || undefined,
          model: selectedModel,
          size, 
          n: numImages 
        })
      });

      const submitData = await submitRes.json();
      
      if (!submitRes.ok) {
        throw new Error(submitData.error || '提交任务失败');
      }

      const taskId = submitData.task_id;
      if (!taskId) {
        throw new Error('未返回任务ID');
      }

      toast.info('任务已提交，正在生成...');

      const images = await pollTaskStatus(taskId);
      
      if (images.length > 0) {
        setResults(images);
        toast.success(`成功生成 ${images.length} 张图片`);
      } else {
        toast.error('没有生成图片');
      }

    } catch (err: any) {
      toast.error(`错误: ${err.message}`);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col">
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Wand2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold">文生图</h1>
              <p className="text-xs text-zinc-500">Text to Image · 通义万相</p>
            </div>
          </Link>
          <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
            返回首页
          </Link>
        </div>
      </header>

      {/* Main Content - Top: Results, Bottom: Controls */}
      <main className="flex-1 flex flex-col">
        
        {/* Top Section: Result Display */}
        <section className="flex-1 min-h-[200px] p-4 overflow-y-auto flex items-center justify-center">
          {loading ? (
            <div className="text-center">
              <div className="h-16 w-16 rounded-full border-4 border-zinc-700 border-t-amber-500 animate-spin mx-auto" />
              <p className="mt-4 text-zinc-400">{progress || 'AI 正在创作中...'}</p>
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
              <p className="text-sm mt-1 text-zinc-600">输入描述后点击生成按钮</p>
            </div>
          )}
        </section>

        {/* Bottom Section: Controls */}
        <section className="border-t border-zinc-700/50 bg-zinc-900/95 backdrop-blur-md px-6 py-4">
          <div className="max-w-5xl mx-auto space-y-3">
            
            {/* Row 1: Prompt */}
            <div className="flex gap-4">
              <Textarea
                ref={textareaRef}
                placeholder="描述你想生成的图片... (回车生成 | Shift+回车换行)"
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

            {/* Row 2: Settings + Generate Button */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Model Select */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-zinc-500">模型</Label>
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="h-9 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  {AVAILABLE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              {/* Size */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-zinc-500">尺寸</Label>
                <select 
                  value={size} 
                  onChange={(e) => setSize(e.target.value)}
                  className="h-9 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  {SIZE_PRESETS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-8 shadow-lg shadow-amber-500/25"
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
