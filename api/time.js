export default function handler(req, res) {
  res.status(200).json({
    now: Temporal.Now.instant().epochMilliseconds
  });
}
