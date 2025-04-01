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
  onApplyDivider: (rules: DividerRule[]) => void
}

export function DividerModal({
  showDividerModal,
  setShowDividerModal,
  products,
  onApplyDivider,
}: DividerModalProps) {
  const [dividerRules, setDividerRules] = useState<DividerRule[]>([
    {
      id: "1",
      range: [0, 0],
      color: "#FFE4E1",
      text: "",
    },
  ])

  const handleUpdateDividerRule = (
    id: string,
    field: keyof DividerRule,
    value: any
  ) => {
    setDividerRules((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, [field]: value } : rule
      )
    )
  }

  const handleResetDividerRules = () => {
    setDividerRules([
      {
        id: "1",
        range: [0, 0],
        color: "#FFE4E1",
        text: "",
      },
    ])
  }

  const handleApplyDivider = () => {
    onApplyDivider(dividerRules)
    setShowDividerModal(false)
  }

  return (
    <Dialog open={showDividerModal} onOpenChange={setShowDividerModal}>
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
                      onChange={(e) => handleUpdateDividerRule(rule.id, 'range', [Number(e.target.value), rule.range[1]])}
                      min={0}
                      max={products.length}
                      className="w-[70px]"
                      placeholder="시작"
                    />
                    <span className="text-muted-foreground">~</span>
                    <Input
                      type="number"
                      value={rule.range[1]}
                      onChange={(e) => handleUpdateDividerRule(rule.id, 'range', [rule.range[0], Number(e.target.value)])}
                      min={0}
                      max={products.length}
                      className="w-[70px]"
                      placeholder="끝"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2"> 
                  <Select
                    value={rule.color || '#FFE4E1'}
                    onValueChange={(value) => handleUpdateDividerRule(rule.id, 'color', value)}
                  >
                    <SelectTrigger className="w-[70px] h-10">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: rule.color || '#FFE4E1' }}
                          />
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="#FFE4E1">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#FFE4E1]" />
                        </div>
                      </SelectItem>
                      <SelectItem value="#E6E6FA">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#E6E6FA]" />
                        </div>
                      </SelectItem>
                      <SelectItem value="#F0FFF0">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#F0FFF0]" />
                        </div>
                      </SelectItem>
                      <SelectItem value="#FFF0F5">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#FFF0F5]" />
                        </div>
                      </SelectItem>
                      <SelectItem value="#F0FFFF">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#F0FFFF]" />
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div> 
                <div className="flex flex-col gap-2"> 
                  <Input
                    value={rule.text}
                    onChange={(e) => handleUpdateDividerRule(rule.id, 'text', e.target.value)}
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
  )
}