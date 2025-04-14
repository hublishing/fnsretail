'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/ui/use-toast";
import { Channel, Log } from '@/app/types/types';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

export default function UploadChannelPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [productId, setProductId] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchChannels();
    fetchLogs();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/upload-channel/channels');
      if (!response.ok) throw new Error('채널 정보를 불러오는데 실패했습니다.');
      const data = await response.json();
      setChannels(data);
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast({
        title: "에러",
        description: "채널 정보를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/upload-channel/logs');
      if (!response.ok) throw new Error('로그를 불러오는데 실패했습니다.');
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "에러",
        description: "로그를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const fetchPreviewData = async () => {
    if (!selectedChannel || !productId) return;
    try {
      const response = await fetch(`/api/upload-channel/preview?channelName=${selectedChannel}&productId=${productId}`);
      const data = await response.json();
      setPreviewData(data);
    } catch (error) {
      console.error('Error fetching preview data:', error);
      toast({
        title: "에러",
        description: "미리보기 데이터를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        '이지어드민코드': '',
        '채널상품코드': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'upload_template.xlsx');
  };

  const handleUpload = async (file: File) => {
    try {
      console.log('파일 업로드 시작:', file.name);
      const user = auth.currentUser;
      
      if (!user) {
        console.log('사용자 로그인 필요');
        toast({
          title: "업로드 실패",
          description: "로그인이 필요합니다.",
          variant: "destructive"
        });
        return;
      }

      const token = await user.getIdToken();
      console.log('인증 토큰 획득');

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          console.log('파일 읽기 완료');
          
          if (!data) {
            console.log('파일 데이터 없음');
            toast({
              title: "업로드 실패",
              description: "파일 데이터가 없습니다.",
              variant: "destructive"
            });
            return;
          }

          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          console.log('Excel 데이터 변환 완료, 행 수:', jsonData.length);

          const response = await fetch('/api/upload-channel/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              channelName: selectedChannel,
              data: jsonData
            })
          });

          console.log('API 응답 상태:', response.status);
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('업로드 실패:', errorData);
            throw new Error(errorData.error || '업로드에 실패했습니다.');
          }

          const result = await response.json();
          console.log('업로드 성공:', result);
          toast({
            title: "업로드 성공",
            description: `총 ${result.uploadedCount}개의 상품이 성공적으로 업로드되었습니다.`,
            variant: "success"
          });
        } catch (error) {
          console.error('파일 처리 중 에러:', error);
          toast({
            title: "업로드 실패",
            description: error instanceof Error ? error.message : '파일 업로드 중 오류가 발생했습니다.',
            variant: "destructive"
          });
        }
      };

      reader.onerror = (error) => {
        console.error('파일 읽기 에러:', error);
        toast({
          title: "업로드 실패",
          description: "파일을 읽는 중 오류가 발생했습니다.",
          variant: "destructive"
        });
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('업로드 처리 중 에러:', error);
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : '파일 업로드 중 오류가 발생했습니다.',
        variant: "destructive"
      });
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      const response = await fetch(`/api/upload-channel/logs/${logId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('로그 삭제에 실패했습니다.');
      }

      toast({
        title: "성공",
        description: "로그가 삭제되었습니다.",
        variant: "success"
      });
      fetchLogs();
    } catch (error) {
      console.error('Error deleting log:', error);
      toast({
        title: "에러",
        description: "로그 삭제에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">채널 업로드</h1>
      
      {/* 섹션 1 */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">1. 채널 선택 및 업로드</h2>
        <div className="flex gap-4 mb-4">
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="w-[200px] p-2 border rounded"
          >
            <option value="">채널 선택</option>
            {channels.map((channel) => (
              <option key={channel.channel_name} value={channel.channel_name}>
                {channel.channel_name}
              </option>
            ))}
          </select>
          <Button onClick={handleDownloadTemplate}>양식 다운로드</Button>
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              if (e.target.files) {
                const file = e.target.files[0];
                handleUpload(file);
              }
            }}
            className="w-[200px]"
          />
        </div>
      </div>

      {/* 섹션 2 */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">2. 미리보기</h2>
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="이지어드민 코드 입력"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-[200px]"
          />
          <Button onClick={fetchPreviewData}>조회</Button>
        </div>
        {previewData && (
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th className="px-4 py-2">채널명</th>
                <th className="px-4 py-2">이지어드민 코드</th>
                <th className="px-4 py-2">채널 상품 코드</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2">{previewData.channel_name}</td>
                <td className="px-4 py-2">{previewData.product_id}</td>
                <td className="px-4 py-2">{previewData.channel_product_id}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* 섹션 3 */}
      <div className="p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">3. 업로드 로그</h2>
        <table className="min-w-full table-auto">
          <thead>
            <tr>
              <th className="px-4 py-2">날짜</th>
              <th className="px-4 py-2">채널명</th>
              <th className="px-4 py-2">이지어드민 코드</th>
              <th className="px-4 py-2">채널 상품 코드</th>
              <th className="px-4 py-2">삭제</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={`${log.date}-${log.product_id}`}>
                <td className="px-4 py-2">{new Date(log.date).toLocaleString()}</td>
                <td className="px-4 py-2">{log.channel_name}</td>
                <td className="px-4 py-2">{log.product_id}</td>
                <td className="px-4 py-2">{log.channel_product_id}</td>
                <td className="px-4 py-2">
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteLog(log.user_id)}>
                    삭제
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
