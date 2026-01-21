import type { Panel, PanelType } from '../types/panel';

const DEFAULT_Z_INDEX = 40;
const PANEL_OFFSET_STEP = 24;

export class ModalManager {
  private panels: Panel[];
  private zIndex: number;

  constructor(initialPanels: Panel[] = []) {
    this.panels = [...initialPanels];
    this.zIndex = initialPanels.reduce((max, panel) => Math.max(max, panel.z), DEFAULT_Z_INDEX);
  }

  getPanels(): Panel[] {
    return [...this.panels];
  }

  openPanel(type: PanelType): Panel[] {
    const existing = this.panels.find((panel) => panel.type === type);
    if (existing) {
      return this.bringToFront(existing.id);
    }
    const offset = this.panels.length * PANEL_OFFSET_STEP;
    const nextZ = this.nextZ();
    const nextPanel: Panel = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      x: offset,
      y: offset,
      z: nextZ,
    };
    this.panels = [...this.panels, nextPanel];
    return this.getPanels();
  }

  closePanel(panelId: string): Panel[] {
    this.panels = this.panels.filter((panel) => panel.id !== panelId);
    return this.getPanels();
  }

  bringToFront(panelId: string): Panel[] {
    const nextZ = this.nextZ();
    this.panels = this.panels.map((panel) =>
      panel.id === panelId ? { ...panel, z: nextZ } : panel,
    );
    return this.getPanels();
  }

  updatePosition(panelId: string, x: number, y: number): Panel[] {
    this.panels = this.panels.map((panel) =>
      panel.id === panelId ? { ...panel, x, y } : panel,
    );
    return this.getPanels();
  }

  reset(initialPanels: Panel[] = []): Panel[] {
    this.panels = [...initialPanels];
    this.zIndex = initialPanels.reduce((max, panel) => Math.max(max, panel.z), DEFAULT_Z_INDEX);
    return this.getPanels();
  }

  private nextZ(): number {
    this.zIndex += 1;
    return this.zIndex;
  }
}
