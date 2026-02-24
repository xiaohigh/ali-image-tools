import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const debugInfo: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasApiKey: !!process.env.DASHSCOPE_API_KEY,
      apiKeyPrefix: process.env.DASHSCOPE_API_KEY ? process.env.DASHSCOPE_API_KEY.substring(0, 6) + '...' : 'not set',
    },
    runtime: {
      type: 'edge',
    },
    tests: {}
  };

  // Test 1: 基本 fetch 是否可用
  try {
    const testFetch = await fetch('https://httpbin.org/get');
    debugInfo.tests.basicFetch = {
      ok: testFetch.ok,
      status: testFetch.status
    };
  } catch (error) {
    debugInfo.tests.basicFetch = {
      error: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown'
    };
  }

  // Test 2: 阿里云 API 连接
  try {
    const testResponse = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY || 'no-key'}`
      },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        input: {
          messages: [{ role: 'user', content: [{ text: 'test' }] }]
        }
      })
    });

    let responseData;
    try {
      responseData = await testResponse.json();
    } catch {
      responseData = await testResponse.text();
    }

    debugInfo.tests.dashscopeApi = {
      status: testResponse.status,
      statusText: testResponse.statusText,
      ok: testResponse.ok,
      response: responseData
    };

  } catch (error) {
    debugInfo.tests.dashscopeApi = {
      error: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    };
  }

  return NextResponse.json(debugInfo, { status: 200 });
}

// POST 方法用于测试请求体解析
export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      status: 'ok',
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
