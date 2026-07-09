import { useState } from 'react'
import { compressImage, fileTooBig, MAX_VIDEO_MB } from '../lib/image'
import { enqueueSubmission } from '../lib/outbox'

// Bottom sheet for submitting evidence to one challenge. Optimistic: as soon as
// you tap Submit, the item is queued (with its file persisted offline) and the
// sheet closes — uploading happens in the background with retries.
export default function SubmitSheet({ challenge, team, memberName, subs, config, onClose }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const needsMedia = challenge.evidence !== 'text'
  const accept =
    challenge.evidence === 'video' || challenge.evidence === 'recorded'
      ? 'video/*'
      : 'image/*'
  const minTeam = config?.minTeammatesInShot ?? 2

  function pickFile(e) {
    const f = e.target.files?.[0]
    setErr('')
    if (!f) return
    if (fileTooBig(f)) {
      setErr(`That video is over ${MAX_VIDEO_MB} MB. Keep clips short (15–30s) so they upload on cell service.`)
      return
    }
    setFile(f)
    if (f.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(f))
    else setPreviewUrl(null)
  }

  async function submit() {
    setErr('')
    if (needsMedia && !file) {
      setErr('Add a photo or video first.')
      return
    }
    if (!needsMedia && !text.trim()) {
      setErr('Type your answer first.')
      return
    }
    setBusy(true)
    try {
      const prepared = file && file.type.startsWith('image/') ? await compressImage(file) : file
      await enqueueSubmission({
        teamId: team.id,
        teamName: team.name,
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        submittedBy: memberName || null,
        evidenceType: challenge.evidence,
        textAnswer: needsMedia ? text.trim() || null : text.trim(),
        file: prepared || null,
      })
      onClose()
    } catch (e) {
      setErr(e?.message || 'Could not queue your submission. Try again.')
      setBusy(false)
    }
  }

  const cap = challenge.maxClaims || 1
  const verifiedCount = subs.filter((s) => s.status === 'verified').length
  const capReached = verifiedCount >= cap

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row spread">
          <h2 style={{ flex: 1 }}>{challenge.title}</h2>
          <button className="ghost" onClick={onClose}>✕</button>
        </div>
        <div className="meta" style={{ marginBottom: 12 }}>
          <span className="pts-badge">
            {challenge.points} pt{challenge.points === 1 ? '' : 's'}
            {cap > 1 ? ` ·×${cap}` : ''}
          </span>
          {challenge.enhanced && <span className="tag enhanced">Enhanced proof needed</span>}
        </div>

        <div className="banner info" style={{ marginBottom: 12 }}>
          📸 At least {minTeam} teammates must be in every photo or video.
          {challenge.enhanced && ' This one needs more than a photo — read the title.'}
        </div>

        {/* Prior submissions for this challenge (esp. rejections w/ notes). */}
        {subs.length > 0 && (
          <div className="stack" style={{ marginBottom: 12 }}>
            {subs.map((s) => (
              <div key={s.id} className={'banner ' + bannerFor(s)}>
                <span>{statusLine(s)}</span>
              </div>
            ))}
          </div>
        )}

        {capReached && (
          <div className="banner warn" style={{ marginBottom: 12 }}>
            You’ve already maxed this one ({verifiedCount}/{cap} verified). Extra
            submissions won’t add points.
          </div>
        )}

        {needsMedia ? (
          <div className="stack">
            <label className="secondary" style={{
              display: 'block', textAlign: 'center', padding: 14,
              borderRadius: 12, border: '2px dashed #c4c7cb',
            }}>
              {file ? 'Choose a different file' : `Take or choose ${accept === 'video/*' ? 'a video' : 'a photo'}`}
              {/* No `capture` attribute, so phones offer BOTH the live camera and
                  the photo library (a teammate may have snapped it on their phone). */}
              <input
                type="file"
                accept={accept}
                style={{ display: 'none' }}
                onChange={pickFile}
              />
            </label>
            {previewUrl && <img className="preview-img" src={previewUrl} alt="preview" />}
            {file && !previewUrl && (
              <div className="muted small">Selected: {file.name}</div>
            )}
            {/* Optional note alongside media (e.g. exhibit name). */}
            {challenge.enhanced && (
              <textarea
                rows={2}
                placeholder="Add the required detail (exhibit name, fact, how it shows public service…)"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            )}
          </div>
        ) : (
          <textarea
            rows={4}
            placeholder="Type your answer"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}

        {err && <div className="banner err" style={{ marginTop: 12 }}>{err}</div>}

        <div className="row" style={{ marginTop: 14, gap: 10 }}>
          <button className="secondary grow" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="grow" onClick={submit} disabled={busy}>
            {busy ? 'Submitting…' : 'Submit evidence'}
          </button>
        </div>
        <p className="muted small center" style={{ marginTop: 10 }}>
          It’s safe to lose signal — your submission is saved on this phone and
          keeps trying to upload until it lands.
        </p>
      </div>
    </div>
  )
}

function bannerFor(s) {
  if (s._local) return 'info'
  if (s.status === 'verified') return 'ok'
  if (s.status === 'rejected') return 'err'
  return 'warn'
}

function statusLine(s) {
  if (s._local) {
    if (s._syncState === 'error') return '↻ Saved on your phone — retrying upload…'
    if (s._syncState === 'uploading') return '⤴ Uploading…'
    return '✓ Saved — waiting to upload'
  }
  if (s.status === 'verified') {
    const pts = s.awarded_points != null ? ` (+${s.awarded_points})` : ''
    return `✓ Verified${pts}`
  }
  if (s.status === 'rejected') {
    return `✕ Rejected${s.admin_note ? ' — ' + s.admin_note : ' — try again'}`
  }
  return '⏳ Pending verification'
}
