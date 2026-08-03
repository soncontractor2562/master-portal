import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yloqjcojhvmaxfvsgpkh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3FqY29qaHZtYXhmdnNncGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MDg4NDAsImV4cCI6MjA5OTk4NDg0MH0.XfSGNW22xnwckpPjjNzz8UUha3RiUJRSWXn0M27n2sk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching push subscriptions...');
  const { data, error } = await supabase.from('store_push_subscriptions').select('*');
  if (error) {
    console.error('Error fetching subscriptions:', error);
    return;
  }
  console.log(`Found ${data.length} subscriptions`);
  if (data.length > 0) {
    console.log(data.map(sub => ({ id: sub.id, username: sub.username, endpoint: sub.endpoint.substring(0, 50) + '...' })));
  }

  console.log('\nFetching admin users...');
  const { data: adminUsers, error: adminErr } = await supabase.from('store_users').select('username').or('role.eq.แอดมิน,role.eq.admin');
  if (adminErr) {
    console.error('Admin query error:', adminErr);
  } else {
    console.log('Admins found:', adminUsers.map(u => u.username));
  }
}
run();
