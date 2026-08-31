import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const colors = {
  brown: '#8b5e3b',
  brownSoft: '#906645',
  pink: '#ff7380',
  pinkSoft: '#fbdce6',
  pinkPale: '#fff6f6',
  blue: '#c7eaf9',
  white: '#ffffff',
  border: '#f2a5a3',
};

const initialForm = {
  estimatedHours: '',
  quotation: '',
  deadlineDate: '',
  decisionStatus: 'Pending',
  decisionDate: '',
  projectStatus: 'Not Started',
};

export default function ProposalForm() {
  const router = useRouter();
  const { token } = router.query;
  const [project, setProject] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [pdf, setPdf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || typeof token !== 'string') return;

    fetch(`/api/quotation/proposal/${encodeURIComponent(token)}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Unable to load proposal');
        }
        setProject(data.project);
      })
      .catch(loadError => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [token]);

  const updateForm = event => {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: value }));
  };

  const submitProposal = async event => {
    event.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError('');

    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (pdf) data.append('proposalPdf', pdf);

      const response = await fetch(
        `/api/quotation/proposal/${encodeURIComponent(token)}`,
        { method: 'POST', body: data }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Unable to submit proposal');
      }

      setSuccess(true);
    } catch (submitError) {
      setError(submitError.message);
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
        <title>KSC Proposal Form</title>
      </Head>

      <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fbdce6 0%, #c7eaf9 100%)', color: colors.brown, padding: '26px 16px 48px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <header style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src="/logo.png" alt="Kawaii Slime Company" style={{ display: 'block', width: '140px', height: '140px', objectFit: 'contain', margin: '0 auto 8px' }} />
            <h1 style={{ margin: 0, color: colors.brown, fontSize: '32px' }}>KSC Proposal Form</h1>
            <p style={{ margin: '6px 0 0', color: colors.brownSoft, fontWeight: '600' }}>Project estimate and proposal details ✨</p>
          </header>

          {loading && <section style={{ background: colors.white, borderRadius: '14px', padding: '30px', textAlign: 'center' }}>Loading project details...</section>}

          {!loading && error && !project && <section style={{ background: colors.white, borderRadius: '14px', padding: '30px', textAlign: 'center', color: colors.pink }}>{error}</section>}

          {!loading && project && !success && (
            <>
              <section style={{ background: colors.white, border: `1px solid ${colors.border}`, borderRadius: '14px', padding: '20px', marginBottom: '18px', boxShadow: '0 10px 30px rgba(139, 94, 59, 0.10)' }}>
                <h2 style={{ margin: '0 0 12px', color: colors.brown, fontSize: '20px' }}>Project Details</h2>
                <div style={{ display: 'grid', gap: '7px', color: colors.brownSoft }}>
                  <div><strong>Project Name:</strong> {project.name}</div>
                  <div><strong>Project ID:</strong> {project.id}</div>
                  <div><strong>Assigned To:</strong> {project.assignedTo}</div>
                </div>
              </section>

              <section style={{ background: colors.white, border: `1px solid ${colors.border}`, borderRadius: '14px', padding: '26px', boxShadow: '0 10px 30px rgba(139, 94, 59, 0.12)' }}>
                <h2 style={{ margin: '0 0 20px', color: colors.brown, fontSize: '22px' }}>Proposal Details</h2>

                <form onSubmit={submitProposal}>
                  <label htmlFor="estimatedHours" style={{ display: 'block', marginBottom: '7px', fontWeight: '700' }}>Estimated Hours *</label>
                  <input id="estimatedHours" name="estimatedHours" type="number" min="0" step="0.5" value={form.estimatedHours} onChange={updateForm} placeholder="e.g. 24" style={{ ...fieldStyle, marginBottom: '18px' }} required />

                  <label htmlFor="quotation" style={{ display: 'block', marginBottom: '7px', fontWeight: '700' }}>Quotation</label>
                  <textarea id="quotation" name="quotation" rows={5} value={form.quotation} onChange={updateForm} placeholder="Enter quotation details..." style={{ ...fieldStyle, minHeight: '120px', resize: 'vertical', marginBottom: '18px' }} />

                  <label htmlFor="deadlineDate" style={{ display: 'block', marginBottom: '7px', fontWeight: '700' }}>Deadline Date *</label>
                  <input id="deadlineDate" name="deadlineDate" type="date" value={form.deadlineDate} onChange={updateForm} style={{ ...fieldStyle, marginBottom: '18px' }} required />

                  <label htmlFor="proposalPdf" style={{ display: 'block', marginBottom: '7px', fontWeight: '700' }}>Proposal PDF</label>
                  <input id="proposalPdf" type="file" accept="application/pdf,.pdf" onChange={event => setPdf(event.target.files?.[0] || null)} style={{ ...fieldStyle, marginBottom: '18px' }} />
                  {pdf && <p style={{ margin: '-8px 0 18px', fontSize: '13px', color: colors.brownSoft }}>Selected: {pdf.name}</p>}

                  <label htmlFor="decisionStatus" style={{ display: 'block', marginBottom: '7px', fontWeight: '700' }}>Decision Status *</label>
                  <select id="decisionStatus" name="decisionStatus" value={form.decisionStatus} onChange={updateForm} style={{ ...fieldStyle, marginBottom: '18px', appearance: 'auto' }} required>
                    <option>Pending</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                  </select>

                  <label htmlFor="decisionDate" style={{ display: 'block', marginBottom: '7px', fontWeight: '700' }}>Decision Date *</label>
                  <input id="decisionDate" name="decisionDate" type="date" value={form.decisionDate} onChange={updateForm} style={{ ...fieldStyle, marginBottom: '18px' }} required />

                  <label htmlFor="projectStatus" style={{ display: 'block', marginBottom: '7px', fontWeight: '700' }}>Project Status *</label>
                  <select id="projectStatus" name="projectStatus" value={form.projectStatus} onChange={updateForm} style={{ ...fieldStyle, marginBottom: '22px', appearance: 'auto' }} required>
                    <option>Not Started</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                    <option>On Hold</option>
                  </select>

                  {error && <div style={{ background: colors.pinkSoft, color: colors.pink, borderRadius: '10px', padding: '12px 14px', marginBottom: '18px', fontWeight: '700' }}>{error}</div>}

                  <button type="submit" disabled={submitting} style={{ width: '100%', padding: '13px 20px', border: 0, borderRadius: '10px', background: submitting ? '#c2c2c2' : colors.pink, color: colors.white, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: '700' }}>
                    {submitting ? 'Submitting Proposal...' : 'Submit Proposal ✅'}
                  </button>
                </form>
              </section>
            </>
          )}

          {success && (
            <section style={{ background: colors.white, border: `1px solid ${colors.border}`, borderRadius: '14px', padding: '42px 24px', textAlign: 'center', boxShadow: '0 10px 30px rgba(139, 94, 59, 0.12)' }}>
              <div style={{ fontSize: '52px' }}>🎉</div>
              <h2 style={{ margin: '10px 0 12px', color: colors.brown }}>Proposal Submitted!</h2>
              <p style={{ margin: 0, color: colors.brownSoft }}>The proposal details and PDF have been saved to Monday.com.</p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
