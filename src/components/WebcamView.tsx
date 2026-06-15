"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { loadModels, detectFaces, buildMatcher, faceapi } from "@/lib/faceApi";
import {
  supabase,
  isSupabaseConfigured,
  Person,
  Memory,
  fetchMemories,
} from "@/lib/supabase";
import LoadingScreen from "@/components/LoadingScreen";
import NewPersonPanel from "@/components/NewPersonPanel";
import InfoCard from "@/components/InfoCard";
import AddNoteModal from "@/components/AddNoteModal";
import Link from "next/link";
import Logo from "@/components/Logo";
import type { FaceMatcher, LabeledFaceDescriptors } from "face-api.js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface DetectedFace {
  box: { x: number; y: number; width: number; height: number };
  label: string;
  distance: number;
  descriptor: Float32Array;
  relationship?: string;
}

interface MatchedPerson {
  personId: string;
  name: string;
  relationship: string;
  box: { x: number; y: number; width: number; height: number };
  memories: Memory[];
  lastSeenTimestamp: number;
}

/* ------------------------------------------------------------------ */
/*  Canvas drawing helpers                                              */
/* ------------------------------------------------------------------ */
function drawSoftRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  strokeColor: string,
  lineWidth: number
) {
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.stroke();
}

function drawFriendlyLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  name: string,
  relationship: string,
  isKnown: boolean
) {
  const accentColor = isKnown ? "#c4b5fd" : "#fbcfe8";
  const bgColor = isKnown
    ? "rgba(10, 8, 20, 0.88)"
    : "rgba(20, 8, 20, 0.88)";
  const borderColor = isKnown
    ? "rgba(167, 139, 250, 0.5)"
    : "rgba(249, 168, 212, 0.5)";

  const nameFontSize = 16;
  const relFontSize = 12;
  ctx.font = `700 ${nameFontSize}px Nunito, sans-serif`;
  const nameWidth = ctx.measureText(name).width;

  let relText = "";
  let relWidth = 0;
  if (relationship) {
    relText = relationship;
    ctx.font = `500 ${relFontSize}px Quicksand, sans-serif`;
    relWidth = ctx.measureText(relText).width;
  }

  const pillW = Math.max(nameWidth, relWidth) + 28;
  const pillH = relationship ? 46 : 34;
  const pillX = x + (w - pillW) / 2;
  const pillY = y - pillH - 12;

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 10);
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 10);
  ctx.stroke();

  ctx.font = `700 ${nameFontSize}px Nunito, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name, pillX + 14, pillY + (relationship ? 20 : 23));

  if (relationship) {
    ctx.font = `500 ${relFontSize}px Quicksand, sans-serif`;
    ctx.fillStyle = accentColor;
    ctx.fillText(relText, pillX + 14, pillY + 36);
  }

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(x + w / 2, pillY + pillH + 5, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

// Logo is now imported from @/components/Logo

/* ------------------------------------------------------------------ */
/*  Main Webcam Component                                              */
/* ------------------------------------------------------------------ */
export default function WebcamView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matcherRef = useRef<FaceMatcher | null>(null);
  const personsRef = useRef<Person[]>([]);
  const loopRef = useRef<number | null>(null);
  const lastDetectRef = useRef<number>(0);

  /* ── Core state ── */
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [unknownFace, setUnknownFace] = useState<{
    descriptor: Float32Array;
  } | null>(null);
  const [statusText, setStatusText] = useState("Initializing...");
  const [knownCount, setKnownCount] = useState(0);
  const [supabaseOnline, setSupabaseOnline] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  /* ── Matched persons (info cards) ── */
  const [matchedPersons, setMatchedPersons] = useState<MatchedPerson[]>([]);
  const matchedMapRef = useRef<Map<string, MatchedPerson>>(new Map());
  const memoryCacheRef = useRef<
    Map<string, { notes: Memory[]; fetchedAt: number }>
  >(new Map());
  const [videoDims, setVideoDims] = useState({ width: 1280, height: 720 });

  /* ── Note modal ── */
  const [noteModalTarget, setNoteModalTarget] = useState<{
    personId: string;
    name: string;
  } | null>(null);

  /* Time-of-day greeting */
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning ☀️");
    else if (hour < 17) setGreeting("Good afternoon 🌤️");
    else setGreeting("Good evening 🌙");
  }, []);

  /* ── Rebuild matcher ── */
  const rebuildMatcher = useCallback(() => {
    const labeled = personsRef.current
      .filter((p) => p.face_descriptor && p.face_descriptor.length === 128)
      .map(
        (p) =>
          new faceapi.LabeledFaceDescriptors(p.name, [
            new Float32Array(p.face_descriptor),
          ])
      );
    matcherRef.current = buildMatcher(
      labeled as LabeledFaceDescriptors[],
      0.5
    );
    setKnownCount(personsRef.current.length);
  }, []);

  /* ── Init: load models + fetch persons ── */
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setStatusText("Loading face recognition models…");
        await loadModels();
        if (cancelled) return;
        setModelsReady(true);

        if (isSupabaseConfigured()) {
          setStatusText("Connecting to your memory database…");
          const { data, error } = await supabase.from("persons").select("*");
          if (error) {
            console.error("Supabase fetch error:", error);
            setSupabaseOnline(false);
          } else {
            setSupabaseOnline(true);
          }
          if (data) personsRef.current = data as Person[];
        } else {
          setSupabaseOnline(false);
        }

        rebuildMatcher();
        setStatusText("");
      } catch (err) {
        console.error("Init error:", err);
        setStatusText("Something went wrong. Please refresh the page.");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [rebuildMatcher]);

  /* ── Start webcam ── */
  useEffect(() => {
    if (!modelsReady) return;
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current!.play();
            setCameraReady(true);
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
        const error = err as DOMException;
        if (
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError"
        ) {
          setCameraError(
            "Camera access was blocked. Please go to your browser Settings → Privacy & Security → Camera and allow access for this site, then refresh the page."
          );
        } else if (error.name === "NotFoundError") {
          setCameraError(
            "No camera found. Please connect a camera and refresh the page."
          );
        } else {
          setCameraError(
            "Could not start the camera. Please check your device and try again."
          );
        }
      }
    }

    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [modelsReady]);

  /* ── Detection loop ── */
  useEffect(() => {
    if (!modelsReady || !cameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    canvas.width = vw;
    canvas.height = vh;
    setVideoDims({ width: vw, height: vh });

    let running = true;
    setIsScanning(true);

    async function detect(timestamp: number) {
      if (!running || !video || !canvas) return;

      if (timestamp - lastDetectRef.current < 800) {
        loopRef.current = requestAnimationFrame(detect);
        return;
      }
      lastDetectRef.current = timestamp;

      try {
        const results = await detectFaces(video);
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, vw, vh);

        const faces: DetectedFace[] = [];
        const now = Date.now();
        const currentlyVisible = new Set<string>();

        for (const r of results) {
          const rawBox = r.detection.box;
          const mirroredX = vw - rawBox.x - rawBox.width;

          const box = {
            x: mirroredX,
            y: rawBox.y,
            width: rawBox.width,
            height: rawBox.height,
          };

          const bestMatch = matcherRef.current
            ? matcherRef.current.findBestMatch(r.descriptor)
            : null;

          const label = bestMatch?.label ?? "unknown";
          const distance = bestMatch?.distance ?? 1;
          const isKnown = label !== "unknown";

          const matchedPerson = isKnown
            ? personsRef.current.find((p) => p.name === label)
            : null;
          const relationship = matchedPerson?.relationship || "";

          faces.push({
            box,
            label,
            distance,
            descriptor: r.descriptor,
            relationship,
          });

          /* ── Track known person for info card ── */
          let drawBox = box;
          if (isKnown && matchedPerson) {
            currentlyVisible.add(matchedPerson.id);

            /* Check memory cache */
            let memories: Memory[] = [];
            const cached = memoryCacheRef.current.get(matchedPerson.id);
            if (cached && now - cached.fetchedAt < 30000) {
              memories = cached.notes;
            } else {
              memories = cached?.notes ?? [];
              /* Fire async fetch — do not block the loop */
              fetchMemories(matchedPerson.id, 2).then((notes) => {
                memoryCacheRef.current.set(matchedPerson.id, {
                  notes,
                  fetchedAt: Date.now(),
                });
                /* Push updated memories into the matched map */
                const entry = matchedMapRef.current.get(matchedPerson.id);
                if (entry) {
                  entry.memories = notes;
                  setMatchedPersons(
                    Array.from(matchedMapRef.current.values())
                  );
                }
              });
            }

            const existing = matchedMapRef.current.get(matchedPerson.id);
            if (existing) {
              const dx = Math.abs(box.x - existing.box.x);
              const dy = Math.abs(box.y - existing.box.y);
              const dw = Math.abs(box.width - existing.box.width);
              const dh = Math.abs(box.height - existing.box.height);

              if (dx < 15 && dy < 15 && dw < 15 && dh < 15) {
                drawBox = existing.box;
              } else {
                drawBox = {
                  x: existing.box.x + (box.x - existing.box.x) * 0.4,
                  y: existing.box.y + (box.y - existing.box.y) * 0.4,
                  width: existing.box.width + (box.width - existing.box.width) * 0.4,
                  height: existing.box.height + (box.height - existing.box.height) * 0.4,
                };
              }
            }

            matchedMapRef.current.set(matchedPerson.id, {
              personId: matchedPerson.id,
              name: matchedPerson.name,
              relationship: matchedPerson.relationship,
              box: drawBox,
              memories,
              lastSeenTimestamp: now,
            });
          }

          /* ── Draw on canvas ── */
          const accentColor = isKnown
            ? "rgba(167, 139, 250, 0.6)"
            : "rgba(249, 168, 212, 0.5)";
          const solidColor = isKnown ? "#a78bfa" : "#f9a8d4";

          drawSoftRoundedRect(
            ctx,
            drawBox.x,
            drawBox.y,
            drawBox.width,
            drawBox.height,
            12,
            accentColor,
            2
          );

          const gradient = ctx.createRadialGradient(
            drawBox.x + drawBox.width / 2,
            drawBox.y + drawBox.height / 2,
            0,
            drawBox.x + drawBox.width / 2,
            drawBox.y + drawBox.height / 2,
            drawBox.width / 2
          );
          gradient.addColorStop(
            0,
            isKnown
              ? "rgba(167,139,250,0.05)"
              : "rgba(249,168,212,0.05)"
          );
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(drawBox.x, drawBox.y, drawBox.width, drawBox.height, 12);
          ctx.fill();

          /* Corner accents */
          const cLen = Math.min(drawBox.width, drawBox.height) * 0.15;
          ctx.strokeStyle = solidColor;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";

          ctx.beginPath();
          ctx.moveTo(drawBox.x, drawBox.y + cLen);
          ctx.lineTo(drawBox.x, drawBox.y);
          ctx.lineTo(drawBox.x + cLen, drawBox.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(drawBox.x + drawBox.width - cLen, drawBox.y);
          ctx.lineTo(drawBox.x + drawBox.width, drawBox.y);
          ctx.lineTo(drawBox.x + drawBox.width, drawBox.y + cLen);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(drawBox.x, drawBox.y + drawBox.height - cLen);
          ctx.lineTo(drawBox.x, drawBox.y + drawBox.height);
          ctx.lineTo(drawBox.x + cLen, drawBox.y + drawBox.height);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(drawBox.x + drawBox.width - cLen, drawBox.y + drawBox.height);
          ctx.lineTo(drawBox.x + drawBox.width, drawBox.y + drawBox.height);
          ctx.lineTo(drawBox.x + drawBox.width, drawBox.y + drawBox.height - cLen);
          ctx.stroke();

          const displayName = isKnown ? label : "Someone new!";
          const displayRel = isKnown
            ? relationship
              ? `Your ${relationship}`
              : ""
            : "Tap below to remember them";
          drawFriendlyLabel(
            ctx,
            drawBox.x,
            drawBox.y,
            drawBox.width,
            displayName,
            displayRel,
            isKnown
          );
        }

        /* ── Expire stale matched persons (1.5s grace period) ── */
        for (const [id, person] of matchedMapRef.current) {
          if (!currentlyVisible.has(id) && now - person.lastSeenTimestamp > 1500) {
            matchedMapRef.current.delete(id);
          }
        }

        setMatchedPersons(Array.from(matchedMapRef.current.values()));
        setDetectedFaces(faces);

        const firstUnknown = faces.find((f) => f.label === "unknown");
        if (firstUnknown) {
          setUnknownFace({ descriptor: firstUnknown.descriptor });
        } else {
          setUnknownFace(null);
        }
      } catch (err) {
        console.error("Detection error:", err);
      }

      if (running) loopRef.current = requestAnimationFrame(detect);
    }

    loopRef.current = requestAnimationFrame(detect);
    return () => {
      running = false;
      setIsScanning(false);
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [modelsReady, cameraReady]);

  /* ── Save person ── */
  const handleSavePerson = async (
    name: string,
    relationship: string,
    descriptor: Float32Array
  ) => {
    const descriptorArray = Array.from(descriptor);

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("persons")
        .insert({ name, relationship, face_descriptor: descriptorArray })
        .select()
        .single();

      if (error) {
        console.error("Save error:", error);
        alert("Couldn\u2019t save. Please try again.");
        return;
      }
      personsRef.current.push(data as Person);
    } else {
      personsRef.current.push({
        id: crypto.randomUUID(),
        name,
        relationship,
        face_descriptor: descriptorArray,
        photo_url: null,
        created_at: new Date().toISOString(),
      });
    }

    rebuildMatcher();
    setUnknownFace(null);
  };

  /* ── Handle note added via modal ── */
  const handleNoteAdded = useCallback(
    (personId: string, note: Memory) => {
      /* Update memory cache */
      const cached = memoryCacheRef.current.get(personId);
      const updatedNotes = cached ? [note, ...cached.notes] : [note];
      memoryCacheRef.current.set(personId, {
        notes: updatedNotes,
        fetchedAt: Date.now(),
      });

      /* Update matched person's memories for immediate display */
      const entry = matchedMapRef.current.get(personId);
      if (entry) {
        entry.memories = updatedNotes;
        setMatchedPersons(Array.from(matchedMapRef.current.values()));
      }

      setNoteModalTarget(null);
    },
    []
  );

  /* ── Render ── */
  if (!modelsReady) {
    return <LoadingScreen statusText={statusText} />;
  }

  return (
    <div className="ar-container">
      {/* Full-screen video */}
      <video ref={videoRef} autoPlay playsInline muted className="ar-video" />

      {/* Detection canvas */}
      <canvas ref={canvasRef} className="ar-canvas" />

      {/* Ambient floating orbs */}
      <div className="ambient-orbs">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
      </div>

      {/* Scan line */}
      {cameraReady && <div className="scan-line" />}

      {/* Camera placeholder / error */}
      {!cameraReady && (
        <div className="camera-placeholder">
          {cameraError ? (
            <>
              <div className="camera-icon" style={{ opacity: 0.5 }}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
                  <path d="M14.12 9.88a3 3 0 0 1 .88 2.12 3 3 0 0 1-3 3 3 3 0 0 1-2.12-.88" />
                </svg>
              </div>
              <p style={{ maxWidth: 400, textAlign: "center", lineHeight: 1.6 }}>
                {cameraError}
              </p>
            </>
          ) : (
            <>
              <div className="camera-icon">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <p>Starting camera…</p>
            </>
          )}
        </div>
      )}

      {/* ── Info Cards for matched persons (up to 3) ── */}
      <div className="hud-layer" style={{ pointerEvents: "none" }}>
        {matchedPersons.slice(0, 3).map((person) => (
          <InfoCard
            key={person.personId}
            personId={person.personId}
            name={person.name}
            relationship={person.relationship}
            box={person.box}
            videoDims={videoDims}
            memories={person.memories}
            onAddNote={(id, name) => setNoteModalTarget({ personId: id, name })}
            onNoteSaved={handleNoteAdded}
            aiSummary={(person as any).ai_summary}
          />
        ))}
      </div>

      {/* HUD layer */}
      <div className="hud-layer">
        {/* Top bar */}
        <div className="hud-top">
          <div className="hud-top-glass" />

          <div className="hud-brand">
            <div className="hud-brand-icon">
              <Logo size={22} />
            </div>
            <div className="hud-brand-text">
              <span className="hud-brand-name">MemoryMate</span>
              <span className="hud-brand-tagline">Remembering for you</span>
            </div>
          </div>

          <div className="hud-stats">
            {/* Scanning indicator */}
            {isScanning && (
              <div className="hud-stat-pill scanning-pill">
                <div className="scanning-dot" />
                <span>Scanning</span>
              </div>
            )}

            <div className="hud-stat-pill">
              <div className="dot purple" />
              <span>{knownCount} remembered</span>
            </div>
            {detectedFaces.length > 0 && (
              <div className="hud-stat-pill">
                <div className="dot pink" />
                <span>{detectedFaces.length} looking</span>
              </div>
            )}

            {/* People page link */}
            <Link href="/people" className="nav-pill">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>People</span>
            </Link>
          </div>
        </div>

        {/* Status bar */}
        {statusText && <div className="status-bar">{statusText}</div>}

        {/* Bottom bar */}
        <div className="hud-bottom">
          <div className="hud-bottom-glass" />
          <div className="hud-greeting">{greeting}</div>
          <div className="hud-status-indicator">
            <div
              className={`hud-status-dot ${supabaseOnline ? "" : "offline"}`}
            />
            <span className="hud-status-text">
              {supabaseOnline ? "Memory saved" : "Local only"}
            </span>
          </div>
        </div>
      </div>

      {/* New person panel */}
      {unknownFace && (
        <NewPersonPanel
          descriptor={unknownFace.descriptor}
          onSave={handleSavePerson}
          onDismiss={() => setUnknownFace(null)}
        />
      )}

      {/* Add note modal */}
      {noteModalTarget && (
        <AddNoteModal
          personId={noteModalTarget.personId}
          personName={noteModalTarget.name}
          onSave={handleNoteAdded}
          onClose={() => setNoteModalTarget(null)}
        />
      )}
    </div>
  );
}
