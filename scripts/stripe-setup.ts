// Creates (or reuses) the Stripe products and monthly EUR prices for the paid plans
// and prints the env vars to copy into .env / Vercel.
// Usage: STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-setup.ts
import "dotenv/config";
import Stripe from "stripe";
import { PLANS, type PlanId } from "../src/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const PAID: Exclude<PlanId, "GRATIS">[] = ["COMUNIDAD", "PRO", "ADMINISTRADOR"];

async function main() {
  for (const id of PAID) {
    const plan = PLANS[id];
    const lookupKey = `micomunidad_${id.toLowerCase()}_monthly_eur`;
    const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    let price = existing.data[0];
    if (!price) {
      const product = await stripe.products.create({
        name: `Mi Comunidad — ${plan.name}`,
        description: plan.tagline,
        metadata: { plan: id },
      });
      price = await stripe.prices.create({
        product: product.id,
        currency: "eur",
        unit_amount: plan.priceCents,
        recurring: { interval: "month" },
        tax_behavior: "exclusive",
        lookup_key: lookupKey,
        metadata: { plan: id },
      });
    }
    console.log(`STRIPE_PRICE_${id}=${price.id}`);
  }
  console.log("\nWebhook endpoint: <APP_URL>/api/webhooks/stripe");
  console.log("Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed, invoice.paid");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
