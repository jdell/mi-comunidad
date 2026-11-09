import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { Prisma } from "@/generated/prisma/client";
import { handleCheckoutCompleted, handleInvoicePaid, handleInvoicePaymentFailed, syncSubscription } from "@/lib/billing";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    // Signature verification needs the raw body.
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  // Idempotency: Stripe may deliver the same event more than once.
  try {
    await db.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw err;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, event.id);
        break;
      case "customer.subscription.updated":
        await syncSubscription(event.data.object, event.id);
        break;
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object, event.id, { deleted: true });
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object, event.id);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object, event.id);
        break;
      default:
        break;
    }
  } catch (err) {
    // Let Stripe retry: forget the event so the retry is processed.
    await db.stripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    console.error("[stripe] webhook handler failed", event.type, err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
