import { useState, useRef, useCallback } from "react";

export type RecorderStatus = "idle" | "recording" | "transcribing" | "success" | "error";

interface UseAudioRecorderResult {
  status: RecorderStatus;
  errorMessage: string;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetStatus: () => void;
}

export function useAudioRecorder(
  onTranscriptionSuccess: (text: string) => void
): UseAudioRecorderResult {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    setStatus("idle");
    setErrorMessage("");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Select browser-compatible MIME type
      let mimeType = "";
      if (typeof MediaRecorder !== "undefined") {
        const candidateTypes = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4",
          "audio/aac",
        ];
        for (const type of candidateTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            break;
          }
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all track streams to release the microphone hardware
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || recorder.mimeType || "audio/webm",
        });

        // Ensure the audio isn't too short to transcribe
        if (audioBlob.size < 500) {
          setStatus("error");
          setErrorMessage("Couldn't catch that, try again");
          return;
        }

        setStatus("transcribing");

        try {
          const formData = new FormData();
          // Extract the proper extension from MIME type to prevent Whisper upload rejection
          let extension = "webm";
          const currentMime = (mimeType || recorder.mimeType || "").toLowerCase();
          if (currentMime.includes("mp4")) {
            extension = "mp4";
          } else if (currentMime.includes("aac")) {
            extension = "aac";
          } else if (currentMime.includes("ogg")) {
            extension = "ogg";
          } else if (currentMime.includes("wav")) {
            extension = "wav";
          }

          formData.append("file", audioBlob, `voice_note.${extension}`);

          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Transcription failed");
          }

          const data = await res.json();
          if (data.text && data.text.trim()) {
            setStatus("success");
            onTranscriptionSuccess(data.text.trim());
          } else {
            throw new Error("Empty transcript received");
          }
        } catch (err) {
          console.error("Audio upload/transcription error:", err);
          setStatus("error");
          setErrorMessage("Couldn't catch that, try again");
        }
      };

      recorder.start(100); // chunk slice frequency
      setStatus("recording");
    } catch (err) {
      console.error("Mic access or recorder setup failed:", err);
      setStatus("error");
      setErrorMessage("Microphone blocked or unavailable");
    }
  }, [onTranscriptionSuccess]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const resetStatus = useCallback(() => {
    setStatus("idle");
    setErrorMessage("");
  }, []);

  return {
    status,
    errorMessage,
    startRecording,
    stopRecording,
    resetStatus,
  };
}
