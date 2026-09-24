// ---------------------------------------------------------------------------
// Sending messages.
//
// Two channels at launch, chosen for what they cost and how fast they work:
//
//   Email (Resend)  — customers. Free to 3,000 a month. Needs a domain before
//                     it reaches inboxes rather than spam folders.
//   Telegram        — the owner. Free, instant, five minutes to set up.
//
// WhatsApp is deliberately absent. Its Business API needs Meta verification, an
// approved number and pre-approved templates, and costs money per conversation.
// The storefront links to a normal WhatsApp chat instead, which works today.
//
// Nothing here throws. A notification that fails must never take an order down
// with it — the money has already moved and the garment still needs making.
// ---------------------------------------------------------------------------

export interface EmailInput {
  to: string;
  subject: string;
  /** Plain text. Kept deliberately simple: it renders everywhere and never
   *  looks broken on a slow phone. */
  text: string;
}

export async function sendEmail(input: EmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_FROM_EMAIL;

  if (!apiKey || !from) {
    // Expected before a domain exists. Logged, not treated as a failure.
    console.info('email: not configured, skipping —', input.subject);
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
    });
    if (!response.ok) {
      console.error('email: provider returned', response.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('email: send failed', err);
    return false;
  }
}

export async function notifyOwner(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;

  if (!token || !chatId) {
    console.info('telegram: not configured, skipping');
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return response.ok;
  } catch (err) {
    console.error('telegram: send failed', err);
    return false;
  }
}

// --- Message bodies --------------------------------------------------------
//
// Written for someone spending a large sum on a garment they have only seen in
// photographs. Warm, specific, and never chatty.

export function orderConfirmationEmail(order: {
  reference: string;
  customerName: string;
  items: { designName: string }[];
  promisedDate: string;
  siteUrl: string;
}): EmailInput['text'] {
  const pieces = order.items.map((i) => `  · ${i.designName}`).join('\n');
  const due = new Date(order.promisedDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return `Dear ${order.customerName},

Thank you — we have your order.

${pieces}

Your reference is ${order.reference}.

What happens next
-----------------
One of our tailors will check the measurements you sent. If anything looks
wrong, we will message you before anything is cut — this is normal and it is
how we make sure the garment fits.

Once your measurements are confirmed, weaving begins. We expect your order to
be ready by ${due}.

You can follow it at any time:
${order.siteUrl}/order/${order.reference}

Taxes and any import duties are set by your own country and are not included in
the price.

Eyob Traditional Store
Addis Ababa`;
}

export function measurementChangeEmail(input: {
  reference: string;
  customerName: string;
  siteUrl: string;
}): EmailInput['text'] {
  return `Dear ${input.customerName},

Our tailor has looked at the measurements you sent for order ${input.reference}
and suggests a change.

Nothing is cut until you approve it. Please have a look — it takes a moment:

${input.siteUrl}/order/${input.reference}/measurements

If the change does not look right to you, reply to this message or send us a
note on WhatsApp and we will talk it through.

Eyob Traditional Store
Addis Ababa`;
}

export function orderReadyEmail(input: {
  reference: string;
  customerName: string;
  pickup: boolean;
  shopAddress: string;
  siteUrl: string;
}): EmailInput['text'] {
  return `Dear ${input.customerName},

Your order ${input.reference} is finished.

${input.pickup
    ? `You can collect it from us at:\n${input.shopAddress}`
    : 'It is on its way to you now.'}

${input.siteUrl}/order/${input.reference}

Eyob Traditional Store
Addis Ababa`;
}
