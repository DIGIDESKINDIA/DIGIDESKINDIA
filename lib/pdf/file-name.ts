/**
 * ==========================================
 * DigiDesk India
 * PDF File Name Generator
 * ==========================================
 */

export interface FileNameOptions {
  prefix: string;

  extension?: string;

  includeDate?: boolean;

  includeTime?: boolean;
}

function pad(value: number): string {
  return value
    .toString()
    .padStart(2, "0");
}

export function generateFileName({
  prefix,
  extension = "pdf",
  includeDate = true,
  includeTime = true,
}: FileNameOptions): string {
  const now = new Date();

  const date = `${now.getFullYear()}-${pad(
    now.getMonth() + 1
  )}-${pad(now.getDate())}`;

  const time = `${pad(
    now.getHours()
  )}-${pad(
    now.getMinutes()
  )}-${pad(
    now.getSeconds()
  )}`;

  const parts = [prefix];

  if (includeDate) {
    parts.push(date);
  }

  if (includeTime) {
    parts.push(time);
  }

  return `${parts.join("-")}.${extension}`;
}