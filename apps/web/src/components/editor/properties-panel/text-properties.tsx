import { Textarea } from "@/components/ui/textarea";
import { FontPicker } from "@/components/ui/font-picker";
import { FontFamily } from "@/constants/font-constants";
import { TextElement } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FaAlignLeft, FaAlignCenter, FaAlignRight, FaBold, FaItalic, FaUnderline, FaStrikethrough } from "react-icons/fa";
import {
	PropertyItem,
	PropertyItemLabel,
	PropertyItemValue,
} from "./property-item";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { ChangeTextColorDialog } from "@/components/change-font-color-dialog";
import { useState } from "react";
import { ChangeTextBackgroundColorDialog } from "@/components/change-font-background-color-dialog";

export function TextProperties({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	const { updateTextElement } = useTimelineStore();
	const [isTextColorDialogOpen, setIsTextColorDialogOpen] = useState(false);
	const [isTextBackgroundDialogOpen, setIsTextBackgroundDialogOpen] = useState(false);

	return (
		<div className="space-y-6 p-5">
			<Textarea
				placeholder="Name"
				defaultValue={element.content}
				className="min-h-[4.5rem] resize-none bg-background/50"
				onChange={(e) =>
					updateTextElement(trackId, element.id, { content: e.target.value })
				}
			/>
			<PropertyItem direction="row">
				<PropertyItemLabel>Font</PropertyItemLabel>
				<PropertyItemValue>
					<FontPicker
						defaultValue={element.fontFamily}
						onValueChange={(value: FontFamily) =>
							updateTextElement(trackId, element.id, { fontFamily: value })
						}
					/>
				</PropertyItemValue>
			</PropertyItem>
			<PropertyItem direction="column">
				<PropertyItemLabel>Font size</PropertyItemLabel>
				<PropertyItemValue>
					<div className="flex items-center gap-2">
						<Slider
							defaultValue={[element.fontSize]}
							min={8}
							max={300}
							step={1}
							onValueChange={([value]) =>
								updateTextElement(trackId, element.id, { fontSize: value })
							}
							className="w-full"
						/>
						<Input
							type="number"
							value={element.fontSize}
							onChange={(e) =>
								updateTextElement(trackId, element.id, {
									fontSize: parseInt(e.target.value) || element.fontSize,
								})
							}
							className="w-12 !text-xs h-7 rounded-sm text-center
							[appearance:textfield]
							[&::-webkit-outer-spin-button]:appearance-none
							[&::-webkit-inner-spin-button]:appearance-none"
						/>
					</div>
				</PropertyItemValue>
			</PropertyItem>
			<PropertyItem direction="column">
				<PropertyItemLabel>Font Color</PropertyItemLabel>
				<PropertyItemValue>
					<div className="flex items-center gap-2">
						<div
							className="w-5 h-5 rounded-full border cursor-pointer"
							style={{ backgroundColor: element.color }}
							onClick={() => setIsTextColorDialogOpen(true)}
						/>
						<Input
							type="text"
							value={element.color}
							onChange={(e) => {
								const value = e.target.value;
								if (!value || /^#([0-9A-Fa-f]{3}){1,2}$/.test(value)) {
									updateTextElement(trackId, element.id, { color: value || element.color });
								}
							}
							}
							className="w-24 !text-xs h-7 rounded-sm text-center"
						/>
						<ChangeTextColorDialog
							color={element.color}
							setColor={(color) =>
								updateTextElement(trackId, element.id, { color })
							}
							isOpen={isTextColorDialogOpen}
							onOpenChange={setIsTextColorDialogOpen}
						/>
					</div>
				</PropertyItemValue>
			</PropertyItem>
			<PropertyItem direction="column">
				<PropertyItemLabel>Font background color</PropertyItemLabel>
				<PropertyItemValue>
					<div className="flex items-center gap-2">
						<div
							className="w-5 h-5 rounded-full border cursor-pointer"
							style={{ backgroundColor: element.backgroundColor }}
							onClick={() => setIsTextBackgroundDialogOpen(true)}
						/>
						<Input
							type="text"
							value={element.backgroundColor}
							onChange={(e) => {
								const value = e.target.value.toLowerCase();
								if (!value || value === 'transparent' || /^#([0-9A-Fa-f]{3}){1,2}$/.test(value)) {
									updateTextElement(trackId, element.id, {
										backgroundColor: value || 'transparent'
									});
								}
							}
							}
							className="w-24 !text-xs h-7 rounded-sm text-center"
						/>
						<ChangeTextBackgroundColorDialog
							color={element.backgroundColor}
							setColor={(backgroundColor) =>
								updateTextElement(trackId, element.id, { backgroundColor })
							}
							isOpen={isTextBackgroundDialogOpen}
							onOpenChange={setIsTextBackgroundDialogOpen}
						/>
					</div>
				</PropertyItemValue>
			</PropertyItem>
			<PropertyItem direction="column">
				<PropertyItemLabel>Opacity</PropertyItemLabel>
				<PropertyItemValue>
					<div className="flex items-center gap-2">
						<Slider
							defaultValue={[element.opacity * 100]}
							min={0}
							max={100}
							step={1}
							onValueChange={([value]) =>
								updateTextElement(trackId, element.id, { opacity: value / 100 })
							}
							className="w-full"
						/>
						<Input
							type="number"
							value={Math.round(element.opacity * 100)}
							onChange={(e) =>
								updateTextElement(trackId, element.id, {
									opacity: parseFloat(e.target.value) / 100,
								})
							}
							className="w-16 !text-xs h-7 rounded-sm text-center
							[appearance:textfield]
							[&::-webkit-outer-spin-button]:appearance-none
							[&::-webkit-inner-spin-button]:appearance-none"
							step="1"
							min="0"
							max="100"
						/>
					</div>
				</PropertyItemValue>
			</PropertyItem>
			<PropertyItem direction="column">
				<PropertyItemLabel>Rotation</PropertyItemLabel>
				<PropertyItemValue>
					<div className="flex items-center gap-2">
						<Slider
							defaultValue={[element.rotation]}
							min={0}
							max={360}
							step={1}
							onValueChange={([value]) =>
								updateTextElement(trackId, element.id, { rotation: value })
							}
							className="w-full"
						/>
						<Input
							type="number"
							value={element.rotation}
							onChange={(e) =>
								updateTextElement(trackId, element.id, {
									rotation: parseInt(e.target.value),
								})
							}
							className="w-16 !text-xs h-7 rounded-sm text-center
							[appearance:textfield]
							[&::-webkit-outer-spin-button]:appearance-none
							[&::-webkit-inner-spin-button]:appearance-none"
						/>
					</div>
				</PropertyItemValue>
			</PropertyItem>
			<PropertyItem direction="column">
				<PropertyItemLabel>Position X</PropertyItemLabel>
				<PropertyItemValue>
					<div className="flex items-center gap-2">
						<Slider
							defaultValue={[element.x]}
							min={-1000}
							max={1000}
							step={1}
							onValueChange={([value]) =>
								updateTextElement(trackId, element.id, { x: value })
							}
							className="w-full"
						/>
						<Input
							type="number"
							value={element.x}
							onChange={(e) =>
								updateTextElement(trackId, element.id, {
									x: parseInt(e.target.value),
								})
							}
							className="w-16 !text-xs h-7 rounded-sm text-center
							[appearance:textfield]
							[&::-webkit-outer-spin-button]:appearance-none
							[&::-webkit-inner-spin-button]:appearance-none"
						/>
					</div>
				</PropertyItemValue>
			</PropertyItem>
			<PropertyItem direction="column">
				<PropertyItemLabel>Position Y</PropertyItemLabel>
				<PropertyItemValue>
					<div className="flex items-center gap-2">
						<Slider
							defaultValue={[element.y]}
							min={-1000}
							max={1000}
							step={1}
							onValueChange={([value]) =>
								updateTextElement(trackId, element.id, { y: value })
							}
							className="w-full"
						/>
						<Input
							type="number"
							value={element.y}
							onChange={(e) =>
								updateTextElement(trackId, element.id, {
									y: parseInt(e.target.value),
								})
							}
							className="w-16 !text-xs h-7 rounded-sm text-center
							[appearance:textfield]
							[&::-webkit-outer-spin-button]:appearance-none
							[&::-webkit-inner-spin-button]:appearance-none"
						/>
					</div>
				</PropertyItemValue>
			</PropertyItem>
			<PropertyItem direction="column">
				<PropertyItemLabel>Font Weight</PropertyItemLabel>
				<PropertyItemValue>
					<ToggleGroup
						type="multiple"
						value={element.fontWeight === "bold" ? ["bold"] : []}
						onValueChange={(value: ("normal" | "bold")[]) => {
							updateTextElement(trackId, element.id, { fontWeight: value.includes("bold") ? "bold" : "normal" });
						}}
						className="grid w-full grid-cols-1"
					>
						<ToggleGroupItem value="bold" aria-label="Bold">
							<FaBold className="h-4 w-4" />
						</ToggleGroupItem>
					</ToggleGroup>
				</PropertyItemValue>
			</PropertyItem>
			<PropertyItem direction="column">
				<PropertyItemLabel>Font Style</PropertyItemLabel>
				<PropertyItemValue>
					<ToggleGroup
						type="multiple"
						value={element.fontStyle === "italic" ? ["italic"] : []}
						onValueChange={(value: ("normal" | "italic")[]) => {
							updateTextElement(trackId, element.id, { fontStyle: value.includes("italic") ? "italic" : "normal" });
						}}
						className="grid w-full grid-cols-1"
					>
						<ToggleGroupItem value="italic" aria-label="Italic">
							<FaItalic className="h-4 w-4" />
						</ToggleGroupItem>
					</ToggleGroup>
				</PropertyItemValue>
			</PropertyItem>
			<PropertyItem direction="column">
				<PropertyItemLabel>Text Decoration</PropertyItemLabel>
				<PropertyItemValue>
					<ToggleGroup
						type="multiple"
						value={element.textDecoration === "underline" ? ["underline"] : element.textDecoration === "line-through" ? ["line-through"] : []}
						onValueChange={(value: ("underline" | "line-through" | "none")[]) => {
							if (value.length > 0) {
								updateTextElement(trackId, element.id, { textDecoration: value[0] });
							} else {
								updateTextElement(trackId, element.id, { textDecoration: "none" });
							}
						}}
						className="grid w-full grid-cols-2"
					>
						<ToggleGroupItem value="underline" aria-label="Underline">
							<FaUnderline className="h-4 w-4" />
						</ToggleGroupItem>
						<ToggleGroupItem value="line-through" aria-label="Strikethrough">
							<FaStrikethrough className="h-4 w-4" />
						</ToggleGroupItem>
					</ToggleGroup>
				</PropertyItemValue>
			</PropertyItem>
		</div>
	);
}