import { NextRequest, NextResponse } from 'next/server';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export async function POST(request: NextRequest) {
  const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
  
  if (!DASHSCOPE_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { prompt, model = 'wanx2.1-t2i-turbo', size = '1024*1024', n = 1, negative_prompt } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Build parameters
    const parameters: any = {
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
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
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

  } catch (error: any) {
    console.error('Text-to-image error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
