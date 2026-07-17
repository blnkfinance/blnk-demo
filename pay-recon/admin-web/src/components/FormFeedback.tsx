export default function FormFeedback({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) {
    return (
      <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-error/30">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success ring-1 ring-success/30">
        {success}
      </p>
    );
  }
  return null;
}
