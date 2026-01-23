/**
 * 地形类型
 */
export type TerrainType = "normal" | "obstacle" | "water" | "lava" | "grass";

/**
 * 地形单元
 */
export interface TerrainCell {
  x: number;
  y: number;
  type: TerrainType;
}

/**
 * 地图配置
 */
export interface MapConfig {
  width: number; // 地图宽度
  height: number; // 地图高度
  terrain: TerrainCell[]; // 地形配置
}

/**
 * 创建默认地图配置（Mock）
 */
export function createDefaultMapConfig(): MapConfig {
  return {
    width: 10,
    height: 10,
    terrain: []
  };
}
