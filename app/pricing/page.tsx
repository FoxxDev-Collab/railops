import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Check, ArrowRight, HelpCircle } from "lucide-react";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { getPricingConfig } from "@/app/actions/admin/pricing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — RailOps",
  description:
    "Simple, honest pricing for model railroad operations. Start free, upgrade when you outgrow the limits.",
};

export default async function PricingPage() {
  const { hobbyist, operator, club } = await getPricingConfig();

  const faqs = [
    {
      q: "Can I really use RailOps for free?",
      a: "Yes. The Hobbyist tier is free forever — no credit card required. You get one railroad with up to 25 of each resource type, waybill generation, operating sessions, and maintenance tracking.",
    },
    {
      q: "What happens when I hit the free tier limits?",
      a: "You'll see a notice when you approach the cap. Nothing gets deleted — you just can't add new items until you upgrade or remove existing ones.",
    },
    {
      q: "How does Club pricing work?",
      a: `Club includes 5 crew seats. The base price is $${club.price}/month. Additional seats beyond the included 5 are $${club.crewSeatPrice || "5"}/month each. The owner seat is always included.`,
    },
    {
      q: "Can I switch plans anytime?",
      a: "Absolutely. Upgrade, downgrade, or cancel at any time. No annual contracts, no lock-in. If you downgrade and exceed the lower tier's limits, you keep your data but can't add new items.",
    },
    {
      q: "Do crew members need their own accounts?",
      a: "Yes. Each crew member signs up with their own email. The railroad owner or an admin invites them via email or shareable link, and they get role-based access (Dispatcher, Yardmaster, Conductor, or a custom role).",
    },
    {
      q: "Is my data safe?",
      a: "Your data lives on Neon Postgres with automatic backups. All traffic is encrypted in transit. We never share or sell your data.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "4rem 4rem",
            }}
          />
          <div className="container relative mx-auto px-4 py-20 sm:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-8 flex items-center justify-center gap-3">
                <div className="h-px flex-1 max-w-16 bg-border" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Pricing
                </span>
                <div className="h-px flex-1 max-w-16 bg-border" />
              </div>
              <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
                Simple, Honest Pricing
              </h1>
              <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Start free, upgrade when you outgrow the limits. No tricks, no
                annual lock-in, cancel anytime.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="border-b border-border bg-muted/40 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <div className="grid gap-6 md:grid-cols-3">
                {/* Hobbyist */}
                <Card className="relative flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xl">{hobbyist.name}</CardTitle>
                    <CardDescription>{hobbyist.description}</CardDescription>
                    <div className="pt-4">
                      <span className="text-5xl font-extrabold tracking-tight text-foreground">
                        ${hobbyist.price}
                      </span>
                      <span className="ml-1 text-muted-foreground">
                        /month
                      </span>
                    </div>
                    <p className="pt-1 text-xs font-medium text-muted-foreground">
                      Free forever — no credit card
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="flex-1 space-y-3">
                      {hobbyist.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      variant="outline"
                      className="mt-8 w-full"
                      size="lg"
                    >
                      <Link href="/auth/signup">Get Started Free</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Operator */}
                <Card className="relative flex flex-col border-primary shadow-lg">
                  <div className="absolute -top-3 left-6">
                    <Badge className="px-3 py-1 text-xs font-semibold">
                      Most Popular
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl">{operator.name}</CardTitle>
                    <CardDescription>{operator.description}</CardDescription>
                    <div className="pt-4">
                      <span className="text-5xl font-extrabold tracking-tight text-foreground">
                        ${operator.price}
                      </span>
                      <span className="ml-1 text-muted-foreground">
                        /month
                      </span>
                    </div>
                    <p className="pt-1 text-xs font-medium text-muted-foreground">
                      Per railroad owner
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="flex-1 space-y-3">
                      {operator.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button asChild className="mt-8 w-full" size="lg">
                      <Link href="/auth/signup">
                        Start Free, Upgrade Later
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Club */}
                <Card className="relative flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xl">{club.name}</CardTitle>
                    <CardDescription>{club.description}</CardDescription>
                    <div className="pt-4">
                      <span className="text-5xl font-extrabold tracking-tight text-foreground">
                        ${club.price}
                      </span>
                      <span className="ml-1 text-muted-foreground">
                        /month
                      </span>
                    </div>
                    <p className="pt-1 text-xs font-medium text-muted-foreground">
                      Includes 5 crew seats
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="flex-1 space-y-3">
                      {club.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      variant="outline"
                      className="mt-8 w-full"
                      size="lg"
                    >
                      <Link href="/auth/signup">Get Started Free</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                All plans start on the free tier. Upgrade or downgrade at any
                time.{" "}
                <span className="font-medium text-foreground">
                  Club pricing: ${operator.price} operator + $
                  {club.crewSeatPrice || "5"}/seat &times; included crew = $
                  {club.price}/mo
                </span>
                . Additional seats are ${club.crewSeatPrice || "5"}/mo each.
              </p>
            </div>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="border-b border-border py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <div className="mb-12 text-center">
                <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground">
                  Compare Plans
                </h2>
                <p className="text-muted-foreground">
                  See exactly what you get at each tier.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-4 pr-4 text-left font-semibold text-foreground">
                        Feature
                      </th>
                      <th className="px-4 py-4 text-center font-semibold text-foreground">
                        {hobbyist.name}
                      </th>
                      <th className="px-4 py-4 text-center font-semibold text-primary">
                        {operator.name}
                      </th>
                      <th className="px-4 py-4 text-center font-semibold text-foreground">
                        {club.name}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <ComparisonRow
                      feature="Railroads"
                      hobbyist="1"
                      operator="Unlimited"
                      club="Unlimited"
                    />
                    <ComparisonRow
                      feature="Locations"
                      hobbyist="25"
                      operator="Unlimited"
                      club="Unlimited"
                    />
                    <ComparisonRow
                      feature="Locomotives"
                      hobbyist="25"
                      operator="Unlimited"
                      club="Unlimited"
                    />
                    <ComparisonRow
                      feature="Freight Cars"
                      hobbyist="25"
                      operator="Unlimited"
                      club="Unlimited"
                    />
                    <ComparisonRow
                      feature="Trains"
                      hobbyist="25"
                      operator="Unlimited"
                      club="Unlimited"
                    />
                    <ComparisonRow
                      feature="Waybill Generation"
                      hobbyist={true}
                      operator={true}
                      club={true}
                    />
                    <ComparisonRow
                      feature="Operating Sessions"
                      hobbyist={true}
                      operator={true}
                      club={true}
                    />
                    <ComparisonRow
                      feature="Maintenance Tracking"
                      hobbyist={true}
                      operator={true}
                      club={true}
                    />
                    <ComparisonRow
                      feature="Print Switch Lists"
                      hobbyist={false}
                      operator={true}
                      club={true}
                    />
                    <ComparisonRow
                      feature="CSV Import / Export"
                      hobbyist={false}
                      operator={true}
                      club={true}
                    />
                    <ComparisonRow
                      feature="Priority Support"
                      hobbyist={false}
                      operator={true}
                      club={true}
                    />
                    <ComparisonRow
                      feature="Crew Seats"
                      hobbyist="—"
                      operator="—"
                      club="5 included"
                    />
                    <ComparisonRow
                      feature="Role-Based Access"
                      hobbyist={false}
                      operator={false}
                      club={true}
                    />
                    <ComparisonRow
                      feature="Custom Roles"
                      hobbyist={false}
                      operator={false}
                      club={true}
                    />
                    <ComparisonRow
                      feature="Shared Sessions"
                      hobbyist={false}
                      operator={false}
                      club={true}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-border bg-muted/40 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl">
              <div className="mb-12 text-center">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary shadow-sm">
                  <HelpCircle className="h-5 w-5 text-primary-foreground" />
                </div>
                <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground">
                  Frequently Asked Questions
                </h2>
              </div>

              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div
                    key={faq.q}
                    className="rounded-lg border border-border bg-card p-6"
                  >
                    <h3 className="mb-2 text-base font-bold text-card-foreground">
                      {faq.q}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-12 text-center shadow-xl">
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-card-foreground">
                Ready to Roll?
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Start with the free tier — no credit card, no time limit. Upgrade
                when your railroad demands it.
              </p>
              <Button
                size="lg"
                asChild
                className="h-14 px-10 text-base font-semibold shadow-xl"
              >
                <Link href="/auth/signup">
                  Create Your Railroad
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function ComparisonRow({
  feature,
  hobbyist,
  operator,
  club,
}: {
  feature: string;
  hobbyist: boolean | string;
  operator: boolean | string;
  club: boolean | string;
}) {
  function renderCell(value: boolean | string) {
    if (typeof value === "string") {
      return (
        <span className="text-sm font-medium text-foreground">{value}</span>
      );
    }
    return value ? (
      <Check className="mx-auto h-4 w-4 text-primary" />
    ) : (
      <span className="text-muted-foreground/40">—</span>
    );
  }

  return (
    <tr>
      <td className="py-3.5 pr-4 text-foreground">{feature}</td>
      <td className="px-4 py-3.5 text-center">{renderCell(hobbyist)}</td>
      <td className="px-4 py-3.5 text-center">{renderCell(operator)}</td>
      <td className="px-4 py-3.5 text-center">{renderCell(club)}</td>
    </tr>
  );
}
