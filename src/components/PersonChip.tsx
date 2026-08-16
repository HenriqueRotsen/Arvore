import type { Person } from "@prisma/client";
import Link from "next/link";
import { fullName, lifespan } from "@/lib/person";

export function PersonAvatar({
  person,
  size = "md",
}: {
  person: Pick<Person, "firstName" | "lastName" | "photoUrl" | "gender">;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? "h-28 w-28" : size === "sm" ? "h-10 w-10" : "h-14 w-14";
  const initials = `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase();
  const tone =
    person.gender === "female"
      ? "bg-[#ead7d0] text-terracotta"
      : person.gender === "male"
        ? "bg-[#d7e2d8] text-accent-dark"
        : "bg-[#e7dfd0] text-muted";

  if (person.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.photoUrl}
        alt={fullName(person)}
        width={720}
        height={720}
        className={`${dim} rounded-full object-cover object-top ring-2 ring-[#f4f1e6]`}
      />
    );
  }

  return (
    <div
      className={`${dim} ${tone} flex items-center justify-center rounded-full font-serif text-lg font-semibold ring-2 ring-[#f4f1e6]`}
    >
      {initials || "•"}
    </div>
  );
}

export function PersonChip({
  person,
  href,
}: {
  person: Person;
  href?: string;
}) {
  const content = (
    <span className="inline-flex items-center gap-2 text-sm hover:text-accent">
      <PersonAvatar person={person} size="sm" />
      <span>
        <span className="font-medium">{fullName(person)}</span>
        {lifespan(person) ? (
          <span className="ml-2 text-xs text-muted">{lifespan(person)}</span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
