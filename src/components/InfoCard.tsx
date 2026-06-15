"use client";

import { useState, useEffect, useRef } from "react";
import { Memory, isSupabaseConfigured, insertMemory } from "@/lib/supabase";
import { timeAgo, getLastMetSpeechText } from "@/lib/timeUtils";
import { useAudioRecorder } from "@/lib/useAudioRecorder";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface InfoCardProps {
  personId: string;
  name: string;
  relationship: string;
  box: { x: number; y: number; width: number; height: number };
  videoDims: { width: number; height: number };
  memories: Memory[];
  onAddNote: (personId: string, name: string) => void;
  onNoteSaved: (personId: string, note: Memory) => void;
  aiSummary?: string;
}

/* ------------------------------------------------------------------ */
/*  Info Card — Floating glassmorphic card next to bounding box        */
/* ------------------------------------------------------------------ */
export default function InfoCard({
  personId,
  name,
  relationship,
  box,
  videoDims,
  memories,
  onAddNote,
  onNoteSaved,
  aiSummary,
}: InfoCardProps) {
  /* ── Position calculation ── */
  const boxLeftPct = (box.x / videoDims.width) * 100;
  const boxTopPct = (box.y / videoDims.height) * 100;
  const boxWidthPct = (box.width / videoDims.width) * 100;
  const boxHeightPct = (box.height / videoDims.height) * 100;
  const boxRightPct = boxLeftPct + boxWidthPct;
  const boxBottomPct = boxTopPct + boxHeightPct;
  const boxCenterX = boxLeftPct + boxWidthPct / 2;

  const isRightHalf = boxCenterX > 50;
  const isNearBottom = boxBottomPct > 70;

  const cardStyle: React.CSSProperties = {
    position: "absolute",
    zIndex: 15,
    maxWidth: "260px",
    width: "max-content",
  };

  /* Horizontal: right of box by default, left if face is in right half */
  if (isRightHalf) {
    cardStyle.right = `calc(${100 - boxLeftPct}% + 32px)`;
  } else {
    cardStyle.left = `calc(${boxRightPct}% + 32px)`;
  }

  /* Vertical: top-align by default, bottom-align if near bottom */
  if (isNearBottom) {
    cardStyle.bottom = `${100 - boxBottomPct}%`;
  } else {
    cardStyle.top = `${boxTopPct}%`;
  }

  const recentNotes = memories.slice(0, 2);

  /* ── Read Aloud Speech Synthesis ── */
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const toggleSpeech = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel(); // Cancel any current speech

      let textToSpeak = `This is ${name}`;
      if (relationship) {
        textToSpeak += `, your ${relationship}.`;
      } else {
        textToSpeak += ".";
      }

      const lastMetDate = memories.length > 0 ? memories[0].created_at : undefined;
      const lastMetText = getLastMetSpeechText(lastMetDate);
      textToSpeak += ` You last met ${lastMetText}.`;

      if (aiSummary) {
        textToSpeak += ` ${aiSummary}`;
      }

      if (memories.length > 0) {
        textToSpeak += ` Last time, you noted: ${memories[0].note}`;
      }

      const u = new SpeechSynthesisUtterance(textToSpeak);
      u.rate = 0.85;
      u.pitch = 1.0;
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      utteranceRef.current = u;
      window.speechSynthesis.speak(u);
      setIsSpeaking(true);
    }
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  /* ── Voice Note Recording ── */
  const handleVoiceNoteSuccess = async (transcript: string) => {
    if (isSupabaseConfigured()) {
      const saved = await insertMemory(personId, transcript);
      if (saved) {
        onNoteSaved(personId, saved);
      } else {
        console.error("Failed to insert memory");
      }
    } else {
      const localNote: Memory = {
        id: crypto.randomUUID(),
        person_id: personId,
        note: transcript,
        created_at: new Date().toISOString(),
      };
      onNoteSaved(personId, localNote);
    }
  };

  const { status, errorMessage, startRecording, stopRecording, resetStatus } =
    useAudioRecorder(handleVoiceNoteSuccess);

  // Auto-clear success/error state after brief delay
  useEffect(() => {
    if (status === "success" || status === "error") {
      const timer = setTimeout(() => {
        resetStatus();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [status, resetStatus]);

  const handleMicMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    startRecording();
  };

  const handleMicMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopRecording();
  };

  const handleMicTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevents zoom/scroll/selection contexts
    startRecording();
  };

  const handleMicTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    stopRecording();
  };

  return (
    <div className="info-card info-card-enter" style={cardStyle}>
      {/* Visual callout pointer/connector line pointing towards head */}
      {isRightHalf ? (
        <div className="info-card-connector-right">
          <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
            <line x1="0" y1="6" x2="22" y2="6" stroke="#c4b5fd" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.85" />
            <circle cx="22" cy="6" r="3" fill="#c4b5fd" className="connector-pulse-dot" />
          </svg>
        </div>
      ) : (
        <div className="info-card-connector-left">
          <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
            <circle cx="6" cy="6" r="3" fill="#c4b5fd" className="connector-pulse-dot" />
            <line x1="6" y1="6" x2="28" y2="6" stroke="#c4b5fd" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.85" />
          </svg>
        </div>
      )}

      {/* Header with Name & Speaker Button */}
      <div className="info-card-header">
        <div className="info-card-name">{name}</div>
        <button
          className={`speaker-btn${isSpeaking ? " speaking" : ""}`}
          onClick={toggleSpeech}
          aria-label={isSpeaking ? "Stop reading" : "Read details aloud"}
        >
          {isSpeaking ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
      </div>

      {/* Relationship */}
      {relationship && (
        <div className="info-card-rel">Your {relationship}</div>
      )}

      {/* Last seen */}
      <div className="info-card-seen">Seen just now</div>

      {/* Recent notes */}
      {recentNotes.length > 0 && (
        <div className="info-card-notes">
          {recentNotes.map((note) => (
            <div key={note.id} className="info-card-note">
              <span className="info-card-note-text">{note.note}</span>
              <span className="info-card-note-time">
                {timeAgo(note.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Voice note mic recorder */}
      <div className="mic-btn-container">
        <button
          className={`mic-btn${status === "recording" ? " recording" : ""}`}
          onMouseDown={handleMicMouseDown}
          onMouseUp={handleMicMouseUp}
          onMouseLeave={stopRecording}
          onTouchStart={handleMicTouchStart}
          onTouchEnd={handleMicTouchEnd}
          aria-label="Hold to record voice note"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </button>

        <div className={`mic-status-text ${status}`}>
          {status === "idle" && "Hold button to record note"}
          {status === "recording" && "Listening... Release to save"}
          {status === "transcribing" && "Saving note..."}
          {status === "success" && "Saved ✓"}
          {status === "error" && (errorMessage || "Couldn't catch that, try again")}
        </div>
      </div>
    </div>
  );
}
