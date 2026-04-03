import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref
}: EmptyStateProps) {
  return (
    <div className="card-sm p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-900">
        <svg
          aria-hidden="true"
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M7 3h10a2 2 0 0 1 2 2v14l-4-3-4 3-4-3-4 3V5a2 2 0 0 1 2-2Z" />
          <path d="M8 8h8M8 12h5" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-blue-950">{title}</h3>
      <p className="helper-text mt-2">{description}</p>
      {actionLabel && actionHref ? (
        <Link className="btn btn-outline mt-4" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
