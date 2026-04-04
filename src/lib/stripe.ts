import Stripe from "stripe";
import { stripeEnv } from "@/lib/env";

const stripe = new Stripe(stripeEnv().STRIPE_SECRET_KEY, {
  typescript: true,
});

export default stripe;
