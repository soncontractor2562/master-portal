const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yloqjcojhvmaxfvsgpkh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3FqY29qaHZtYXhmdnNncGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MDg4NDAsImV4cCI6MjA5OTk4NDg0MH0.XfSGNW22xnwckpPjjNzz8UUha3RiUJRSWXn0M27n2sk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const locRes = await supabase.from('store_locations').select('*').limit(2);
  console.log("Locations:", locRes.data, locRes.error);
  
  const itemRes = await supabase.from('store_items').select('*').limit(2);
  console.log("Items:", itemRes.data, itemRes.error);
}

check();
