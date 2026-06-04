'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Participant } from '../lib/supabase'

const ARR_DATES = ['Lundi 15 juin', 'Mardi 16 juin']
const DEP_DATES = ['Jeudi 18 juin', 'Vendredi 19 juin']

const STORAGE_KEY = 'cercle-mdb-marbella:ma-declaration'

const EMPTY_FORM = {
  nom: '',
  arr_date: '',
  arr_time: '',
  arr_flight: '',
  dep_date: '',
  dep_time: '',
  dep_flight: '',
  arr_transport: '',
  arr_transport_detail: '',
  dep_transport: '',
  dep_transport_detail: '',
}

// Normalise une heure saisie (14:30, 1430, 9h5…) au format 14h30
function formatTime(raw: string): string {
  if (!raw.trim()) return ''
  const parts = raw.trim().split(/[^0-9]+/).filter(Boolean)
  if (parts.length === 0) return raw.trim()
  let h: string, m: string
  if (parts.length >= 2) {
    h = parts[0]
    m = parts[1]
  } else {
    const d = parts[0]
    if (d.length <= 2) { h = d; m = '0' }
    else if (d.length === 3) { h = d.slice(0, 1); m = d.slice(1) }
    else { h = d.slice(0, 2); m = d.slice(2, 4) }
  }
  const hn = parseInt(h, 10)
  const mn = parseInt(m, 10)
  if (isNaN(hn) || hn > 23 || isNaN(mn) || mn > 59) return raw.trim()
  return `${String(hn).padStart(2, '0')}h${String(mn).padStart(2, '0')}`
}

function Confetti() {
  const colors = ['#B8923E', '#D4AF5A', '#C9A24E', '#F5F0E8', '#EBE4D6', '#161B41', '#ffffff']
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {Array.from({ length: 90 }).map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 0.6
        const duration = 2.4 + Math.random() * 2
        const size = 6 + Math.random() * 9
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${size}px`,
              background: colors[i % colors.length],
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        )
      })}
    </div>
  )
}

function TransportBadge({ dir, type, detail }: { dir: string; type: string; detail: string }) {
  const icon = type === 'Uber' ? '🚕' : '🚗'
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-cream text-ink border border-gold/30 rounded-full px-2 py-0.5">
      {icon} {dir} : {type}{type === 'Autre' && detail ? ` (${detail})` : ''}
    </span>
  )
}

function ParticipantCard({ p, primary }: { p: Participant; primary: 'arr' | 'dep' }) {
  const time = primary === 'arr' ? p.arr_time : p.dep_time
  const flight = primary === 'arr' ? p.arr_flight : p.dep_flight
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 items-start hover:border-gold/40 hover:shadow-sm transition-all">
      <div className="flex flex-col items-center justify-center flex-shrink-0 w-16">
        <span className="text-lg font-bold text-gold leading-none whitespace-nowrap">{time || '—'}</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide mt-1 text-center leading-tight">{primary === 'arr' ? 'arrivée vol' : 'départ vol'}</span>
      </div>
      <div className="w-px self-stretch bg-gray-100" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-ink">{p.nom}</span>
          {flight && <span className="text-xs text-gray-400">{flight}</span>}
        </div>
        {primary === 'arr' && p.dep_date && (
          <p className="text-xs text-gray-500 mt-1">🛫 Départ {p.dep_date}{p.dep_time ? ` à ${p.dep_time}` : ''}{p.dep_flight ? ` · ${p.dep_flight}` : ''}</p>
        )}
        {primary === 'dep' && p.arr_date && (
          <p className="text-xs text-gray-500 mt-1">✈️ Arrivée {p.arr_date}{p.arr_time ? ` à ${p.arr_time}` : ''}{p.arr_flight ? ` · ${p.arr_flight}` : ''}</p>
        )}
        {(p.arr_transport || p.dep_transport) && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {p.arr_transport && <TransportBadge dir="arrivée" type={p.arr_transport} detail={p.arr_transport_detail} />}
            {p.dep_transport && <TransportBadge dir="départ" type={p.dep_transport} detail={p.dep_transport_detail} />}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const [tab, setTab] = useState<'form' | 'list'>('form')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [arrFilter, setArrFilter] = useState('')
  const [depFilter, setDepFilter] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const [hasSaved, setHasSaved] = useState(false)

  const [form, setForm] = useState(EMPTY_FORM)

  // Pré-remplit le formulaire depuis la déclaration enregistrée sur cet appareil
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setForm({ ...EMPTY_FORM, ...JSON.parse(saved) })
        setHasSaved(true)
      }
    } catch {
      /* localStorage indisponible ou JSON invalide : on ignore */
    }
  }, [])

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
    if (!form.arr_date && !form.dep_date) { alert('Indique au moins ton arrivée ou ton départ.'); return }
    // Message informatif (non bloquant) si une seule des deux dates est renseignée
    if (!!form.arr_date !== !!form.dep_date) {
      const oubli = form.arr_date ? 'ton départ' : 'ton arrivée'
      const ok = confirm(`Vous avez peut-être oublié quelque chose : ${oubli} n'est pas renseigné.\n\nL'un des deux suffit — cliquez sur OK pour continuer.`)
      if (!ok) return
    }
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
      // Mémorise la déclaration sur cet appareil pour la retrouver/modifier plus tard
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
        setHasSaved(true)
      } catch {
        /* localStorage indisponible : pas bloquant */
      }
      setSubmitted(true)
    } catch (e) {
      alert(`Erreur lors de l'enregistrement : ${e instanceof Error ? e.message : 'inconnue'}`)
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!form.nom.trim()) return
    if (!confirm(`Retirer "${form.nom}" de la liste ? Cette action est définitive.`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/participants?nom=${encodeURIComponent(form.nom)}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Erreur serveur (${res.status})`)
      }
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
      setHasSaved(false)
      setForm(EMPTY_FORM)
      setSubmitted(false)
      alert('Ta déclaration a été retirée de la liste.')
    } catch (e) {
      alert(`Suppression impossible : ${e instanceof Error ? e.message : 'inconnue'}`)
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const arrivals = participants
    .filter(p => p.arr_date && (!arrFilter || p.arr_date === arrFilter))
    .slice()
    .sort((a, b) => {
      if (!a.arr_time) return 1
      if (!b.arr_time) return -1
      return a.arr_time.localeCompare(b.arr_time)
    })

  const departures = participants
    .filter(p => p.dep_date && (!depFilter || p.dep_date === depFilter))
    .slice()
    .sort((a, b) => {
      if (!a.dep_time) return 1
      if (!b.dep_time) return -1
      return a.dep_time.localeCompare(b.dep_time)
    })

  return (
    <main className={`mx-auto px-4 py-8 transition-all ${tab === 'list' ? 'max-w-5xl' : 'max-w-xl'}`}>
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl mb-8 px-6 py-8 text-center bg-gradient-to-br from-navy via-navy-mid to-navy-surface shadow-lg ring-1 ring-gold/20">
        <div className="relative">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-xs">⭕️</span>
            <span className="text-xs font-semibold text-gold uppercase tracking-widest">Cercle MDB</span>
          </div>
          <h1 className="text-3xl font-semibold text-white mb-1">Séminaire Marbella</h1>
          <p className="text-sm text-white/60">Coordination des transferts aéroport</p>
          <div className="inline-flex items-center gap-1.5 mt-3 bg-gold/10 border border-gold/30 backdrop-blur rounded-full px-3 py-1 text-xs font-medium text-gold-bright">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            16 – 18 juin 2025 · Marbella
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-6">
        <button
          onClick={() => setTab('form')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'form' ? 'bg-gray-100 text-ink' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          Mon arrivée / départ
        </button>
        <button
          onClick={() => setTab('list')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors border-l border-gray-200 ${tab === 'list' ? 'bg-gray-100 text-ink' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          Arrivées / Départs ({participants.length || '…'})
        </button>
      </div>

      {/* FORM TAB */}
      {tab === 'form' && (
        <>
          {submitted ? (
            <div className="text-center py-12">
              <Confetti />
              <div className="overflow-hidden mb-2">
                <div className="drive-across text-4xl inline-block">🚗💨</div>
              </div>
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-xl font-semibold text-ink mb-1">C&apos;est enregistré !</h2>
              <p className="text-sm text-gray-500 mb-6">On se retrouve à Marbella 🌴🍹 — tes infos sont visibles par tous les membres.</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setTab('list')}
                  className="px-4 py-2 bg-gold text-white text-sm font-medium rounded-lg hover:bg-gold-light transition-colors"
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
              {hasSaved && (
                <div className="flex items-start gap-3 bg-cream border border-gold/30 rounded-xl px-4 py-3">
                  <span className="text-base leading-none mt-0.5">↩️</span>
                  <div className="text-xs text-ink">
                    <p className="font-medium">On a retrouvé ta déclaration{form.nom ? ` (${form.nom})` : ''}.</p>
                    <p className="text-ink-muted mt-0.5">Modifie ce que tu veux puis ré-enregistre — ta ligne sera mise à jour.</p>
                  </div>
                </div>
              )}
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
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
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
                        onClick={() => setForm(f => ({ ...f, arr_date: f.arr_date === d ? '' : d }))}
                        className={`border rounded-lg px-3 py-2.5 text-sm text-left transition-all ${form.arr_date === d ? 'border-gold bg-cream text-ink' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
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
                      onBlur={e => setForm(f => ({ ...f, arr_time: formatTime(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">N° de vol (optionnel)</label>
                    <input
                      type="text"
                      placeholder="VY8242"
                      value={form.arr_flight}
                      onChange={e => setForm(f => ({ ...f, arr_flight: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-500 mb-2">Transport à partager (optionnel)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Uber', 'Autre'].map(t => (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, arr_transport: f.arr_transport === t ? '' : t, arr_transport_detail: t === 'Uber' ? '' : f.arr_transport_detail }))}
                        className={`border rounded-lg px-3 py-2.5 text-sm transition-all ${form.arr_transport === t ? 'border-gold bg-cream text-ink' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {form.arr_transport === 'Autre' && (
                    <input
                      type="text"
                      placeholder="Ex : Je loue une voiture, dispo pour 2 places"
                      value={form.arr_transport_detail}
                      onChange={e => setForm(f => ({ ...f, arr_transport_detail: e.target.value }))}
                      className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  )}
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
                        onClick={() => setForm(f => ({ ...f, dep_date: f.dep_date === d ? '' : d }))}
                        className={`border rounded-lg px-3 py-2.5 text-sm text-left transition-all ${form.dep_date === d ? 'border-gold bg-cream text-ink' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
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
                      onBlur={e => setForm(f => ({ ...f, dep_time: formatTime(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">N° de vol (optionnel)</label>
                    <input
                      type="text"
                      placeholder="VY8243"
                      value={form.dep_flight}
                      onChange={e => setForm(f => ({ ...f, dep_flight: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-500 mb-2">Transport à partager (optionnel)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Uber', 'Autre'].map(t => (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, dep_transport: f.dep_transport === t ? '' : t, dep_transport_detail: t === 'Uber' ? '' : f.dep_transport_detail }))}
                        className={`border rounded-lg px-3 py-2.5 text-sm transition-all ${form.dep_transport === t ? 'border-gold bg-cream text-ink' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {form.dep_transport === 'Autre' && (
                    <input
                      type="text"
                      placeholder="Ex : Je loue une voiture, dispo pour 2 places"
                      value={form.dep_transport_detail}
                      onChange={e => setForm(f => ({ ...f, dep_transport_detail: e.target.value }))}
                      className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  )}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-gold hover:bg-gold-light disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium py-3 rounded-xl text-sm transition-colors"
              >
                {loading ? 'Enregistrement…' : hasSaved ? 'Mettre à jour ma disponibilité' : 'Enregistrer ma disponibilité'}
              </button>

              {hasSaved && (
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full text-xs text-ink-muted hover:text-red-600 disabled:opacity-50 transition-colors py-1"
                >
                  Retirer ma déclaration de la liste
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* LIST TAB */}
      {tab === 'list' && (
        <>
          {/* Filters */}
          <div className="space-y-2 mb-4">
            {/* Arrivée */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider w-16 flex-shrink-0">✈️ Arrivée</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setArrFilter('')}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${arrFilter === '' ? 'bg-gold text-white border-gold' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                >
                  Toutes
                </button>
                {ARR_DATES.map(d => (
                  <button
                    key={d}
                    onClick={() => setArrFilter(arrFilter === d ? '' : d)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${arrFilter === d ? 'bg-gold text-white border-gold' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            {/* Départ */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider w-16 flex-shrink-0">🛫 Départ</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setDepFilter('')}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${depFilter === '' ? 'bg-gold text-white border-gold' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                >
                  Tous
                </button>
                {DEP_DATES.map(d => (
                  <button
                    key={d}
                    onClick={() => setDepFilter(depFilter === d ? '' : d)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${depFilter === d ? 'bg-gold text-white border-gold' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={fetchParticipants}
                className="px-3 py-1 rounded-full text-xs border bg-white text-gray-500 border-gray-200 hover:border-gray-300 transition-colors"
              >
                ↻ Actualiser
              </button>
            </div>
          </div>

          {listLoading ? (
            <div className="text-center py-12 text-sm text-gray-400">Chargement…</div>
          ) : arrivals.length === 0 && departures.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">Aucun participant pour l&apos;instant.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Colonne Arrivées */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-ink uppercase tracking-wider">✈️ Arrivées</span>
                  <span className="text-xs text-gray-400">{arrFilter || 'tous les jours'}</span>
                </div>
                <div className="space-y-2">
                  {arrivals.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4">Aucune arrivée ce jour-là.</p>
                  ) : (
                    arrivals.map((p, i) => <ParticipantCard key={i} p={p} primary="arr" />)
                  )}
                </div>
              </div>

              {/* Colonne Départs */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-ink uppercase tracking-wider">🛫 Départs</span>
                  <span className="text-xs text-gray-400">{depFilter || 'tous les jours'}</span>
                </div>
                <div className="space-y-2">
                  {departures.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4">Aucun départ ce jour-là.</p>
                  ) : (
                    departures.map((p, i) => <ParticipantCard key={i} p={p} primary="dep" />)
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
