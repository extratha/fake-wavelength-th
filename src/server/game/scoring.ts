import { getZoneScore } from "../constant/scoreZones";

// กฎการคิดคะแนนตาม Wavelength ฉบับสากล
// 1. ทีมที่เดา: เข็มตกโซน 4 / 3 / 2 ได้คะแนนตามโซน นอกโซนได้ 0
// 2. ทีมตรงข้ามแทงว่าเป้าอยู่ "ซ้าย" หรือ "ขวา" ของเข็ม ถ้าถูกได้ 1 คะแนน
//    (ยกเว้นทีมที่เดาได้ 4 = เข้าเป้ากลาง ทีมตรงข้ามจะไม่ได้คะแนนนี้)
// 3. Catch-up: ถ้าทีมที่เดาได้ 4 แต่คะแนนรวมยังตามหลัง ได้เล่นต่ออีกตา
// 4. ทีมแรกที่ถึง 10 คะแนนชนะ (ถ้าถึง 10 พร้อมกันและเสมอ ยังไม่มีผู้ชนะ เล่นต่อ)

export type TeamKey = "teamA" | "teamB";
export type ScoreType = Record<TeamKey, number>;
export type LeftRightGuess = "left" | "right";

export const WINNING_SCORE = 10;
const BULLSEYE_SCORE = 4;
const LEFT_RIGHT_GUESS_POINTS = 1;

export type RoundResult = {
  guessingTeam: TeamKey;
  opposingTeam: TeamKey;
  dialRotation: number;
  markerRotation: number;
  guessingTeamPoints: number;
  leftRightGuess: LeftRightGuess | null;
  // null = ไม่ได้แทง หรือเข็มตรงเป้าพอดี (ตัดสินไม่ได้)
  isLeftRightGuessCorrect: boolean | null;
  opposingTeamPoints: number;
  scoresAfterRound: ScoreType;
  isCatchUpTurn: boolean;
  nextTurn: TeamKey;
  winner: TeamKey | null;
};

export const getOpposingTeam = (team: TeamKey): TeamKey => (team === "teamA" ? "teamB" : "teamA");

// เป้าจริงอยู่ทางซ้ายหรือขวาของเข็ม (มุมน้อยกว่า = ซ้าย)
const checkLeftRightGuess = (
  leftRightGuess: LeftRightGuess | null,
  dialRotation: number,
  markerRotation: number
): boolean | null => {
  if (!leftRightGuess) return null;
  if (markerRotation === dialRotation) return null;

  const targetSide: LeftRightGuess = markerRotation < dialRotation ? "left" : "right";
  return leftRightGuess === targetSide;
};

const findWinner = (scores: ScoreType): TeamKey | null => {
  const someoneReachedWinningScore = scores.teamA >= WINNING_SCORE || scores.teamB >= WINNING_SCORE;
  if (!someoneReachedWinningScore) return null;
  if (scores.teamA === scores.teamB) return null;
  return scores.teamA > scores.teamB ? "teamA" : "teamB";
};

type CalculateRoundResultInput = {
  guessingTeam: TeamKey;
  dialRotation: number;
  markerRotation: number;
  leftRightGuess: LeftRightGuess | null;
  scoresBeforeRound: ScoreType;
};

export const calculateRoundResult = ({
  guessingTeam,
  dialRotation,
  markerRotation,
  leftRightGuess,
  scoresBeforeRound,
}: CalculateRoundResultInput): RoundResult => {
  const opposingTeam = getOpposingTeam(guessingTeam);

  const guessingTeamPoints = getZoneScore(dialRotation, markerRotation);
  const isBullseye = guessingTeamPoints === BULLSEYE_SCORE;

  const isLeftRightGuessCorrect = checkLeftRightGuess(leftRightGuess, dialRotation, markerRotation);
  const opposingTeamPoints = !isBullseye && isLeftRightGuessCorrect ? LEFT_RIGHT_GUESS_POINTS : 0;

  const scoresAfterRound: ScoreType = {
    ...scoresBeforeRound,
    [guessingTeam]: scoresBeforeRound[guessingTeam] + guessingTeamPoints,
    [opposingTeam]: scoresBeforeRound[opposingTeam] + opposingTeamPoints,
  };

  const isCatchUpTurn = isBullseye && scoresAfterRound[guessingTeam] < scoresAfterRound[opposingTeam];

  return {
    guessingTeam,
    opposingTeam,
    dialRotation,
    markerRotation,
    guessingTeamPoints,
    leftRightGuess,
    isLeftRightGuessCorrect,
    opposingTeamPoints,
    scoresAfterRound,
    isCatchUpTurn,
    nextTurn: isCatchUpTurn ? guessingTeam : opposingTeam,
    winner: findWinner(scoresAfterRound),
  };
};
