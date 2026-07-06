import React from 'react';

function Contact() {
  const team = [
    {
      name: 'Mridul Singh Rawat',
      github: 'https://github.com/MRIDULsinghRAWAT',
      githubHandle: '@MRIDULsinghRAWAT',
      email: 'mridulsinghrawat31@gmail.com',
    },
    {
      name: 'Akshat Joshi',
      github: 'https://github.com/Akshat-Joshi0',
      githubHandle: '@Akshat-Joshi0',
      email: 'akshatjoshi7218@gmail.com',
    },
    {
      name: 'Shiva Jakhad',
      github: 'https://github.com/Shiva0454',
      githubHandle: '@Shiva0454',
      email: 's19167813@gmail.com',
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-16">
        <h1
          className="text-5xl font-black tracking-tight mb-4"
          style={{
            background: 'linear-gradient(135deg, #C1E8FF 0%, #5483B3 50%, #7DA0CA 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Contact Us
        </h1>
        <p className="text-lg font-light" style={{ color: '#7DA0CA' }}>
          Get in touch with the team behind NET_SCAN
        </p>
        <div
          className="w-24 h-[2px] mx-auto mt-6"
          style={{ background: 'linear-gradient(90deg, transparent, #5483B3, transparent)' }}
        ></div>
      </div>

      {/* Cards Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {team.map((member, idx) => (
          <div
            key={idx}
            className="rounded-2xl p-8 transition-all duration-500 hover:scale-[1.03] group"
            style={{
              background: 'rgba(5, 38, 89, 0.35)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(84, 131, 179, 0.2)',
              boxShadow: '0 8px 32px rgba(2, 16, 36, 0.4)',
            }}
          >
            {/* Avatar Placeholder */}
            <div
              className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-2xl font-black transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(84,131,179,0.3), rgba(193,232,255,0.1))',
                border: '2px solid rgba(84, 131, 179, 0.3)',
                color: '#C1E8FF',
              }}
            >
              {member.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>

            {/* Name */}
            <h2 className="text-xl font-bold text-center mb-6 text-white tracking-wide">
              {member.name}
            </h2>

            {/* Links */}
            <div className="space-y-4">
              {/* GitHub */}
              <a
                href={member.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-5 py-3 rounded-xl transition-all duration-300 hover:translate-x-1"
                style={{
                  background: 'rgba(2, 16, 36, 0.5)',
                  border: '1px solid rgba(84, 131, 179, 0.15)',
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7DA0CA"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
                <div>
                  <div className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: '#5483B3' }}>
                    GitHub
                  </div>
                  <div className="text-sm font-medium" style={{ color: '#C1E8FF' }}>
                    {member.githubHandle}
                  </div>
                </div>
                <svg
                  className="ml-auto opacity-40 group-hover:opacity-80 transition-opacity"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7DA0CA"
                  strokeWidth="2"
                >
                  <path d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </a>

              {/* Email */}
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-4 px-5 py-3 rounded-xl transition-all duration-300 hover:translate-x-1"
                  style={{
                    background: 'rgba(2, 16, 36, 0.5)',
                    border: '1px solid rgba(84, 131, 179, 0.15)',
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7DA0CA"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 7L2 7" />
                  </svg>
                  <div>
                    <div className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: '#5483B3' }}>
                      Email
                    </div>
                    <div className="text-sm font-medium" style={{ color: '#C1E8FF' }}>
                      {member.email}
                    </div>
                  </div>
                  <svg
                    className="ml-auto opacity-40 group-hover:opacity-80 transition-opacity"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7DA0CA"
                    strokeWidth="2"
                  >
                    <path d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Contact;
