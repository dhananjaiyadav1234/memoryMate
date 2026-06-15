"use client";

import { useEffect } from "react";
import { isSupabaseConfigured, Memory, insertMemory } from "@/lib/supabase";
import { useAudioRecorder } from "@/lib/useAudioRecorder";

interface AddNoteModalProps {
  personId: string;
  personName: string;
  onSave: (personId: string, note: Memory) => void;
  onClose: () => void;
}

export default function AddNoteModal({
  personId,
  personName,
  onSave,
  onClose,
}: AddNoteModalProps) {
  const handleVoiceNoteSuccess = async (transcript: string) => {
    if (isSupabaseConfigured()) {
      const saved = await insertMemory(personId, transcript);
      if (saved) {
        onSave(personId, saved);
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
      onSave(personId, localNote);
    }
  };

  const { status, errorMessage, startRecording, stopRecording, resetStatus } =
    useAudioRecorder(handleVoiceNoteSuccess);

  // Auto-clear error after a short delay so user can try again
  useEffect(() => {
    if (status === "error") {
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
    e.preventDefault(); // Prevents zoom/scroll/selection contexts during long press
    startRecording();
  };

  const handleMicTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    stopRecording();
  };

  return (
    <div className="note-modal-overlay" onClick={onClose}>
      <div className="note-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="note-modal-header">
          <div>
            <h3 className="note-modal-title">Record voice note</h3>
            <p className="note-modal-person">for {personName}</p>
          </div>
          <button
            className="panel-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Large voice recorder interface */}
        <div className="mic-btn-container" style={{ margin: "32px 0 24px" }}>
          <button
            className={`mic-btn${status === "recording" ? " recording" : ""}`}
            onMouseDown={handleMicMouseDown}
            onMouseUp={handleMicMouseUp}
            onMouseLeave={stopRecording}
            onTouchStart={handleMicTouchStart}
            onTouchEnd={handleMicTouchEnd}
            aria-label="Hold to record note"
            style={{ width: "76px", height: "76px" }} // slightly larger for the modal
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </button>

          <div className={`mic-status-text ${status}`} style={{ marginTop: "12px", fontSize: "14px" }}>
            {status === "idle" && "Hold button to record note"}
            {status === "recording" && "Listening... Release to save"}
            {status === "transcribing" && "Saving note..."}
            {status === "success" && "Saved ✓"}
            {status === "error" && (errorMessage || "Couldn't catch that, try again")}
          </div>
        </div>

        {/* Actions */}
        <div className="panel-actions" style={{ justifyContent: "center" }}>
          <button
            className="btn-cancel"
            onClick={onClose}
            type="button"
            style={{ width: "100%", maxWidth: "160px" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
