"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { useTranslation } from "react-i18next";

interface OnboardingProps {
	isOpen: boolean;
	onClose: () => void;
}

	const { t } = useTranslation("common");
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("onboarding_welcome", "Welcome to Clipture")}</DialogTitle>
					<DialogDescription>
						{t("onboarding_description", "Let's get you started with the basics.")}
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
