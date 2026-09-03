import { useEffect, useState } from 'react';

import {
  useRouter,
} from 'next/router';

import Head from 'next/head';

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

const initialForm = {
  estimatedHours: '',
  investment: '',
  deliverables: '',
  deliverableOutcome: '',
  deadlineDays: '',
};

export default function ProposalForm() {
  const router =
    useRouter();

  const {
    token,
  } = router.query;

  const [project, setProject] =
    useState(null);

  const [form, setForm] =
    useState(initialForm);

  const [pdf, setPdf] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (
      !token ||
      typeof token !== 'string'
    ) {
      return;
    }

    fetch(
      `/api/quotation/proposal/${encodeURIComponent(
        token
      )}`
    )
      .then(async response => {
        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              'Unable to load proposal'
          );
        }

        setProject(
          data.project
        );
      })
      .catch(loadError => {
        setError(
          loadError.message
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const updateForm =
    event => {
      const {
        name,
        value,
      } = event.target;

      setForm(previous => ({
        ...previous,
        [name]: value,
      }));
    };

  const submitProposal =
    async event => {
      event.preventDefault();

      if (!token) {
        return;
      }

      setSubmitting(true);
      setError('');

      try {
        const data =
          new FormData();

        Object.entries(form).forEach(
          ([key, value]) => {
            data.append(
              key,
              value
            );
          }
        );

        if (pdf) {
          data.append(
            'proposalPdf',
            pdf
          );
        }

        const response =
          await fetch(
            `/api/quotation/proposal/${encodeURIComponent(
              token
            )}`,
            {
              method: 'POST',
              body: data,
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
              'Unable to submit proposal'
          );
        }

        setSuccess(true);
      } catch (submitError) {
        setError(
          submitError.message
        );
      } finally {
        setSubmitting(false);
      }
    };

  const fieldStyle = {
    width: '100%',
    padding: '12px 14px',
    background:
      colors.pinkPale,
    border:
      `1px solid ${colors.border}`,
    borderRadius: '10px',
    color: colors.brown,
    fontSize: '15px',
    fontWeight: '500',
    boxSizing: 'border-box',
  };

  return (
    <>
      <Head>
        <title>
          KSC Proposal Request Form
        </title>

        <meta
          name="description"
          content="Complete the project proposal request for Kawaii Slime Company."
        />
      </Head>

      <main
        style={{
          minHeight: '100vh',
          background:
            'linear-gradient(135deg, #fbdce6 0%, #c7eaf9 100%)',
          color:
            colors.brown,
          padding:
            '26px 16px 48px',
        }}
      >
        <div
          style={{
            maxWidth:
              '760px',
            margin:
              '0 auto',
          }}
        >
          <header
            style={{
              textAlign:
                'center',
              marginBottom:
                '24px',
            }}
          >
            <img
              className="ksc-logo"
              src="/logo.png"
              alt="Kawaii Slime Company"
              style={{
                display:
                  'block',
                width:
                  '140px',
                height:
                  '140px',
                objectFit:
                  'contain',
                margin:
                  '0 auto 8px',
              }}
            />

            <h1
              className="ksc-title"
              style={{
                margin: 0,
                color:
                  colors.brown,
                fontSize:
                  '32px',
              }}
            >
              KSC Proposal Request Form
            </h1>

            <p
              style={{
                margin:
                  '6px 0 0',
                color:
                  colors.brownSoft,
                fontWeight:
                  '600',
              }}
            >
              Project proposal details ✨
            </p>
          </header>

          {loading && (
            <section
              style={{
                background:
                  colors.white,
                borderRadius:
                  '14px',
                padding:
                  '30px',
                textAlign:
                  'center',
              }}
            >
              Loading project details...
            </section>
          )}

          {!loading &&
            error &&
            !project && (
              <section
                style={{
                  background:
                    colors.white,
                  borderRadius:
                    '14px',
                  padding:
                    '30px',
                  textAlign:
                    'center',
                  color:
                    colors.pink,
                }}
              >
                {error}
              </section>
            )}

          {!loading &&
            project &&
            !success && (
              <>
                <section
                  style={{
                    background:
                      colors.white,
                    border:
                      `1px solid ${colors.border}`,
                    borderRadius:
                      '14px',
                    padding:
                      '20px',
                    marginBottom:
                      '18px',
                    boxShadow:
                      '0 10px 30px rgba(139, 94, 59, 0.10)',
                  }}
                >
                  <h2
                    style={{
                      margin:
                        '0 0 12px',
                      color:
                        colors.brown,
                      fontSize:
                        '20px',
                    }}
                  >
                    Project Details
                  </h2>

                  <div
                    style={{
                      display:
                        'grid',
                      gap:
                        '10px',
                      color:
                        colors.brownSoft,
                    }}
                  >
                    <div>
                      <strong>
                        Project Name:
                      </strong>{' '}
                      {project.name}
                    </div>

                    <div>
                      <strong>
                        Project ID:
                      </strong>{' '}
                      {project.id}
                    </div>

                    <div>
                      <strong>
                        Assigned To:
                      </strong>{' '}
                      {project.assignedTo}
                    </div>

                    <div>
                      <strong>
                        Project Objective:
                      </strong>

                      <div
                        style={{
                          marginTop:
                            '6px',
                          padding:
                            '12px 14px',
                          background:
                            colors.pinkPale,
                          border:
                            `1px solid ${colors.border}`,
                          borderRadius:
                            '10px',
                          whiteSpace:
                            'pre-wrap',
                          lineHeight:
                            '1.55',
                          color:
                            colors.brown,
                        }}
                      >
                        {project.description ||
                          'Not provided'}
                      </div>
                    </div>
                  </div>
                </section>

                <section
                  className="ksc-card"
                  style={{
                    background:
                      colors.white,
                    border:
                      `1px solid ${colors.border}`,
                    borderRadius:
                      '14px',
                    padding:
                      '26px',
                    boxShadow:
                      '0 10px 30px rgba(139, 94, 59, 0.12)',
                  }}
                >
                  <h2
                    style={{
                      margin:
                        '0 0 20px',
                      color:
                        colors.brown,
                      fontSize:
                        '22px',
                    }}
                  >
                    Proposal Details
                  </h2>

                  <form
                    onSubmit={
                      submitProposal
                    }
                  >
                    <label
                      htmlFor="estimatedHours"
                      style={{
                        display:
                          'block',
                        marginBottom:
                          '7px',
                        fontWeight:
                          '700',
                      }}
                    >
                      Estimated Hours *
                    </label>

                    <input
                      id="estimatedHours"
                      name="estimatedHours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={
                        form.estimatedHours
                      }
                      onChange={
                        updateForm
                      }
                      placeholder="e.g. 24"
                      style={{
                        ...fieldStyle,
                        marginBottom:
                          '18px',
                      }}
                      required
                    />

                    <label
                      htmlFor="investment"
                      style={{
                        display:
                          'block',
                        marginBottom:
                          '7px',
                        fontWeight:
                          '700',
                      }}
                    >
                      Investment
                    </label>

                    <textarea
                      id="investment"
                      name="investment"
                      rows={5}
                      value={
                        form.investment
                      }
                      onChange={
                        updateForm
                      }
                      placeholder="Enter investment details..."
                      style={{
                        ...fieldStyle,
                        minHeight:
                          '120px',
                        resize:
                          'vertical',
                        marginBottom:
                          '18px',
                        lineHeight:
                          '1.5',
                        fontFamily:
                          'inherit',
                      }}
                    />

                    <label
                      htmlFor="deliverables"
                      style={{
                        display:
                          'block',
                        marginBottom:
                          '7px',
                        fontWeight:
                          '700',
                      }}
                    >
                      Deliverables
                    </label>

                    <textarea
                      id="deliverables"
                      name="deliverables"
                      rows={4}
                      value={
                        form.deliverables
                      }
                      onChange={
                        updateForm
                      }
                      placeholder="List the project deliverables..."
                      style={{
                        ...fieldStyle,
                        minHeight:
                          '100px',
                        resize:
                          'vertical',
                        marginBottom:
                          '18px',
                        lineHeight:
                          '1.5',
                        fontFamily:
                          'inherit',
                      }}
                    />

                    <label
                      htmlFor="deliverableOutcome"
                      style={{
                        display:
                          'block',
                        marginBottom:
                          '7px',
                        fontWeight:
                          '700',
                      }}
                    >
                      Deliverable Outcome
                    </label>

                    <textarea
                      id="deliverableOutcome"
                      name="deliverableOutcome"
                      rows={4}
                      value={
                        form.deliverableOutcome
                      }
                      onChange={
                        updateForm
                      }
                      placeholder="Describe the expected outcome..."
                      style={{
                        ...fieldStyle,
                        minHeight:
                          '100px',
                        resize:
                          'vertical',
                        marginBottom:
                          '18px',
                        lineHeight:
                          '1.5',
                        fontFamily:
                          'inherit',
                      }}
                    />

                    <label
                      htmlFor="deadlineDays"
                      style={{
                        display:
                          'block',
                        marginBottom:
                          '7px',
                        fontWeight:
                          '700',
                      }}
                    >
                      Deadline (Days) *
                    </label>

                    <select
                      id="deadlineDays"
                      name="deadlineDays"
                      value={
                        form.deadlineDays
                      }
                      onChange={
                        updateForm
                      }
                      style={{
                        ...fieldStyle,
                        marginBottom:
                          '18px',
                        appearance:
                          'auto',
                      }}
                      required
                    >
                      <option value="">
                        Select deadline
                      </option>
                      {Array.from({ length: 30 }, (_, index) => index + 1).map(days => (
                        <option key={days} value={days}>
                          {days} {days === 1 ? 'day' : 'days'}
                        </option>
                      ))}
                    </select>

                    <label
                      htmlFor="proposalPdf"
                      style={{
                        display:
                          'block',
                        marginBottom:
                          '7px',
                        fontWeight:
                          '700',
                      }}
                    >
                      Proposal PDF
                    </label>

                    <input
                      id="proposalPdf"
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={
                        event =>
                          setPdf(
                            event.target
                              .files?.[0] ||
                              null
                          )
                      }
                      style={{
                        ...fieldStyle,
                        marginBottom:
                          '18px',
                      }}
                    />

                    {pdf && (
                      <p
                        style={{
                          margin:
                            '-8px 0 18px',
                          fontSize:
                            '13px',
                          color:
                            colors.brownSoft,
                        }}
                      >
                        Selected:{' '}
                        {pdf.name}
                      </p>
                    )}

                    {error && (
                      <div
                        style={{
                          background:
                            colors.pinkSoft,
                          color:
                            colors.pink,
                          borderRadius:
                            '10px',
                          padding:
                            '12px 14px',
                          marginBottom:
                            '18px',
                          fontWeight:
                            '700',
                        }}
                      >
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        submitting
                      }
                      style={{
                        width:
                          '100%',
                        padding:
                          '13px 20px',
                        border: 0,
                        borderRadius:
                          '10px',
                        background:
                          submitting
                            ? '#c2c2c2'
                            : colors.pink,
                        color:
                          colors.white,
                        cursor:
                          submitting
                            ? 'not-allowed'
                            : 'pointer',
                        fontSize:
                          '16px',
                        fontWeight:
                          '700',
                      }}
                    >
                      {submitting
                        ? 'Submitting Proposal...'
                        : 'Submit Proposal ✅'}
                    </button>
                  </form>
                </section>
              </>
            )}

          {success && (
            <section
              style={{
                background:
                  colors.white,
                border:
                  `1px solid ${colors.border}`,
                borderRadius:
                  '14px',
                padding:
                  '42px 24px',
                textAlign:
                  'center',
                boxShadow:
                  '0 10px 30px rgba(139, 94, 59, 0.12)',
              }}
            >
              <div
                style={{
                  fontSize:
                    '52px',
                }}
              >
                🎉
              </div>

              <h2
                style={{
                  margin:
                    '10px 0 12px',
                  color:
                    colors.brown,
                }}
              >
                Proposal Submitted!
              </h2>

              <p
                style={{
                  margin: 0,
                  color:
                    colors.brownSoft,
                }}
              >
                The proposal details
                and PDF have been
                submitted successfully.
              </p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
