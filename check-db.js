const { createClient } = require("@supabase/supabase-js");

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables!");
    return;
  }

  console.log("Connecting to Supabase at:", supabaseUrl);
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("user_id, instagram_page_id, fb_field_mappings");

  if (error) {
    console.error("Error fetching data:", error);
    return;
  }

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
