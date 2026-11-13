import { useCallback, useEffect, useRef, useState } from "react";
import { HiArrowUpRight, HiMusicalNote, HiOutlineArrowTopRightOnSquare } from "react-icons/hi2";
import styles from "../styles/ItemStyles.module.css";

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_URL = "https://api.spotify.com/v1";
const SCOPE = "user-top-read";

type TimeRange = "short_term" | "medium_term" | "long_term";
type Token = { accessToken: string; expiresAt: number };
type Artist = { id: string; name: string; images?: { url: string }[]; external_urls?: { spotify: string } };
type Track = { id: string; name: string; artists: Artist[]; album: { name: string; images?: { url: string }[] }; external_urls?: { spotify: string } };

const ranges: { value: TimeRange; label: string }[] = [
  { value: "short_term", label: "Last month" },
  { value: "medium_term", label: "Last 6 months" },
  { value: "long_term", label: "All time" },
];

function randomString(length: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function createChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function spotifyWebUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === "https://open.spotify.com" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function MainPage() {
  const [token, setToken] = useState<Token | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [range, setRange] = useState<TimeRange>("medium_term");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const requestSequence = useRef(0);

  useEffect(() => {
    const finishSignIn = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const returnedState = params.get("state");
      const authError = params.get("error");
      if (!code && !authError) return;
      window.history.replaceState({}, document.title, window.location.pathname);
      if (authError) {
        sessionStorage.removeItem("spotify_auth_state");
        sessionStorage.removeItem("spotify_code_verifier");
        setError("Spotify sign-in was cancelled. You can try again whenever you're ready.");
        return;
      }
      if (!code) return;
      const expectedState = sessionStorage.getItem("spotify_auth_state");
      const verifier = sessionStorage.getItem("spotify_code_verifier");
      sessionStorage.removeItem("spotify_auth_state");
      sessionStorage.removeItem("spotify_code_verifier");
      if (!returnedState || returnedState !== expectedState || !verifier) {
        setError("Sign-in could not be verified. Please connect your account again.");
        return;
      }
      if (!CLIENT_ID || !REDIRECT_URI) {
        setError("Add your Spotify client ID and redirect URI to the local environment settings.");
        return;
      }
      setAuthenticating(true);
      try {
        const response = await fetch(TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: "authorization_code",
            code,
            redirect_uri: REDIRECT_URI,
            code_verifier: verifier,
          }),
        });
        if (!response.ok) throw new Error("Spotify could not complete sign-in. Please try again.");
        const data: { access_token: string; expires_in: number } = await response.json();
        setToken({ accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to connect to Spotify.");
      } finally {
        setAuthenticating(false);
      }
    };
    void finishSignIn();
  }, []);

  const connectSpotify = async () => {
    setError("");
    if (!CLIENT_ID || !REDIRECT_URI) {
      setError("Add VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_REDIRECT_URI to your local .env file.");
      return;
    }
    const verifier = randomString(64);
    const state = randomString(32);
    sessionStorage.setItem("spotify_code_verifier", verifier);
    sessionStorage.setItem("spotify_auth_state", state);
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: SCOPE,
      state,
      code_challenge_method: "S256",
      code_challenge: await createChallenge(verifier),
    });
    window.location.assign(`${AUTH_URL}?${params.toString()}`);
  };

  const loadTopItems = useCallback(async () => {
    if (!token) return;
    const requestId = ++requestSequence.current;
    if (Date.now() >= token.expiresAt) {
      setToken(null);
      setLoaded(false);
      setLoading(false);
      setError("Your Spotify session expired. Connect again to refresh your listening stats.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token.accessToken}` };
      const [trackResponse, artistResponse] = await Promise.all([
        fetch(`${API_URL}/me/top/tracks?limit=10&time_range=${range}`, { headers }),
        fetch(`${API_URL}/me/top/artists?limit=10&time_range=${range}`, { headers }),
      ]);
      if (requestId !== requestSequence.current) return;
      if (trackResponse.status === 401 || artistResponse.status === 401) {
        setToken(null);
        setLoaded(false);
        throw new Error("Your Spotify session expired. Connect again to refresh your listening stats.");
      }
      if (!trackResponse.ok || !artistResponse.ok) {
        throw new Error("Spotify couldn't load your listening history. Please try again.");
      }
      const [trackData, artistData] = await Promise.all([trackResponse.json(), artistResponse.json()]);
      setTracks(trackData.items ?? []);
      setArtists(artistData.items ?? []);
      setLoaded(true);
    } catch (cause) {
      if (requestId === requestSequence.current) {
        setError(cause instanceof Error ? cause.message : "Unable to load your Spotify data.");
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [range, token]);

  useEffect(() => {
    if (token) void loadTopItems();
  }, [token, loadTopItems]);

  const disconnect = () => {
    requestSequence.current += 1;
    setToken(null);
    setLoading(false);
    setTracks([]);
    setArtists([]);
    setLoaded(false);
    setError("");
  };

  return (
    <main className={styles.appShell}>
      <header className={styles.topbar}>
        <a className={styles.wordmark} href="#top" aria-label="CheckIt home"><span className={styles.logoMark}>c.</span>checkit</a>
        {token ? <button className={styles.disconnectButton} onClick={disconnect}>Disconnect</button> : <span className={styles.privacyNote}><span /> Private by design</span>}
      </header>

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span className={styles.eyebrowLine} /> YOUR LISTENING, IN FOCUS</p>
          <h1>Your taste<br />has a <span>pattern.</span></h1>
          <p className={styles.heroText}>A little look back at the music you keep coming back to. Your top tracks and artists, straight from Spotify.</p>
          {!token ? (
            <button className={styles.connectButton} onClick={connectSpotify} disabled={authenticating}>
              <span className={styles.spotifyGlyph}>◉</span> {authenticating ? "Connecting…" : "Connect Spotify"}<HiArrowUpRight aria-hidden="true" />
            </button>
          ) : (
            <p className={styles.connectedLabel}><span /> Spotify connected <span className={styles.dotDivider}>·</span> Your stats are ready</p>
          )}
          {error && <p className={styles.errorMessage} role="alert">{error}</p>}
          {!token && <p className={styles.caption}>Only the <strong>user-top-read</strong> permission. No playlists, no changes.</p>}
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <div className={`${styles.orbit} ${styles.orbitOne}`} />
          <div className={`${styles.orbit} ${styles.orbitTwo}`} />
          <div className={styles.artCore}><span className={styles.artNote}>♫</span><span className={styles.artLabel}>ON REPEAT</span></div>
          <div className={`${styles.floatingCard} ${styles.cardOne}`}><span className={styles.floatDot} /> YOUR SOUND, UNMISTAKABLY</div>
          <div className={`${styles.floatingCard} ${styles.cardTwo}`}>01 <span>↓</span> YOUR TOP TEN</div>
          <div className={styles.sparkle}>✳</div>
        </div>
      </section>

      <section className={styles.statsSection} aria-labelledby="listening-title">
        <div className={styles.sectionTopline}><span>THE LISTENING REPORT</span><span className={styles.toplineRight} role="status" aria-live="polite"><span /> {loading && loaded ? "UPDATING YOUR SPOTIFY" : "UPDATED FROM YOUR SPOTIFY"}</span></div>
        <div className={styles.sectionHeading}>
          <div><p className={styles.kicker}>A SNAPSHOT OF YOU</p><h2 id="listening-title">The things you <span>love.</span></h2></div>
          {token && <div className={styles.rangeControl} aria-label="Listening period">
            {ranges.map((item) => <button key={item.value} className={range === item.value ? styles.rangeActive : ""} onClick={() => setRange(item.value)} aria-pressed={range === item.value}>{item.label}</button>)}
          </div>}
        </div>

        {!token ? (
          <div className={styles.emptyState}><span className={styles.emptyIcon}><HiMusicalNote /></span><div><h3>Your next favorite might already be here.</h3><p>Connect Spotify to see the tracks and artists at the top of your rotation.</p></div><span className={styles.emptyArrow}>↗</span></div>
        ) : loading && !loaded ? (
          <div className={styles.loadingState}><span className={styles.loader} /> Reading your listening history…</div>
        ) : !loaded ? (
          <div className={styles.emptyState}><span className={styles.emptyIcon}><HiMusicalNote /></span><div><h3>Ready when you are.</h3><p>We couldn’t load this listening period. You can give it another try.</p></div><button className={styles.retryButton} onClick={() => void loadTopItems()}>Try again ↗</button></div>
        ) : (
          <div className={styles.resultsGrid} aria-busy={loading}>
            <section className={styles.resultPanel} aria-labelledby="tracks-title">
              <div className={styles.panelHeading}><div><p className={styles.kicker}>ON REPEAT</p><h3 id="tracks-title">Top tracks</h3></div><span className={styles.countBadge}>{tracks.length.toString().padStart(2, "0")}</span></div>
              <div className={styles.listHeading}><span>RANK / TRACK</span><span>ALBUM</span></div>
              {tracks.length ? tracks.map((track, index) => <a className={styles.trackRow} href={spotifyWebUrl(track.external_urls?.spotify)} target="_blank" rel="noopener noreferrer" key={track.id}>
                <span className={styles.rank}>{(index + 1).toString().padStart(2, "0")}</span><img className={styles.trackCover} src={track.album.images?.[2]?.url ?? track.album.images?.[0]?.url} alt="" /><span className={styles.trackInfo}><strong>{track.name}</strong><small>{track.artists.map((artist) => artist.name).join(", ")}</small></span><span className={styles.albumName}>{track.album.name}</span><HiOutlineArrowTopRightOnSquare className={styles.rowArrow} aria-hidden="true" />
              </a>) : <p className={styles.noResults}>No top tracks found for this period.</p>}
            </section>
            <section className={styles.resultPanel} aria-labelledby="artists-title">
              <div className={styles.panelHeading}><div><p className={styles.kicker}>THE SOUNDTRACK</p><h3 id="artists-title">Top artists</h3></div><span className={styles.countBadge}>{artists.length.toString().padStart(2, "0")}</span></div>
              <div className={styles.artistGrid}>
                {artists.length ? artists.map((artist, index) => <a className={styles.artistCard} href={spotifyWebUrl(artist.external_urls?.spotify)} target="_blank" rel="noopener noreferrer" key={artist.id}>
                  {artist.images?.[0]?.url ? <img src={artist.images[0].url} alt="" /> : <span className={styles.artistFallback}>♫</span>}<span className={styles.artistRank}>{(index + 1).toString().padStart(2, "0")}</span><span className={styles.artistName}>{artist.name}</span>
                </a>) : <p className={styles.noResults}>No top artists found for this period.</p>}
              </div>
            </section>
          </div>
        )}
      </section>
      <footer className={styles.footer}><a className={styles.wordmark} href="#top"><span className={styles.logoMark}>c.</span>checkit</a><span>Your music. Your moments. Yours alone.</span><span>MADE FOR THE LOVE OF LISTENING <b>✳</b></span></footer>
    </main>
  );
}

export default MainPage;
