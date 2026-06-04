'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Participant } from '../lib/supabase'

const ARR_DATES = ['Lundi 15 juin', 'Mardi 16 juin']
const DEP_DATES = ['Jeudi 18 juin', 'Vendredi 19 juin']

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key])
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

export default function Home() {
  const [tab, setTab] = useState<'form' | 'list'>('form')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [filter, setFilter] = useState('all')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(false)

  const [form, setForm] = useState({
    nom: '',
    arr_date: '',
    arr_time: '',
    arr_flight: '',
    dep_date: '',
    dep_time: '',
    dep_flight: '',
    transport_type: '',
    comment: '',
  })

  const fetchParticipants = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await fetch('/api/participants')
      const data = await res.json()
      setParticipants(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'list') fetchParticipants()
  }, [tab, fetchParticipants])

  async function handleSubmit() {
    if (!form.nom.trim()) { alert('Indique ton prénom et nom.'); return }
    if (!form.arr_date) { alert("Sélectionne ta date d'arrivée."); return }
    if (!form.dep_date) { alert('Sélectionne ta date de départ.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Erreur serveur (${res.status})`)
      }
      setSubmitted(true)
    } catch (e) {
      alert(`Erreur lors de l'enregistrement : ${e instanceof Error ? e.message : 'inconnue'}`)
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = participants.filter(p => {
    if (filter === 'arr-15') return p.arr_date === ARR_DATES[0]
    if (filter === 'arr-16') return p.arr_date === ARR_DATES[1]
    if (filter === 'dep-18') return p.dep_date === DEP_DATES[0]
    if (filter === 'dep-19') return p.dep_date === DEP_DATES[1]
    return true
  })

  const grouped = groupBy(filtered, 'arr_date')

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="text-xs">⭕️</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">Cercle MDB</span>
        </div>
        <h1 className="text-2xl font-medium text-gray-900 mb-1">Séminaire Marbella</h1>
        <p className="text-sm text-gray-500">Coordination des transferts aéroport</p>
        <div className="inline-flex items-center gap-1.5 mt-3 bg-gray-100 rounded-full px-3 py-1 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          16 – 18 juin 2025 · Marbella
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-6">
        <button
          onClick={() => setTab('form')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'form' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          Mon arrivée / départ
        </button>
        <button
          onClick={() => setTab('list')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors border-l border-gray-200 ${tab === 'list' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          Voir les participants ({participants.length || '…'})
        </button>
      </div>

      {/* FORM TAB */}
      {tab === 'form' && (
        <>
          {submitted ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-gray-900 mb-1">C&apos;est enregistré !</h2>
              <p className="text-sm text-gray-500 mb-6">Tes infos sont visibles par tous les membres.</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setTab('list')}
                  className="px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Voir qui est là
                </button>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Modifier
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Infos */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Mes infos</p>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Prénom et nom</label>
                  <input
                    type="text"
                    placeholder="Ex : Thomas Dupont"
                    value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Arrivée */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">✈️ Arrivée</p>
                <div className="mb-4">
                  <label className="block text-sm text-gray-500 mb-2">Date d&apos;arrivée</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ARR_DATES.map(d => (
                      <button
                        key={d}
                        onClick={() => setForm(f => ({ ...f, arr_date: d }))}
                        className={`border rounded-lg px-3 py-2.5 text-sm text-left transition-all ${form.arr_date === d ? 'border-teal-500 bg-teal-50 text-teal-900' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Heure d&apos;arrivée du vol</label>
                    <input
                      type="text"
                      placeholder="14h30"
                      value={form.arr_time}
                      onChange={e => setForm(f => ({ ...f, arr_time: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">N° de vol (optionnel)</label>
                    <input
                      type="text"
                      placeholder="VY8242"
                      value={form.arr_flight}
                      onChange={e => setForm(f => ({ ...f, arr_flight: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Départ */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">🛫 Départ</p>
                <div className="mb-4">
                  <label className="block text-sm text-gray-500 mb-2">Date de départ</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DEP_DATES.map(d => (
                      <button
                        key={d}
                        onClick={() => setForm(f => ({ ...f, dep_date: d }))}
                        className={`border rounded-lg px-3 py-2.5 text-sm text-left transition-all ${form.dep_date === d ? 'border-teal-500 bg-teal-50 text-teal-900' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Heure de départ du vol</label>
                    <input
                      type="text"
                      placeholder="19h15"
                      value={form.dep_time}
                      onChange={e => setForm(f => ({ ...f, dep_time: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">N° de vol (optionnel)</label>
                    <input
                      type="text"
                      placeholder="VY8243"
                      value={form.dep_flight}
                      onChange={e => setForm(f => ({ ...f, dep_flight: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Transport partagé */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <label className="block text-sm text-gray-500 mb-2">Transport que tu souhaites partager</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Uber', 'Autre'].map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, transport_type: t, comment: t === 'Uber' ? '' : f.comment }))}
                      className={`border rounded-lg px-3 py-2.5 text-sm transition-all ${form.transport_type === t ? 'border-teal-500 bg-teal-50 text-teal-900' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {form.transport_type === 'Autre' && (
                  <div className="mt-4">
                    <label className="block text-sm text-gray-500 mb-1">Précise (covoiturage, taxi…)</label>
                    <input
                      type="text"
                      placeholder="Ex : Je loue une voiture, dispo pour 2 places"
                      value={form.comment}
                      onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium py-3 rounded-xl text-sm transition-colors"
              >
                {loading ? 'Enregistrement…' : 'Enregistrer ma disponibilité'}
              </button>
            </div>
          )}
        </>
      )}

      {/* LIST TAB */}
      {tab === 'list' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { num: participants.length, label: 'Participants' },
              { num: participants.filter(p => p.arr_date === ARR_DATES[0]).length, label: 'Arrivent le 15' },
              { num: participants.filter(p => p.dep_date === DEP_DATES[1]).length, label: 'Repartent le 19' },
            ].map(({ num, label }) => (
              <div key={label} className="bg-gray-100 rounded-xl p-3 text-center">
                <div className="text-2xl font-medium text-gray-900">{num}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap mb-4">
            {[
              { key: 'all', label: 'Tous' },
              { key: 'arr-15', label: 'Arrive le 15' },
              { key: 'arr-16', label: 'Arrive le 16' },
              { key: 'dep-18', label: 'Repart le 18' },
              { key: 'dep-19', label: 'Repart le 19' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${filter === f.key ? 'bg-gray-200 text-gray-900 border-gray-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
              >
                {f.label}
              </button>
            ))}
            <button
              onClick={fetchParticipants}
              className="ml-auto px-3 py-1 rounded-full text-xs border bg-white text-gray-500 border-gray-200 hover:border-gray-300 transition-colors"
            >
              ↻ Actualiser
            </button>
          </div>

          {listLoading ? (
            <div className="text-center py-12 text-sm text-gray-400">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">Aucun participant pour l&apos;instant.</div>
          ) : (
            <div className="space-y-6">
              {ARR_DATES.map(date => {
                const group = grouped[date]
                if (!group?.length) return null
                return (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Arrivée {date}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="space-y-2">
                      {group
                        .sort((a, b) => (a.arr_time || '').localeCompare(b.arr_time || ''))
                        .map((p, i) => {
                          const sameTime = group.filter(x => x.arr_time && x.arr_time === p.arr_time).length > 1
                          return (
                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-3">
                              <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-xs font-medium text-teal-900 flex-shrink-0">
                                {initials(p.nom)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-gray-900">{p.nom}</span>
                                  {sameTime && (
                                    <span className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-100">
                                      groupe possible
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  ✈️ {p.arr_date}{p.arr_time ? ` à ${p.arr_time}` : ''}{p.arr_flight ? ` · ${p.arr_flight}` : ''}
                                  {'  '}
                                  🛫 {p.dep_date}{p.dep_time ? ` à ${p.dep_time}` : ''}{p.dep_flight ? ` · ${p.dep_flight}` : ''}
                                </p>
                                {p.transport_type && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    🚗 {p.transport_type}
                                    {p.transport_type === 'Autre' && p.comment ? ` — ${p.comment}` : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </main>
  )
}
