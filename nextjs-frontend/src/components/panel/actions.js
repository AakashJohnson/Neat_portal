'use client';
// GET impersonate/take/{user} → laravel-impersonate, then redirect to '/'.
export async function impersonate(panel, router, userId) {
  const res = await fetch('/api/panel/impersonate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: userId }) });
  if (res.ok) {
    await panel.refresh();
    router.push('/panel');
  }
}
