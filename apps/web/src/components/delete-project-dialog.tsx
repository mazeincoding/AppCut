import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function DeleteProjectDialog({
	isOpen,
	onOpenChange,
	onConfirm,
	projectName,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	projectName?: string;
}) {
	const { t } = useTranslation("common");
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent
				onOpenAutoFocus={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
			>
				<DialogHeader>
					<DialogTitle>
						{projectName ? (
							<>
								{t("delete_project_with_name", "Delete '")}
								<span className="inline-block max-w-[300px] truncate align-bottom">
									{projectName}
								</span>
								{t("delete_project_question_mark", "'?")}
							</>
						) : (
							t("delete_project", "Delete Project?")
						)}
					</DialogTitle>
					<DialogDescription>
						{t("delete_project_confirm", "Are you sure you want to delete this project? This action cannot be undone.")}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onOpenChange(false);
						}}
					>
						{t("cancel", "Cancel")}
					</Button>
					<Button variant="destructive" onClick={onConfirm}>
						{t("delete", "Delete")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
