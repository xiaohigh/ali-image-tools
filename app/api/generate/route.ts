import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

export async function POST(req: NextRequest) {
  if (!DASHSCOPE_API_KEY) {
    return NextResponse.json({ error: 'Server API Key missing' }, { status: 500 });
  }

  try {
    const body = await req.json();

    // DashScope API URL
    const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
