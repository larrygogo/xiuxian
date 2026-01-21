export type PanelType = 'bag' | 'equipment' | 'stats' | 'settings' | 'admin';

export interface Panel {
  id: string;
  type: PanelType;
  x: number;
  y: number;
  z: number;
}
