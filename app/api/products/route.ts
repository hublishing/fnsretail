import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search');

  try {
    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // BigQuery 쿼리
    const query = `
      SELECT 
        product_id,
        options_product_id,
        name,
        options_options,
        org_price,
        shop_price,
        category
      FROM \`third-current-410914.001_ezadmin.001_ezadmin_product_*\`
      ${searchTerm ? `WHERE name LIKE '%${searchTerm}%'` : ''}
      ORDER BY product_id DESC
    `;

    // JWT 토큰 생성
    const now = Math.floor(Date.now() / 1000);
    const token = await generateJWT(now);

    // API 요청
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        useLegacySql: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'BigQuery API 요청 실패');
    }

    // BigQuery 응답에서 데이터 추출
    const rows = data.rows?.map((row: any) => ({
      product_id: row.f[0].v,
      options_product_id: row.f[1].v,
      name: row.f[2].v,
      options_options: row.f[3].v,
      org_price: Number(row.f[4].v),
      shop_price: Number(row.f[5].v),
      category: row.f[6].v,
    })) || [];

    return NextResponse.json(rows);
  } catch (error) {
    console.error('BigQuery 쿼리 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

async function generateJWT(now: number) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
  };

  const payload = {
    iss: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/bigquery',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64');
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signatureInput = `${headerBase64}.${payloadBase64}`;

  // RS256 서명 생성
  const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const signature = await signRS256(signatureInput, privateKey || '');

  return `${headerBase64}.${payloadBase64}.${signature}`;
}

async function signRS256(input: string, privateKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(privateKey);
  const messageData = encoder.encode(input);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    messageData
  );

  return Buffer.from(signature).toString('base64');
} 