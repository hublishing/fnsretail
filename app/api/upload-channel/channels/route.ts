import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: 'third-current-410914',
  credentials: {
    client_email: process.env.BIGQUERY_CLIENT_EMAIL,
    private_key: process.env.BIGQUERY_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

export async function GET() {
  try {
    const query = `
      SELECT DISTINCT channel_name_2
      FROM \`third-current-410914.project_m.channel_db\`
      WHERE channel_name_2 IS NOT NULL
      ORDER BY channel_name_2
    `;

    const [rows] = await bigquery.query({ query });
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
} 