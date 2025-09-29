// Debug script to check what date data we're getting from Stripe webhooks

// This simulates what we expect to receive from Stripe
const simulateCheckoutEvent = {
  id: 'cs_test_...',
  customer: 'cus_T8zeLAkbu7w54r',
  subscription: 'sub_1SChfGDEKVIZZyJVs...',
  customer_email: 'info@narrin.ai',
  metadata: {
    user_email: 'info@narrin.ai',
    plan_name: 'premium'
  }
};

const simulateSubscriptionEvent = {
  id: 'sub_1SChfGDEKVIZZyJVs...',
  customer: 'cus_T8zeLAkbu7w54r',
  status: 'active',
  current_period_start: 1727622000, // Example timestamp
  current_period_end: 1730300400,   // Example timestamp
  metadata: {
    user_email: 'info@narrin.ai',
    plan_name: 'premium'
  }
};

console.log('=== DEBUGGING DATE HANDLING ===');

// Test checkout session date handling
console.log('\n🔄 CHECKOUT SESSION DATES:');
const checkoutStartDate = new Date().toISOString().split('T')[0];
const checkoutEndDate = (() => {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  return endDate.toISOString().split('T')[0];
})();

console.log('plan_start_date (checkout):', checkoutStartDate);
console.log('plan_end_date (checkout fallback):', checkoutEndDate);

// Test subscription date handling
console.log('\n🔄 SUBSCRIPTION DATES:');
if (simulateSubscriptionEvent.current_period_start) {
  const subStartDate = new Date(simulateSubscriptionEvent.current_period_start * 1000).toISOString().split('T')[0];
  console.log('plan_start_date (subscription):', subStartDate);
  console.log('Raw current_period_start:', simulateSubscriptionEvent.current_period_start);
  console.log('Converted start date:', new Date(simulateSubscriptionEvent.current_period_start * 1000));
}

if (simulateSubscriptionEvent.current_period_end) {
  const subEndDate = new Date(simulateSubscriptionEvent.current_period_end * 1000).toISOString().split('T')[0];
  console.log('plan_end_date (subscription):', subEndDate);
  console.log('Raw current_period_end:', simulateSubscriptionEvent.current_period_end);
  console.log('Converted end date:', new Date(simulateSubscriptionEvent.current_period_end * 1000));
}

console.log('\n=== WHAT TO CHECK IN STRIPE ===');
console.log('1. Go to Stripe Dashboard → Developers → Webhooks');
console.log('2. Click your webhook endpoint');
console.log('3. Find the latest customer.subscription.updated event');
console.log('4. Look for these fields in the subscription object:');
console.log('   - current_period_start: [timestamp number]');
console.log('   - current_period_end: [timestamp number]');
console.log('5. If these fields are missing or null, that\'s the problem!');