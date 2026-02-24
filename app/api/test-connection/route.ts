import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey || !apiKey.startsWith('sk-')) {
      return NextResponse.json({ error: 'Invalid API Key format' }, { status: 400 });
    }

    // Test the API key with a simple request
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        input: {
          messages: [{ role: 'user', content: [{ text: 'test' }] }]
        }
      })
    });

    // If we get 401, the key is invalid
    if (response.status === 401) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
    }

    // Any other response means the API is reachable
    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('Test connection error:', error);
    return NextResponse.json({ error: 'Connection failed' }, { status: 500 });
  }
}
