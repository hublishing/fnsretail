'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';

interface Channel {
  channel_name_2: string;
}

interface PreviewData {
  channel_name: string;
  product_id: string;
  channel_product_id: string;
}

interface LogData {
  user_id: string;
  date: string;
  channel_name: string;
  product_id: string;
  channel_product_id: string;
}

export default function UploadChannelPage() {
  const { data: session } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [productId, setProductId] = useState('');
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [logs, setLogs] = useState<LogData[]>([]);

  useEffect(() => {
    fetchChannels();
    if (session?.user?.email) {
      fetchLogs(session.user.email);
    }
  }, [session]);

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/upload-channel/channels');
      const data = await response.json();
      setChannels(data);
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch channels',
        variant: 'destructive',
      });
    }
  };

  const fetchPreviewData = async () => {
    if (!selectedChannel || !productId) return;

    try {
      const response = await fetch(
        `/api/upload-channel/preview?channelName=${selectedChannel}&productId=${productId}`
      );
      const data = await response.json();
      setPreviewData(data);
    } catch (error) {
      console.error('Error fetching preview data:', error);
    }
  };

  const fetchLogs = async (userId: string) => {
    try {
      const response = await fetch(`/api/upload-channel/logs?userId=${userId}`);
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedChannel || !session?.user?.email) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('channelName', selectedChannel);
    formData.append('userId', session.user.email);

    try {
      const response = await fetch('/api/upload-channel/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });

      fetchLogs(session.user.email);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">업로드 채널</h1>

      {/* Section 1 */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">1. 채널 선택 및 업로드</h2>
        <div className="flex gap-4 mb-4">
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="채널 선택" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((channel) => (
                <SelectItem key={channel.channel_name_2} value={channel.channel_name_2}>
                  {channel.channel_name_2}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleDownloadTemplate}>양식 다운로드</Button>
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="w-[200px]"
          />
        </div>
      </div>

      {/* Section 2 */}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>채널명</TableHead>
                <TableHead>이지어드민 코드</TableHead>
                <TableHead>채널 상품 코드</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{previewData.channel_name}</TableCell>
                <TableCell>{previewData.product_id}</TableCell>
                <TableCell>{previewData.channel_product_id}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>

      {/* Section 3 */}
      <div className="p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">3. 업로드 로그</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>채널명</TableHead>
              <TableHead>이지어드민 코드</TableHead>
              <TableHead>채널 상품 코드</TableHead>
              <TableHead>삭제</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={`${log.date}-${log.product_id}`}>
                <TableCell>{new Date(log.date).toLocaleString()}</TableCell>
                <TableCell>{log.channel_name}</TableCell>
                <TableCell>{log.product_id}</TableCell>
                <TableCell>{log.channel_product_id}</TableCell>
                <TableCell>
                  <Button variant="destructive" size="sm">
                    삭제
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
