import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function RenameProjectDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  projectName,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
  projectName: string;
}) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(projectName);

  // Reset the name when dialog opens - this is better UX than syncing with every prop change
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName(projectName);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('renameProject')}</DialogTitle>
          <DialogDescription>
            {t('renameProjectDesc')}
          </DialogDescription>
        </DialogHeader>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onConfirm(name);
            }
          }}
          placeholder={t('enterNewName')}
          className="mt-4"
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenChange(false);
            }}
          >
            {tCommon('cancel')}
          </Button>
          <Button onClick={() => onConfirm(name)}>{t('rename')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
