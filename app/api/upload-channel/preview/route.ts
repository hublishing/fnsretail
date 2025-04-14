import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channelName = searchParams.get('channelName');
    const productId = searchParams.get('productId');

    if (!channelName || !productId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

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

    // BigQuery API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;

    const query = `
      SELECT 
        channel_name,
        channel_name_2,
        shop_id,
        shop_name,
        team,
        manager,
        type,
        use_yn,
        used,
        currency,
        currency_2,
        applied_exchange_rate,
        correction_rate,
        commission_rate,
        average_fee_rate,
        markup_ratio,
        min_price,
        price_formula,
        rounddown,
        shipping_fee,
        shipping_formula,
        shipping_condition,
        conditional_shipping,
        free_shipping,
        delivery_fee,
        domestic_delivery_fee,
        customs_fee,
        declaration_fee,
        innerbox_fee,
        outerbox_fee,
        packingbox_fee,
        digit_adjustment,
        amazon_shipping_cost,
        channel_category_2,
        channel_category_3,
        comment
      FROM \`third-current-410914.project_m.channel_db\`
      WHERE channel_name = '${channelName}'
      AND product_id = '${productId}'
      LIMIT 1
    `;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        useLegacySql: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('BigQuery API 호출 실패');
    }

    const data = await response.json();
    
    // 결과 처리
    const preview = data.rows?.[0]?.f?.map((field: any) => field.v) || [];
    
    return NextResponse.json(preview);
  } catch (error) {
    console.error('Error fetching preview:', error);
    return NextResponse.json({ error: 'Failed to fetch preview' }, { status: 500 });
  }
} 