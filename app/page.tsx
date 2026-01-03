'use client';

import Link from 'next/link';
import { Sparkles, Wand2, Zap, ImageIcon, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

const FEATURES = [
  {
    title: '图片编辑',
    description: '上传图片，输入指令，AI 智能编辑',
    href: '/image-edit',
    icon: Sparkles,
    color: 'from-violet-500 to-indigo-600',
    shadowColor: 'shadow-violet-500/25'
  },
  {
    title: '图片生成',
    description: '输入描述，AI 从零生成精美图片',
    href: '/text-to-image',
    icon: Wand2,
    color: 'from-amber-500 to-orange-600',
    shadowColor: 'shadow-amber-500/25'
  },
  {
    title: '去除水印',
    description: '一键去除 AI 生成图片的 Logo 水印',
    href: '/logo-remove',
    icon: Zap,
    color: 'from-rose-500 to-pink-600',
    shadowColor: 'shadow-rose-500/25'
  },
];

// Twinkling star component
function Star({ style }: { style: React.CSSProperties }) {
  return (
    <div 
      className="absolute rounded-full bg-white animate-twinkle"
      style={style}
    />
  );
}

// Starry background component
function StarryBackground() {
  const [stars, setStars] = useState<Array<{ id: number; style: React.CSSProperties }>>([]);

  useEffect(() => {
    const generateStars = () => {
      const newStars = [];
      for (let i = 0; i < 80; i++) {
        const size = Math.random() * 2 + 1;
        newStars.push({
          id: i,
          style: {
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${size}px`,
            height: `${size}px`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }
        });
      }
      setStars(newStars);
    };
    generateStars();
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {stars.map(star => (
        <Star key={star.id} style={star.style} />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col relative overflow-hidden">
      {/* Starry Background */}
      <StarryBackground />
      
      {/* Gradient orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="fixed top-1/2 right-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-600 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">神机营 - 图片编辑器</h1>
              <p className="text-xs text-zinc-500">Powered by Aliyun DashScope</p>
            </div>
          </div>
          <Link 
            href="/settings" 
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm">设置</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="max-w-4xl w-full">
          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400 text-transparent bg-clip-text">
              AI 驱动的图片处理工具
            </h2>
            <p className="text-zinc-400 text-lg">
              选择一个功能开始使用
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className={`group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-800/50 backdrop-blur-sm p-6 hover:border-zinc-700 transition-all hover:scale-[1.02] hover:shadow-xl ${feature.shadowColor}`}
                >
                  {/* Icon */}
                  <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  
                  {/* Description */}
                  <p className="text-zinc-400 text-sm">{feature.description}</p>
                  
                  {/* Arrow */}
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-2xl">→</span>
                  </div>
                  
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                </Link>
              );
            })}
          </div>

        </div>
      </main>

      {/* CSS for twinkle animation */}
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
