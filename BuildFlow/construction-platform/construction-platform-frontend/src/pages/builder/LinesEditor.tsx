import { input } from './ui';
import { money } from '../../lib/builder-api';

/** Priced lines (quantity × unit cost, plus markup %) for change orders and estimates. */
export type Line = { costCode?: string; description: string; quantity: number; unit?: string; unitCost: number; markupPct: number };
export const blankLine = (): Line => ({ description: '', quantity: 1, unitCost: 0, markupPct: 20 });
export const linePrice = (l: Line) => (Number(l.quantity) || 0) * (Number(l.unitCost) || 0) * (1 + (Number(l.markupPct) || 0) / 100);

export default function LinesEditor({ lines, onChange, costCodes = false }: { lines: Line[]; onChange: (l: Line[]) => void; costCodes?: boolean }) {
  const set = (i: number, patch: Partial<Line>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-gray-500">
          <tr>{costCodes && <th className="pb-1 pr-2">Code</th>}<th className="pb-1 pr-2">Description</th><th className="pb-1 pr-2">Qty</th>{costCodes && <th className="pb-1 pr-2">Unit</th>}<th className="pb-1 pr-2">Unit cost</th><th className="pb-1 pr-2">Markup %</th><th className="pb-1 text-right">Price</th><th /></tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              {costCodes && <td className="pr-2"><input className={`${input} w-20`} value={l.costCode ?? ''} onChange={(e) => set(i, { costCode: e.target.value })} /></td>}
              <td className="pr-2 py-1"><input className={input} value={l.description} onChange={(e) => set(i, { description: e.target.value })} /></td>
              <td className="pr-2"><input type="number" className={`${input} w-20`} value={l.quantity} onChange={(e) => set(i, { quantity: Number(e.target.value) })} /></td>
              {costCodes && <td className="pr-2"><input className={`${input} w-16`} value={l.unit ?? ''} onChange={(e) => set(i, { unit: e.target.value })} /></td>}
              <td className="pr-2"><input type="number" className={`${input} w-24`} value={l.unitCost} onChange={(e) => set(i, { unitCost: Number(e.target.value) })} /></td>
              <td className="pr-2"><input type="number" className={`${input} w-20`} value={l.markupPct} onChange={(e) => set(i, { markupPct: Number(e.target.value) })} /></td>
              <td className="text-right tabular-nums text-gray-800">{money(linePrice(l))}</td>
              <td className="pl-2"><button type="button" className="text-xs text-gray-400 hover:text-red-600" onClick={() => onChange(lines.filter((_, j) => j !== i))} aria-label="Remove line">✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="mt-2 text-sm text-blue-600 hover:underline" onClick={() => onChange([...lines, blankLine()])}>+ Add line</button>
    </div>
  );
}
