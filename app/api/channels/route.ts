import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export async function GET() {
  try {
    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // 채널 정보를 가져오는 쿼리
    const query = `
      SELECT 
        channel_name,
        channel_name_2,
        channel_category_2,
        channel_category_3,
        team,
        manager,
        shop_id,
        shop_name,
        used,
        price_formula,
        shipping_formula,
        exchange_rate,
        currency,
        correction_rate,
        amount,
        comment,
        use_yn,
        type,
        markup_ratio,
        applied_exchange_rate,
        rounddown,
        digit_adjustment,
        currency_2,
        average_fee_rate,
        shipping_condition,
        outerbox_fee,
        domestic_delivery_fee,
        shipping_fee,
        customs_fee,
        declaration_fee,
        innerbox_fee,
        packingbox_fee,
        free_shipping,
        conditional_shipping
      FROM \`third-current-410914.project_m.channel_db\`
      WHERE channel_name_2 IS NOT NULL
      ORDER BY channel_name_2
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

    // BigQuery API 호출
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
    const channels = data.rows?.map((row: any) => ({
      channel_name: row.f[0].v,
      channel_name_2: row.f[1].v,
      channel_category_2: row.f[2].v,
      channel_category_3: row.f[3].v,
      team: row.f[4].v,
      manager: row.f[5].v,
      shop_id: row.f[6].v,
      shop_name: row.f[7].v,
      used: row.f[8].v,
      price_formula: row.f[9].v,
      shipping_formula: row.f[10].v,
      exchange_rate: row.f[11].v,
      currency: row.f[12].v,
      correction_rate: row.f[13].v,
      amount: row.f[14].v,
      comment: row.f[15].v,
      use_yn: row.f[16].v,
      type: row.f[17].v,
      markup_ratio: row.f[18].v,
      applied_exchange_rate: row.f[19].v,
      rounddown: row.f[20].v,
      digit_adjustment: row.f[21].v,
      currency_2: row.f[22].v,
      average_fee_rate: row.f[23].v,
      shipping_condition: row.f[24].v,
      outerbox_fee: row.f[25].v,
      domestic_delivery_fee: row.f[26].v,
      shipping_fee: row.f[27].v,
      customs_fee: row.f[28].v,
      declaration_fee: row.f[29].v,
      innerbox_fee: row.f[30].v,
      packingbox_fee: row.f[31].v,
      free_shipping: row.f[32].v ? parseFloat(row.f[32].v) : 0,
      conditional_shipping: row.f[33].v ? parseFloat(row.f[33].v) : 0
    })) || [];
    
    return NextResponse.json({ channels });
  } catch (error) {
    console.error('채널 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '채널 정보를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 