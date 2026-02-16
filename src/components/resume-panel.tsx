/**
 * Resume Panel Component
 *
 * Provides AI-generated resume bullet points based on completed goals and AEIOU data.
 * Supports editing, copying, and deleting individual bullets.
 * Includes resume file upload and full resume generation via Claude.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface BulletItem {
  id: string;
  text: string;
  isEditing: boolean;
}

export function ResumePanel() {
  const [bullets, setBullets] = useState<BulletItem[]>([]);
  const [loadingBullets, setLoadingBullets] = useState(true);
  const [generatingMore, setGeneratingMore] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [generatedResume, setGeneratedResume] = useState<string | null>(null);
  const [generatingResume, setGeneratingResume] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedResume, setCopiedResume] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchBullets = useCallback(async () => {
    try {
      const res = await fetch("/api/resume/bullets");
      if (res.ok) {
        const data = await res.json();
        const newBullets: BulletItem[] = (data.bullets || []).map(
          (text: string) => ({
            id: crypto.randomUUID(),
            text,
            isEditing: false,
          })
        );
        setBullets(newBullets);
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingBullets(false);
    }
  }, []);

  useEffect(() => {
    fetchBullets();
  }, [fetchBullets]);

  async function handleGenerateMore() {
    setGeneratingMore(true);
    try {
      const res = await fetch("/api/resume/bullets");
      if (res.ok) {
        const data = await res.json();
        const newBullets: BulletItem[] = (data.bullets || []).map(
          (text: string) => ({
            id: crypto.randomUUID(),
            text,
            isEditing: false,
          })
        );
        setBullets((prev) => [...prev, ...newBullets]);
      }
    } catch {
      // Silent fail
    } finally {
      setGeneratingMore(false);
    }
  }

  function handleEditStart(id: string) {
    setBullets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isEditing: true } : b))
    );
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  function handleEditSave(id: string, newText: string) {
    setBullets((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, text: newText, isEditing: false } : b
      )
    );
  }

  function handleEditCancel(id: string) {
    setBullets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isEditing: false } : b))
    );
  }

  function handleDelete(id: string) {
    setBullets((prev) => prev.filter((b) => b.id !== id));
  }

  async function handleCopy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleFileChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) return;
    setUploadedFile(file.name);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFileChange(e.dataTransfer.files);
  }

  async function handleGenerateResume() {
    setGeneratingResume(true);
    try {
      const activeBullets = bullets.map((b) => b.text);
      const res = await fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bullets: activeBullets,
          context: uploadedFile
            ? `User has an existing resume file: ${uploadedFile}`
            : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedResume(data.resume || null);
      }
    } catch {
      // Silent fail
    } finally {
      setGeneratingResume(false);
    }
  }

  async function handleCopyResume() {
    if (!generatedResume) return;
    await navigator.clipboard.writeText(generatedResume);
    setCopiedResume(true);
    setTimeout(() => setCopiedResume(false), 2000);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-950">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Resume Bullets Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Resume Bullets
            </h2>
            <button
              onClick={handleGenerateMore}
              disabled={generatingMore}
              className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors cursor-pointer"
            >
              {generatingMore ? "Generating..." : "Generate more bullets"}
            </button>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            AI-generated bullet points based on your completed goals and AEIOU
            reflections. Click any bullet to edit it.
          </p>

          {loadingBullets ? (
            <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Generating resume bullets...
              </p>
            </div>
          ) : bullets.length === 0 ? (
            <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No bullets yet. Complete some goals and AEIOU reflections to
                generate resume content.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {bullets.map((bullet) => (
                <div
                  key={bullet.id}
                  className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 group"
                >
                  {bullet.isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        ref={editInputRef}
                        defaultValue={bullet.text}
                        className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleEditSave(
                              bullet.id,
                              e.currentTarget.value
                            );
                          }
                          if (e.key === "Escape") {
                            handleEditCancel(bullet.id);
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleEditSave(
                              bullet.id,
                              editInputRef.current?.value || bullet.text
                            )
                          }
                          className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 rounded-xl px-3 py-1 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => handleEditCancel(bullet.id)}
                          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xs font-medium cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <span className="text-gray-300 dark:text-gray-600 mt-0.5">
                        &bull;
                      </span>
                      <p
                        className="flex-1 text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 rounded px-1 -mx-1 transition-colors"
                        onClick={() => handleEditStart(bullet.id)}
                      >
                        {bullet.text}
                      </p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => handleCopy(bullet.id, bullet.text)}
                          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xs font-medium px-2 py-1 cursor-pointer"
                          title="Copy to clipboard"
                        >
                          {copiedId === bullet.id ? "Copied!" : "Copy"}
                        </button>
                        <button
                          onClick={() => handleDelete(bullet.id)}
                          className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 text-xs font-medium px-2 py-1 cursor-pointer"
                          title="Delete bullet"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upload Resume Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Upload Existing Resume
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Upload your current resume to help generate a more personalized
            result.
          </p>

          {uploadedFile ? (
            <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 dark:text-gray-500">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 2C4 1.44772 4.44772 1 5 1H12L16 5V18C16 18.5523 15.5523 19 15 19H5C4.44772 19 4 18.5523 4 18V2Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 1V5H16"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {uploadedFile}
                </span>
              </div>
              <button
                onClick={() => setUploadedFile(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 text-xs font-medium cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-900"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files)}
              />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Drag and drop your resume here, or click to browse
              </p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                PDF or DOCX
              </p>
            </div>
          )}
        </section>

        {/* Generate Resume Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Generated Resume
            </h2>
            <button
              onClick={handleGenerateResume}
              disabled={generatingResume || bullets.length === 0}
              className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors cursor-pointer"
            >
              {generatingResume ? "Generating..." : "Generate New Resume"}
            </button>
          </div>

          {generatedResume ? (
            <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 space-y-3">
              <textarea
                value={generatedResume}
                readOnly
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg p-3 text-sm resize-none focus:outline-none h-80 font-mono"
              />
              <button
                onClick={handleCopyResume}
                className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 rounded-xl px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
              >
                {copiedResume ? "Copied!" : "Copy to Clipboard"}
              </button>
            </div>
          ) : (
            <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {bullets.length === 0
                  ? "Generate some resume bullets first, then generate a full resume."
                  : "Click \"Generate New Resume\" to create a formatted resume using your bullets."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
