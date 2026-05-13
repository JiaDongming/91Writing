export function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function nowIso() {
  return new Date().toISOString()
}
