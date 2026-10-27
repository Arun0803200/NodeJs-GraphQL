export interface Place { label: string; detail: string; lat: number; lon: number }

export const placeText = (p: Place) => (p.detail ? `${p.label}, ${p.detail}` : p.label);
