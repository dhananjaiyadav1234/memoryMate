"use client";

import { useState } from "react";

interface NewPersonPanelProps {
  descriptor: Float32Array;
  onSave: (name: string, relationship: string, descriptor: Float32Array) => Promise<void>;
  onDismiss: () => void;
}

export default function NewPersonPanel({
  descriptor,
  onSave,
  onDismiss,
}: NewPersonPanelProps) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave(name.trim(), relationship.trim(), descriptor);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel-overlay">
      <div className="panel">
        {/* Header */}
        <div className="panel-header">
          <div className="panel-header-left">
            <div className="panel-icon">
              {/* Person with sparkle — represents recognizing someone new */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M7 20v-1a5 5 0 0 1 10 0v1" />
                <path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5z" opacity="0.7" />
              </svg>
            </div>
            <div>
              <h3 className="panel-title">New face!</h3>
              <p className="panel-subtitle">
                Who is this? Let&apos;s remember them.
              </p>
            </div>
          </div>
          <button
            className="panel-close"
            onClick={onDismiss}
            type="button"
            aria-label="Dismiss"
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="panel-form">
          <div className="input-group">
            <label htmlFor="person-name" className="input-label">
              Their name
            </label>
            <input
              id="person-name"
              type="text"
              placeholder="e.g. Sarah, Dr. Patel"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              autoFocus
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="person-relationship" className="input-label">
              How do you know them?
            </label>
            <input
              id="person-relationship"
              type="text"
              placeholder="e.g. daughter, nurse, friend"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="panel-actions">
            <button
              type="button"
              onClick={onDismiss}
              className="btn-cancel"
              disabled={saving}
            >
              Not now
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={saving || !name.trim()}
            >
              {saving ? (
                <>
                  <span className="btn-spinner" />
                  Saving…
                </>
              ) : (
                <>
                  {/* Memory save icon — brain/bookmark metaphor */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="8" r="3" />
                    <path d="M8 20v-1a4 4 0 0 1 8 0v1" />
                    <path d="M5 12l2 2 4-4" opacity="0.8" />
                  </svg>
                  Remember them
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
