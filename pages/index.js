import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';

const INITIAL_FORM = {
  projectName: '',
  assignedToId: '',
  assignedToName: '',
  description: '',
};

const colors = {
  brown: '#8b5e3b',
  brownSoft: '#906645',
  pink: '#ff7380',
  pinkSoft: '#fbdce6',
  pinkPale: '#fff6f6',
  blue: '#c7eaf9',
  blueDeep: '#2f5363',
  white: '#ffffff',
  border: '#f2a5a3',
};

export default function Home() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const bubbleLayerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const response = await fetch('/api/slack/users');
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load Slack users');
        if (!cancelled) setUsers(data.users || []);
      } catch (error) {
        if (!cancelled) setUsersError(error.message);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    }

    loadUsers();
    return () => { cancelled = true; };
  }, []);

  const assignableUsers = useMemo(() => {
    const matches = users.filter(user => /alex|neel|uma/i.test(`${user.name} ${user.username}`));
    return matches.length ? matches : users;
  }, [users]);

  useEffect(() => {
    const layer = bubbleLayerRef.current;
    if (!layer) return undefined;

    let pointerDown = false;
    let animationFrame;
    let lastFrame = performance.now();
    const bubbles = [];
    const lifetime = 5000;
    const maxBubbles = 70;

    const createBubble = (x, y) => {
      const size = 10 + Math.random() * 24;
      const bubble = document.createElement('span');
      bubble.style.position = 'fixed';
      bubble.style.left = `${x - size}px`;
      bubble.style.top = `${y - size}px`;
      bubble.style.width = `${size * 2}px`;
      bubble.style.height = `${size * 2}px`;
      bubble.style.borderRadius = '50%';
      bubble.style.pointerEvents = 'none';
      bubble.style.opacity = '0.75';
      bubble.style.background = 'radial-gradient(circle at 30% 28%, #ffffff 0 12%, #b1e0f9 48%, #c7eaf9 72%, rgba(255, 255, 255, 0.25) 100%)';
      bubble.style.border = '1px solid rgba(139, 94, 59, 0.18)';
      bubble.style.boxShadow = 'inset -3px -4px 8px rgba(120, 214, 240, 0.28), 0 2px 8px rgba(139, 94, 59, 0.12)';
      layer.appendChild(bubble);

      bubbles.push({
        element: bubble,
        size,
        remaining: lifetime,
        x,
        y,
        velocityX: (Math.random() - 0.5) * 0.04,
        velocityY: 0,
      });

      while (bubbles.length > maxBubbles) bubbles.shift()?.element.remove();
    };

    const onPointerDown = () => { pointerDown = true; };
    const onPointerUp = () => { pointerDown = false; };
    const onPointerMove = event => {
      if (pointerDown) createBubble(event.clientX, event.clientY);
    };

    const animate = now => {
      const delta = Math.min(now - lastFrame, 50);
      lastFrame = now;

      for (let index = bubbles.length - 1; index >= 0; index -= 1) {
        const bubble = bubbles[index];
        bubble.remaining -= delta;
        bubble.velocityY += 0.0025 * delta;
        bubble.velocityX -= bubble.velocityX * 0.001 * bubble.size * delta;
        bubble.velocityY -= bubble.velocityY * 0.001 * bubble.size * delta;
        bubble.x += bubble.velocityX * delta;
        bubble.y -= bubble.velocityY * delta;
        bubble.element.style.left = `${bubble.x - bubble.size}px`;
        bubble.element.style.top = `${bubble.y - bubble.size}px`;
        bubble.element.style.opacity = `${0.7 * Math.max(bubble.remaining / lifetime, 0)}`;

        if (bubble.remaining <= 0) {
          bubble.element.remove();
          bubbles.splice(index, 1);
        }
      }

      animationFrame = requestAnimationFrame(animate);
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    animationFrame = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      cancelAnimationFrame(animationFrame);
      bubbles.forEach(bubble => bubble.element.remove());
    };
  }, []);

  const updateForm = (event) => {
    const { name, value } = event.target;
    if (name === 'assignedToId') {
      const selected = users.find(user => user.userId === value);
      setForm(previous => ({
        ...previous,
        assignedToId: value,
        assignedToName: selected?.name || '',
      }));
      return;
    }
    setForm(previous => ({ ...previous, [name]: value }));
  };

  const submitRequest = async event => {
    event.preventDefault();
    if (!form.projectName.trim() || !form.assignedToId || !form.description.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/quotation/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to create quotation request');
      setSuccess(data);
      setForm(INITIAL_FORM);
    } catch (error) {
      window.alert(`Unable to submit request: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldStyle = {
    width: '100%',
    padding: '12px 14px',
    background: colors.pinkPale,
    border: `1px solid ${colors.border}`,
    borderRadius: '10px',
    color: colors.brown,
    fontSize: '15px',
    fontWeight: '500',
  };

  return (
    <>
      <Head>
        <title>KSC Quotation App</title>
        <meta name="description" content="Create quotation requests for Kawaii Slime Company projects and collect proposal details from Alex or Neel." />
      </Head>

      <main style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #fbdce6 0%, #c7eaf9 100%)', color: colors.brown, padding: '26px 16px 48px' }}>
        <div ref={bubbleLayerRef} aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10, overflow: 'hidden' }} />
        <div style={{ maxWidth: '760px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <header style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img className="ksc-logo" src="/logo.png" alt="Kawaii Slime Company" style={{ display: 'block', width: '152px', height: '152px', objectFit: 'contain', margin: '0 auto 8px' }} />
            <h1 className="ksc-title" style={{ margin: 0, color: colors.brown, fontSize: '34px', fontWeight: '700' }}>KSC Quotation App</h1>
            <p style={{ margin: '6px 0 0', color: colors.brownSoft, fontSize: '15px', fontWeight: '600' }}>
              Project quotation requests, proposals, and approvals ✨
            </p>
          </header>

          <div style={{ background: 'rgba(255, 255, 255, 0.86)', border: `1px solid ${colors.border}`, borderRadius: '14px', padding: '12px 16px', marginBottom: '18px', textAlign: 'center', color: colors.blueDeep, fontSize: '14px', fontWeight: '600' }}>
            April Request Form → Monday.com → Alex, Neel, or Uma Proposal Form 💬
          </div>

          {usersError && (
            <div style={{ background: colors.pink, color: colors.white, borderRadius: '10px', padding: '12px 14px', marginBottom: '18px', fontWeight: '600' }}>
              Slack users could not be loaded: {usersError}
            </div>
          )}

          {success ? (
            <section className="ksc-card" style={{ background: colors.white, border: `1px solid ${colors.border}`, borderRadius: '14px', padding: '40px 24px', textAlign: 'center', boxShadow: '0 10px 30px rgba(139, 94, 59, 0.12)' }}>
              <div style={{ fontSize: '52px', marginBottom: '10px' }}>🎉</div>
              <h2 style={{ margin: '0 0 12px', color: colors.brown }}>Request Created!</h2>
              <p style={{ margin: '0 0 8px', color: colors.brownSoft }}>The project was added to Monday.com.</p>
              <p style={{ margin: '0 0 22px', color: colors.blueDeep }}>A proposal form link was sent to the selected team member in #flow-test.</p>
              <p style={{ margin: '0 0 24px', fontWeight: '700' }}>Monday Project ID: {success.projectId}</p>
              <button type="button" onClick={() => setSuccess(null)} style={{ padding: '11px 24px', border: 0, borderRadius: '10px', background: colors.pink, color: colors.white, cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
                Create another request
              </button>
            </section>
          ) : (
            <section className="ksc-card" style={{ background: colors.white, border: `1px solid ${colors.border}`, borderRadius: '14px', padding: '26px', boxShadow: '0 10px 30px rgba(139, 94, 59, 0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ display: 'grid', placeItems: 'center', width: '38px', height: '38px', borderRadius: '50%', background: colors.blue, fontSize: '20px' }}>📝</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '22px', color: colors.brown }}>April Request Form</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: colors.brownSoft }}>Create a new project quotation request.</p>
                </div>
              </div>

              <form onSubmit={submitRequest}>
                <label htmlFor="projectName" style={{ display: 'block', marginBottom: '7px', fontWeight: '700' }}>Project Name *</label>
                <input id="projectName" name="projectName" value={form.projectName} onChange={updateForm} placeholder="Enter the project name" style={{ ...fieldStyle, marginBottom: '18px' }} required />

                <label htmlFor="assignedToId" style={{ display: 'block', marginBottom: '7px', fontWeight: '700' }}>Assign Proposal To *</label>
                <select id="assignedToId" name="assignedToId" value={form.assignedToId} onChange={updateForm} disabled={usersLoading || assignableUsers.length === 0} style={{ ...fieldStyle, marginBottom: '18px', appearance: 'auto' }} required>
                  <option value="">{usersLoading ? 'Loading team members...' : 'Select Alex, Neel, or Uma'}</option>
                  {assignableUsers.map(user => <option key={user.userId} value={user.userId}>{user.name}</option>)}
                </select>

                <label htmlFor="description" style={{ display: 'block', marginBottom: '7px', fontWeight: '700' }}>Project Description *</label>
                <textarea id="description" name="description" value={form.description} onChange={updateForm} placeholder="Describe the project, requirements, and expected deliverables" rows={7} style={{ ...fieldStyle, resize: 'vertical', marginBottom: '22px' }} required />

                <div style={{ background: colors.pinkPale, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '12px 14px', marginBottom: '22px', color: colors.brownSoft, fontSize: '13px' }}>
                  The selected person will receive the project details and a secure proposal form link in Slack. 🔗
                </div>

                <button type="submit" disabled={submitting || usersLoading || !form.assignedToId} style={{ width: '100%', padding: '13px 20px', border: 0, borderRadius: '10px', background: submitting ? '#c2c2c2' : colors.pink, color: colors.white, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: '700' }}>
                  {submitting ? 'Creating Request...' : 'Create Quotation Request 🚀'}
                </button>
              </form>
            </section>
          )}

          <p style={{ textAlign: 'center', color: colors.brownSoft, fontSize: '12px', marginTop: '18px', fontWeight: '600' }}>
            Alex, Neel, and Uma can complete the proposal form from their unique Slack link.
          </p>
        </div>
      </main>
    </>
  );
}
