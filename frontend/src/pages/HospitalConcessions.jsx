import { useState, useEffect } from 'react'

const MOCK_HOSPITALS = [
  { id: 1, name: "City General Hospital", type: "Govt Scheme - PMJAY", link: "https://pmjay.gov.in/", website: "https://example.com/city-gen", color: "blue" },
  { id: 2, name: "St. Mary Medical Center", type: "Medilink Special Concession", link: "#", website: "https://example.com/st-mary", color: "violet" },
  { id: 3, name: "Apollo Specialty", type: "Cancer Care Concession", link: "https://www.apollohospitals.com/", website: "https://www.apollohospitals.com/", color: "emerald" },
  { id: 4, name: "Regional Heart Institute", type: "Senior Citizen Discount", link: "#", website: "https://example.com/rhi", color: "rose" },
]

export default function HospitalConcessions() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Medical Bill Concessions</h1>
          <p className="text-slate-400">Find nearby hospitals offering concessions and apply for government healthcare schemes.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_HOSPITALS.map((h) => (
            <div key={h.id} className="glass p-6 rounded-2xl border border-slate-700/50 hover:border-blue-500/30 transition-all group">
               <div className={`w-12 h-12 bg-${h.color}-500/10 rounded-xl flex items-center justify-center mb-4 text-${h.color}-400`}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{h.name}</h3>
              <div className="inline-block px-3 py-1 rounded-full bg-slate-800 text-xs font-medium text-slate-300 mb-4 border border-slate-700">
                {h.type}
              </div>
              
              <div className="space-y-3 mt-4">
                <a href={h.link} className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-2">
                  Apply Now
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a href={h.website} target="_blank" rel="noreferrer" className="block text-center text-sm text-slate-400 hover:text-white transition-colors">
                  Visit Official Website
                </a>
              </div>
            </div>
          ))}
        </div>
        
        <section className="mt-16 p-8 glass rounded-3xl border border-blue-500/20 bg-blue-500/5">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-4">Ayushman Bharat (PM-JAY)</h2>
              <p className="text-slate-300 mb-6 font-light leading-relaxed">
                The world's largest health insurance/assurance scheme fully financed by the government. It provides a cover of Rs. 5 lakhs per family per year for secondary and tertiary care hospitalization across public and private empanelled hospitals in India.
              </p>
              <a href="https://pmjay.gov.in/" className="btn-secondary px-8 py-3">Learn More</a>
            </div>
            <div className="w-32 h-32 md:w-48 md:h-48 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
               <span className="text-white text-lg font-bold">PM-JAY</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
