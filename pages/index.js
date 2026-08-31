import { useEffect, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const response = await fetch('/api/slack/users');

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              'Unable to load Slack users'
          );
        }

        if (!cancelled) {
          setUsers(data.users || []);
        }
      } catch (error) {
        if (!cancelled) {
          setUsersError(error.message);
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateForm = event => {
    const {
      name,
      value,
    } = event.target;

    if (name === 'assignedToId') {
      const selectedUser =
        users.find(
          user =>
            user.userId === value
        );

      setForm(previous => ({
        ...previous,
        assignedToId: value,
        assignedToName:
          selectedUser?.name || '',
      }));

      return;
    }

    setForm(previous => ({
      ...previous,
      [name]: value,
    }));
  };

  const submitRequest = async event => {
    event.preventDefault();

    if (
      !form.projectName.trim() ||
      !form.assignedToId ||
      !form.description.trim()
    ) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        '/api/quotation/request',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(form),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            'Unable to create project request'
        );
      }

      setSuccess(data);

      setForm(INITIAL_FORM);
    } catch (error) {
      window.alert(
        `Unable to submit request: ${error.message}`
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
    border: `1px solid ${colors.border}`,
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
          KSC Project Request Form
        </title>

        <meta
          name="description"
          content="Create project requests for Kawaii Slime Company and send secure proposal forms to contractors."
        />
      </Head>

      <main
        style={{
          minHeight: '100vh',
          background:
            'linear-gradient(135deg, #fbdce6 0%, #c7eaf9 100%)',
          color: colors.brown,
          padding:
            '26px 16px 48px',
        }}
      >
        <div
          style={{
            maxWidth: '760px',
            margin: '0 auto',
          }}
        >
          <header
            style={{
              textAlign: 'center',
              marginBottom: '24px',
            }}
          >
            <img
              className="ksc-logo"
              src="/logo.png"
              alt="Kawaii Slime Company"
              style={{
                display: 'block',
                width: '152px',
                height: '152px',
                objectFit: 'contain',
                margin:
                  '0 auto 8px',
              }}
            />

            <h1
              className="ksc-title"
              style={{
                margin: 0,
                color: colors.brown,
                fontSize: '34px',
                fontWeight: '700',
              }}
            >
              KSC Project Request Form
            </h1>

            <p
              style={{
                margin: '6px 0 0',
                color:
                  colors.brownSoft,
                fontSize: '15px',
                fontWeight: '600',
              }}
            >
              Project requests, proposals,
              and project details ✨
            </p>
          </header>

          <div
            style={{
              background:
                'rgba(255, 255, 255, 0.86)',
              border:
                `1px solid ${colors.border}`,
              borderRadius: '14px',
              padding:
                '12px 16px',
              marginBottom: '18px',
              textAlign: 'center',
              color:
                colors.blueDeep,
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Project Request Form → Monday.com → contractors 💬
          </div>

          {usersError && (
            <div
              style={{
                background:
                  colors.pink,
                color:
                  colors.white,
                borderRadius:
                  '10px',
                padding:
                  '12px 14px',
                marginBottom:
                  '18px',
                fontWeight:
                  '600',
              }}
            >
              Slack users could not
              be loaded:{' '}
              {usersError}
            </div>
          )}

          {success ? (
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
                  '40px 24px',
                textAlign:
                  'center',
                boxShadow:
                  '0 10px 30px rgba(139, 94, 59, 0.12)',
              }}
            >
              <div
                style={{
                  fontSize: '52px',
                  marginBottom:
                    '10px',
                }}
              >
                🎉
              </div>

              <h2
                style={{
                  margin:
                    '0 0 12px',
                  color:
                    colors.brown,
                }}
              >
                Project Request Created!
              </h2>

              <p
                style={{
                  margin:
                    '0 0 8px',
                  color:
                    colors.brownSoft,
                }}
              >
                The project was
                added to Monday.com.
              </p>

              <p
                style={{
                  margin:
                    '0 0 22px',
                  color:
                    colors.blueDeep,
                }}
              >
                The selected contractor
                has received the
                proposal request form
                in Slack.
              </p>

              <p
                style={{
                  margin:
                    '0 0 24px',
                  fontWeight:
                    '700',
                }}
              >
                Monday Project ID:{' '}
                {success.projectId}
              </p>

              <button
                type="button"
                onClick={() =>
                  setSuccess(null)
                }
                style={{
                  padding:
                    '11px 24px',
                  border: 0,
                  borderRadius:
                    '10px',
                  background:
                    colors.pink,
                  color:
                    colors.white,
                  cursor:
                    'pointer',
                  fontWeight:
                    '700',
                  fontSize:
                    '14px',
                }}
              >
                Create Another Request
              </button>
            </section>
          ) : (
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
              <div
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: '10px',
                  marginBottom:
                    '20px',
                }}
              >
                <span
                  style={{
                    display:
                      'grid',
                    placeItems:
                      'center',
                    width: '38px',
                    height: '38px',
                    borderRadius:
                      '50%',
                    background:
                      colors.blue,
                    fontSize:
                      '20px',
                  }}
                >
                  📝
                </span>

                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize:
                        '22px',
                      color:
                        colors.brown,
                    }}
                  >
                    Project Request Form
                  </h2>

                  <p
                    style={{
                      margin:
                        '2px 0 0',
                      fontSize:
                        '13px',
                      color:
                        colors.brownSoft,
                    }}
                  >
                    Create a new
                    project request.
                  </p>
                </div>
              </div>

              <form
                onSubmit={
                  submitRequest
                }
              >
                <label
                  htmlFor="projectName"
                  style={{
                    display:
                      'block',
                    marginBottom:
                      '7px',
                    fontWeight:
                      '700',
                  }}
                >
                  Project Name *
                </label>

                <input
                  id="projectName"
                  name="projectName"
                  value={
                    form.projectName
                  }
                  onChange={
                    updateForm
                  }
                  placeholder="Enter the project name"
                  style={{
                    ...fieldStyle,
                    marginBottom:
                      '18px',
                  }}
                  required
                />

                <label
                  htmlFor="assignedToId"
                  style={{
                    display:
                      'block',
                    marginBottom:
                      '7px',
                    fontWeight:
                      '700',
                  }}
                >
                  Assign To *
                </label>

                <select
                  id="assignedToId"
                  name="assignedToId"
                  value={
                    form.assignedToId
                  }
                  onChange={
                    updateForm
                  }
                  disabled={
                    usersLoading ||
                    users.length ===
                      0
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
                    {usersLoading
                      ? 'Loading team members...'
                      : 'Select a contractor'}
                  </option>

                  {users.map(
                    user => (
                      <option
                        key={
                          user.userId
                        }
                        value={
                          user.userId
                        }
                      >
                        {user.name}
                      </option>
                    )
                  )}
                </select>

                <label
                  htmlFor="description"
                  style={{
                    display:
                      'block',
                    marginBottom:
                      '7px',
                    fontWeight:
                      '700',
                  }}
                >
                  Project Description *
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    updateForm
                  }
                  placeholder="Describe the project, requirements, and expected deliverables"
                  rows={7}
                  style={{
                    ...fieldStyle,
                    resize:
                      'vertical',
                    marginBottom:
                      '22px',
                  }}
                  required
                />

                <div
                  style={{
                    background:
                      colors.pinkPale,
                    border:
                      `1px solid ${colors.border}`,
                    borderRadius:
                      '10px',
                    padding:
                      '12px 14px',
                    marginBottom:
                      '22px',
                    color:
                      colors.brownSoft,
                    fontSize:
                      '13px',
                  }}
                >
                  The selected contractor
                  will receive the project
                  details and a secure
                  Proposal Request Form
                  link in Slack. 🔗
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    usersLoading ||
                    !form.assignedToId
                  }
                  style={{
                    width: '100%',
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
                    ? 'Creating Request...'
                    : 'Create Project Request 🚀'}
                </button>
              </form>
            </section>
          )}

          <p
            style={{
              textAlign:
                'center',
              color:
                colors.brownSoft,
              fontSize:
                '12px',
              marginTop:
                '18px',
              fontWeight:
                '600',
            }}
          >
            The selected contractor can
            complete the proposal form
            from their unique Slack link.
          </p>
        </div>
      </main>
    </>
  );
}
