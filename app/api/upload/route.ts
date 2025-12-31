import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Base64 URL safe encoding
function base64UrlSafe(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_');
}

// Generate Qiniu upload token using Web Crypto API
async function generateUploadToken(accessKey: string, secretKey: string, bucket: string): Promise<string> {
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const putPolicy = JSON.stringify({
    scope: bucket,
    deadline: deadline
  });
  
  const encodedPolicy = base64UrlSafe(putPolicy);
  
  // Create HMAC-SHA1 signature using Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(encodedPolicy));
  const encodedSign = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${accessKey}:${encodedSign}:${encodedPolicy}`;
}

export async function POST(req: NextRequest) {
  const ACCESS_KEY = process.env.QINIU_ACCESS_KEY;
  const SECRET_KEY = process.env.QINIU_SECRET_KEY;
  const BUCKET = process.env.QINIU_BUCKET;
  const DOMAIN = process.env.QINIU_DOMAIN;

  if (!ACCESS_KEY || !SECRET_KEY || !BUCKET || !DOMAIN) {
    return NextResponse.json({ error: 'Server Qiniu configuration missing' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const key = `qwen-edit/${Date.now()}_${safeName}`;

    // Generate upload token
    const uploadToken = await generateUploadToken(ACCESS_KEY, SECRET_KEY, BUCKET);

    // Create form data for Qiniu upload
    const qiniuFormData = new FormData();
    qiniuFormData.append('token', uploadToken);
    qiniuFormData.append('key', key);
    qiniuFormData.append('file', file);

    // Upload to Qiniu
    const uploadResponse = await fetch('https://upload.qiniup.com/', {
      method: 'POST',
      body: qiniuFormData
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      console.error('Qiniu Upload Error:', errorData);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const respBody = await uploadResponse.json();
    
    // Construct URL
    let domain = DOMAIN.endsWith('/') ? DOMAIN.slice(0, -1) : DOMAIN;
    if (!domain.startsWith('http')) domain = 'http://' + domain;
    const publicUrl = `${domain}/${respBody.key}`;

    return NextResponse.json({ url: publicUrl });

  } catch (error: any) {
    console.error('Upload Handle Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
