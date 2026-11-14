import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export function SlideTabs({ tabs = [], active, onChange }) {
  const [position, setPosition] = useState({ left: 0, width: 0, opacity: 0 });
  const refs = useRef([]);
  const mountedRef = useRef(false);

  const moveToIndex = (idx) => {
    const el = refs.current[idx];
    if (!el) return;
    const { width } = el.getBoundingClientRect();
    setPosition({ left: el.offsetLeft, width, opacity: 1 });
  };

  // Posisi awal saat mount (sekali).
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const idx = tabs.findIndex((t) => t.id === active);
    if (idx >= 0) moveToIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkronkan pill saat `active` berubah dari luar (bukan dari klik).
  useEffect(() => {
    const idx = tabs.findIndex((t) => t.id === active);
    if (idx >= 0) moveToIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const handleClick = (e, tab, i) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    // Pindahkan pill dulu, lalu beri tahu parent.
    moveToIndex(i);
    onChange?.(tab.id);
  };

  return (
    <ul className="relative mx-auto flex w-full min-w-max rounded-full border border-line bg-muted/50 p-1">
      {tabs.map((tab, i) => (
        <li
          key={tab.id}
          ref={(el) => (refs.current[i] = el)}
          onClick={(e) => handleClick(e, tab, i)}
          className={`relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-semibold transition-colors duration-[400ms] ${
            active === tab.id ? 'text-brandfg' : 'text-mutedfg hover:text-ink'
          }`}
        >
          {tab.icon && <Icon name={tab.icon} size={13} />}
          {tab.label}
        </li>
      ))}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 bottom-1 rounded-full bg-brandtint transition-all duration-[400ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
        style={{ left: position.left, width: position.width, opacity: position.opacity }}
      />
    </ul>
  );
}

export default SlideTabs;
