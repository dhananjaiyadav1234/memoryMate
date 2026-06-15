"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  supabase,
  isSupabaseConfigured,
  Person,
  Memory,
  deleteMemory,
} from "@/lib/supabase";
import { timeAgo, getLastMetSpeechText } from "@/lib/timeUtils";
import AddNoteModal from "@/components/AddNoteModal";
import Logo from "@/components/Logo";

interface PersonSpeechButtonProps {
  name: string;
  relationship: string;
  memories: Memory[];
  aiSummary?: string;
}

function PersonSpeechButton({ name, relationship, memories, aiSummary }: PersonSpeechButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const toggleSpeech = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel(); // cancel current speech

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

  return (
    <button
      className={`speaker-btn${isSpeaking ? " speaking" : ""}`}
      onClick={toggleSpeech}
      aria-label={isSpeaking ? "Stop reading" : "Read details aloud"}
      type="button"
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
  );
}

interface PersonWithMemories extends Person {
  memories: Memory[];
}

export default function PeoplePage() {
  const [people, setPeople] = useState<PersonWithMemories[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{
    personId: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const [personsResult, memoriesResult] = await Promise.all([
          supabase
            .from("persons")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("memories")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

        const persons: Person[] = personsResult.data ?? [];
        const memories: Memory[] = memoriesResult.data ?? [];

        const memoriesByPerson = new Map<string, Memory[]>();
        for (const memory of memories) {
          const list = memoriesByPerson.get(memory.person_id) ?? [];
          list.push(memory);
          memoriesByPerson.set(memory.person_id, list);
        }

        const peopleWithMemories: PersonWithMemories[] = persons.map(
          (person) => ({
            ...person,
            memories: memoriesByPerson.get(person.id) ?? [],
          })
        );

        setPeople(peopleWithMemories);
      } catch (error) {
        console.error("Failed to fetch people data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  function handleToggleExpand(personId: string) {
    setExpandedId((prev) => (prev === personId ? null : personId));
  }

  async function handleDeleteNote(memoryId: string) {
    const success = await deleteMemory(memoryId);
    if (success) {
      setPeople((prev) =>
        prev.map((person) => ({
          ...person,
          memories: person.memories.filter((m) => m.id !== memoryId),
        }))
      );
    }
  }

  function handleNoteSaved(personId: string, note: Memory) {
    setPeople((prev) =>
      prev.map((person) => {
        if (person.id !== personId) return person;
        return {
          ...person,
          memories: [note, ...person.memories],
        };
      })
    );
    setNoteModal(null);
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="people-page">
        <div className="people-header">
          <Link href="/" className="people-back-link">
            ← Back to Camera
          </Link>
          <div className="people-header-content">
            <Logo size={26} />
            <h1 className="people-title">People</h1>
          </div>
        </div>
        <div className="people-empty">
          <p>
            Supabase is not configured. Please set up your environment variables
            to use this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="people-page">
      <div className="people-header">
        <Link href="/" className="people-back-link">
          ← Back to Camera
        </Link>
        <div className="people-header-content">
          <Logo size={26} />
          <h1 className="people-title">People</h1>
          {!loading && (
            <span className="people-count">{people.length}</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="people-loading">
          <div className="spinner" />
        </div>
      ) : people.length === 0 ? (
        <div className="people-empty">
          <p>No people added yet. Start by recognizing someone!</p>
        </div>
      ) : (
        <div className="people-list">
          {people.map((person) => {
            const isExpanded = expandedId === person.id;
            return (
              <div
                key={person.id}
                className={`person-row${isExpanded ? " expanded" : ""}`}
              >
                <button
                  className="person-row-header"
                  onClick={() => handleToggleExpand(person.id)}
                >
                  <div className="person-row-info">
                    <div className="person-row-avatar">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="person-row-name">{person.name}</div>
                      <div className="person-row-rel">
                        {person.relationship || "No relationship set"}
                      </div>
                    </div>
                  </div>
                  <div className="person-row-meta">
                    <span className="person-row-notes-count">
                      {person.memories.length}{" "}
                      {person.memories.length === 1 ? "note" : "notes"}
                    </span>
                    <span className="person-row-date">
                      {timeAgo(person.created_at)}
                    </span>
                    <span className="person-row-chevron">
                      {isExpanded ? "▾" : "▸"}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="person-row-expanded">
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", margin: "14px 0 12px" }}>
                      <button
                        className="person-add-note-btn"
                        style={{ margin: 0 }}
                        onClick={() =>
                          setNoteModal({
                            personId: person.id,
                            name: person.name,
                          })
                        }
                      >
                        + Add note
                      </button>
                      <PersonSpeechButton
                        name={person.name}
                        relationship={person.relationship}
                        memories={person.memories}
                        aiSummary={(person as any).ai_summary}
                      />
                    </div>

                    {person.memories.length === 0 ? (
                      <div className="person-no-notes">
                        No notes yet. Add one!
                      </div>
                    ) : (
                      <div className="notes-list">
                        {person.memories.map((memory) => (
                          <div key={memory.id} className="note-item">
                            <div className="note-item-content">
                              <span className="note-item-text">
                                {memory.note}
                              </span>
                              <span className="note-item-time">
                                {timeAgo(memory.created_at)}
                              </span>
                            </div>
                            <button
                              className="note-delete-btn"
                              onClick={() => handleDeleteNote(memory.id)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {noteModal && (
        <AddNoteModal
          personId={noteModal.personId}
          personName={noteModal.name}
          onClose={() => setNoteModal(null)}
          onSave={(personId: string, note: Memory) =>
            handleNoteSaved(personId, note)
          }
        />
      )}
    </div>
  );
}
