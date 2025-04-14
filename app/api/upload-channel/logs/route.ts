import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';
import { auth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { getSession } from '@/app/actions/auth';

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const uid = session.uid;

    const bigquery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: {
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
    });

    let query = `
      SELECT 
        user_id,
        date,
        channel_name,
        product_id,
        channel_product_id
      FROM \`third-current-410914.project_m.product_sub_db\`
      WHERE user_id = @uid
      ORDER BY date DESC
    `;

    const options = {
      query,
      params: { uid },
    };

    const [rows] = await bigquery.query(options);
    
    const logs = rows.map((row: any) => ({
      user_id: row.user_id,
      date: row.date,
      channel_name: row.channel_name,
      product_id: row.product_id,
      channel_product_id: row.channel_product_id
    }));

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: '로그를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 