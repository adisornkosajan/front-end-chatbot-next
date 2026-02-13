'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';

type AIProvider = 'openai' | 'anthropic' | 'gemini';

export default function AISettingsPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    provider: 'openai' as AIProvider,
    model: 'gpt-4',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: '',
    autoReply: true,
    autoReplyDelay: 5,
    enableAI: true,
  });

  const providers = [
    {
      id: 'openai' as AIProvider,
      name: 'OpenAI',
      icon: '🤖',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      description: 'GPT-4 and GPT-3.5 models',
    },
    {
      id: 'anthropic' as AIProvider,
      name: 'Anthropic',
      icon: '🧠',
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      description: 'Claude 3 family of models',
    },
    {
      id: 'gemini' as AIProvider,
      name: 'Google Gemini',
      icon: '✨',
      models: ['gemini-pro', 'gemini-pro-vision'],
      description: 'Google\'s Gemini models',
    },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not logged in or not admin
  useEffect(() => {
    if (mounted) {
      if (!token) {
        router.push('/auth/login');
      } else if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
        router.push('/dashboard/inbox');
      }
    }
  }, [mounted, token, user, router]);

  useEffect(() => {
    if (mounted && token) {
      loadAIConfig();
    }
  }, [mounted, token]);

  const loadAIConfig = async () => {
    try {
      const response = await apiFetch('/api/ai/config', token!);
      if (response?.data) {
        setAiConfig((prev) => ({
          ...prev,
          provider: response.data.provider || 'openai',
          model: response.data.model || 'gpt-4',
          apiKey: response.data.hasApiKey ? '••••••••' : '',
          temperature: response.data.temperature ?? 0.7,
          maxTokens: response.data.maxTokens ?? 1000,
          systemPrompt: response.data.systemPrompt || '',
        }));
      }
    } catch (error) {
      console.error('Error loading AI config:', error);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!aiConfig.apiKey || aiConfig.apiKey === '••••••••') {
      alert('Please enter an API key');
      return;
    }

    try {
      setLoading(true);

      await apiFetch('/api/ai/config', token!, {
        method: 'POST',
        body: JSON.stringify({
          provider: aiConfig.provider,
          model: aiConfig.model,
          apiKey: aiConfig.apiKey,
          temperature: aiConfig.temperature,
          maxTokens: aiConfig.maxTokens,
          systemPrompt: aiConfig.systemPrompt,
        }),
      });

      alert('AI configuration saved successfully!');
      loadAIConfig();
    } catch (error: any) {
      console.error('Error saving AI config:', error);
      alert(error.message || 'Failed to save AI configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestAI = async () => {
    if (!aiConfig.apiKey || aiConfig.apiKey === '••••••••') {
      alert('Please enter and save an API key first');
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch('/api/ai/test', token!, {
        method: 'POST',
        body: JSON.stringify({
          provider: aiConfig.provider,
          model: aiConfig.model,
          apiKey: aiConfig.apiKey,
        }),
      });

      if (response.success) {
        alert('✅ AI Connection Test Successful!\n\nYour AI provider is working correctly.');
      } else {
        alert(`❌ Test Failed\n\n${response.message}`);
      }
    } catch (error: any) {
      console.error('Error testing AI:', error);
      alert(error.message || 'AI test failed. Please check your configuration.');
    } finally {
      setLoading(false);
    }
  };

  const selectedProvider = providers.find((p) => p.id === aiConfig.provider);

  if (!mounted || !token) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">AI Assistant Settings</h1>
          <p className="text-gray-600">Configure AI models and behavior for automated responses</p>
        </div>

        {/* Enable/Disable AI */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">AI Assistant Status</h2>
                <p className="text-sm text-gray-600">Enable or disable AI-powered responses</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiConfig.enableAI}
                onChange={(e) => setAiConfig({ ...aiConfig, enableAI: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">
                {aiConfig.enableAI ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">{selectedProvider?.icon}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">AI Provider</h2>
              <p className="text-sm text-gray-600">Select your preferred AI service</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {providers.map((provider) => (
              <div
                key={provider.id}
                onClick={() => setAiConfig({ ...aiConfig, provider: provider.id })}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  aiConfig.provider === provider.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-4xl mb-2">{provider.icon}</div>
                <h3 className="font-bold text-gray-800 mb-1">{provider.name}</h3>
                <p className="text-xs text-gray-600">{provider.description}</p>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Model <span className="text-red-500">*</span>
            </label>
            <select
              value={aiConfig.model}
              onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            >
              {selectedProvider?.models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* API Configuration */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">API Configuration</h2>
              <p className="text-sm text-gray-600">Enter your API credentials</p>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={aiConfig.apiKey}
                onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
                placeholder="sk-..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your API key from{' '}
                {aiConfig.provider === 'openai' && (
                  <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 underline">
                    OpenAI Dashboard
                  </a>
                )}
                {aiConfig.provider === 'anthropic' && (
                  <a href="https://console.anthropic.com/" target="_blank" className="text-blue-600 underline">
                    Anthropic Console
                  </a>
                )}
                {aiConfig.provider === 'gemini' && (
                  <a href="https://makersuite.google.com/app/apikey" target="_blank" className="text-blue-600 underline">
                    Google AI Studio
                  </a>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Temperature (0-1)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={aiConfig.temperature}
                  onChange={(e) => setAiConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
                <p className="text-xs text-gray-500 mt-1">Higher = more creative, Lower = more focused</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="100"
                  max="4000"
                  step="100"
                  value={aiConfig.maxTokens}
                  onChange={(e) => setAiConfig({ ...aiConfig, maxTokens: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum response length</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                System Prompt <span className="text-gray-500 text-xs font-normal">(กำหนดบทบาทและข้อมูลธุรกิจ)</span>
              </label>
              <textarea
                value={aiConfig.systemPrompt}
                onChange={(e) => setAiConfig({ ...aiConfig, systemPrompt: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder:text-gray-500"
                placeholder="คุณคือพนักงานต้อนรับของร้าน [ชื่อร้าน]&#10;ประเภทธุรกิจ: [เช่น ร้านนวด, ร้านอาหาร, โรงแรม]&#10;เวลาเปิด-ปิด: [เช่น 09:00-21:00 น.]&#10;บริการหลัก: [เช่น นวดไทย, นวดน้ำมัน, นวดฝ่าเท้า]&#10;ราคา: [ระบุราคาบริการ]&#10;ที่อยู่: [ที่อยู่ร้าน]&#10;เบอร์โทร: [เบอร์ติดต่อ]&#10;&#10;คุณต้องตอบคำถามลูกค้าอย่างสุภาพ ให้ข้อมูลที่ถูกต้อง และช่วยจองคิวหรือให้คำแนะนำเกี่ยวกับบริการ"
                rows={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 <strong>คำแนะนำ:</strong> ระบุประเภทธุรกิจ, เวลาเปิดปิด, บริการ, ราคา, ที่อยู่ เพื่อให้ AI ตอบคำถามลูกค้าได้ถูกต้อง
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
              <button
                type="button"
                onClick={handleTestAI}
                disabled={loading || !aiConfig.apiKey}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test AI
              </button>
            </div>
          </form>
        </div>

        {/* Auto Reply Settings */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Auto Reply Settings</h2>
              <p className="text-sm text-gray-600">Configure automatic response behavior</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-800">Enable Auto Reply</h3>
                <p className="text-sm text-gray-600">Automatically respond to new messages</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiConfig.autoReply}
                  onChange={(e) => setAiConfig({ ...aiConfig, autoReply: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Reply Delay (seconds)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={aiConfig.autoReplyDelay}
                onChange={(e) => setAiConfig({ ...aiConfig, autoReplyDelay: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                disabled={!aiConfig.autoReply}
              />
              <p className="text-xs text-gray-500 mt-1">Add a delay before sending automatic responses</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
