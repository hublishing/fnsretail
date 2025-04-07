import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channel = searchParams.get('channel');

    if (!channel) {
      return NextResponse.json({ 
        success: false, 
        error: '채널명이 필요합니다.' 
      }, { status: 400 });
    }

    console.log('[API] shop-product-ids 요청:', { channel });

    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // SQL 쿼리 작성
    const query = `
      WITH RankedProducts AS (
        SELECT
          product_id,
          shop_product_id,
          ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY order_date DESC) as rn
        FROM \`third-current-410914.project_m.order_db\`
        WHERE channel_name = @channel
        AND shop_product_id IS NOT NULL
        AND shop_product_id != ''
      )
      SELECT DISTINCT
        product_id,
        shop_product_id
      FROM RankedProducts
      WHERE rn = 1
    `;

    // JWT 토큰 생성
    const now = Math.floor(Date.now() / 1000);
    const privateKeyString = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
    
    if (!privateKeyString) {
      throw new Error('GOOGLE_CLOUD_PRIVATE_KEY 환경 변수가 설정되지 않았습니다.');
    }

    const privateKey = createPrivateKey({
      key: privateKeyString,
      format: 'pem',
    });
    
    const jwtToken = jwt.sign(
      {
        iss: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        sub: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        jti: Math.random().toString(),
        scope: 'https://www.googleapis.com/auth/bigquery',
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      }
    );

    // OAuth 2.0 액세스 토큰 얻기
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtToken,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(`액세스 토큰 획득 실패: ${JSON.stringify(tokenData)}`);
    }

    const { access_token } = tokenData;

    // BigQuery API 요청
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        queryParameters: [
          {
            name: 'channel',
            parameterType: { type: 'STRING' },
            parameterValue: { value: channel }
          }
        ],
        useLegacySql: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`BigQuery API 요청 실패: ${JSON.stringify(data)}`);
    }

    // 결과 매핑
    const shopProductIds: Record<string, string> = {};
    data.rows?.forEach((row: any) => {
      const productId = row.f[0].v;
      const shopProductId = row.f[1].v;
      if (productId && shopProductId && shopProductId !== 'NaN' && shopProductId !== 'nan') {
        shopProductIds[productId] = shopProductId;
      }
    });

    console.log('[API] 매핑된 결과:', {
      count: Object.keys(shopProductIds).length
    });

    return NextResponse.json({ 
      success: true, 
      shopProductIds 
    });
  } catch (error) {
    console.error('[API] 오류 발생:', error);
    return NextResponse.json({ 
      success: false, 
      error: '데이터를 가져오는 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 