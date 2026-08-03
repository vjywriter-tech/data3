"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { studentEntries, type StudentEntry } from "@/data/student-entries";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PAGE_SIZE = 6;

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

type StatusFilter = "all" | "uploaded" | "pending";

type Notice =
  | {
      type: "success" | "error";
      message: string;
    }
  | null;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
      <path d="M5 14.5v4A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-4" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.5h7l4 4V20H7z" />
      <path d="M14 3.5V8h4M9.5 12h6M9.5 15h6" />
    </svg>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EntryCard({
  entry,
  position,
  uploaded,
  uploading,
  onChooseFile,
}: {
  entry: StudentEntry;
  position: number;
  uploaded: boolean;
  uploading: boolean;
  onChooseFile: (entry: StudentEntry, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <article className="record-card">
      <div className="record-number" aria-label={`Result ${position}`}>
        {position}
      </div>

      <div className="record-main">
        <div className="student-line">
          <p className="field-label">Student</p>
          <h3>{entry.studentNames}</h3>
        </div>

        <div className="record-grid">
          <div className="event-cell">
            <p className="field-label">Event</p>
            <p className="field-value">{entry.eventName}</p>
          </div>

          <div>
            <p className="field-label">Academic year</p>
            <p className="field-value">{entry.academicYear}</p>
          </div>

          <div>
            <p className="field-label">Level</p>
            <p className="field-value">{entry.level}</p>
          </div>

          <div>
            <p className="field-label">Date</p>
            <p className="field-value">{entry.eventDate}</p>
          </div>

          <div className="award-cell">
            <p className="field-label">Award / outcome</p>
            <p className="field-value">{entry.award}</p>
          </div>

          <div>
            <p className="field-label">Evidence</p>

            <span
              className={`status-chip ${uploaded ? "uploaded" : "pending"}`}
            >
              <span aria-hidden="true">{uploaded ? "✓" : "!"}</span>
              {uploaded ? "Uploaded" : "Upload required"}
            </span>
          </div>

          <div className="record-action">
            <input
              ref={inputRef}
              className="visually-hidden"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              aria-label={`Choose evidence document for ${entry.eventName}`}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];

                if (file) {
                  onChooseFile(entry, file);
                }

                event.currentTarget.value = "";
              }}
            />

            {uploaded && (
              <a
                className="view-document-button"
                href={`/api/evidence/view?entryId=${encodeURIComponent(
                  entry.id,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View document
              </a>
            )}

            <button
              className="upload-button"
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <UploadIcon />

              {uploading
                ? "Uploading…"
                : uploaded
                  ? "Replace document"
                  : "Upload document"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function StudentUploadPortal() {
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [uploadedIds, setUploadedIds] =
    useState<Set<string>>(new Set());

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selectedEntry, setSelectedEntry] =
    useState<StudentEntry | null>(null);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [uploadingId, setUploadingId] =
    useState<string | null>(null);

  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/evidence/status", {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          uploadedEntryIds?: string[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Status unavailable");
        }

        if (active) {
          setUploadedIds(
            new Set(payload.uploadedEntryIds ?? []),
          );
        }
      })
      .catch(() => {
        if (active) {
          setNotice({
            type: "error",
            message:
              "Upload status could not be loaded. You can still search the fixed records.",
          });
        }
      })
      .finally(() => {
        if (active) {
          setLoadingStatus(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLocaleLowerCase();

    return studentEntries.filter((entry) => {
      const matchesName =
        !normalizedQuery ||
        entry.studentNames
          .toLocaleLowerCase()
          .includes(normalizedQuery);

      const matchesYear =
        year === "all" ||
        entry.academicYear === year;

      const isUploaded = uploadedIds.has(entry.id);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "uploaded" && isUploaded) ||
        (statusFilter === "pending" && !isUploaded);

      return (
        matchesName &&
        matchesYear &&
        matchesStatus
      );
    });
  }, [query, statusFilter, uploadedIds, year]);

  const uploadedTotal = studentEntries.filter((entry) =>
    uploadedIds.has(entry.id),
  ).length;

  const completion = Math.round(
    (uploadedTotal / studentEntries.length) * 100,
  );

  const visibleEntries = filteredEntries.slice(
    0,
    visibleCount,
  );

  function submitSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setQuery(draftQuery);
    setVisibleCount(PAGE_SIZE);
    setNotice(null);
  }

  function chooseFile(
    entry: StudentEntry,
    file: File,
  ) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setNotice({
        type: "error",
        message:
          "Please choose a PDF, JPG, or PNG document.",
      });

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setNotice({
        type: "error",
        message:
          "The selected file is larger than the 10 MB limit.",
      });

      return;
    }

    setNotice(null);
    setSelectedEntry(entry);
    setSelectedFile(file);
  }

  function closeConfirmation() {
    if (uploadingId) {
      return;
    }

    setSelectedEntry(null);
    setSelectedFile(null);
  }

  async function uploadEvidence() {
    if (!selectedEntry || !selectedFile) {
      return;
    }

    const entry = selectedEntry;

    setUploadingId(entry.id);

    try {
      const presignResponse = await fetch(
        "/api/evidence/presign",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entryId: entry.id,
            fileName: selectedFile.name,
            contentType: selectedFile.type,
            fileSize: selectedFile.size,
          }),
        },
      );

      const payload =
        (await presignResponse.json()) as {
          uploadUrl?: string;
          requiredHeaders?: Record<string, string>;
          error?: string;
        };

      if (
        !presignResponse.ok ||
        !payload.uploadUrl
      ) {
        throw new Error(
          payload.error ||
            "Upload could not be started.",
        );
      }

      const uploadResponse = await fetch(
        payload.uploadUrl,
        {
          method: "PUT",
          headers: payload.requiredHeaders,
          body: selectedFile,
        },
      );

      if (!uploadResponse.ok) {
        throw new Error(
          "R2 rejected the upload. Check the bucket CORS configuration.",
        );
      }

      setUploadedIds((current) => {
        const updated = new Set(current);
        updated.add(entry.id);
        return updated;
      });

      setNotice({
        type: "success",
        message: `Evidence uploaded successfully for ${entry.eventName}.`,
      });

      setSelectedEntry(null);
      setSelectedFile(null);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "The document could not be uploaded. Please try again.",
      });
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <main className="portal">
      <header className="topbar">
        <div className="topbar-inner">
          <div
            className="brand-mark"
            aria-hidden="true"
          >
            EC
          </div>

          <div>
            <p className="brand-title">
              Institute Accreditation Portal
            </p>

            <p className="brand-subtitle">
              Electronics &amp; Communication Department
            </p>
          </div>

          <a
            className="help-link"
            href="#upload-guidelines"
          >
            Upload guidelines
          </a>
        </div>
      </header>

      <div className="portal-shell">
        <section
          className="hero"
          aria-labelledby="page-title"
        >
          <p className="eyebrow">
            NBA Accreditation · Criterion 4
          </p>

          <h1 id="page-title">
            Student Participation in Professional Events
          </h1>

          <p className="hero-copy">
            Criterion 4.7.2 · Find your fixed activity
            entry and upload its supporting evidence.
          </p>

          <div className="section-chip">
            <FileIcon />
            Academic records
          </div>
        </section>

        <form
          className="search-panel"
          onSubmit={submitSearch}
        >
          <label className="search-field">
            <span className="visually-hidden">
              Search by student name
            </span>

            <SearchIcon />

            <input
              type="search"
              value={draftQuery}
              onChange={(event) =>
                setDraftQuery(event.target.value)
              }
              placeholder="Enter your name"
              autoComplete="name"
            />
          </label>

          <label className="select-field">
            <span className="visually-hidden">
              Academic year
            </span>

            <select
              value={year}
              onChange={(event) => {
                setYear(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              <option value="all">
                All academic years
              </option>

              <option value="2024-25">
                2024–25
              </option>

              <option value="2023-24">
                2023–24
              </option>

              <option value="2022-23">
                2022–23
              </option>
            </select>
          </label>

          <label className="select-field">
            <span className="visually-hidden">
              Evidence status
            </span>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value as StatusFilter,
                );

                setVisibleCount(PAGE_SIZE);
              }}
            >
              <option value="all">
                All evidence status
              </option>

              <option value="pending">
                Upload required
              </option>

              <option value="uploaded">
                Uploaded
              </option>
            </select>
          </label>

          <button
            className="search-button"
            type="submit"
          >
            <SearchIcon />
            Search
          </button>
        </form>

        <section
          className="progress-panel"
          aria-label="Document progress"
        >
          <div className="progress-copy">
            <div>
              <p className="progress-title">
                Document progress
              </p>

              <p className="progress-subtitle">
                {loadingStatus
                  ? "Checking uploaded evidence…"
                  : `${uploadedTotal} of ${studentEntries.length} entries completed`}
              </p>
            </div>

            <p className="progress-percent">
              {completion}% complete
            </p>
          </div>

          <div
            className="progress-track"
            role="progressbar"
            aria-label="Evidence upload completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion}
          >
            <span
              style={{
                width: `${completion}%`,
              }}
            />
          </div>
        </section>

        <div className="results-heading">
          <div>
            <p className="eyebrow">
              Fixed records
            </p>

            <h2>Your matching entries</h2>
          </div>

          <p>
            Showing {visibleEntries.length} of{" "}
            {filteredEntries.length}
          </p>
        </div>

        {notice ? (
          <div
            className={`notice ${notice.type}`}
            role={
              notice.type === "error"
                ? "alert"
                : "status"
            }
            aria-live="polite"
          >
            {notice.message}

            <button
              type="button"
              onClick={() => setNotice(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <section
          className="record-list"
          aria-label="Student activity entries"
        >
          {visibleEntries.map(
            (entry, index) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                position={index + 1}
                uploaded={uploadedIds.has(
                  entry.id,
                )}
                uploading={
                  uploadingId === entry.id
                }
                onChooseFile={chooseFile}
              />
            ),
          )}
        </section>

        {filteredEntries.length === 0 ? (
          <section className="empty-state">
            <h2>No matching entry found</h2>

            <p>
              Check the spelling of your name or select
              another academic year. The institutional
              activity details cannot be edited here.
            </p>
          </section>
        ) : null}

        {visibleCount < filteredEntries.length ? (
          <button
            className="load-more"
            type="button"
            onClick={() =>
              setVisibleCount(
                (count) => count + PAGE_SIZE,
              )
            }
          >
            Show more entries
          </button>
        ) : null}

        <section
          className="guidelines"
          id="upload-guidelines"
        >
          <div>
            <p className="eyebrow">
              Before uploading
            </p>

            <h2>Evidence guidelines</h2>
          </div>

          <ul>
            <li>
              Upload one clear PDF, JPG, or PNG file for
              the selected entry.
            </li>

            <li>
              The maximum allowed file size is 10 MB.
            </li>

            <li>
              Uploading again replaces the previous
              evidence for that entry.
            </li>
          </ul>
        </section>
      </div>

      {selectedEntry && selectedFile ? (
        <div
          className="dialog-backdrop"
          role="presentation"
        >
          <section
            className="upload-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-upload-title"
          >
            <div className="dialog-icon">
              <FileIcon />
            </div>

            <p className="eyebrow">
              Confirm document
            </p>

            <h2 id="confirm-upload-title">
              Upload this evidence?
            </h2>

            <p className="dialog-entry">
              {selectedEntry.eventName}
            </p>

            <div className="selected-file">
              <div>
                <p>{selectedFile.name}</p>

                <span>
                  {formatFileSize(
                    selectedFile.size,
                  )}
                </span>
              </div>

              <span className="file-type">
                {selectedFile.type ===
                "application/pdf"
                  ? "PDF"
                  : "IMAGE"}
              </span>
            </div>

            <p className="dialog-note">
              The file will be stored securely against
              this fixed activity entry. A new upload
              will replace any previous evidence.
            </p>

            <div className="dialog-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={Boolean(uploadingId)}
                onClick={closeConfirmation}
              >
                Cancel
              </button>

              <button
                className="upload-button"
                type="button"
                disabled={Boolean(uploadingId)}
                onClick={uploadEvidence}
              >
                <UploadIcon />

                {uploadingId
                  ? "Uploading…"
                  : "Confirm upload"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}