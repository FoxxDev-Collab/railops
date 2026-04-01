"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadTrackPlanImage, removeTrackPlanImage } from "@/app/actions/track-plan";
import Image from "next/image";

interface ImageUploadProps {
  layoutId: string;
  currentImageUrl: string | null;
}

export function TrackPlanImageUpload({ layoutId, currentImageUrl }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImageUrl);

  const handleUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadTrackPlanImage(layoutId, formData);
      if (result.error) {
        toast.error(result.error);
      } else if (result.imageUrl) {
        setImageUrl(result.imageUrl);
        toast.success("Track plan uploaded");
      }
      setIsUploading(false);
    },
    [layoutId]
  );

  const handleRemove = async () => {
    const result = await removeTrackPlanImage(layoutId);
    if (result.error) {
      toast.error(result.error);
    } else {
      setImageUrl(null);
      toast.success("Track plan removed");
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  if (imageUrl) {
    return (
      <div className="space-y-3">
        <label className="text-sm font-medium">Track Plan</label>
        <div className="relative rounded-lg border overflow-hidden bg-muted/50">
          <Image
            src={imageUrl}
            alt="Track plan"
            width={800}
            height={400}
            className="w-full h-auto max-h-64 object-contain"
            unoptimized
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <label>
              <Button variant="secondary" size="sm" asChild>
                <span>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Replace
                </span>
              </Button>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={handleFileSelect}
              />
            </label>
            <Button variant="destructive" size="sm" onClick={handleRemove}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Track Plan</label>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <ImageIcon className="h-10 w-10 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">
            {isUploading ? "Uploading..." : "Drop your track plan image here"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PNG, JPG, or WebP up to 10MB
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={isUploading}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Browse Files
        </Button>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
      </label>
    </div>
  );
}
