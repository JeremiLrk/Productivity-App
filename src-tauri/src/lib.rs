use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::{distributions::Alphanumeric, Rng};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    io::{Read, Write},
    net::TcpListener,
    sync::Mutex,
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{Manager, State};
use url::Url;

const SPOTIFY_CLIENT_ID: &str = "41e2c07c60e24e4bb7c5493891f19728";
const SPOTIFY_REDIRECT_URI: &str = "http://127.0.0.1:8888/callback";
const SPOTIFY_SCOPES: &str = "user-read-currently-playing user-read-playback-state user-modify-playback-state";

#[derive(Clone, Debug)]
struct SpotifyTokens {
    access_token: String,
    refresh_token: String,
    expires_at_ms: u128,
}

#[derive(Default)]
struct SpotifyState {
    tokens: Mutex<Option<SpotifyTokens>>,
}

#[derive(Debug, Deserialize)]
struct SpotifyTokenResponse {
    access_token: String,
    expires_in: u64,
    refresh_token: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SpotifyImage {
    url: String,
}

#[derive(Debug, Deserialize)]
struct SpotifyArtist {
    name: String,
}

#[derive(Debug, Deserialize)]
struct SpotifyAlbum {
    name: String,
    images: Vec<SpotifyImage>,
}

#[derive(Debug, Deserialize)]
struct SpotifyTrack {
    name: String,
    duration_ms: u64,
    artists: Vec<SpotifyArtist>,
    album: SpotifyAlbum,
}

#[derive(Debug, Deserialize)]
struct SpotifyPlaybackResponse {
    is_playing: bool,
    progress_ms: Option<u64>,
    item: Option<SpotifyTrack>,
}

#[derive(Debug, Serialize)]
struct SpotifyPlayback {
    connected: bool,
    is_playing: bool,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    album_art_url: Option<String>,
    progress_ms: Option<u64>,
    duration_ms: Option<u64>,
}

#[tauri::command]
fn focus_main(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        win.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn spotify_login(state: State<'_, SpotifyState>) -> Result<(), String> {
    let code_verifier = generate_random_string(64);
    let code_challenge = generate_code_challenge(&code_verifier);
    let login_state = generate_random_string(32);
    let auth_url = build_authorize_url(&code_challenge, &login_state)?;

    let listener = TcpListener::bind("127.0.0.1:8888")
        .map_err(|e| format!("Could not start Spotify callback listener on 127.0.0.1:8888: {e}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|e| format!("Could not configure Spotify callback listener: {e}"))?;

    open::that(auth_url).map_err(|e| format!("Could not open Spotify login in your browser: {e}"))?;

    let code = tauri::async_runtime::spawn_blocking(move || wait_for_spotify_code(listener, &login_state))
        .await
        .map_err(|e| format!("Spotify login listener failed: {e}"))??;

    let tokens = exchange_code_for_tokens(&code, &code_verifier).await?;
    let mut token_lock = state
        .tokens
        .lock()
        .map_err(|_| "Could not store Spotify tokens".to_string())?;
    *token_lock = Some(tokens);

    Ok(())
}

#[tauri::command]
fn spotify_disconnect(state: State<'_, SpotifyState>) -> Result<(), String> {
    let mut token_lock = state
        .tokens
        .lock()
        .map_err(|_| "Could not clear Spotify tokens".to_string())?;
    *token_lock = None;
    Ok(())
}

#[tauri::command]
async fn spotify_current_playback(state: State<'_, SpotifyState>) -> Result<SpotifyPlayback, String> {
    let access_token = ensure_access_token(&state).await?;
    let Some(access_token) = access_token else {
        return Ok(SpotifyPlayback {
            connected: false,
            is_playing: false,
            title: None,
            artist: None,
            album: None,
            album_art_url: None,
            progress_ms: None,
            duration_ms: None,
        });
    };

    let response = reqwest::Client::new()
        .get("https://api.spotify.com/v1/me/player")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Could not reach Spotify playback API: {e}"))?;

    if response.status() == StatusCode::NO_CONTENT {
        return Ok(SpotifyPlayback {
            connected: true,
            is_playing: false,
            title: None,
            artist: None,
            album: None,
            album_art_url: None,
            progress_ms: None,
            duration_ms: None,
        });
    }

    if !response.status().is_success() {
        return Err(format_spotify_error(response).await);
    }

    let playback = response
        .json::<SpotifyPlaybackResponse>()
        .await
        .map_err(|e| format!("Could not parse Spotify playback response: {e}"))?;

    let item = playback.item;
    let artist = item
        .as_ref()
        .map(|track| track.artists.iter().map(|artist| artist.name.as_str()).collect::<Vec<_>>().join(", "));
    let album_art_url = item
        .as_ref()
        .and_then(|track| track.album.images.first().map(|image| image.url.clone()));

    Ok(SpotifyPlayback {
        connected: true,
        is_playing: playback.is_playing,
        title: item.as_ref().map(|track| track.name.clone()),
        artist,
        album: item.as_ref().map(|track| track.album.name.clone()),
        album_art_url,
        progress_ms: playback.progress_ms,
        duration_ms: item.as_ref().map(|track| track.duration_ms),
    })
}

#[tauri::command]
async fn spotify_next(state: State<'_, SpotifyState>) -> Result<(), String> {
    spotify_player_command(&state, "https://api.spotify.com/v1/me/player/next").await
}

#[tauri::command]
async fn spotify_previous(state: State<'_, SpotifyState>) -> Result<(), String> {
    spotify_player_command(&state, "https://api.spotify.com/v1/me/player/previous").await
}

#[tauri::command]
async fn spotify_pause(state: State<'_, SpotifyState>) -> Result<(), String> {
    spotify_player_command(&state, "https://api.spotify.com/v1/me/player/pause").await
}

#[tauri::command]
async fn spotify_resume(state: State<'_, SpotifyState>) -> Result<(), String> {
    spotify_player_command(&state, "https://api.spotify.com/v1/me/player/play").await
}

fn generate_random_string(length: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(length)
        .map(char::from)
        .collect()
}

fn generate_code_challenge(code_verifier: &str) -> String {
    let digest = Sha256::digest(code_verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(digest)
}

fn build_authorize_url(code_challenge: &str, state: &str) -> Result<String, String> {
    let mut url = Url::parse("https://accounts.spotify.com/authorize")
        .map_err(|e| format!("Could not build Spotify authorization URL: {e}"))?;
    url.query_pairs_mut()
        .append_pair("client_id", SPOTIFY_CLIENT_ID)
        .append_pair("response_type", "code")
        .append_pair("redirect_uri", SPOTIFY_REDIRECT_URI)
        .append_pair("scope", SPOTIFY_SCOPES)
        .append_pair("state", state)
        .append_pair("code_challenge_method", "S256")
        .append_pair("code_challenge", code_challenge)
        .append_pair("show_dialog", "true");
    Ok(url.to_string())
}

fn wait_for_spotify_code(listener: TcpListener, expected_state: &str) -> Result<String, String> {
    let deadline = SystemTime::now() + Duration::from_secs(120);

    loop {
        if SystemTime::now() > deadline {
            return Err("Spotify login timed out. Try connecting again.".to_string());
        }

        match listener.accept() {
            Ok((mut stream, _)) => {
                let mut buffer = [0_u8; 4096];
                let bytes_read = stream
                    .read(&mut buffer)
                    .map_err(|e| format!("Could not read Spotify callback: {e}"))?;
                let request = String::from_utf8_lossy(&buffer[..bytes_read]);
                let request_line = request
                    .lines()
                    .next()
                    .ok_or_else(|| "Spotify callback request was empty".to_string())?;
                let path = request_line
                    .split_whitespace()
                    .nth(1)
                    .ok_or_else(|| "Spotify callback path was missing".to_string())?;

                let callback_url = Url::parse(&format!("http://127.0.0.1{path}"))
                    .map_err(|e| format!("Could not parse Spotify callback URL: {e}"))?;
                let code = callback_url
                    .query_pairs()
                    .find(|(key, _)| key == "code")
                    .map(|(_, value)| value.to_string());
                let returned_state = callback_url
                    .query_pairs()
                    .find(|(key, _)| key == "state")
                    .map(|(_, value)| value.to_string());
                let error = callback_url
                    .query_pairs()
                    .find(|(key, _)| key == "error")
                    .map(|(_, value)| value.to_string());

                let body = if error.is_some() {
                    "<h1>Spotify connection failed</h1><p>You can close this tab and return to LOCK IN.</p>"
                } else {
                    "<h1>Spotify connected</h1><p>You can close this tab and return to LOCK IN.</p>"
                };
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\r\n{}",
                    body.len(),
                    body
                );
                let _ = stream.write_all(response.as_bytes());

                if let Some(error) = error {
                    return Err(format!("Spotify login was cancelled or denied: {error}"));
                }
                if returned_state.as_deref() != Some(expected_state) {
                    return Err("Spotify login state did not match. Try connecting again.".to_string());
                }
                return code.ok_or_else(|| "Spotify callback did not include a code".to_string());
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(100));
            }
            Err(error) => return Err(format!("Spotify callback listener failed: {error}")),
        }
    }
}

async fn exchange_code_for_tokens(code: &str, code_verifier: &str) -> Result<SpotifyTokens, String> {
    let response = reqwest::Client::new()
        .post("https://accounts.spotify.com/api/token")
        .form(&[
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", SPOTIFY_REDIRECT_URI),
            ("client_id", SPOTIFY_CLIENT_ID),
            ("code_verifier", code_verifier),
        ])
        .send()
        .await
        .map_err(|e| format!("Could not reach Spotify token API: {e}"))?;

    if !response.status().is_success() {
        return Err(format_spotify_error(response).await);
    }

    let token_response = response
        .json::<SpotifyTokenResponse>()
        .await
        .map_err(|e| format!("Could not parse Spotify token response: {e}"))?;

    let refresh_token = token_response
        .refresh_token
        .ok_or_else(|| "Spotify did not return a refresh token".to_string())?;

    Ok(SpotifyTokens {
        access_token: token_response.access_token,
        refresh_token,
        expires_at_ms: now_ms() + u128::from(token_response.expires_in.saturating_sub(60)) * 1000,
    })
}

async fn ensure_access_token(state: &State<'_, SpotifyState>) -> Result<Option<String>, String> {
    let tokens = {
        state
            .tokens
            .lock()
            .map_err(|_| "Could not read Spotify tokens".to_string())?
            .clone()
    };

    let Some(tokens) = tokens else {
        return Ok(None);
    };

    if tokens.expires_at_ms > now_ms() {
        return Ok(Some(tokens.access_token));
    }

    let refreshed = refresh_access_token(&tokens.refresh_token).await?;
    let access_token = refreshed.access_token.clone();
    let mut token_lock = state
        .tokens
        .lock()
        .map_err(|_| "Could not store refreshed Spotify token".to_string())?;
    *token_lock = Some(refreshed);

    Ok(Some(access_token))
}

async fn refresh_access_token(refresh_token: &str) -> Result<SpotifyTokens, String> {
    let response = reqwest::Client::new()
        .post("https://accounts.spotify.com/api/token")
        .form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
            ("client_id", SPOTIFY_CLIENT_ID),
        ])
        .send()
        .await
        .map_err(|e| format!("Could not refresh Spotify token: {e}"))?;

    if !response.status().is_success() {
        return Err(format_spotify_error(response).await);
    }

    let token_response = response
        .json::<SpotifyTokenResponse>()
        .await
        .map_err(|e| format!("Could not parse Spotify refresh response: {e}"))?;

    Ok(SpotifyTokens {
        access_token: token_response.access_token,
        refresh_token: token_response
            .refresh_token
            .unwrap_or_else(|| refresh_token.to_string()),
        expires_at_ms: now_ms() + u128::from(token_response.expires_in.saturating_sub(60)) * 1000,
    })
}

async fn spotify_player_command(state: &State<'_, SpotifyState>, url: &str) -> Result<(), String> {
    let access_token = ensure_access_token(state).await?;
    let Some(access_token) = access_token else {
        return Err("Niet verbonden met Spotify".to_string());
    };

    let client = reqwest::Client::new();
    
    // 1. Bepaal de juiste methode (PUT voor pause/play, POST voor next/previous)
    let request_builder = if url.ends_with("/pause") || url.ends_with("/play") {
        client.put(url)
    } else {
        client.post(url)
    };

    // 2. Bouw de headers op en dwing "content-length: 0" af
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        reqwest::header::CONTENT_LENGTH,
        reqwest::header::HeaderValue::from_static("0"), // 👈 Dit forceert de 0 byte header
    );

    // 3. Stuur het verzoek met de geforceerde header én een lege body string
    let response = request_builder
        .bearer_auth(access_token)
        .headers(headers)
        .body("") 
        .send()
        .await
        .map_err(|e| format!("Could not reach Spotify player API: {e}"))?;

    if !response.status().is_success() {
        return Err(format_spotify_error(response).await);
    }

    Ok(())
}


async fn format_spotify_error(response: reqwest::Response) -> String {
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    if body.is_empty() {
        format!("Spotify API returned {status}")
    } else {
        format!("Spotify API returned {status}: {body}")
    }
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

pub fn run() {
    tauri::Builder::default()
        .manage(SpotifyState::default())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            focus_main,
            spotify_login,
            spotify_disconnect,
            spotify_current_playback,
            spotify_next,
            spotify_previous,
            spotify_pause,
            spotify_resume
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
