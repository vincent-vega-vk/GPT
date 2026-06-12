export type Position = 'GK' | 'RB' | 'CB' | 'LB' | 'CDM' | 'CM' | 'CAM' | 'RM' | 'LM' | 'RW' | 'LW' | 'CF' | 'ST';
export type Personality = 'Leader' | 'Professional' | 'Temperamental' | 'Reserved' | 'Ambitious' | 'Maverick';
export type TacticalStyle = 'possession' | 'pressing' | 'counter' | 'direct' | 'tiki-taka' | 'low-block' | 'gegenpress' | 'vertical' | 'wing-play' | 'compact';
export type Mentality = 'ultra-attacking' | 'attacking' | 'balanced' | 'defensive' | 'ultra-defensive';
export type Difficulty = 'casual' | 'realistic' | 'brutal';
export type MatchStage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final';
export type GamePhase =
  | 'WELCOME' | 'TEAM_SELECT' | 'SQUAD_HUB' | 'TACTICAL_BOARD' | 'PRE_MATCH'
  | 'LIVE_MATCH' | 'POST_MATCH' | 'PRESS_CONFERENCE' | 'DRESSING_ROOM'
  | 'BETWEEN_MATCHES' | 'GROUP_TABLES' | 'KNOCKOUT_BRACKET' | 'TOURNAMENT_END';

export interface Player {
  id: string;
  name: string;
  age: number;
  position: Position;
  role: string;
  rating: number;
  form: number;
  fitness: number;
  morale: number;
  experience: number;
  personality: Personality;
  injuryRisk: number;
  bigMatchMentality: number;
  penaltyAbility: number;
  isInjured: boolean;
  injuredUntilRound: number | null;
  isSuspended: boolean;
  yellowCards: number;
  goals: number;
  assists: number;
  matchRatings: number[];
  isInStartingXI: boolean;
}

export interface TeamTactics {
  formation: string;
  style: TacticalStyle;
  mentality: Mentality;
  pressingIntensity: number;
  defensiveLine: number;
  tempo: number;
  buildUpStyle: 'short' | 'mixed' | 'long';
  attackingWidth: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  flag: string;
  confederation: string;
  groupId: string;
  overall: number;
  attack: number;
  midfield: number;
  defense: number;
  goalkeeper: number;
  depth: number;
  tacticalIdentity: TacticalStyle;
  mentality: Mentality;
  footballCulture: string;
  mediaPressure: number;
  fanExpectations: number;
  chemistry: number;
  form: number[];
  tournamentExperience: number;
  isPlayerTeam: boolean;
  players: Player[];
  tactics: TeamTactics;
  groupPoints: number;
  groupGD: number;
  groupGF: number;
  groupGA: number;
  groupMatchesPlayed: number;
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'owngoal' | 'yellow' | 'red' | 'substitution' | 'injury' | 'penalty_miss' | 'save' | 'momentum';
  team: 'home' | 'away';
  playerName: string;
  detail?: string;
}

export interface MatchStats {
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeXG: number;
  awayXG: number;
  homeCorners: number;
  awayCorners: number;
}

export interface PlayerMatchRating {
  playerId: string;
  playerName: string;
  position: Position;
  rating: number;
  goals: number;
  assists: number;
  keyAction: string;
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  homePens?: number;
  awayPens?: number;
  events: MatchEvent[];
  stats: MatchStats;
  homeRatings: PlayerMatchRating[];
  awayRatings: PlayerMatchRating[];
  tacticalVerdict: string;
  mediaReaction: string;
  motm: string;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  stage: MatchStage;
  groupId?: string;
  roundNumber: number;
  result: MatchResult | null;
  played: boolean;
}

export interface PressQuestion {
  question: string;
  options: { text: string; moraleDelta: number; pressureDelta: number; label: string }[];
}

export interface DramaEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  choices: { id: string; text: string; effect: string; moraleDelta: number; chemistrydelta: number }[];
}

export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty;
  managerName: string;
  playerTeamId: string | null;
  teams: Record<string, Team>;
  matches: Match[];
  currentMatchId: string | null;
  currentRound: number;
  groupsGenerated: boolean;
  knockoutGenerated: boolean;
  mediaHeat: number;
  managerRep: number;
  tournamentLog: string[];
  pendingDrama: DramaEvent | null;
  pendingPress: PressQuestion[] | null;
  notifications: string[];
  savedAt: string | null;
}
