import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Dispatch, SetStateAction } from "react";
import { HexColorPicker } from "react-colorful";

export function ChangeTextColorDialog({
    isOpen,
    onOpenChange,
    setColor,
    color,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    setColor: (color: string) => void;
    color?: string;
}) {

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent
                onOpenAutoFocus={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
                className="w-fit h-fit p-4"
            >
                <DialogHeader className="items-center space-y-2">
                    <DialogTitle className="text-md">
                       Change the color of the text
                    </DialogTitle>
                    <HexColorPicker color={color || '#000000'} onChange={(newColor) => setColor(newColor)}/>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}