"use client";

import { useFormStatus } from "react-dom";

/**
 * Neither auth form gave any feedback while its server action was in
 * flight - nothing disabled the button, nothing showed it was working. On a
 * slow connection that reads as "did my click even register?", and the
 * second click that follows can land as a genuine double submission (e.g.
 * two signups racing, one succeeding and the other coming back "already
 * registered" even though the account never existed before that click).
 * useFormStatus only works from a component rendered inside the <form>,
 * which is why this can't just be a prop on the page.
 */
export default function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
