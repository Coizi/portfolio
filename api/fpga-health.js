export default async function handler(req, res) {
  const BRIDGE = process.env.FPGA_BRIDGE_URL ?? "http://localhost:8000";
  try {
    const r = await fetch(`${BRIDGE}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await r.json();
    res.status(200).json(data);
  } catch {
    res.status(503).json({ status: "unreachable", fpga_connected: false });
  }
}
