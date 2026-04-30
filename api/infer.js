export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const BRIDGE = process.env.FPGA_BRIDGE_URL ?? "http://localhost:8000";
  try {
    const upstream = await fetch(`${BRIDGE}/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(10000),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(503).json({ error: `Bridge unreachable: ${err.message}` });
  }
}
