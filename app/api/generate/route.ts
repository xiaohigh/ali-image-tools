import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 支持从前端传入 API Key，优先使用前端传来的，否则使用环境变量
    const apiKey = body.apiKey || req.headers.get('X-API-Key') || process.env.DASHSCOPE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: '请先在设置页面配置 API Key' }, { status: 401 });
    }

    // DashScope API URL
    const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

    // 从 body 中移除 apiKey，不要传给阿里云
    const { apiKey: _, ...requestBody } = body;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: unknown) {
    console.error('Proxy Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
