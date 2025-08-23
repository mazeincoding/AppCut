"use client";

import { useState } from "react";
import { TransitionUpIcon } from "./icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import {
  exportWaitlistSchema,
  type ExportWaitlistInput,
  type ExportWaitlistResponse,
} from "@/lib/schemas/waitlist";
import { cn } from "@/lib/utils";

export function ExportButton() {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const handleExport = () => {
    setIsExportDialogOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className="flex items-center gap-1.5 bg-[#38BDF8] text-white rounded-md px-[0.12rem] py-[0.12rem] cursor-pointer hover:brightness-95 transition-all duration-200"
        onClick={handleExport}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleExport();
          }
        }}
      >
        <div className="flex items-center gap-1.5 bg-linear-270 from-[#2567EC] to-[#37B6F7] rounded-[0.8rem] px-4 py-1 relative shadow-[0_1px_3px_0px_rgba(0,0,0,0.65)]">
          <TransitionUpIcon className="z-50" />
          <span className="text-[0.875rem] z-50">Export (soon)</span>
          <div className="absolute w-full h-full left-0 top-0 bg-linear-to-t from-white/0 to-white/50 z-10 rounded-[0.8rem] flex items-center justify-center">
            <div className="absolute w-[calc(100%-2px)] h-[calc(100%-2px)] top-[0.08rem] bg-linear-270 from-[#2567EC] to-[#37B6F7] z-50 rounded-[0.8rem]"></div>
          </div>
        </div>
      </button>
      <ExportDialog
        isOpen={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
      />
    </>
  );
}

function ExportDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<ExportWaitlistInput>({ defaultValues: { email: "" } });
  const { isSubmitting } = form.formState;
  const [serverMessage, setServerMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const onSubmit = form.handleSubmit(async (values) => {
    const parsed = exportWaitlistSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const fieldName =
          (issue.path[0] as keyof ExportWaitlistInput) || "email";
        form.setError(fieldName, { type: "zod", message: issue.message });
      }
      return;
    }
    setServerMessage(null);
    const { email } = parsed.data;
    const response = await fetch("/api/waitlist/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      setServerMessage({
        text: "Something went wrong. Please try again.",
        type: "error",
      });
      return;
    }
    const data: ExportWaitlistResponse = await response.json();
    if (data.success && data.alreadySubscribed) {
      setServerMessage({
        text: "You're already on the list.",
        type: "success",
      });
      return;
    }
    if (data.success) {
      setServerMessage({
        text: "You're on the list. We'll email you when it's ready.",
        type: "success",
      });
      form.reset();
      return;
    }
    setServerMessage({
      text: "Couldn't add your email. Please try again.",
      type: "error",
    });
  });
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-6">
        <DialogHeader>
          <DialogTitle>Export Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <DialogDescription>
            Export isn't ready yet. we're building a custom pipeline to make it
            great.
          </DialogDescription>
          <Form {...form}>
            <form className="flex flex-col gap-5" onSubmit={onSubmit}>
              <div className="flex flex-col gap-4 w-full">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          inputMode="email"
                          autoComplete="email"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        We'll let you know once export is ready.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Notify me"}
                </Button>
              </div>
              {serverMessage ? (
                <p
                  role="status"
                  aria-live="polite"
                  className={cn(
                    "text-xs",
                    serverMessage.type === "success"
                      ? "text-green-600"
                      : "text-red-600"
                  )}
                >
                  {serverMessage.text}
                </p>
              ) : null}
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
