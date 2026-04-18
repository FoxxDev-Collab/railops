"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { AdminProduct } from "@/lib/stripe-admin";

interface ProductsPricesProps {
  products: AdminProduct[];
  proPriceId: string | null;
  seatPriceId: string | null;
  error?: string;
  livemode: boolean;
}

export function ProductsPrices({
  products,
  proPriceId,
  seatPriceId,
  error,
  livemode,
}: ProductsPricesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copy(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  }

  if (error) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Products & Prices</CardTitle>
          <CardDescription className="text-amber-700">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const stripeBase = `https://dashboard.stripe.com/${livemode ? "" : "test/"}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Products & Prices</CardTitle>
        <CardDescription>
          Stripe catalog. Price IDs configured in Admin Settings are annotated below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No products found in Stripe.
          </p>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="rounded-md border border-border">
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={product.active ? "default" : "secondary"} className="text-[10px] font-normal">
                      {product.active ? "active" : "archived"}
                    </Badge>
                    <a
                      href={`${stripeBase}products/${product.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      title="Open product in Stripe"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {product.prices.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No prices</p>
                  ) : (
                    product.prices.map((price) => {
                      const usedAs =
                        price.id === proPriceId
                          ? "Pro"
                          : price.id === seatPriceId
                            ? "Seat"
                            : null;
                      return (
                        <div key={price.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                          <span className="min-w-[120px] text-xs">
                            {price.nickname ?? <span className="text-muted-foreground">(unnamed)</span>}
                          </span>
                          <span className="tabular-nums">
                            ${price.unitAmount.toFixed(2)} {price.currency.toUpperCase()}
                            {price.interval ? ` / ${price.interval}` : ""}
                          </span>
                          {usedAs && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              Used as {usedAs}
                            </Badge>
                          )}
                          {!price.active && (
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              archived
                            </Badge>
                          )}
                          <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                            {price.id}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => copy(price.id)}
                            title="Copy price ID"
                          >
                            {copiedId === price.id ? (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
