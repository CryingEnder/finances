"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  isConfirming?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  isConfirming = false,
}: ConfirmDialogProps) {
  const t = useTranslations("Common");
  const resolvedConfirm = confirmLabel ?? t("yes");
  const resolvedCancel = cancelLabel ?? t("cancel");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-zinc-800 border-zinc-700 text-white sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-zinc-300">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
          <Button
            type="button"
            disabled={isConfirming}
            onClick={() => {
              onOpenChange(false);
            }}
            className="cursor-pointer border-0 bg-red-600 text-white hover:bg-red-700"
          >
            {resolvedCancel}
          </Button>
          <Button
            type="button"
            disabled={isConfirming}
            onClick={() => {
              void onConfirm();
            }}
            className="cursor-pointer bg-green-600 text-white hover:bg-green-700"
          >
            {resolvedConfirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface NoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
  okLabel?: string;
}

export function NoticeDialog({
  open,
  onOpenChange,
  title,
  message,
  okLabel,
}: NoticeDialogProps) {
  const t = useTranslations("Common");
  const resolvedTitle = title ?? t("somethingWrong");
  const resolvedOk = okLabel ?? t("ok");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-zinc-800 border-zinc-700 text-white sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-white">{resolvedTitle}</DialogTitle>
          <DialogDescription className="text-zinc-300">
            {message}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
            }}
            className="cursor-pointer bg-green-600 text-white hover:bg-green-700"
          >
            {resolvedOk}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
