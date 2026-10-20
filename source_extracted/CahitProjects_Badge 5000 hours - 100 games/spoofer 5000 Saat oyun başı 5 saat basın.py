#!/usr/bin/env python3
"""
Discord Science Spoofer - Oyun Saati ve Rozet Hilesi

Geliştirici: Cahit Projects
YouTube: https://www.youtube.com/@cahitgergin
Discord: discord.gg/cahit

Bu araç Discord'un /api/v9/science uç noktasına sahte (spoof) veriler göndererek 
profilinizdeki oynanan oyun saatini ve sayısını artırır.
"""

from __future__ import annotations

import base64
import json
import sys
import time
import uuid
import random
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterator, Sequence

# Yollar
ROOT = Path(__file__).resolve().parent
GAMES_FILE = ROOT.parent / "data" / "games.json"     # Tam oyun listesi
STATE_FILE = ROOT / "science_state.json"             # Kayıtlı token, cookie ve ayarlar

ME_URL = "https://discord.com/api/v9/users/@me?with_analytics_token=true"
SCIENCE_URL = "https://discord.com/api/v9/science"
PROPERTIES_URL = "https://cordapi.dolfi.es/api/v2/properties/windows"  
GAMES_CDN_URL = "https://cdn.discordapp.com/detectables/games.json"  

BATCH_SIZE = 100          # Gönderim hızı için her paketteki oyun sayısı
BATCH_DELAY = 0.3         # Paketler arası sabit gecikme
AUTH_MAX_AGE = 12 * 3600  # Token yenileme süresi
DEBUG = False

# İstemci Kimliği (Client Identity)
CLIENT_VERSION = "1.0.9253"
CLIENT_BUILD_NUMBER = 594031
NATIVE_BUILD_NUMBER = 88414
OS_VERSION = "10.0.26200"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) discord/1.0.9253 Chrome/148.0.7778.280 "
    "Electron/42.7.1 Safari/537.36"
)

class Console:
    """Renkli konsol çıktıları için."""

    RED = "\x1b[91m"
    ORANGE = "\x1b[38;5;208m"
    GREEN = "\x1b[92m"
    YELLOW = "\x1b[93m"
    WHITE = "\x1b[97m"
    GREY = "\x1b[90m"
    RESET = "\x1b[0m"
    RULE = "─" * 44

    def __init__(self) -> None:
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
        if sys.platform == "win32":
            self._enable_ansi()

    @staticmethod
    def _enable_ansi() -> None:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        handle = kernel32.GetStdHandle(-11)
        mode = ctypes.c_uint32()
        if kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
            kernel32.SetConsoleMode(handle, mode.value | 0x0004)

    def _stamp(self) -> str:
        return f"{self.GREY}{time.strftime('%H:%M:%S')}{self.RESET}"

    def _line(self, glyph: str, target: str, detail: str, color: str) -> None:
        print(f"  {self._stamp()} {glyph} {self.WHITE}{target}{self.RESET} "
              f"{self.GREY}·{self.RESET} {color}{detail}{self.RESET}")

    def ok(self, target: str, detail: str) -> None:
        self._line(f"{self.GREEN}✓{self.RESET}", target, detail, self.GREEN)

    def sent(self, target: str, detail: str) -> None:
        self._line(f"{self.GREY}·{self.RESET} {self.GREEN}Yollandı{self.RESET}", target, detail, self.GREEN)

    def warn(self, target: str, detail: str) -> None:
        self._line(f"{self.YELLOW}!{self.RESET}", target, detail, self.YELLOW)

    def err(self, target: str, detail: str) -> None:
        self._line(f"{self.RED}✗{self.RESET}", target, detail, self.RED)

    def info(self, detail: str) -> None:
        print(f"  {self._stamp()} {self.GREY}·{self.RESET} {self.WHITE}{detail}{self.RESET}")

    def rule(self) -> None:
        print(f"  {self.GREY}{self.RULE}{self.RESET}")

    def clear(self) -> None:
        print("\x1b[2J\x1b[3J\x1b[H", end="")

    def banner(self) -> None:
        self.clear()
        print()
        print(f"  {self.ORANGE}╔══════════════════════════════════════════════════════════════════════╗{self.RESET}")
        print(f"  {self.ORANGE}║{self.RESET} {self.WHITE}Cahit Projects Spoofer - Discord Oyun & Saat Rozeti Hilesi{self.RESET}           {self.ORANGE}║{self.RESET}")
        print(f"  {self.ORANGE}╠══════════════════════════════════════════════════════════════════════╣{self.RESET}")
        print(f"  {self.ORANGE}║{self.RESET} {self.GREY}Geliştirici:{self.RESET} {self.WHITE}Cahit Projects{self.RESET}                                          {self.ORANGE}║{self.RESET}")
        print(f"  {self.ORANGE}║{self.RESET} {self.RED}YouTube:{self.RESET} {self.WHITE}https://www.youtube.com/@cahitgergin{self.RESET}                        {self.ORANGE}║{self.RESET}")
        print(f"  {self.ORANGE}║{self.RESET} {self.RED}Discord:{self.RESET} {self.WHITE}discord.gg/cahit{self.RESET}                                            {self.ORANGE}║{self.RESET}")
        print(f"  {self.ORANGE}╚══════════════════════════════════════════════════════════════════════╝{self.RESET}")
        print()
        print(f"  {self.RED}╔═════════════════════════ YASAL UYARI & BİLGİLENDİRME ═════════════════════════╗{self.RESET}")
        print(f"  {self.RED}║{self.RESET} {self.YELLOW}1.{self.RESET} {self.WHITE}Bu yazılım Discord Hizmet Şartları'na (TOS) aykırıdır.{self.RESET}                     {self.RED}║{self.RESET}")
        print(f"  {self.RED}║{self.RESET} {self.YELLOW}2.{self.RESET} {self.WHITE}Ban yeme riski tamamen SİZE aittir!{self.RESET}                                        {self.RED}║{self.RESET}")
        print(f"  {self.RED}║{self.RESET} {self.YELLOW}3.{self.RESET} {self.WHITE}Oluşabilecek hesap kapanmalarından Cahit Projects sorumlu tutulamaz.{self.RESET}       {self.RED}║{self.RESET}")
        print(f"  {self.RED}║{self.RESET} {self.YELLOW}4.{self.RESET} {self.WHITE}Özellikle ana (değerli) hesaplarınızda kullanırken dikkatli olun.{self.RESET}          {self.RED}║{self.RESET}")
        print(f"  {self.RED}╚═══════════════════════════════════════════════════════════════════════════════╝{self.RESET}")
        print()


@dataclass
class State:
    """Kaydedilen hesap ayarları."""
    token: str = ""
    cookie: str = ""
    fingerprint: str = ""
    analytics_token: str = ""
    fetched_at: int = 0

    @classmethod
    def load(cls) -> "State":
        if STATE_FILE.exists():
            data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
            return cls(**{k: data.get(k, v) for k, v in cls().__dict__.items()})
        return cls()

    def save(self) -> None:
        STATE_FILE.write_text(json.dumps(asdict(self), indent=2), encoding="utf-8")

    @property
    def is_stale(self) -> bool:
        return not self.analytics_token or (time.time() - self.fetched_at) > AUTH_MAX_AGE

    @property
    def has_cookie(self) -> bool:
        return bool(self.cookie.strip())

    @property
    def has_token(self) -> bool:
        return bool(self.token.strip())


def _local_props() -> dict:
    return {
        "os": "Windows",
        "browser": "Discord Client",
        "release_channel": "stable",
        "client_version": CLIENT_VERSION,
        "os_version": OS_VERSION,
        "os_arch": "x64",
        "app_arch": "x64",
        "system_locale": "tr-TR",
        "has_client_mods": False,
        "browser_user_agent": USER_AGENT,
        "browser_version": "42.7.1",
        "os_sdk_version": "26200",
        "client_build_number": CLIENT_BUILD_NUMBER,
        "native_build_number": NATIVE_BUILD_NUMBER,
        "client_event_source": None,
        "client_app_state": "focused",
    }


def build_super_props(launch_signature: str, heartbeat_session: str) -> str:
    try:
        req = urllib.request.Request(PROPERTIES_URL, method="POST", data=b"{}",
                                     headers={"content-type": "application/json", "user-agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=10) as response:
            props = json.loads(response.read().decode("utf-8"))["properties"]
    except Exception:
        props = _local_props()
    props["client_launch_id"] = str(uuid.uuid4())
    props["launch_signature"] = launch_signature
    props["client_heartbeat_session_id"] = heartbeat_session
    raw = json.dumps(props, separators=(",", ":")).encode("utf-8")
    return base64.b64encode(raw).decode("ascii")


def _read_analytics_token(auth_token: str) -> str:
    req = urllib.request.Request(ME_URL, headers={"authorization": auth_token, "user-agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Token reddedildi ({exc.code}). Doğru girdiğinizden emin olun.") from exc
    token = data.get("analytics_token")
    if not token:
        raise RuntimeError("Yanıtta analytics_token bulunamadı.")
    return token


def ensure_token(state: State) -> None:
    if not state.is_stale:
        return
    state.analytics_token = _read_analytics_token(state.token)
    state.fetched_at = int(time.time())
    state.save()


@dataclass(frozen=True)
class Session:
    heartbeat_session: str
    launch_signature: str
    super_props: str

    @classmethod
    def new(cls) -> "Session":
        hb = str(uuid.uuid4())
        sig = str(uuid.uuid4())
        return cls(hb, sig, build_super_props(sig, hb))


@dataclass(frozen=True)
class Game:
    id: str
    name: str
    exe: str


def _win_exe(game: dict) -> str:
    for entry in game.get("executables", []):
        if entry.get("os") == "win32" and entry.get("name"):
            return entry["name"]
    return "game.exe"


def _download_games() -> str:
    request = urllib.request.Request(GAMES_CDN_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read().decode("utf-8")
    GAMES_FILE.parent.mkdir(parents=True, exist_ok=True)
    GAMES_FILE.write_text(raw, encoding="utf-8")
    return raw


def load_games() -> list[Game]:
    if GAMES_FILE.exists():
        raw = GAMES_FILE.read_text(encoding="utf-8")
    else:
        try:
            raw = _download_games()
        except Exception:
            return []
    data = json.loads(raw)
    games: list[Game] = []
    seen: set[str] = set()
    for entry in data:
        gid = str(entry.get("id", ""))
        if not gid.isdigit() or gid in seen:
            continue
        if not any(e.get("os") == "win32" and e.get("name") for e in entry.get("executables", [])):
            continue
        seen.add(gid)
        games.append(Game(gid, entry.get("name", "Unknown"), _win_exe(entry)))
    return games


class ScienceClient:
    def __init__(self, state: State, session: Session) -> None:
        self.state = state
        self.session = session
        self._seq = 0

    def _next_seq(self) -> int:
        self._seq += 1
        return self._seq

    def build_launch(self, game: Game) -> dict:
        now = int(time.time() * 1000)
        props = {
            "client_track_timestamp": now,
            "client_heartbeat_session_id": self.session.heartbeat_session,
            "event_sequence_number": self._next_seq(),
            "game": game.name,
            "game_id": game.id,
            "verified": True,
            "elevated": False,
            "is_launcher": False,
            "game_platform": "desktop",
            "detection_method": "verified_game",
            "is_overlay_enabled": False,
            "is_overlay_game_enabled": True,
            "is_overlay_game_source": "OOP_DEFAULT_DATABASE",
            "fullscreen_type": "UNKNOWN",
            "hardware_display_count": 1,
            "overlay_method": "Disabled",
            "activity_status_enabled": True,
            "activity_status_shared_guilds": [],
            "current_user_status": "online",
            "game_detection_enabled": True,
            "executable_path": game.exe,
            "voice_channel_id": None,
            "voice_channel_type": None,
            "voice_channel_bitrate": None,
            "voice_channel_guild_id": None,
            "hidden_by_distributor": False,
            "game_metadata": None,
            "executable_fingerprint": self.state.fingerprint,
            "client_performance_cpu": None,
            "client_performance_memory": None,
            "cpu_core_count": None,
            "accessibility_features": 0,
            "rendered_locale": "tr-TR",
            "launch_signature": self.session.launch_signature,
            "client_rtc_state": None,
            "client_app_state": "focused",
            "client_send_timestamp": now,
        }
        if not self.state.fingerprint:
            del props["executable_fingerprint"]
        return {"type": "launch_game", "properties": props}

    def build_heartbeat(self, game: Game, duration_ms: int, session_id: str,
                        initial: bool, final: bool, ts: int | None = None) -> dict:
        ts = int(time.time() * 1000) if ts is None else ts
        return {
            "type": "running_game_heartbeat",
            "properties": {
                "client_track_timestamp": ts,
                "client_heartbeat_session_id": self.session.heartbeat_session,
                "event_sequence_number": self._next_seq(),
                "game_id": game.id,
                "game_name": game.name,
                "game_metadata": None,
                "game_executable": game.exe,
                "game_detection_enabled": True,
                "initial_heartbeat": initial,
                "final_heartbeat": final,
                "game_session_id": session_id,
                "duration_tracked_ms": duration_ms,
                "rtc_connection_id": None,
                "media_session_id": None,
                "launch_signature": self.session.launch_signature,
                "client_app_state": "focused",
                "client_send_timestamp": ts,
            },
        }

    def build_session(self, game: Game, duration_ms: int) -> list[dict]:
        sid = str(uuid.uuid4())
        now = int(time.time() * 1000)
        start = now - duration_ms
        if start < 0:
            start = now
        return [
            self.build_heartbeat(game, 0, sid, initial=True, final=False, ts=start),
            self.build_launch(game),
            self.build_heartbeat(game, duration_ms, sid, initial=False, final=True, ts=now),
        ]

    def post(self, events: Sequence[dict]) -> int:
        payload = {"token": self.state.analytics_token, "events": list(events)}
        body = json.dumps(payload).encode("utf-8")
        headers = {
            "accept": "*/*",
            "accept-language": "tr-TR",
            "authorization": self.state.token,
            "content-type": "application/json",
            "cookie": self.state.cookie,
            "origin": "https://discord.com",
            "referer": "https://discord.com/channels/@me",
            "user-agent": USER_AGENT,
            "x-debug-options": "bugReporterEnabled",
            "x-discord-locale": "tr-TR",
            "x-discord-timezone": "Europe/Istanbul",
            "x-super-properties": self.session.super_props,
        }
        if DEBUG:
            print("\n" + "=" * 72)
            print(f"POST {SCIENCE_URL} ({len(payload['events'])} events)")
            print("=" * 72)
        request = urllib.request.Request(SCIENCE_URL, data=body, method="POST", headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                return response.status
        except urllib.error.HTTPError as exc:
            return exc.code
        except Exception:
            return 0


def _chunked(items: Sequence[Game], size: int) -> Iterator[Sequence[Game]]:
    for start in range(0, len(items), size):
        yield items[start:start + size]


class Spoofer:
    def __init__(self, client: ScienceClient, console: Console) -> None:
        self.client = client
        self.console = console

    def run(self, games: Sequence[Game], build_events) -> int:
        total = len(games)
        sent_ok = 0
        for request_no, chunk in enumerate(_chunked(games, BATCH_SIZE), start=1):
            events = []
            for game in chunk:
                events.extend(build_events(game))
            status = self.client.post(events)
            if status == 204:
                sent_ok += len(chunk)
                self.console.sent(f"Paket {request_no}", f"{sent_ok}/{total} oyun işlendi")
            elif status in (401, 403):
                self.console.err(f"Paket {request_no}",
                                 f"[{status}] Yetki reddedildi! 3 numaralı menüden Token ve Cookie yenileyin.")
                return sent_ok
            else:
                self.console.warn(f"Paket {request_no}", f"[{status}] Beklenmeyen hata kodu")
            
            # Anti-Spam / En Hızlı ve Legit mod: Rastgele bekleme (0.5 - 1.5 sn)
            time.sleep(BATCH_DELAY + random.uniform(0.5, 1.5))
        return sent_ok


class App:
    def __init__(self) -> None:
        self.console = Console()
        self.state = State.load()
        self.session: Session | None = None
        self.client: ScienceClient | None = None
        self.games: list[Game] = []

    def start(self) -> None:
        self.console.banner()

        if not self.state.has_token:
            self._prompt_token()
        if not self.state.has_token:
            self.console.err("Token", "Devam etmek için token zorunludur!")
            return

        self.games = load_games()[:1000]
        if not self.games:
            self.console.err("Oyunlar", f"Oyun listesi bulunamadı veya boş: {GAMES_FILE}")
            return
        self.console.info(f"Sistemdeki {self.console.GREEN}{len(self.games)}{self.console.WHITE} oyun başarıyla yüklendi.")

        if not self.state.fingerprint:
            self.console.warn("Parmak İzi", "EKSİK! Sadece saat kasabilirsiniz. Oyun sayısı rozeti için parmak izi ayarlamalısınız.")

        try:
            ensure_token(self.state)
        except Exception as exc:
            self.console.err("Token Hatası", str(exc))
            return
        self._new_session()

        self.menu()

    def _new_session(self) -> None:
        self.session = Session.new()
        self.client = ScienceClient(self.state, self.session)

    def _prompt_token(self) -> None:
        self.console.info("Lütfen Discord Hesap Token'ınızı giriniz.")
        self.console.info("Bulmak için: Discord'dayken F12'ye basın -> Network(Ağ) -> Filtreye 'science' yazın.")
        self.console.info("Herhangi bir science isteğine tıklayıp 'authorization' başlığındaki kodu kopyalayın.")
        entered = input(f"  {self.console.GREY}Token:{self.console.RESET} ").strip()
        if entered:
            self.state.token = entered
            self.state.save()
            self.console.ok("Token", "Başarıyla kaydedildi.")

    def _refresh(self, prompt_cookie: bool) -> None:
        if prompt_cookie:
            self.console.info("Güvenlik Duvarını aşmak için çerez (cookie) girmelisiniz.")
            self.console.info("Bulmak için: Network (Ağ) sekmesindeki 'science' isteklerinden birinin içindeki 'cookie:' satırını kopyalayın.")
            entered = input(f"  {self.console.GREY}Cookie (Değiştirmeyecekseniz Enter'a basın):{self.console.RESET} ").strip()
            if entered:
                self.state.cookie = entered
                self.console.ok("Cookie", "Güncellendi")
            else:
                self.console.info("Cookie değiştirilmedi.")

        self.console.info("Analitik tokeni sunucudan çekiliyor...")
        try:
            self.state.fetched_at = 0
            ensure_token(self.state)
        except Exception as exc:
            self.console.err("Yetkilendirme", str(exc))
            return
        self._new_session()
        self.console.ok("Yetkilendirme", "Başarıyla tazelendi.")

    def _require_ready(self) -> bool:
        if not self.state.has_cookie:
            self.console.err("Cookie", "Tanımlı değil! Lütfen 3 numaralı menüden cookie ekleyin.")
            return False
        if self.state.is_stale:
            try:
                ensure_token(self.state)
            except Exception as exc:
                self.console.err("Yetkilendirme", str(exc))
                return False
            self._new_session()
        return bool(self.state.analytics_token)

    def module_playtime(self) -> None:
        if not self._require_ready():
            return
        self.console.info("Öneri: Daha güvenli ve doğal görünmesi için '2' ile '5' arası bir saat girin.")
        raw = input(f"  {self.console.GREY}Oyun başı eklenecek saat (Örn: 5):{self.console.RESET} ").strip()
        try:
            hours = float(raw)
        except ValueError:
            self.console.err("Hatalı Giriş", "Lütfen geçerli bir saat girin.")
            return
        duration_ms = int(hours * 3600 * 1000)
        print()
        self.console.info(
            f"Toplam {self.console.ORANGE}{len(self.games)}{self.console.WHITE} oyuna "
            f"oyun başı {self.console.ORANGE}{hours:g} saat{self.console.WHITE} basılıyor "
            f"{self.console.GREY}·{self.console.WHITE} Toplam: {len(self.games) * hours:,.0f} saat"
        )
        self.console.rule()
        ok = Spoofer(self.client, self.console).run(
            self.games,
            # Her oyun için +- %5 rastgele sapma (jitter) ekleyerek robotlaşmayı önler
            lambda g: self.client.build_session(g, duration_ms + random.randint(int(-duration_ms * 0.05), int(duration_ms * 0.05))),
        )
        print()
        self.console.ok("Tamamlandı", f"{ok}/{len(self.games)} oyun işlendi · {ok * hours:,.0f} saat eklendi")

    def module_played_count(self) -> None:
        if not self._require_ready():
            return
        print()
        self.console.info(
            f"Toplam {self.console.ORANGE}{len(self.games)}{self.console.WHITE} oyun 'Oynandı' (Played) olarak kaydediliyor "
            f"{self.console.GREY}·{self.console.WHITE} Doğal görünmesi için oyun başı 1 dakika sürecek"
        )
        self.console.rule()
        ok = Spoofer(self.client, self.console).run(
            self.games,
            lambda g: self.client.build_session(g, 60 * 1000),
        )
        print()
        self.console.ok("Tamamlandı", f"{ok}/{len(self.games)} oyun başarıyla kaydedildi")

    def menu(self) -> None:
        C = self.console
        while True:
            cookie_state = f"{C.GREEN}AYARLANDI{C.RESET}" if self.state.has_cookie else f"{C.RED}EKSİK{C.RESET}"
            C.rule()
            print(f"  {C.ORANGE}1{C.RESET} {C.WHITE}Oyun Süresi Kas (Saat Ekle){C.RESET}")
            print(f"  {C.ORANGE}2{C.RESET} {C.WHITE}Oyun Sayısı Kas (Oynandı Rozeti İçin){C.RESET}")
            print(f"  {C.ORANGE}3{C.RESET} {C.WHITE}Hesap Bilgilerini (Token/Cookie) Yenile{C.RESET} {C.GREY}· Durum: {cookie_state}{C.RESET}")
            print(f"  {C.ORANGE}4{C.RESET} {C.WHITE}Çıkış{C.RESET}")
            C.rule()

            choice = ""
            while choice not in ("1", "2", "3", "4"):
                choice = input(f"  {C.ORANGE}›{C.RESET} ").strip()

            if choice == "1":
                self.module_playtime()
            elif choice == "2":
                self.module_played_count()
            elif choice == "3":
                self._refresh(prompt_cookie=True)
            elif choice == "4":
                break


def main() -> None:
    try:
        App().start()
    except KeyboardInterrupt:
        print()
        Console().warn("Çıkış", "İşlem iptal edildi.")


if __name__ == "__main__":
    main()
