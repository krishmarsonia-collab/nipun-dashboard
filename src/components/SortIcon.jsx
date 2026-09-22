import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export default function SortIcon({ active, direction }) {
  if (!active) {
    return <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />;
  }
  return direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
}
