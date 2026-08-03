export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  
  if (!publicKey) {
    return res.status(500).json({ error: 'VAPID public key not configured on server' });
  }

  res.status(200).json({ publicKey });
}
