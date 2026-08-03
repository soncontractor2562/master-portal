import webPush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Setup VAPID keys
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';



export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, message, url } = req.body;

    try {
      webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    } catch (vErr) {
      console.error('VAPID setup error:', vErr);
      return res.status(500).json({ error: 'VAPID configuration error: ' + vErr.message });
    }

    let supabase;
    try {
      const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
      const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
      supabase = createClient(supabaseUrl, supabaseKey);
    } catch (dbInitErr) {
      return res.status(500).json({ error: 'Supabase Config Error: ' + dbInitErr.message });
    }

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // Fetch all subscriptions from Supabase
    const { data: subscriptions, error } = await supabase
      .from('store_push_subscriptions')
      .select('*');

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return res.status(500).json({ error: 'DB Error: ' + (error.message || JSON.stringify(error)) });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, message: 'No subscriptions found' });
    }

    const payload = JSON.stringify({
      title: title,
      body: message,
      url: url || '/'
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth
        }
      };

      try {
        await webPush.sendNotification(pushSubscription, payload);
      } catch (err) {
        console.error('Error sending push to endpoint:', sub.endpoint, err);
        if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 400 || err.statusCode === 403) {
          // Subscription has expired or invalid VAPID, delete it
          await supabase.from('store_push_subscriptions').delete().eq('id', sub.id);
        }
      }
    });

    await Promise.all(sendPromises);

    return res.status(200).json({ success: true, sentCount: subscriptions.length });
  } catch (error) {
    console.error('Push broadcast error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
