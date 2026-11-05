import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/format";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function PricingTable() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PLAN_ORDER.map((id) => {
        const plan = PLANS[id];
        const featured = id === "COMUNIDAD";
        return (
          <Card key={id} className={cn("flex flex-col", featured && "border-primary ring-2 ring-primary/30")}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                {featured && <Badge>Más popular</Badge>}
              </div>
              <CardDescription>{plan.tagline}</CardDescription>
              <p className="pt-2">
                <span className="font-heading text-4xl font-semibold">
                  {formatCents(plan.priceCents, { round: true })}
                </span>
                <span className="text-muted-foreground"> /mes</span>
              </p>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2 text-sm">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant={featured ? "default" : "outline"} size="lg">
                <Link href="/login?next=/onboarding">
                  {plan.priceCents === 0 ? "Empezar gratis" : "Probar 14 días gratis"}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
