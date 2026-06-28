// JWT is stateless — logout is handled client-side by deleting the token from localStorage.
// This endpoint exists for completeness and future token blacklisting if needed.
export async function POST() {
  return Response.json({ message: 'Sesión cerrada' });
}
