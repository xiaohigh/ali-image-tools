import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  // 支持从前端传入 API Key
  const apiKey = request.headers.get('X-API-Key') || process.env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: '请先在设置页面配置 API Key' }, { status: 401 });
  }

  try {
    const { taskId } = await params;

    const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Failed to get task status' }, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error: unknown) {
    console.error('Task status error:', error);
    const errorInfo = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };
    return NextResponse.json({ error: errorInfo }, { status: 500 });
  }
}
