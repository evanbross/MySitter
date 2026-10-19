/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

const OUTPUT_SIZE = 400;

async function cropToBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/jpeg", 0.92);
  });
}

export function AvatarCropDialog({ imageSrc, onConfirm, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);

  const onCropComplete = useCallback((_: Area, pixelCrop: Area) => {
    setCroppedArea(pixelCrop);
  }, []);

  async function handleApply() {
    if (!croppedArea) return;
    setApplying(true);
    try {
      const blob = await cropToBlob(imageSrc, croppedArea);
      onConfirm(blob);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crop photo</DialogTitle>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-md bg-slate-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-1 px-1">
          <label className="text-xs font-medium text-slate-600">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-slate-900"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={applying}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply} disabled={applying || !croppedArea}>
            {applying ? "Applying…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
