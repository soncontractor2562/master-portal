import webPush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

// Read from .env manually
import { readFileSync } from 'fs';
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key) envVars[key.trim()] = val.join('=').trim();
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

console.log('VAPID Public Key:', vapidPublicKey ? vapidPublicKey.substring(0, 20) + '...' : 'MISSING');
console.log('VAPID Private Key:', vapidPrivateKey ? 'SET (' + vapidPrivateKey.length + ' chars)' : 'MISSING');
console.log('Supabase URL:', supabaseUrl);

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('\n❌ VAPID keys are not set in environment variables!');
  console.error('These need to be set in Vercel environment variables:');
  console.error('  VITE_VAPID_PUBLIC_KEY');
  console.error('  VAPID_PRIVATE_KEY');
  console.error('\nThe push-broadcast API runs on Vercel, not locally.');
  console.error('\nLet me test the API endpoint directly instead...');
}

// Test: call the deployed Vercel API directly
console.log('\n--- Testing deployed API endpoint ---');
const testPayload = {
  title: '🔧 ทดสอบระบบ Push',
  message: 'ทดสอบว่า Push Notification ทำงานได้หรือไม่',
  url: '/apps/store-dragdrop/',
  targetRole: 'แอดมิน',
  targetUsername: 'admin'
};

try {
  const response = await fetch('https://master-portal-gilt.vercel.app/api/push-broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload)
  });
  const result = await response.json();
  console.log('API Response Status:', response.status);
  console.log('API Response Body:', JSON.stringify(result, null, 2));
} catch (err) {
  console.error('API call error:', err.message);
}
