import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog"
import { Input } from "@/app/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"
import { v4 as uuidv4 } from 'uuid';

interface DividerRule {
  id: string
  range: [number, number]
  color: string
  text: string
}

interface DividerModalProps {
  showDividerModal: boolean
  setShowDividerModal: (show: boolean) => void
  products: any[]
  dividerRules: DividerRule[]
  onUpdateDividerRule: (id: string, field: keyof DividerRule, value: any) => void
  onApplyDivider: (rules: DividerRule[]) => void
  onResetDividerRules: () => Promise<void>
}

export function DividerModal({
  showDividerModal,
  setShowDividerModal,
  products,
  dividerRules,
  onUpdateDividerRule,
  onApplyDivider,
  onResetDividerRules,
}: DividerModalProps) {

  // 범위 변경 핸들러
  const handleRangeChange = (ruleId: string, isStart: boolean, value: number, currentRule: DividerRule) => {
    console.log('=== 구분자 범위 변경 ===');
    console.log('변경 전 범위:', currentRule.range);
    console.log('변경 정보:', {
      구분자ID: ruleId,
      변경위치: isStart ? '시작' : '끝',
      변경값: value
    });
    
    const newRange = isStart 
      ? [value, currentRule.range[1]] 
      : [currentRule.range[0], value];
    
    onUpdateDividerRule(ruleId, 'range', newRange);
    console.log('변경 후 범위:', newRange);
  };

  // 색상 변경 핸들러
  const handleColorChange = (ruleId: string, value: string, currentRule: DividerRule) => {
    console.log('=== 구분자 색상 변경 ===');
    console.log('변경 전 색상:', currentRule.color);
    console.log('새로운 색상:', value);
    
    onUpdateDividerRule(ruleId, 'color', value);
  };

  // 텍스트 변경 핸들러
  const handleTextChange = (ruleId: string, value: string, currentRule: DividerRule) => {
    console.log('=== 구분자 텍스트 변경 ===');
    console.log('변경 전 텍스트:', currentRule.text);
    console.log('새로운 텍스트:', value);
    
    onUpdateDividerRule(ruleId, 'text', value);
  };

  // 적용 핸들러
  const handleApplyDivider = () => {
    console.log('=== 구분자 적용 시작 ===');
    console.log('전체 상품 수:', products.length);
    
    dividerRules.forEach((rule, index) => {
      console.log(`구분자 ${index + 1} 설정:`, {
        범위: `${rule.range[0]}~${rule.range[1]}`,
        색상: rule.color,
        텍스트: rule.text || '없음',
        적용될상품수: products.filter((_, i) => 
          i + 1 >= rule.range[0] && i + 1 <= rule.range[1]
        ).length
      });
    });

    onApplyDivider(dividerRules);
    console.log('=== 구분자 적용 완료 ===');
    setShowDividerModal(false);
  };
 
  // 초기화 핸들러
  const handleResetDividerRules = async () => {
    try {
      console.log('=== 구분자 초기화 시작 ===');
      console.log('현재 구분자 규칙:', dividerRules);
      
      const defaultRules = [
        { id: uuidv4(), range: [0, 0] as [number, number], color: '#fef9c3', text: '' },
        { id: uuidv4(), range: [0, 0] as [number, number], color: '#d1fae5', text: '' },
        { id: uuidv4(), range: [0, 0] as [number, number], color: '#dbeafe', text: '' }
      ];
      
      // 각 규칙 업데이트
      for (const rule of defaultRules) {
        await onUpdateDividerRule(rule.id, 'range', rule.range);
        await onUpdateDividerRule(rule.id, 'color', rule.color);
        await onUpdateDividerRule(rule.id, 'text', rule.text);
      }
      
      console.log('초기화 후 규칙:', defaultRules);
      console.log('=== 구분자 초기화 완료 ===');
      
      // 부모 컴포넌트의 초기화 함수 호출 (파이어스토어 업데이트 포함)
      await onResetDividerRules();
    } catch (error) {
      console.error('구분자 초기화 중 오류 발생:', error);
      alert('구분자 초기화 중 오류가 발생했습니다.');
    }
  };

  return (
    <Dialog open={showDividerModal} onOpenChange={(open) => {
      console.log('모달 상태 변경:', open ? '열림' : '닫힘');
      setShowDividerModal(open);
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>구분자 설정</DialogTitle>
          <DialogDescription>
            행 범위별로 구분자를 설정합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {dividerRules.map((rule, index) => (
            <div key={rule.id} className="flex flex-col gap-4 p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">구분자 {index + 1}</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1"> 
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={rule.range[0]}
                      onChange={(e) => handleRangeChange(rule.id, true, Number(e.target.value), rule)}
                      min={0}
                      max={products.length}
                      className="w-[70px]"
                      placeholder="시작"
                    />
                    <span className="text-muted-foreground">~</span>
                    <Input
                      type="number"
                      value={rule.range[1]}
                      onChange={(e) => handleRangeChange(rule.id, false, Number(e.target.value), rule)}
                      min={0}
                      max={products.length}
                      className="w-[70px]"
                      placeholder="끝"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2"> 
                  <Select
                    value={rule.color || (index === 0 ? '#fef9c3' : index === 1 ? '#d1fae5' : '#dbeafe')}
                    onValueChange={(value) => handleColorChange(rule.id, value, rule)}
                  >
                    <SelectTrigger className="w-[70px] h-10">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: rule.color || (index === 0 ? '#fef9c3' : index === 1 ? '#d1fae5' : '#dbeafe') }}
                          />
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="#fef9c3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#fef9c3]" />
                        </div>
                      </SelectItem>
                      <SelectItem value="#d1fae5">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#d1fae5]" />
                        </div>
                      </SelectItem>
                      <SelectItem value="#dbeafe">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#dbeafe]" />
                        </div>
                      </SelectItem>
                      <SelectItem value="#fee2e2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#fee2e2]" />
                        </div>
                      </SelectItem>
                      <SelectItem value="#f3e8ff">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#f3e8ff]" />
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div> 
                <div className="flex flex-col gap-2"> 
                  <Input
                    value={rule.text}
                    onChange={(e) => handleTextChange(rule.id, e.target.value, rule)}
                    placeholder="구분자 텍스트 입력" 
                    className="w-[245px]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleResetDividerRules}>초기화</Button>
          <Button onClick={handleApplyDivider}>적용</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}