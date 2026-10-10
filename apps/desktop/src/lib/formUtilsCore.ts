/** Suggest output path from input basename under optional default root. */
export function suggestOutputPath(input: string, defaultRoot: string, suffix: string): string {
  const trimmed = input.trim().replace(/[/\\]+$/, '');
  if (!trimmed) return '';
  const parts = trimmed.split(/[/\\]/);
  const base = parts[parts.length - 1] || 'output';
  const name = base.toLowerCase().endsWith(suffix.toLowerCase()) ? base : `${base}${suffix}`;
  const root = defaultRoot.trim().replace(/[/\\]+$/, '');
  if (root) {
    const sep = root.includes('\\') ? '\\' : '/';
    return `${root}${sep}${name}`;
  }
  const sep = trimmed.includes('\\') ? '\\' : '/';
  const parent = parts.slice(0, -1).join(sep);
  return parent ? `${parent}${sep}${name}` : name;
}

export function cloneOutputPath(path: string): string {
  const stamp = Date.now().toString(36);
  if (!path) return `output_rerun_${stamp}`;
  if (path.endsWith('/') || path.endsWith('\\')) {
    return `${path.replace(/[/\\]$/, '')}_rerun_${stamp}`;
  }
  return `${path}_rerun_${stamp}`;
}

export function pathsEqual(a: string, b: string): boolean {
  const norm = (p: string) => p.trim().replace(/[/\\]+$/, '').replace(/\\/g, '/').toLowerCase();
  return Boolean(a.trim()) && norm(a) === norm(b);
}

const STAGE_LABELS_ZH: Record<string, string> = {
  scan: '扫描',
  convert: '转换',
  merge: '合并',
  clip: '裁剪',
  flatten: '压平',
  rebuild: '顶层重建',
  'rebuild-index': '顶层重建',
  'rebuild-proxy': '顶层重建',
  texture: '纹理',
  validate: '检查',
  check: '检查',
  commit: '提交',
  done: '完成',
};

const UNIT_LABELS_ZH: Record<string, string> = {
  block: '块',
  element: '构件',
  tile: '瓦片',
  node: '节点',
  file: '文件',
  dataset: '数据集',
};

const PHASE_LABELS_ZH: Record<string, string> = {
  open: '打开',
  index: '索引',
  tessellate: '三角化',
  tiles: '分块',
};

export function stageLabelZh(stage?: string | null): string {
  if (!stage) return '处理中';
  return STAGE_LABELS_ZH[stage] || stage;
}

/** Extract numeric progress percent: prefer overall, else completed/total. */
export function realProgressPercent(progress: unknown, status?: string): number | null {
  if (status === 'completed' || status === 'succeeded') return 100;
  if (progress && typeof progress === 'object') {
    const rec = progress as Record<string, unknown>;
    const overall = rec.overall;
    if (typeof overall === 'number' && !Number.isNaN(overall)) {
      const n = overall <= 1 ? overall * 100 : overall;
      return Math.max(0, Math.min(100, Math.round(n)));
    }
    const completed = rec.completed;
    const total = rec.total;
    if (typeof completed === 'number' && typeof total === 'number' && total > 0) {
      return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
    }
    const raw = rec.percent ?? rec.pct;
    if (typeof raw === 'number' && !Number.isNaN(raw) && rec.total != null) {
      const n = raw <= 1 ? raw * 100 : raw;
      return Math.max(0, Math.min(100, Math.round(n)));
    }
  }
  return null;
}

/** Build the compact status line for the task table. */
export function formatTaskProgressLine(
  stage: string | undefined,
  progress: unknown,
  status?: string,
): { text: string; pct: number | null } {
  const pct = realProgressPercent(progress, status);
  const prog =
    progress && typeof progress === 'object'
      ? (progress as Record<string, unknown>)
      : undefined;
  const stageName = stageLabelZh(stage || (typeof prog?.stage === 'string' ? prog.stage : undefined));

  if (status === 'running' || status === 'cancelling') {
    let text = stageName;
    const phase =
      typeof prog?.phase === 'string' && prog.phase
        ? PHASE_LABELS_ZH[prog.phase] || prog.phase
        : null;
    if (phase) text = `${stageName} · ${phase}`;

    const completed = prog?.completed;
    const total = prog?.total;
    const unit =
      typeof prog?.unit === 'string' ? UNIT_LABELS_ZH[prog.unit] || prog.unit : '';
    if (typeof completed === 'number') {
      if (typeof total === 'number' && total > 0) {
        text = `${text} · ${unit ? unit + ' ' : ''}${completed}/${total}`;
      } else {
        text = `${text} · 已完成 ${completed}${unit ? ' ' + unit : ''}`;
      }
    }
    if (pct != null) {
      text = `${text} · ${pct}%`;
    }
    return { text, pct };
  }
  if (status === 'queued') return { text: '排队中', pct: null };
  if (status === 'completed' || status === 'succeeded') return { text: '已完成', pct: 100 };
  return { text: stageName, pct };
}
