import { evidenceUrl } from '../lib/supabase'

// Renders a submission's evidence inline: image, video, or just a typed answer.
export default function EvidenceViewer({ submission }) {
  const url = evidenceUrl(submission.evidence_path)
  const type = submission.evidence_type

  return (
    <div className="queue-evidence">
      {url && (type === 'photo' || (!type && /\.(jpg|jpeg|png|gif|webp)$/i.test(url))) && (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="evidence" loading="lazy" />
        </a>
      )}
      {url && (type === 'video' || type === 'recorded') && (
        <video src={url} controls preload="metadata" playsInline />
      )}
      {submission.text_answer && (
        <div className="banner info" style={{ marginTop: 8 }}>
          “{submission.text_answer}”
        </div>
      )}
      {!url && !submission.text_answer && (
        <div className="muted small">No evidence attached.</div>
      )}
    </div>
  )
}
