#!/usr/bin/env node
/**
 * Phase 7.3 End-to-End Smoke & Security Verification Script
 * Usage: node scripts/verify-e2e.mjs [baseUrl]
 */

const BASE_URL = (process.argv[2] || "http://localhost:3000").replace(/\/+$/, "");

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
    return true;
  } catch (err) {
    console.error(`FAIL  ${name}: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const results = [];

  results.push(
    await check("Public pages (/ , /login, /signup, /store, /store/track) render 200", async () => {
      for (const path of ["/", "/login", "/signup", "/store", "/store/track"]) {
        const res = await fetch(`${BASE_URL}${path}`);
        assert(res.status === 200, `${path} returned ${res.status}`);
      }
    })
  );

  results.push(
    await check("Auth bootstrap status API reports cleanly", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/signup`);
      assert(res.status === 200, `GET /api/auth/signup returned ${res.status}`);
      const json = await res.json();
      assert(json.success === true, "success !== true");
      assert(typeof json.isFirstSuperAdminAvailable === "boolean", "missing bootstrap boolean");
    })
  );

  results.push(
    await check("Signup rejects invalid short input cleanly without DB write", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "A", contact: "123", password: "123" }),
      });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
    })
  );

  results.push(
    await check("Protected dashboard routes enforce authentication redirect", async () => {
      for (const path of [
        "/dashboard/admin",
        "/dashboard/admin/users",
        "/dashboard/admin/ecommerce",
        "/dashboard/admin/revolving",
        "/dashboard/finance",
        "/dashboard/vet",
        "/dashboard/field",
      ]) {
        const res = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
        assert(
          res.status === 307 || res.status === 302 || res.status === 401,
          `${path} unexpectedly returned ${res.status} without session`
        );
      }
    })
  );

  results.push(
    await check("E-Commerce products API responds cleanly (or reports tableMissing before SQL)", async () => {
      const res = await fetch(`${BASE_URL}/api/ecommerce/products`);
      assert(res.status === 200, `GET /api/ecommerce/products returned ${res.status}`);
      const json = await res.json();
      assert(json.success === true && Array.isArray(json.products), "Invalid products response");
    })
  );

  results.push(
    await check("E-Commerce checkout rejects empty cart cleanly", async () => {
      const res = await fetch(`${BASE_URL}/api/ecommerce/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: "Test Buyer", customerPhone: "0788000000", items: [] }),
      });
      assert(res.status === 400 || res.status === 503, `Expected 400/503, got ${res.status}`);
    })
  );

  results.push(
    await check("Payment webhook rejects malformed payload cleanly", async () => {
      const res = await fetch(`${BASE_URL}/api/ecommerce/webhooks/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      assert(res.status === 400 || res.status === 401, `Expected 400/401, got ${res.status}`);
    })
  );

  results.push(
    await check("Finance CSV export requires authenticated finance role", async () => {
      const res = await fetch(`${BASE_URL}/api/finance/export`);
      assert(res.status === 401, `Expected 401 without login, got ${res.status}`);
    })
  );

  const passed = results.filter(Boolean).length;
  console.log(`\nVerification complete: ${passed}/${results.length} checks passed.`);
  if (passed !== results.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
