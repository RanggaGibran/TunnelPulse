const paths = {
  panel: "M3 4h18v16H3z M9 4v16 M14 9l3 3-3 3",
  check: "m5 12 4 4L19 6",
  warning: "m12 3 10 18H2L12 3z M12 9v5 M12 17h.01",
  pulse: "M2 12h4l3-8 6 16 3-8h4",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  service: "m12 3 9 5-9 5-9-5 9-5z M3 12l9 5 9-5 M3 16l9 5 9-5",
  clock: "M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  server: "M3 3h18v7H3z M3 14h18v7H3z M6 6h1 M6 17h1",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3c-5 5-5 13 0 18 M12 3c5 5 5 13 0 18",
  tunnel: "M3 8h16l-4-4 M21 16H5l4 4",
  origin: "M7 8 3 12l4 4 M17 8l4 4-4 4 M14 5l-4 14",
};
export function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
