import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

export async function GET() {
  try {
    console.log('채널 조회 시작');
    
    const bigquery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: {
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
    });

    const query = `
      SELECT DISTINCT channel_name_2 as channel_name
      FROM \`third-current-410914.project_m.channel_db\`
      WHERE channel_name_2 IS NOT NULL
      ORDER BY channel_name_2
    `;

    console.log('쿼리 실행:', query);
    const [rows] = await bigquery.query(query);
    console.log('쿼리 결과:', rows);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('채널 조회 오류:', error);
    return NextResponse.json(
      { error: '채널 정보를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 