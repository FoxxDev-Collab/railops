"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pencil, Save, X, Plus, Trash2 } from "lucide-react";
import { updatePricingTier, type PricingTier, type PricingConfig } from "@/app/actions/admin/pricing";
import { toast } from "sonner";

interface PricingManagerProps {
  initialConfig: PricingConfig;
}

type TierKey = "free" | "pro";

function TierEditor({
  tierKey,
  tier,
  highlighted,
}: {
  tierKey: TierKey;
  tier: PricingTier;
  highlighted?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(tier.name);
  const [price, setPrice] = useState(tier.price);
  const [description, setDescription] = useState(tier.description);
  const [features, setFeatures] = useState<string[]>(tier.features);
  const [crewSeatPrice, setCrewSeatPrice] = useState(tier.crewSeatPrice || "");
  const [newFeature, setNewFeature] = useState("");

  function reset() {
    setName(tier.name);
    setPrice(tier.price);
    setDescription(tier.description);
    setFeatures(tier.features);
    setCrewSeatPrice(tier.crewSeatPrice || "");
    setNewFeature("");
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data: PricingTier = { name, price, description, features };
      if (tierKey === "pro") data.crewSeatPrice = crewSeatPrice;
      const result = await updatePricingTier(tierKey, data);
      if (result.success) {
        toast.success(`${name} tier updated`);
        setEditing(false);
      }
    } catch {
      toast.error("Failed to save pricing");
    } finally {
      setSaving(false);
    }
  }

  function addFeature() {
    const trimmed = newFeature.trim();
    if (!trimmed) return;
    setFeatures([...features, trimmed]);
    setNewFeature("");
  }

  function removeFeature(idx: number) {
    setFeatures(features.filter((_, i) => i !== idx));
  }

  return (
    <Card className={highlighted ? "border-primary" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">
              {editing ? (
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xl font-bold"
                />
              ) : (
                <>
                  {tier.name}
                  {highlighted && (
                    <Badge className="ml-2 text-[10px]">Most Popular</Badge>
                  )}
                </>
              )}
            </CardTitle>
            {!editing && (
              <CardDescription className="mt-1">
                {tier.description}
              </CardDescription>
            )}
          </div>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={saving}
              >
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="mr-1 h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price */}
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Price ($/month)
          </Label>
          {editing ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg font-bold">$</span>
              <Input
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-9 w-24"
              />
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
          ) : (
            <p className="mt-1 text-2xl font-extrabold">
              ${tier.price}
              <span className="text-sm font-normal text-muted-foreground">
                /month
              </span>
            </p>
          )}
        </div>

        {/* Description */}
        {editing && (
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
        )}

        {/* Crew seat price (Club only) */}
        {tierKey === "pro" && (
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Additional Crew Seat Price ($/month)
            </Label>
            {editing ? (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-bold">$</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={crewSeatPrice}
                  onChange={(e) => setCrewSeatPrice(e.target.value)}
                  className="h-9 w-24"
                />
                <span className="text-sm text-muted-foreground">/seat/month</span>
              </div>
            ) : (
              <p className="mt-1 text-sm">
                <span className="font-semibold">${tier.crewSeatPrice || "5"}</span>
                <span className="text-muted-foreground"> per additional seat/month</span>
              </p>
            )}
          </div>
        )}

        {/* Features */}
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Features
          </Label>
          <ul className="mt-2 space-y-1.5">
            {(editing ? features : tier.features).map((f, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 text-sm"
              >
                <span className="h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                {editing ? (
                  <>
                    <Input
                      value={f}
                      onChange={(e) => {
                        const updated = [...features];
                        updated[idx] = e.target.value;
                        setFeatures(updated);
                      }}
                      className="h-7 flex-1 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => removeFeature(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <span>{f}</span>
                )}
              </li>
            ))}
          </ul>
          {editing && (
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Add feature..."
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                className="h-8 flex-1 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={addFeature}
                disabled={!newFeature.trim()}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PricingManager({ initialConfig }: PricingManagerProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TierEditor tierKey="free" tier={initialConfig.free} />
      <TierEditor tierKey="pro" tier={initialConfig.pro} highlighted />
    </div>
  );
}
