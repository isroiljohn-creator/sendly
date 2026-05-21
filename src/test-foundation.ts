import jwt from "jsonwebtoken";
import http from "http";
import app from "./app";
import { env } from "./config/env";

async function main() {
  console.log("Running foundation validation tests...");
  
  // Start server on temporary port
  const port = 4001;
  const server = app.listen(port);
  console.log(`Test server started on port ${port}`);

  try {
    // Helper to perform HTTP request
    const request = (path: string, token?: string): Promise<{ status: number; data: any }> => {
      return new Promise((resolve, reject) => {
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const req = http.request(
          {
            host: "localhost",
            port,
            path,
            method: "GET",
            headers,
          },
          (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
              try {
                resolve({
                  status: res.statusCode || 0,
                  data: JSON.parse(body),
                });
              } catch (e) {
                resolve({
                  status: res.statusCode || 0,
                  data: body,
                });
              }
            });
          }
        );
        req.on("error", reject);
        req.end();
      });
    };

    // Test 1: Public route
    const t1 = await request("/");
    if (t1.status !== 200 || t1.data.status !== "healthy") {
      throw new Error(`Test 1 Failed: Public route returned status ${t1.status} instead of 200.`);
    }
    console.log("✅ Test 1: Public health check route passed.");

    // Test 2: Protected route without authorization header
    const t2 = await request("/api/protected");
    if (t2.status !== 401 || !t2.data.error.includes("missing")) {
      throw new Error(`Test 2 Failed: Expected 401 (missing header), got ${t2.status}.`);
    }
    console.log("✅ Test 2: Protected route missing auth header rejected with 401.");

    // Test 3: Protected route with invalid bearer token
    const t3 = await request("/api/protected", "invalid_token_value_here");
    if (t3.status !== 401 || !t3.data.error.includes("Invalid")) {
      throw new Error(`Test 3 Failed: Expected 401 (invalid token), got ${t3.status}.`);
    }
    console.log("✅ Test 3: Protected route invalid token rejected with 401.");

    // Test 4: Protected route with valid bearer token
    const userId = "b328a6f2-bfd1-417d-8153-f725a397cd9a";
    const validToken = jwt.sign({ user_id: userId }, env.JWT_SECRET, { expiresIn: "1h" });
    const t4 = await request("/api/protected", validToken);
    if (t4.status !== 200 || t4.data.user_id !== userId) {
      throw new Error(`Test 4 Failed: Expected 200 and user_id matching ${userId}, got ${t4.status} and ${JSON.stringify(t4.data)}.`);
    }
    console.log("✅ Test 4: Protected route with valid token returned 200 and matched user_id.");

    console.log("\n🎉 All foundation tests passed successfully!");
    server.close(() => {
      console.log("Test server stopped.");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Foundation test validation failed:", error);
    server.close(() => {
      process.exit(1);
    });
  }
}

main();
