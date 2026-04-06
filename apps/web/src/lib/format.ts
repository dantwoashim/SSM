function asRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function asRealTimestamp(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  const dateOnly = asRealDate(value);
  if (dateOnly) {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(dateOnly);
  }

  const timestamp = asRealTimestamp(value);
  if (timestamp) {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(timestamp);
  }

  return "Invalid date";
}

export function titleCase(value: string) {
  return value
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

export function isRealDateString(value: string) {
  return !!asRealDate(value);
}
