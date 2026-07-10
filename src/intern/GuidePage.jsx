// The player guide, embedded in the app at /guide. Mirrors the printed handout
// so interns always have a digital copy one tap away.

export default function GuidePage({ onBack }) {
  return (
    <div className="app">
      <div className="topbar">
        <h1>Player Guide</h1>
        <button className="ghost small" style={{ color: '#fff' }} onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="pad stack">
        <div className="banner info">
          🗺 <strong>The golden rule:</strong>&nbsp;use your printed packet to find
          and solve challenges. Use this app to check them off and upload proof.
          The numbers here match your packet.
        </div>

        <div className="card stack">
          <h2>Submitting a challenge</h2>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
            <li>Tap the challenge (grouped by quest, numbered like your packet).</li>
            <li>Tap <strong>“Take or choose a photo/video”</strong> — camera or camera roll both work.</li>
            <li><strong>At least 2 teammates in every shot.</strong> This gets checked.</li>
            <li>Add any extra detail it asks for (exhibit name, fact, recorded answer).</li>
            <li>Tap <strong>Submit evidence</strong>. Done!</li>
          </ol>
        </div>

        <div className="card stack">
          <h2>What the statuses mean</h2>
          <div className="row"><span className="tag pending">Pending</span><span className="small">Sent — awaiting review. Doesn’t count yet (normal!).</span></div>
          <div className="row"><span className="tag verified">Verified</span><span className="small">Approved — points are on the board. 🎉</span></div>
          <div className="row"><span className="tag rejected">Rejected</span><span className="small">Not approved (see the note). Fix it and try again.</span></div>
        </div>

        <div className="banner warn">
          📶 <strong>Weak signal? Don’t panic.</strong>&nbsp;Submissions are saved
          on your phone and keep retrying by themselves. Nothing is lost — keep
          playing and they’ll land when signal returns.
        </div>

        <div className="card stack">
          <h2>Scoring &amp; strategy</h2>
          <p className="small" style={{ margin: 0 }}>
            The big number is your <strong>official</strong> (verified) score;
            “if all verified” shows your ceiling. The <strong>★ Hero’s
            Journey</strong> pays you to spread out: score in 3 quests for
            <strong> +5</strong>, 4 for <strong>+10</strong>, all 5 for
            <strong> +15</strong>.
          </p>
        </div>

        <div className="card stack">
          <h2>Bonuses</h2>
          <p className="small" style={{ margin: 0 }}>
            <strong>✨ Roaming:</strong> both roamers (Isabella &amp; Avis) in one
            photo with 2+ teammates — one-time bonus.
          </p>
          <p className="small" style={{ margin: 0 }}>
            <strong>💼 LinkedIn:</strong> post a challenge photo (“What is Boston
            to you?”), tag @CityofBoston + teammates + the packet hashtags, then
            submit a screenshot under “LinkedIn Bonus.” +1 per teammate the City
            reposts — one post each.
          </p>
        </div>

        <div className="card stack">
          <h2>Video tips</h2>
          <p className="small" style={{ margin: 0 }}>
            Keep clips <strong>15–30 seconds</strong> and record at
            <strong> 1080p, not 4K</strong> (Settings → Camera → Record Video) —
            big files crawl on cell service.
          </p>
        </div>

        <div className="card stack">
          <h2>Quick fixes</h2>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }} className="small">
            <li><strong>“Couldn’t reach the server”</strong> → reload, or check your signal.</li>
            <li><strong>Stuck “Uploading…”</strong> → it retries by itself; big videos take a while. Move on.</li>
            <li><strong>Wrong team?</strong> → bottom of the challenge list → “Joined the wrong team?”</li>
            <li><strong>App looks weird?</strong> → close the tab, reopen the link.</li>
            <li>Anything else → <strong>find Erin.</strong></li>
          </ul>
        </div>

        <div className="card stack">
          <h2>Ground rules</h2>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }} className="small">
            <li>You’re representing the City of Boston today.</li>
            <li>Use good judgment, stay safe — no challenge is worth a risk.</li>
            <li>Be brief and kind; “no thank you” is a complete answer.</li>
            <li>Only post things that make you and the program look great.</li>
          </ul>
        </div>

        <div className="center muted small">Have fun out there. Go win it. 🏆</div>
        <div className="spacer" />
      </div>
    </div>
  )
}
