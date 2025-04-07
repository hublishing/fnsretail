import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

interface ExcelSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: {
    includeImage: boolean
    includeUrl: boolean
    includeCost: boolean
    includeDiscount: boolean
  }
  onSettingsChange: (settings: {
    includeImage: boolean
    includeUrl: boolean
    includeCost: boolean
    includeDiscount: boolean
  }) => void
}

export function ExcelSettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange
}: ExcelSettingsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background">
        <DialogHeader>
          <DialogTitle>엑셀 다운로드 설정</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="includeImage" className="text-foreground">이미지 포함</Label>
            <Switch
              id="includeImage"
              checked={settings.includeImage}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, includeImage: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="includeUrl" className="text-foreground">URL 포함</Label>
            <Switch
              id="includeUrl"
              checked={settings.includeUrl}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, includeUrl: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="includeCost" className="text-foreground">원가 포함</Label>
            <Switch
              id="includeCost"
              checked={settings.includeCost}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, includeCost: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="includeDiscount" className="text-foreground">할인 정보 포함</Label>
            <Switch
              id="includeDiscount"
              checked={settings.includeDiscount}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, includeDiscount: checked })}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>확인</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 