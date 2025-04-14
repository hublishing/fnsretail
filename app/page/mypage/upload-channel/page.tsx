'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toast } from "@/components/ui/toast";
import { Channel, Log } from '@/app/types/types';

export default function UploadChannelPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'destructive', message: string } | null>(null);

  useEffect(() => {
    fetchChannels();
    fetchLogs();
  }, []);

  const showToast = (type: 'success' | 'destructive', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/upload-channel/channels');
      if (!response.ok) throw new Error('채널 정보를 불러오는데 실패했습니다.');
      const data = await response.json();
      setChannels(data);
    } catch (error) {
      console.error('Error fetching channels:', error);
      showToast('destructive', '채널 정보를 불러오는데 실패했습니다.');
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
      showToast('destructive', '로그를 불러오는데 실패했습니다.');
    }
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (!selectedChannel) {
        throw new Error('채널을 선택해주세요.');
      }

      const response = await fetch('/api/upload-channel/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channelName: selectedChannel }),
      });

      if (!response.ok) {
        throw new Error('업로드에 실패했습니다.');
      }

      showToast('success', '업로드가 완료되었습니다.');
      fetchLogs();
    } catch (error) {
      console.error('Error uploading:', error);
      showToast('destructive', error instanceof Error ? error.message : '업로드에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">채널 업로드</h1>
      
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <Label htmlFor="channel">채널 선택</Label>
          <select
            id="channel"
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">채널을 선택하세요</option>
            {channels.map((channel) => (
              <option key={channel.channel_name} value={channel.channel_name}>
                {channel.channel_name}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? '업로드 중...' : '업로드'}
        </Button>
      </form>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">업로드 이력</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th className="px-4 py-2">날짜</th>
                <th className="px-4 py-2">채널</th>
                <th className="px-4 py-2">상품 ID</th>
                <th className="px-4 py-2">채널 상품 ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={index} className="border-t">
                  <td className="px-4 py-2">{log.date}</td>
                  <td className="px-4 py-2">{log.channel_name}</td>
                  <td className="px-4 py-2">{log.product_id}</td>
                  <td className="px-4 py-2">{log.channel_product_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <Toast variant={toast.type}>
          {toast.type === 'success' ? '성공' : '오류'}: {toast.message}
        </Toast>
      )}
    </div>
  );
}
