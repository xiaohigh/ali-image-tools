import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 支持从前端传入 API Key
    const apiKey = body.apiKey || request.headers.get('X-API-Key') || process.env.DASHSCOPE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: '请先在设置页面配置 API Key' }, { status: 401 });
    }

    const { prompt, model = 'wanx2.1-t2i-turbo', size = '1024*1024', n = 1, negative_prompt } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Build parameters
    const parameters: Record<string, unknown> = {
      n,
      size,
    };

    if (negative_prompt) {
      parameters.negative_prompt = negative_prompt;
    }

    // Submit async task
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-Async': 'enable'
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [
            {
              role: 'user',
              content: [{ text: prompt }]
            }
          ]
        },
        parameters
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Failed to submit task' }, { status: response.status });
    }

    // Return task_id for polling
    return NextResponse.json({
      task_id: data.output?.task_id,
      status: data.output?.task_status
    });

  } catch (error: unknown) {
    console.error('Text-to-image error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
