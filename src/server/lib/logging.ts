function truncateValue(value: string, max = 400) {
  return value.length > max ? `${value.slice(0, max)}...<truncated>` : value;
}

export function safeLogValue(value: unknown) {
  if (typeof value === "string") {
    return truncateValue(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => safeLogValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, safeLogValue(nestedValue)]),
    );
  }

  return value;
}

export function logEvent(event: string, payload: Record<string, unknown>) {
  console.log(`[${event}]`, JSON.stringify(safeLogValue(payload)));
}
