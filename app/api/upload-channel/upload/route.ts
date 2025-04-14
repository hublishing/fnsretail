import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';
import * as XLSX from 'xlsx';

const bigquery = new BigQuery({
  projectId: 'third-current-410914',
  credentials: {
    client_email: process.env.BIGQUERY_CLIENT_EMAIL,
    private_key: process.env.BIGQUERY_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const channelName = formData.get('channelName') as string;
    const userId = formData.get('userId') as string;

    if (!file || !channelName || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const rows = data.map((row: any) => ({
      product_id: row['이지어드민코드'],
      channel_product_id: row['채널상품코드'],
      channel_name: channelName,
      user_id: userId,
      date: new Date().toISOString()
    }));

    const dataset = bigquery.dataset('project_m');
    const table = dataset.table('product_sub_db');

    await table.insert(rows);

    return NextResponse.json({ message: 'Upload successful' });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
} 