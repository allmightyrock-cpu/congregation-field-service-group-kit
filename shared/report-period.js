export function pad2(value) {
  return String(value).padStart(2, '0');
}

export function parsePeriod(period) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(period || '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export function computeReportPeriod(date = new Date(), configuredPeriod = '') {
  const configured = parsePeriod(configuredPeriod);
  if (configured) return `${configured.year}-${pad2(configured.month)}`;

  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  if (date.getDate() <= 10) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return `${year}-${pad2(month)}`;
}

export function isReportOpen(date = new Date()) {
  const day = date.getDate();
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return day <= 10 || day >= lastDay - 1;
}

export function periodLabel(period) {
  const parsed = parsePeriod(period);
  return parsed ? `${parsed.year}년 ${parsed.month}월` : String(period || '');
}

export function deadlineLabel(period) {
  const parsed = parsePeriod(period);
  if (!parsed) return '';
  const month = parsed.month === 12 ? 1 : parsed.month + 1;
  return `${month}월 6일`;
}

export function resolveReportConfig(config = {}, date = new Date()) {
  const hasOverrideField = Object.prototype.hasOwnProperty.call(config, 'reportPeriodOverride');
  const reportPeriodOverride = String(config.reportPeriodOverride || '').trim();
  const existingPeriod = parsePeriod(config.reportPeriod);
  const reportPeriod = hasOverrideField || !existingPeriod
    ? computeReportPeriod(date, reportPeriodOverride)
    : `${existingPeriod.year}-${pad2(existingPeriod.month)}`;
  const reportOpen = hasOverrideField || typeof config.reportOpen !== 'boolean'
    ? isReportOpen(date)
    : config.reportOpen;

  return {
    ...config,
    reportPeriodOverride,
    reportPeriod,
    reportOpen,
    periodLabel: periodLabel(reportPeriod),
    deadlineLabel: deadlineLabel(reportPeriod)
  };
}
