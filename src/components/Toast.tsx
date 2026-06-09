// Transient on-screen alert for reminders.
export default function Toast({ title, body }: { title: string; body: string }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <div className="toast-title">{title}</div>
      <div className="toast-body">{body}</div>
    </div>
  );
}
