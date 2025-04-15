import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    // 빈 워크북 생성
    const wb = XLSX.utils.book_new();
    
    // 헤더 데이터 생성
    const headerData = ['이지어드민코드', '채널상품코드'];
    const ws = XLSX.utils.aoa_to_sheet([headerData]);
    
    // 워크북에 워크시트 추가
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    // 엑셀 파일 생성
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // 응답 헤더 설정
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    responseHeaders.set('Content-Disposition', 'attachment; filename=channel_upload_template.xlsx');
    
    return new NextResponse(buffer, {
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Error generating Excel file:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel file' },
      { status: 500 }
    );
  }
} 