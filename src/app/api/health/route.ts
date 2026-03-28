export function GET() {
  return Response.json({
    ok: true,
    phase: '01-foundation-auth',
    message: 'Karaí scaffold is up.',
  });
}
