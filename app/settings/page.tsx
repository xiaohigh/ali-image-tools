'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, CheckCircle, XCircle, ArrowLeft, Loader2, Key, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// Available models
const AVAILABLE_MODELS = [
  { value: 'qwen-image-edit-plus', label: 'qwen-image-edit-plus (推荐)' },
  { value: 'qwen-image-edit', label: 'qwen-image-edit' },
  { value: 'qwen-image-edit-plus-2025-12-15', label: 'qwen-image-edit-plus-2025-12-15' },
  { value: 'qwen-image-edit-plus-2025-10-30', label: 'qwen-image-edit-plus-2025-10-30' },
];

// Type for Electron API
declare global {
  interface Window {
    electronAPI?: {
      getConfig: () => Promise<{ dashscopeApiKey: string; defaultModel: string }>;
      setConfig: (config: { dashscopeApiKey: string; defaultModel: string }) => Promise<boolean>;
      isElectron: boolean;
    };
  }
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('qwen-image-edit-plus');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [isElectron, setIsElectron] = useState(false);

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      // Check if running in Electron
      if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
        setIsElectron(true);
        try {
          const config = await window.electronAPI.getConfig();
          setApiKey(config.dashscopeApiKey || '');
          setDefaultModel(config.defaultModel || 'qwen-image-edit-plus');
        } catch (err) {
          console.error('Failed to load config:', err);
        }
      } else {
        // Web mode - load from localStorage
        const savedKey = localStorage.getItem('dashscopeApiKey') || '';
        const savedModel = localStorage.getItem('defaultModel') || 'qwen-image-edit-plus';
        setApiKey(savedKey);
        setDefaultModel(savedModel);
      }
      setLoading(false);
    };

    loadConfig();
  }, []);

  // Save configuration
  const handleSave = async () => {
    setSaving(true);
    try {
      if (isElectron && window.electronAPI) {
        const success = await window.electronAPI.setConfig({
          dashscopeApiKey: apiKey,
          defaultModel
        });
        if (success) {
          toast.success('配置已保存，重启应用后生效');
        } else {
          toast.error('保存失败');
        }
      } else {
        // Web mode - save to localStorage
        localStorage.setItem('dashscopeApiKey', apiKey);
        localStorage.setItem('defaultModel', defaultModel);
        toast.success('配置已保存');
      }
    } catch (err) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Test API connection
  const handleTest = async () => {
    if (!apiKey) {
      toast.error('请先输入 API Key');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });

      if (response.ok) {
        setTestResult('success');
        toast.success('API 连接测试成功');
      } else {
        setTestResult('error');
        toast.error('API 连接测试失败');
      }
    } catch {
      setTestResult('error');
      toast.error('网络错误');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold">设置</h1>
              <p className="text-xs text-zinc-500">配置 API 和模型</p>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="space-y-8">
          
          {/* API Key Section */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Key className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-medium">百炼 API Key</h2>
                <p className="text-sm text-zinc-500">用于调用阿里云 DashScope 服务</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="apiKey" className="text-sm text-zinc-400">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="mt-1.5 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                />
              </div>

              <Button
                onClick={handleTest}
                disabled={testing || !apiKey}
                className="bg-zinc-700 hover:bg-zinc-600 text-white border-0"
              >
                {testing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : testResult === 'success' ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                ) : testResult === 'error' ? (
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                ) : null}
                测试连接
              </Button>
            </div>
          </div>

          {/* Model Section */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Cpu className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-medium">默认模型</h2>
                <p className="text-sm text-zinc-500">选择图片编辑使用的 AI 模型</p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="model" className="text-sm text-zinc-400">模型</Label>
              <select
                id="model"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="mt-1.5 w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {AVAILABLE_MODELS.map(model => (
                  <option key={model.value} value={model.value}>{model.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              保存配置
            </Button>
          </div>

          {/* Info Box */}
          {isElectron && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <p className="text-sm text-yellow-200">
                <strong>提示：</strong>API Key 配置保存后，需要重启应用才能生效。
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
