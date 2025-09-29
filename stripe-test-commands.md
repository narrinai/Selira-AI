# Stripe Test Commands

## Setup Stripe CLI
```bash
# Install Stripe CLI (if not installed)
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Listen to events and forward to local webhook
stripe listen --forward-to https://selira.ai/.netlify/functions/selira-stripe-webhook
```

## Send Test Events
```bash
# Test checkout session completed
stripe trigger checkout.session.completed

# Test subscription created
stripe trigger customer.subscription.created

# Test subscription updated
stripe trigger customer.subscription.updated

# Test payment succeeded
stripe trigger invoice.payment_succeeded
```

## Custom Test Event
```bash
# Send custom checkout.session.completed event
stripe events resend evt_EXAMPLE_EVENT_ID
```

Deze methoden sturen echte webhook events naar je endpoint zonder echte betalingen.