import { MediaElement } from "@/types/timeline";
import { useTranslations } from "next-intl";

export function AudioProperties({ element }: { element: MediaElement }) {
  const t = useTranslations('editor.properties');
  
  return <div className="space-y-4 p-5">{t('audio')}</div>;
}