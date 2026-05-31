async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables!");
    return;
  }

  console.log("Connecting to Supabase REST API at:", supabaseUrl);
  
  const res = await fetch(`${supabaseUrl}/rest/v1/instagram_accounts?select=*`, {
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`
    }
  });

  if (!res.ok) {
    console.error("Error fetching data:", res.status, await res.text());
    return;
  }

  const data = await res.json();

  console.log(`Fetched ${data.length} rows:`);
  data.forEach((row, idx) => {
    console.log(`\n--- Row ${idx + 1} ---`);
    console.log("User ID:", row.user_id);
    console.log("Page ID:", row.instagram_page_id);
    if (row.fb_field_mappings) {
      console.log("Fields inside fb_field_mappings:");
      Object.keys(row.fb_field_mappings).forEach((key) => {
        let valSummary = "";
        try {
          const val = row.fb_field_mappings[key];
          if (typeof val === "string") {
            valSummary = val.slice(0, 100);
          } else {
            valSummary = JSON.stringify(val).slice(0, 100);
          }
        } catch(e) {}
        console.log(`  - ${key}: ${valSummary}...`);
      });
    } else {
      console.log("fb_field_mappings is empty");
    }
  });
}

main().catch(console.error);
