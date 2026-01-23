import { BattleRoomRepo } from "./repo/BattleRoomRepo";
import { BattleRoomService } from "./service/BattleRoomService";

export const battleRoomRepo = new BattleRoomRepo();
export const battleRoomService = new BattleRoomService(battleRoomRepo);

