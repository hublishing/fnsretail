import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search');

  // 검색어가 없으면 빈 배열 반환
  if (!searchTerm) {
    return NextResponse.json([]);
  }

  try {
    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // BigQuery 쿼리
    const query = `
      WITH LatestTable AS (
        SELECT table_id
        FROM \`third-current-410914.001_ezadmin.__TABLES__\`
        WHERE table_id LIKE '001_ezadmin_product_%'
        ORDER BY table_id DESC
        LIMIT 1
      ),
      RankedProducts AS (
        SELECT 
          product_id,
          name,
          origin,
          weight,
          org_price,
          shop_price,
          img_desc1,
          product_desc,
          category,
          extra_column1,
          extra_column2,
          options_product_id,
          options_options,
          ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY product_id DESC) as rn
        FROM \`third-current-410914.001_ezadmin.001_ezadmin_product_20240319\`
        WHERE name LIKE '%${searchTerm}%'
      )
      SELECT 
        product_id,
        name,
        origin,
        weight,
        org_price,
        shop_price,
        img_desc1,
        product_desc,
        category,
        extra_column1,
        extra_column2,
        options_product_id,
        options_options
      FROM RankedProducts
      WHERE rn = 1
      ORDER BY product_id DESC
    `;

    // 먼저 최신 테이블 ID를 가져옵니다
    const latestTableQuery = `
      SELECT table_id
      FROM \`third-current-410914.001_ezadmin.__TABLES__\`
      WHERE table_id LIKE '001_ezadmin_product_%'
      ORDER BY table_id DESC
      LIMIT 1
    `;

    // JWT 토큰 생성
    const now = Math.floor(Date.now() / 1000);
    const privateKeyString = process.env.GOOGLE_CLOUD_PRIVATE_KEY || '';
    
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

    const tokenResponseText = await tokenResponse.text();
    console.log('토큰 응답:', tokenResponseText);

    if (!tokenResponse.ok) {
      throw new Error(`액세스 토큰 획득 실패: ${tokenResponseText}`);
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenResponseText);
    } catch (e) {
      throw new Error(`토큰 응답 파싱 실패: ${tokenResponseText}`);
    }

    const { access_token } = tokenData;

    // 먼저 최신 테이블 ID를 가져옵니다
    const latestTableResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: latestTableQuery,
        useLegacySql: false,
      }),
    });

    const latestTableData = await latestTableResponse.json();
    const latestTableId = latestTableData.rows?.[0]?.f?.[0]?.v;

    if (!latestTableId) {
      throw new Error('최신 테이블을 찾을 수 없습니다.');
    }

    // 실제 데이터를 가져오는 쿼리
    const dataQuery = `
      WITH RankedProducts AS (
        SELECT 
          product_id,
          name,
          origin,
          weight,
          org_price,
          shop_price,
          img_desc1,
          product_desc,
          category,
          extra_column1,
          extra_column2,
          options_product_id,
          options_options,
          ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY product_id DESC) as rn
        FROM \`third-current-410914.001_ezadmin.${latestTableId}\`
        WHERE name LIKE '%${searchTerm}%'
      )
      SELECT 
        product_id,
        name,
        origin,
        weight,
        org_price,
        shop_price,
        img_desc1,
        product_desc,
        category,
        extra_column1,
        extra_column2,
        options_product_id,
        options_options
      FROM RankedProducts
      WHERE rn = 1
      ORDER BY product_id DESC
    `;

    // BigQuery API 요청
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: dataQuery,
        useLegacySql: false,
      }),
    });

    const responseText = await response.text();
    console.log('BigQuery 응답:', responseText);

    if (!response.ok) {
      throw new Error(`BigQuery API 요청 실패: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`BigQuery 응답 파싱 실패: ${responseText}`);
    }

    // BigQuery 응답에서 데이터 추출
    const rows = data.rows?.map((row: any) => {
      try {
        return {
          product_id: row.f[0]?.v || '',
          name: row.f[1]?.v || '',
          origin: row.f[2]?.v || '',
          weight: row.f[3]?.v || '',
          org_price: Number(row.f[4]?.v || 0),
          shop_price: Number(row.f[5]?.v || 0),
          img_desc1: row.f[6]?.v || '',
          product_desc: row.f[7]?.v || '',
          category: row.f[8]?.v || '',
          extra_column1: row.f[9]?.v || '',
          extra_column2: row.f[10]?.v || '',
          options_product_id: row.f[11]?.v || '',
          options_options: row.f[12]?.v || '',
        }
      } catch (error) {
        console.error('행 데이터 매핑 오류:', error, row)
        return null
      }
    }).filter(Boolean) || [];

    return NextResponse.json(rows);
  } catch (error) {
    console.error('BigQuery 쿼리 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 