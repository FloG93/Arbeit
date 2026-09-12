window.Poster = window.Poster || {};

Poster.api = (function () {
  function upgradeArtwork(url, px) {
    if (!url) return url;
    return url.replace(/\/\d+x\d+bb(\.[a-z]+)$/i, '/' + px + 'x' + px + 'bb$1');
  }

  async function searchITunes(term, entity) {
    const url = 'https://itunes.apple.com/search?' + new URLSearchParams({
      term, media: 'music', entity: entity === 'album' ? 'album' : 'song', limit: '16',
    });
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('iTunes-Suche fehlgeschlagen (' + resp.status + ')');
    const json = await resp.json();
    return json.results.map((r) => ({
      source: 'itunes',
      type: entity === 'album' ? 'album' : 'track',
      id: 'itunes:' + (r.trackId || r.collectionId),
      albumId: r.collectionId ? String(r.collectionId) : null,
      title: entity === 'album' ? r.collectionName : r.trackName,
      artist: r.artistName,
      albumName: r.collectionName,
      year: (r.releaseDate || '').slice(0, 4),
      releaseDate: r.releaseDate || '',
      genre: r.primaryGenreName || '',
      durationMs: r.trackTimeMillis || null,
      explicit: r.trackExplicitness === 'explicit' || r.collectionExplicitness === 'explicit',
      coverUrl: r.artworkUrl100 || r.artworkUrl60,
      coverUrlHigh: upgradeArtwork(r.artworkUrl100 || r.artworkUrl60, 2000),
      appleUrl: r.trackViewUrl || r.collectionViewUrl || null,
      spotifyUri: null,
    }));
  }

  // The album behind a hit: tracklist, label, exact release date, total running time.
  // Everything the tracklist-style posters print beyond what a search result carries.
  async function fetchITunesAlbum(collectionId) {
    const url = 'https://itunes.apple.com/lookup?' + new URLSearchParams({
      id: collectionId, entity: 'song', limit: '200',
    });
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('iTunes-Album konnte nicht geladen werden (' + resp.status + ')');
    const json = await resp.json();
    const collection = json.results.find((r) => r.wrapperType === 'collection') || {};
    const tracks = json.results
      .filter((r) => r.wrapperType === 'track' && r.trackName)
      .sort((a, b) => (a.discNumber - b.discNumber) || (a.trackNumber - b.trackNumber))
      .map((t) => ({
        name: t.trackName,
        durationMs: t.trackTimeMillis || 0,
        explicit: t.trackExplicitness === 'explicit',
      }));
    return {
      tracks,
      copyright: collection.copyright || '',
      label: deriveLabel(collection.copyright || ''),
      releaseDate: collection.releaseDate || '',
      genre: collection.primaryGenreName || '',
      explicit: collection.collectionExplicitness === 'explicit',
    };
  }

  // iTunes exposes no label field, only a copyright line like
  // "℗ 2013 Daft Life Limited, under exclusive license to Columbia". The first
  // clause after the year is the closest thing to a label — and stays editable.
  function deriveLabel(copyright) {
    if (!copyright) return '';
    return copyright
      .replace(/^[℗©]\s*/, '')
      .replace(/^\d{4}\s+/, '')
      .split(/,| under | unter /i)[0]
      .trim();
  }

  // Best-effort fallback: only used when a source has no usable cover art.
  async function findCoverViaMusicBrainz(artist, title) {
    try {
      const q = new URLSearchParams({
        query: 'release:"' + title + '" AND artist:"' + artist + '"',
        fmt: 'json',
        limit: '3',
      });
      const resp = await fetch('https://musicbrainz.org/ws/2/release/?' + q);
      if (!resp.ok) return null;
      const json = await resp.json();
      for (const rel of json.releases || []) {
        const caaUrl = 'https://coverartarchive.org/release/' + rel.id + '/front-500';
        try {
          const head = await fetch(caaUrl, { method: 'GET', redirect: 'follow' });
          if (head.ok) return head.url;
        } catch (e) { /* try next release */ }
      }
    } catch (e) { /* offline or blocked — caller falls back further */ }
    return null;
  }

  const Spotify = {
    STORAGE_KEY: 'posterapp.spotify.creds',
    _token: null,
    _tokenExp: 0,

    getCreds() {
      try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || 'null'); }
      catch (e) { return null; }
    },
    setCreds(id, secret) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ id, secret }));
      this._token = null;
    },
    clearCreds() {
      localStorage.removeItem(this.STORAGE_KEY);
      this._token = null;
    },
    isConfigured() {
      const c = this.getCreds();
      return !!(c && c.id && c.secret);
    },

    async getToken() {
      const creds = this.getCreds();
      if (!creds || !creds.id || !creds.secret) return null;
      if (this._token && this._tokenExp > Date.now()) return this._token;
      const resp = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + btoa(creds.id + ':' + creds.secret),
        },
        body: new URLSearchParams({ grant_type: 'client_credentials' }),
      });
      if (!resp.ok) throw new Error('Spotify-Anmeldung fehlgeschlagen (' + resp.status + ')');
      const json = await resp.json();
      this._token = json.access_token;
      this._tokenExp = Date.now() + (json.expires_in - 30) * 1000;
      return this._token;
    },

    async search(term, entity) {
      const token = await this.getToken();
      if (!token) return null;
      const type = entity === 'album' ? 'album' : 'track';
      const url = 'https://api.spotify.com/v1/search?' + new URLSearchParams({ q: term, type, limit: '16' });
      const resp = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      if (!resp.ok) throw new Error('Spotify-Suche fehlgeschlagen (' + resp.status + ')');
      const json = await resp.json();
      const items = type === 'album' ? json.albums.items : json.tracks.items;
      return items.map((it) => {
        const albumImages = (it.album && it.album.images) || it.images || [];
        const releaseDate = (entity === 'album' ? it.release_date : it.album && it.album.release_date) || '';
        return {
          source: 'spotify',
          type: entity === 'album' ? 'album' : 'track',
          id: 'spotify:' + it.id,
          albumId: entity === 'album' ? it.id : (it.album && it.album.id) || null,
          title: it.name,
          artist: (it.artists || []).map((a) => a.name).join(', '),
          albumName: entity === 'album' ? it.name : (it.album && it.album.name) || '',
          year: releaseDate.slice(0, 4),
          releaseDate,
          genre: '',
          durationMs: it.duration_ms || null,
          explicit: !!it.explicit,
          coverUrl: albumImages[0] && albumImages[0].url,
          coverUrlHigh: albumImages[0] && albumImages[0].url,
          appleUrl: null,
          spotifyUri: it.uri,
        };
      });
    },

    // The full album object — unlike search results it carries label, copyrights
    // and the tracklist (paged at 50, so long albums need the follow-up requests).
    async getAlbum(albumId) {
      const token = await this.getToken();
      if (!token) return null;
      const headers = { Authorization: 'Bearer ' + token };
      const resp = await fetch('https://api.spotify.com/v1/albums/' + albumId, { headers });
      if (!resp.ok) throw new Error('Spotify-Album konnte nicht geladen werden (' + resp.status + ')');
      const album = await resp.json();

      let items = (album.tracks && album.tracks.items) || [];
      let next = album.tracks && album.tracks.next;
      while (next && items.length < 200) {
        const page = await fetch(next, { headers });
        if (!page.ok) break;
        const json = await page.json();
        items = items.concat(json.items || []);
        next = json.next;
      }

      return {
        tracks: items.map((t) => ({
          name: t.name,
          durationMs: t.duration_ms || 0,
          explicit: !!t.explicit,
        })),
        copyright: ((album.copyrights || [])[0] || {}).text || '',
        label: album.label || '',
        releaseDate: album.release_date || '',
        genre: (album.genres || [])[0] || '',
        explicit: items.some((t) => t.explicit),
      };
    },

    // Silent background lookup: find a Spotify URI for a track/album found via iTunes.
    async resolveUri(artist, title, type) {
      try {
        const results = await this.search(artist + ' ' + title, type);
        if (results && results.length) return results[0].spotifyUri;
      } catch (e) { /* best effort, no UI feedback needed */ }
      return null;
    },

    // Public, unauthenticated endpoint that renders the real scannable Spotify code.
    scannableUrl(uri, opts) {
      opts = opts || {};
      const bg = (opts.bg || '000000').replace('#', '');
      const codeColor = opts.codeColor === 'black' ? 'black' : 'white';
      const size = opts.size || 640;
      return 'https://scannables.spotify.com/uri/plain/png/' + bg + '/' + codeColor + '/' + size + '/' + encodeURIComponent(uri);
    },
  };

  // Primary combined search: Spotify first when configured (real catalogue + real codes),
  // otherwise the login-free iTunes Search API.
  async function search(term, entity) {
    if (Spotify.isConfigured()) {
      try {
        const results = await Spotify.search(term, entity);
        if (results && results.length) return { results, source: 'spotify' };
      } catch (e) {
        console.warn('Spotify-Suche fehlgeschlagen, weiche auf iTunes aus:', e);
      }
    }
    const results = await searchITunes(term, entity);
    return { results, source: 'itunes' };
  }

  // Tracklist + album metadata for a hit, from whichever source can answer:
  // its own first, then the other one matched by artist + album name.
  async function fetchAlbumDetails(result) {
    if (result.source === 'spotify' && result.albumId && Spotify.isConfigured()) {
      try {
        const details = await Spotify.getAlbum(result.albumId);
        if (details) return details;
      } catch (e) {
        console.warn('Spotify-Albumdetails fehlgeschlagen, weiche auf iTunes aus:', e);
      }
    }
    if (result.source === 'itunes' && result.albumId) {
      return fetchITunesAlbum(result.albumId);
    }
    const albumName = result.albumName || result.title;
    if (!albumName) return null;
    const hits = await searchITunes(result.artist + ' ' + albumName, 'album');
    const match = hits.find((h) => h.albumId);
    return match ? fetchITunesAlbum(match.albumId) : null;
  }

  return {
    search, searchITunes, fetchAlbumDetails, findCoverViaMusicBrainz, Spotify, upgradeArtwork,
  };
})();
