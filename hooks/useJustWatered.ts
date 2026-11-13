import { useEffect, useState } from 'react';

export function useJustWatered() {
  const [justWatered, setJustWatered] = useState(false);

  useEffect(() => {
    if (!justWatered) return;
    const timer = setTimeout(() => setJustWatered(false), 2000);
    return () => clearTimeout(timer);
  }, [justWatered]);

  return { justWatered, markJustWatered: () => setJustWatered(true) };
}
