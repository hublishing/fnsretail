'use client';

import { useState, useEffect } from 'react';
import { getSession } from '@/app/actions/auth';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Log {
  user_id: string;
  date: string;
  channel_name: string;
  product_id: string;
  channel_product_id: string;
  upload_id?: string;
  count: number;
}

export default function UploadChannelPage() {
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [channels, setChannels] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedCount, setUploadedCount] = useState<number>(0);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const router = useRouter();

  const fetchLogs = async () => {
    try {
      if (!session?.user_id) {
        console.error('사용자 ID가 없습니다');
        return;
      }

      const response = await fetch('/api/upload-channel/logs', {
        headers: {
          'user-id': session.user_id,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        console.error('로그 조회 실패:', response.status);
      }
    } catch (error) {
      console.error('로그 로드 오류:', error);
    }
  };

  // 세션 확인
  useEffect(() => {
    const checkAuth = async () => {
      const currentSession = await getSession();
      console.log('현재 세션:', currentSession);
      
      if (!currentSession) {
        router.push('/');
        return;
      }
      
      setSession(currentSession);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  // 로그 조회
  useEffect(() => {
    if (session?.user_id) {
      fetchLogs();
    }
  }, [session]);

  // 채널 목록 조회
  useEffect(() => {
    const fetchChannels = async () => {
      if (!session) return;
      
      try {
        setIsLoading(true);
        setError(null); 
        
        const response = await fetch('/api/upload-channel/channels', {
          headers: {
            'user-id': session.user_id,
          },
        });
        console.log('API 응답:', response);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setChannels(data);
        } else {
          setError('채널 목록을 가져오는데 실패했습니다.');
          setChannels([]);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : '채널 목록을 가져오는데 실패했습니다.');
        setChannels([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannels();
  }, [session]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!selectedChannel) {
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 업로드 전에 채널을 선택해주세요.</div>,
        variant: "destructive"
      });
      return;
    }

    if (!file) {
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 업로드할 파일을 선택해주세요.</div>,
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);

    try {
      const currentSession = await getSession();
      
      if (!currentSession) {
        router.push('/');
        return;
      }

      const uploadId = uuidv4();
      setCurrentUploadId(uploadId);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('channelName', selectedChannel);
      formData.append('uploadId', uploadId);

      const response = await fetch('/api/upload-channel/upload', {
        method: 'POST',
        headers: {
          'user-id': currentSession.user_id,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('업로드에 실패했습니다.');
      }

      const result = await response.json();
      setUploadedCount(result.count || 0);

      toast({
        description: <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> {result.count}개 상품이 성공적으로 업로드되었습니다.</div>,
      });

      // 전체 로그 새로고침
      const logsResponse = await fetch('/api/upload-channel/logs', {
        headers: {
          'user-id': currentSession.user_id,
        },
      });
      
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setLogs(logsData.logs || []);
      }
    } catch (error) {
      console.error('업로드 오류:', error);
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 파일 업로드 중 오류가 발생했습니다.</div>,
        variant: "destructive"
      });
    }
  };

  // 데이터 삭제
  const handleDelete = async (uploadId: string, channelName: string) => {
    try {
      if (!session?.user_id) {
        console.error('사용자 ID가 없습니다');
        return;
      }

      const response = await fetch(`/api/upload-channel/delete?uploadId=${uploadId}&channelName=${channelName}`, {
        method: 'DELETE',
        headers: {
          'user-id': session.user_id,
        },
      });

      if (!response.ok) {
        throw new Error('삭제에 실패했습니다.');
      }

      // 삭제 성공 후 로그 새로고침
      await fetchLogs();

      toast({
        description: <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> 데이터가 성공적으로 삭제되었습니다.</div>,
      });
    } catch (error) {
      console.error('삭제 오류:', error);
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 데이터 삭제 중 오류가 발생했습니다.</div>,
        variant: "destructive"
      });
    }
  };

  const handleDownload = async () => {
    if (!selectedChannel) {
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 채널을 먼저 선택해주세요.</div>,
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/upload-channel/download?channelName=${selectedChannel}`);
      if (!response.ok) {
        throw new Error('양식 다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedChannel}_양식.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        description: <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> 양식이 다운로드되었습니다.</div>,
      });
    } catch (error) {
      console.error('다운로드 오류:', error);
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 양식 다운로드 중 오류가 발생했습니다.</div>,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* 1번 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>채널 선택 및 업로드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 items-center">
              <Select 
                value={selectedChannel || undefined} 
                onValueChange={setSelectedChannel}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="채널 선택" />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <SelectItem value="loading" disabled>
                      로딩 중...
                    </SelectItem>
                  ) : error ? (
                    <SelectItem value="error" disabled>
                      {error}
                    </SelectItem>
                  ) : channels.length > 0 ? (
                    channels.map((channel) => (
                      <SelectItem key={channel} value={channel}>
                        {channel}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-channels" disabled>
                      채널이 없습니다
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleDownload}
                disabled={!selectedChannel}
              >
                양식 다운로드
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={!selectedChannel}
                  key={selectedFile ? 'file-selected' : 'no-file'}
                  id="file-upload"
                />
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={!selectedChannel}
                  variant="outline"
                >
                  파일 선택
                </Button>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              {selectedFile && (
                <div className="text-sm text-gray-500">
                  {selectedFile.name}
                </div>
              )}
              {uploadedCount > 0 && (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  {uploadedCount} 상품 반영 완료
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 전체 로그 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>전체 로그</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>날짜</TableHead>
                <TableHead>채널명</TableHead>
                <TableHead>업로드 ID</TableHead>
                <TableHead>상품 수</TableHead>
                <TableHead>삭제</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell>{log.date}</TableCell>
                    <TableCell>{log.channel_name}</TableCell>
                    <TableCell>{log.upload_id}</TableCell>
                    <TableCell>{log.count}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(log.upload_id || '', log.channel_name)}
                      >
                        삭제
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    로그 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 