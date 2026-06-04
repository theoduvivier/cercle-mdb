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

// Normalise un numéro de vol : supprime tous les espaces et met en majuscules (VY 8242 → VY8242)
function formatFlight(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
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

function TransportBadge({ type, detail }: { type: string; detail: string }) {
  const icon = type === 'Uber' ? '🚕' : '🚗'
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-cream text-ink border border-gold/30 rounded-full px-2 py-0.5">
      {icon} {type}{type === 'Autre' && detail ? ` (${detail})` : ''}
    </span>
  )
}

function ParticipantCard({ p, primary, index = 0 }: { p: Participant; primary: 'arr' | 'dep'; index?: number }) {
  const time = primary === 'arr' ? p.arr_time : p.dep_time
  const flight = primary === 'arr' ? p.arr_flight : p.dep_flight
  const transport = primary === 'arr' ? p.arr_transport : p.dep_transport
  const transportDetail = primary === 'arr' ? p.arr_transport_detail : p.dep_transport_detail
  return (
    <div
      className="group relative bg-white rounded-2xl p-4 flex gap-4 items-start shadow-card ring-1 ring-gray-100 hover:ring-gold/40 hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300 animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      {/* accent doré latéral au survol */}
      <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-gold-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex flex-col items-center justify-center flex-shrink-0 w-20">
        <span className="font-heading text-xl font-extrabold text-gold-gradient leading-none whitespace-nowrap">{time || '—'}</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide mt-1 whitespace-nowrap">{primary === 'arr' ? 'arrivée vol' : 'départ vol'}</span>
      </div>
      <div className="w-px self-stretch bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-ink">{p.nom}</span>
          {flight && <span className="text-xs text-gray-400">{formatFlight(flight)}</span>}
        </div>
        {transport && (
          <div className="mt-1.5">
            <TransportBadge type={transport} detail={transportDetail} />
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
  const [view, setView] = useState<'arr' | 'dep'>('arr') // bascule Arrivées/Départs sur mobile
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
        const parsed = { ...EMPTY_FORM, ...JSON.parse(saved) }
        setForm(parsed)
        setHasSaved(true)
        // Pré-sélectionne les filtres de la liste sur les jours déclarés par l'utilisateur
        setArrFilter(parsed.arr_date || '')
        setDepFilter(parsed.dep_date || '')
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
    // Numéros de vol nettoyés (sans espaces, majuscules) avant envoi
    const payload = {
      ...form,
      arr_flight: formatFlight(form.arr_flight),
      dep_flight: formatFlight(form.dep_flight),
    }
    setForm(payload)
    setLoading(true)
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Erreur serveur (${res.status})`)
      }
      // Mémorise la déclaration sur cet appareil pour la retrouver/modifier plus tard
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
        setHasSaved(true)
      } catch {
        /* localStorage indisponible : pas bloquant */
      }
      // Aligne les filtres de la liste sur les jours qu'il vient de déclarer
      setArrFilter(form.arr_date || '')
      setDepFilter(form.dep_date || '')
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
    <main className="mx-auto px-4 py-8 max-w-5xl">
      {/* Header — pleine largeur sur mobile, carte arrondie sur grand écran */}
      <div className="gold-halo sheen relative overflow-hidden mb-8 px-6 py-10 text-center bg-navy-gradient shadow-header rounded-b-3xl -mx-4 -mt-8 sm:mx-0 sm:mt-0 sm:rounded-3xl sm:ring-1 sm:ring-gold/25 animate-fade-in">
        {/* liseré doré supérieur */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-60" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-xs">⭕️</span>
            <span className="text-[11px] font-semibold text-gold uppercase tracking-[0.25em]">Cercle MDB</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-1 tracking-tight">
            Séminaire <span className="gold-shimmer">Marbella</span> <span className="sun-pulse text-3xl align-middle">☀️</span>
          </h1>
          <p className="text-sm text-white/55">Coordination des transferts aéroport</p>
          <div className="inline-flex items-center gap-1.5 mt-4 bg-gold/10 border border-gold/30 backdrop-blur rounded-full px-3.5 py-1.5 text-xs font-medium text-gold-bright shadow-gold/0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            16 – 18 juin 2025 · Marbella
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/70 backdrop-blur border border-gray-200/80 rounded-2xl mb-6 max-w-xl mx-auto shadow-card">
        <button
          onClick={() => setTab('form')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all active:scale-[0.98] ${tab === 'form' ? 'bg-navy-gradient text-white shadow-sm' : 'text-ink-muted hover:bg-cream/60'}`}
        >
          Mon arrivée / départ
        </button>
        <button
          onClick={() => setTab('list')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all active:scale-[0.98] ${tab === 'list' ? 'bg-navy-gradient text-white shadow-sm' : 'text-ink-muted hover:bg-cream/60'}`}
        >
          Arrivées / Départs
        </button>
      </div>

      {/* FORM TAB */}
      {tab === 'form' && (
        <div className="max-w-xl mx-auto animate-fade-in">
          {submitted ? (
            <div className="text-center py-12">
              <Confetti />
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-xl font-semibold text-ink mb-1">C&apos;est enregistré !</h2>
              <p className="text-sm text-gray-500 mb-6">On se retrouve à Marbella 🌴🍹 — tes infos sont visibles par tous les membres.</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setTab('list')}
                  className="btn-shine px-5 py-2.5 bg-gold-gradient text-white text-sm font-semibold rounded-xl shadow-gold hover:-translate-y-0.5 transition-all"
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
              <div className="relative overflow-hidden bg-white rounded-2xl pl-5 pr-4 py-3.5 text-xs text-ink-muted leading-relaxed shadow-card ring-1 ring-gold/15 animate-fade-up">
                <div className="absolute left-0 inset-y-0 w-1 bg-gold-gradient" />
                Renseigne tes heures d&apos;arrivée et de départ : tu pourras ensuite repérer les personnes qui arrivent à peu près en même temps que toi et <span className="text-ink font-semibold">mutualiser les transferts</span> (Uber ou autre) vers le Club Med. ☀️
              </div>
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
              <div className="bg-white rounded-2xl p-5 shadow-card ring-1 ring-gray-100">
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
              <div className="bg-white rounded-2xl p-5 shadow-card ring-1 ring-gray-100">
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
                      onBlur={e => setForm(f => ({ ...f, arr_flight: formatFlight(e.target.value) }))}
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
              <div className="bg-white rounded-2xl p-5 shadow-card ring-1 ring-gray-100">
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
                      onBlur={e => setForm(f => ({ ...f, dep_flight: formatFlight(e.target.value) }))}
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
                className="btn-shine w-full bg-gold-gradient disabled:bg-none disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none text-white font-semibold py-3.5 rounded-xl text-sm shadow-gold hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0 transition-all"
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
        </div>
      )}

      {/* LIST TAB */}
      {tab === 'list' && (
        <>
          <div className="relative overflow-hidden bg-white rounded-2xl pl-5 pr-4 py-3.5 text-xs text-ink-muted leading-relaxed mb-4 shadow-card ring-1 ring-gold/15 animate-fade-up">
            <div className="absolute left-0 inset-y-0 w-1 bg-gold-gradient" />
            Qui arrive et qui repart quand. Repère les personnes sur <span className="text-ink font-semibold">tes créneaux d&apos;arrivée et de départ</span> pour vous <span className="text-ink font-semibold">partager un transfert</span> (Uber ou autre) vers et depuis le Club Med. ☀️
          </div>
          {/* Filtres */}
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-card ring-1 ring-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Filtres</span>
              <button
                onClick={fetchParticipants}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                ↻ Actualiser
              </button>
            </div>
            <div>
              {/* Arrivée */}
              <div>
                <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2 whitespace-nowrap">✈️ Arrivée</span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setArrFilter('')}
                    className={`px-3 py-1 rounded-full text-xs border transition-all active:scale-95 ${arrFilter === '' ? 'bg-gold text-white border-gold' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                  >
                    Toutes
                  </button>
                  {ARR_DATES.map(d => (
                    <button
                      key={d}
                      onClick={() => setArrFilter(arrFilter === d ? '' : d)}
                      className={`px-3 py-1 rounded-full text-xs border transition-all active:scale-95 ${arrFilter === d ? 'bg-gold text-white border-gold' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-px bg-gray-100 my-3" />
              {/* Départ */}
              <div>
                <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2 whitespace-nowrap">🛫 Départ</span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setDepFilter('')}
                    className={`px-3 py-1 rounded-full text-xs border transition-all active:scale-95 ${depFilter === '' ? 'bg-gold text-white border-gold' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                  >
                    Tous
                  </button>
                  {DEP_DATES.map(d => (
                    <button
                      key={d}
                      onClick={() => setDepFilter(depFilter === d ? '' : d)}
                      className={`px-3 py-1 rounded-full text-xs border transition-all active:scale-95 ${depFilter === d ? 'bg-gold text-white border-gold' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bascule Arrivées / Départs (mobile uniquement) — collante en haut */}
          <div className="sm:hidden sticky top-3 z-20 flex gap-1 p-1 bg-white/80 backdrop-blur-md ring-1 ring-gray-200/80 rounded-2xl overflow-hidden mb-4 shadow-card">
            <button
              onClick={() => setView('arr')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all active:scale-[0.97] ${view === 'arr' ? 'bg-gold-gradient text-white shadow-gold' : 'text-ink-muted'}`}
            >
              ✈️ Arrivées
            </button>
            <button
              onClick={() => setView('dep')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all active:scale-[0.97] ${view === 'dep' ? 'bg-gold-gradient text-white shadow-gold' : 'text-ink-muted'}`}
            >
              🛫 Départs
            </button>
          </div>

          {listLoading ? (
            <div className="text-center py-12 text-sm text-gray-400">Chargement…</div>
          ) : arrivals.length === 0 && departures.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">Aucun participant pour l&apos;instant.</div>
          ) : (
            <div key={view} className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-4">
              {/* Colonne Arrivées — masquée sur mobile si la bascule est sur Départs */}
              <div className={view === 'arr' ? '' : 'hidden sm:block'}>
                <div className="hidden sm:flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-ink uppercase tracking-wider">✈️ Arrivées</span>
                  <span className="text-xs text-gray-400">{arrFilter || 'tous les jours'}</span>
                </div>
                <div className="space-y-2">
                  {arrivals.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4">Aucune arrivée ce jour-là.</p>
                  ) : (
                    arrivals.map((p, i) => <ParticipantCard key={i} p={p} primary="arr" index={i} />)
                  )}
                </div>
              </div>

              {/* Colonne Départs — masquée sur mobile si la bascule est sur Arrivées */}
              <div className={view === 'dep' ? '' : 'hidden sm:block'}>
                <div className="hidden sm:flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-ink uppercase tracking-wider">🛫 Départs</span>
                  <span className="text-xs text-gray-400">{depFilter || 'tous les jours'}</span>
                </div>
                <div className="space-y-2">
                  {departures.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4">Aucun départ ce jour-là.</p>
                  ) : (
                    departures.map((p, i) => <ParticipantCard key={i} p={p} primary="dep" index={i} />)
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
