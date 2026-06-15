"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

type Faq = {
  id: string;
  question: string;
  answer: string;
};

type FormState = { question: string; answer: string };

const emptyForm: FormState = { question: "", answer: "" };

export function FaqSettings() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadFaqs = useCallback(async () => {
    const res = await fetch("/api/faqs");
    if (res.ok) setFaqs(await res.json());
  }, []);

  useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  function startEdit(faq: Faq) {
    setAdding(false);
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer });
    setMessage("");
  }

  function startAdd() {
    setEditingId(null);
    setAdding(true);
    setForm(emptyForm);
    setMessage("");
  }

  function cancelForm() {
    setEditingId(null);
    setAdding(false);
    setForm(emptyForm);
  }

  async function saveFaq() {
    const question = form.question.trim();
    const answer = form.answer.trim();
    if (!question || !answer) {
      setMessage("Both question and answer are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const isEditing = editingId !== null;
    const res = await fetch("/api/faqs", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEditing ? { id: editingId, question, answer } : { question, answer }
      ),
    });

    if (res.ok) {
      await loadFaqs();
      cancelForm();
      setMessage("Saved. The AI uses these answers immediately.");
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Failed to save.");
    }
    setSaving(false);
  }

  async function deleteFaq(id: string) {
    if (!confirm("Delete this FAQ?")) return;

    const res = await fetch(`/api/faqs/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadFaqs();
      if (editingId === id) cancelForm();
      setMessage("FAQ deleted.");
    }
  }

  const showForm = adding || editingId !== null;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-stone-900">FAQs</h2>
          <p className="mt-1 text-sm text-stone-500">
            Questions the AI can answer for customers.
          </p>
        </div>
        {!showForm && (
          <Button type="button" size="sm" onClick={startAdd}>
            Add FAQ
          </Button>
        )}
      </div>

      {message && <p className="mt-2 text-sm text-stone-600">{message}</p>}

      {showForm && (
        <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
          <h3 className="mb-3 text-sm font-semibold">
            {editingId ? "Edit FAQ" : "New FAQ"}
          </h3>
          <div className="space-y-3">
            <Input
              label="Question"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="Do you deliver?"
            />
            <Textarea
              label="Answer"
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              rows={2}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={saveFaq}
              disabled={saving || !form.question.trim() || !form.answer.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={cancelForm}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-2 divide-y divide-stone-100">
        {faqs.map((faq) => (
          <div key={faq.id} className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-stone-800">{faq.question}</p>
              <p className="mt-0.5 text-stone-500">{faq.answer}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                size="sm"
                variant={editingId === faq.id ? "primary" : "secondary"}
                onClick={() => startEdit(faq)}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => deleteFaq(faq.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
        {faqs.length === 0 && (
          <p className="py-3 text-sm text-stone-400">No FAQs yet.</p>
        )}
      </div>
    </Card>
  );
}
