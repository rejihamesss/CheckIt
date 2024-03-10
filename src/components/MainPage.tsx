import { useEffect, useState } from "react";
import axios from "axios";
import styles from "../styles/ItemStyles.module.css";
import { Tooltip } from "react-tooltip";
import { HiOutlineInformationCircle } from "react-icons/hi";
// import RecommendationPage from "./RecommendationPage";

const AUTH_END_POINT = import.meta.env.VITE_SPOTIFY_APP_AUTH_ENDPOINT;
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_APP_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_APP_REDIRECT_URI;
const SCOPES = import.meta.env.VITE_SPOTIFY_APP_SCOPES.split(", ");
const SPACE_DELIMITER = "%20";

const JOIN_SCOPES = SCOPES.join(SPACE_DELIMITER);

const generateRandomString = (length: number) => {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const STATE = generateRandomString(16);
// const codeVerifier = generateRandomString(64);

// const sha256 = async (plain: any) => {
//   const encoder = new TextEncoder();
//   const data = encoder.encode(plain);
//   return window.crypto.subtle.digest("SHA-256", data);
// };

interface UrlFromImagesAlbums {
  url: string;
}

interface Tracks {
  id: string;
  name: string;
  album: {
    images: Array<UrlFromImagesAlbums>;
  };
  artists: Array<ArtistsFromTracks>;
}

interface ArtistsFromTracks {
  name: string;
}

interface UrlFromImagesArtists {
  url: string;
}

interface Artists {
  id: string;
  name: string;
  images: Array<UrlFromImagesArtists>;
}

const MainPage = () => {
  const [tokenOnly, setTokenOnly] = useState("");
  const [tracks, setTracks] = useState<Tracks[]>([]);
  const [artists, setArtists] = useState<Artists[]>([]);
  const [countTracks, setCountTracks] = useState(1);
  const [countArtist, setCountArtists] = useState(1);

  useEffect(() => {
    const hash = window.location.hash;
    let tokenOnly = window.localStorage.getItem("token");

    if (!tokenOnly && hash) {
      tokenOnly =
        hash
          .substring(1)
          .split("&")
          .find((elem) => elem.startsWith("access_token"))
          ?.split("=")[1] || null;

      window.location.hash = "";

      if (tokenOnly) {
        window.localStorage.setItem("token", tokenOnly);
      }
    }

    if (tokenOnly) {
      setTokenOnly(tokenOnly);
    }

    console.log(tokenOnly);
  }, []);

  const handleOnClick = () => {
    window.location.href = `${AUTH_END_POINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${STATE}&scope=${JOIN_SCOPES}&response_type=token&show_dialog=true`;
  };

  const handleOnLogout = () => {
    setTokenOnly("");
    window.localStorage.removeItem("token");
  };

  const getTracks = async () => {
    try {
      const { data } = await axios.get(
        "https://api.spotify.com/v1/me/top/tracks",
        {
          headers: {
            Authorization: `Bearer ${tokenOnly}`,
          },
        }
      );

      console.log(data.items);
      setTracks(data.items);
      setCountTracks(data.items.length);
      return true;
    } catch (error) {
      console.log(error);
    }
  };

  const getTopArtists = async () => {
    try {
      const { data } = await axios.get(
        "https://api.spotify.com/v1/me/top/artists",
        {
          headers: {
            Authorization: `Bearer ${tokenOnly}`,
          },
        }
      );

      console.log(data.items);
      setArtists(data.items);
      setCountArtists(data.items.length);
      return true;
    } catch (error) {
      console.log(error);
    }
  };

  const renderArtists = () => {
    let count = 1;

    if (!countArtist) {
      return <h2>You don't have any Top Artists yet, keep listening!</h2>;
    }
    return artists.map((artists) => (
      <div
        key={artists.id}
        className={
          count === 1 ? styles.topOneArtistCard : styles.topArtistsCard
        }
        style={{
          backgroundImage: `url(${artists.images[0].url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        TOP {count++} - {artists.name}
      </div>
    ));
  };

  const renderTracks = () => {
    let count = 1;

    if (!countTracks) {
      return <h2>Uh-oh! I think you haven't listened to enough songs!</h2>;
    }
    return tracks.map((tracks) => (
      <div
        className={count === 1 ? styles.topOneTrackCard : styles.topTracksCard}
        key={tracks.id}
        style={{
          backgroundImage: `url(${tracks.album.images[0].url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        TOP {count++} | {tracks.name} by {tracks.artists[0].name}
      </div>
    ));
  };

  const wrapStats = () => {
    getTracks();
    getTopArtists();
  };

  return (
    <>
      {tokenOnly ? (
        <div>
          <button onClick={handleOnLogout}>Log Out</button>
          <div className={styles.submitContainer}>
            <button onClick={wrapStats}>Show me my Favorites!</button>
            <a
              data-tooltip-id="my-tooltip"
              data-tooltip-html="Just a side note, your favorite songs are <br /> approximately based from the last 6 months!"
              data-tooltip-place="right"
            >
              <HiOutlineInformationCircle size={30} />
            </a>
            <Tooltip id="my-tooltip" />
          </div>
          <div>
            <span>
              <h1>My Top Tracks</h1>
              <div className={styles.topTracksContainer}>{renderTracks()}</div>
              <h1>My Top Artists</h1>
              <div className={styles.topArtistsContainer}>
                {renderArtists()}
              </div>
            </span>
          </div>
        </div>
      ) : (
        <div>
          <button onClick={handleOnClick}> Click to Login </button>

          <h4>Please Log in</h4>
        </div>
      )}
    </>
  );
};

export default MainPage;
