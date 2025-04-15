import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';
import * as XLSX from 'xlsx';
import { BigQuery } from '@google-cloud/bigquery';

interface ExcelRow {
  '이지어드민코드': number;
  '채널상품코드': number;
}

export async function POST(request: Request) {
  console.log('업로드 API 시작');
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const channelName = formData.get('channelName') as string;
    const userId = request.headers.get('user-id');
    const uploadId = formData.get('uploadId') as string;

    console.log('요청 데이터:', { 
      file: file ? `파일 존재 (${file.name})` : '파일 없음',
      channelName,
      userId,
      uploadId,
      headers: Object.fromEntries(request.headers.entries())
    });

    if (!file || !channelName || !userId || !uploadId) {
      console.error('필수 데이터 누락:', { 
        file: !!file, 
        channelName, 
        userId,
        uploadId,
        headers: Object.fromEntries(request.headers.entries())
      });
      return NextResponse.json(
        { error: '파일, 채널명, 사용자 ID, 업로드 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 환경 변수 체크
    const requiredEnvVars = {
      GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
      GOOGLE_CLOUD_CLIENT_EMAIL: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      GOOGLE_CLOUD_PRIVATE_KEY: process.env.GOOGLE_CLOUD_PRIVATE_KEY,
      GOOGLE_CLOUD_PRIVATE_KEY_ID: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
    };

    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        console.error(`${key} 환경 변수가 설정되지 않았습니다.`);
        return NextResponse.json(
          { error: `${key} 환경 변수가 설정되지 않았습니다.` },
          { status: 500 }
        );
      }
    }

    // 엑셀 파일 파싱
    const workbook = XLSX.read(await file.arrayBuffer());
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

    console.log('파싱된 데이터:', data);

    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    console.log('JWT 토큰 생성 시작');
    const now = Math.floor(Date.now() / 1000);
    const privateKeyString = (process.env.GOOGLE_CLOUD_PRIVATE_KEY as string).replace(/\\n/g, '\n');
    
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

    console.log('액세스 토큰 요청 시작');
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

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('액세스 토큰 요청 실패:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText
      });
      return NextResponse.json(
        { error: '액세스 토큰을 얻는데 실패했습니다.' },
        { status: 500 }
      );
    }

    const { access_token } = await tokenResponse.json();
    console.log('액세스 토큰 획득 성공');

    // 테이블 스키마 조회
    const schemaQuery = `
      SELECT column_name, data_type
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.project_m.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = 'product_sub_db'
    `;

    const schemaResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: schemaQuery,
        useLegacySql: false,
        location: 'asia-northeast3',
      }),
    });

    if (!schemaResponse.ok) {
      const errorText = await schemaResponse.text();
      console.error('스키마 조회 실패:', errorText);
      throw new Error('테이블 스키마 조회에 실패했습니다.');
    }

    const schemaData = await schemaResponse.json();
    console.log('테이블 스키마:', schemaData);

    const query = `
      INSERT INTO \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.project_m.product_sub_db\`
      (product_id, channel_product_id, channel_name, user_id, upload_id, date)
      VALUES
      ${data.map(row => `(
        '${row['이지어드민코드']}',
        '${row['채널상품코드']}',
        @channelName,
        @userId,
        @uploadId,
        TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 9 HOUR)
      )`).join(',')}
    `;

    console.log('실행할 쿼리:', query);
    console.log('데이터:', data);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        useLegacySql: false,
        location: 'asia-northeast3',
        queryParameters: [
          {
            name: 'channelName',
            parameterType: { type: 'STRING' },
            parameterValue: { value: channelName }
          },
          {
            name: 'userId',
            parameterType: { type: 'STRING' },
            parameterValue: { value: userId }
          },
          {
            name: 'uploadId',
            parameterType: { type: 'STRING' },
            parameterValue: { value: uploadId }
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BigQuery API 호출 실패:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error('BigQuery API 호출에 실패했습니다.');
    }

    console.log('모든 데이터 업로드 완료');
    return NextResponse.json({ 
      message: '데이터 업로드가 완료되었습니다.',
      count: data.length,
      uploadId: uploadId
    });

  } catch (error) {
    console.error('데이터 업로드 오류:', error);
    return NextResponse.json(
      { error: '데이터 업로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}
