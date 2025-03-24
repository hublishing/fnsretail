import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

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
    const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
    
    const token = jwt.sign(
      {
        iss: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        scope: 'https://www.googleapis.com/auth/bigquery',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      }
    );

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